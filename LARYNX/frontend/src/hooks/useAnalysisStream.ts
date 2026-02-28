import { useCallback, useRef } from 'react'
import { useLarynxStore } from '@/store/useLarynxStore'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://gladdonilli--larynx-analyze-dev.modal.run'

export function useAnalysisStream() {
  const abortRef = useRef<AbortController | null>(null)

  const startStream = useCallback(async () => {
    const store = useLarynxStore.getState()
    if (!store.audioFile) return

    // Cancel any existing stream
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

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
      const allFrames: Parameters<typeof store.addFrame>[0][] = []

      while (true) {
        const { done, value } = await reader.read()
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
                store.setProgress({
                  message: parsed.message,
                  percent: Math.round(parsed.progress * 100),
                })
                break

              case 'frame':
                allFrames.push({
                  sensors: parsed.sensors,
                  tongueVelocity: parsed.tongueVelocity,
                  timestamp: parsed.timestamp,
                })
                // Update store with accumulated frames and current frame data
                store.addFrame({
                  sensors: parsed.sensors,
                  tongueVelocity: parsed.tongueVelocity,
                  timestamp: parsed.timestamp,
                })
                break

              case 'verdict':
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
    }
  }, [])

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    useLarynxStore.getState().reset()
  }, [])

  return { startStream, cancelStream }
}
