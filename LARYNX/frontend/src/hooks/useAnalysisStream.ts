import { useCallback, useRef } from 'react'
import { DEMO_MODE_ENABLED, STREAM } from '@/constants'
import { useLarynxStore } from '@/store/useLarynxStore'
import { isDemoFake } from '@/demo/demoRouting'
import { runDemoStream } from '@/demo/demoAnalysisStream'

const API_BASE = import.meta.env.VITE_API_URL || 'https://larynx-api.tianyi35.workers.dev'
const BACKEND_URL = `${API_BASE.replace(/\/$/, '')}/api/analyze`

/** Clamp backend progress to 0-100 range */
function normalizeProgressPercent(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v) || 0
  return Math.max(0, Math.min(100, n))
}

export function useAnalysisStream() {
  const abortRef = useRef<AbortController | null>(null)

  const startStream = useCallback(async () => {
    const store = useLarynxStore.getState()
    if (!store.audioFile) return

    // Cancel any existing stream
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    store._setStreamAbort(controller)

    // Demo mode — fake data, no backend
    if (DEMO_MODE_ENABLED) {
      const fake = isDemoFake(store.audioFile.name)
      try {
        await runDemoStream(fake, controller.signal)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        store.setStatus('error')
        store.setProgress({ message: 'Demo failed', percent: 0 })
      } finally {
        store._setStreamAbort(null)
      }
      return
    }


    // Prepare upload
    const formData = new FormData()
    formData.append('file', store.audioFile)

    store.setStatus('uploading')
    store.setProgress({ message: 'Uploading audio...', percent: 0 })

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Upload failed: ${response.status} ${text}`)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      store.setStatus('analyzing')

      // Parse SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hasReceivedEvent = false
      let terminalEventSeen = false

      while (true) {
        const readPromise = reader.read()
        const timeoutPromise = new Promise<{ done: true; value: undefined }>((_, reject) => {
          const timeoutMs = terminalEventSeen
            ? STREAM.WATCHDOG_TERMINAL_MS
            : hasReceivedEvent
              ? STREAM.WATCHDOG_ACTIVE_MS
              : STREAM.WATCHDOG_INITIAL_MS
          const id = setTimeout(() => reject(new Error(`Stream timeout: no data for ${timeoutMs}ms`)), timeoutMs)
          readPromise.then(() => clearTimeout(id), () => clearTimeout(id))
        })

        const { done, value } = await Promise.race([readPromise, timeoutPromise])
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events (separated by \n\n)
        const events = buffer.split('\n\n')
        buffer = events.pop() || '' // Keep incomplete event in buffer

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue

          let eventType = ''
          let eventData = ''

          for (const line of eventBlock.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6)
            }
          }

          if (!eventType || !eventData) continue

          try {
            const parsed = JSON.parse(eventData)

            switch (eventType) {
              case 'progress':
                hasReceivedEvent = true
                store.setProgress({
                  message: parsed.message,
                  percent: normalizeProgressPercent(parsed.progress),
                })
                break

              case 'frame':
                hasReceivedEvent = true
                
                // Extract sensors and calculate formants
                const sensors = parsed.sensors || {}
                const jVel = (sensors.JAW?.velocity) || 0
                const tBodyVel = (sensors.T2?.velocity) || 0
                const lVel = (sensors.LL?.velocity) || 0

                // Synthesize formants based on architecture mapping if not provided
                const f1 = parsed.f1Hz || Math.max(300, Math.min(900, 300 + (jVel / 20) * 600))
                const f2 = parsed.f2Hz || Math.max(800, Math.min(2400, 800 + (tBodyVel / 30) * 1600))
                const f3 = parsed.f3Hz || Math.max(2200, Math.min(3000, 2200 + (lVel / 25) * 800))

                store.addFrame({
                  sensors: parsed.sensors,
                  tongueVelocity: parsed.tongueVelocity,
                  timestamp: parsed.timestamp,
                  isAnomalous: parsed.isAnomalous,
                })

                store.addFormant({
                  f1,
                  f2,
                  f3,
                  timestamp: parsed.timestamp
                })
                break

              case 'verdict':
                hasReceivedEvent = true
                terminalEventSeen = true
                store.setVerdict({
                  isGenuine: parsed.isGenuine,
                  confidence: parsed.confidence,
                  peakVelocity: parsed.peakVelocity,
                  threshold: parsed.threshold,
                  anomalousFrameCount: parsed.anomalousFrameCount,
                  totalFrameCount: parsed.totalFrameCount,
                  anomalyRatio: parsed.anomalyRatio,
                  reportId: parsed.reportId,
                  processingTimeMs: parsed.processingTimeMs,
                })
                store.setStatus('complete')
                store.setProgress({ message: 'Analysis complete', percent: 100 })
                break

              case 'error':
                hasReceivedEvent = true
                terminalEventSeen = true
                store.setStatus('error')
                store.setProgress({ message: parsed.message || 'Analysis failed', percent: 0 })
                break
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      store.setStatus('error')
      store.setProgress({
        message: err instanceof Error ? err.message : 'Analysis failed',
        percent: 0,
      })
    } finally {
      useLarynxStore.getState()._setStreamAbort(null)
    }
  }, [])

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    useLarynxStore.getState().reset()
  }, [])

  return { startStream, cancelStream }
}
