import { useCallback, useRef } from 'react'
import { STREAM } from '@/constants'
import { useLarynxStore } from '@/store/useLarynxStore'
import type { SensorName, EMASensor, Verdict } from '@/types/larynx'

const API_BASE = import.meta.env.VITE_API_URL || 'https://larynx-api.tianyi35.workers.dev'

function normalizeProgressPercent(progress: unknown): number {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return 0
  const scaled = progress <= 1 ? progress * 100 : progress
  return Math.max(0, Math.min(100, Math.round(scaled)))
}

interface ChannelFrameData {
  channel: 0 | 1
  sensors: Record<SensorName, EMASensor>
  tongueVelocity: number
  timestamp: number
  isAnomalous?: boolean
}

interface ChannelVerdict extends Verdict {
  channel: 0 | 1
}

export function useComparisonStream() {
  const abortRef = useRef<AbortController | null>(null)

  const startComparison = useCallback(async (fileA: File, fileB: File) => {
    // Cancel any existing stream
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    useLarynxStore.getState()._setStreamAbort(controller)

    const store = useLarynxStore.getState()
    store.setStatus('comparing')
    store.setProgress({ message: 'Uploading audio files...', percent: 0 })
    store.resetComparison()

    const formData = new FormData()
    formData.append('file_a', fileA)
    formData.append('file_b', fileB)

    const url = `${API_BASE.replace(/\/$/, '')}/api/compare`

    try {
      const response = await fetch(url, {
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

      // Parse SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hasReceivedEvent = false
      let terminalEventSeen = false

      while (true) {
        const readPromise = reader.read()
        const timeoutPromise = new Promise<never>((_, reject) => {
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

        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

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
              case 'progress': {
                hasReceivedEvent = true
                const channel = parsed.channel as 0 | 1 | undefined
                store.setProgress({
                  message: `[${channel === 1 ? 'File B' : 'File A'}] ${parsed.message}`,
                  percent: normalizeProgressPercent(parsed.progress),
                })
                break
              }

              case 'frame': {
                hasReceivedEvent = true
                const frameData: ChannelFrameData = {
                  channel: parsed.channel ?? 0,
                  sensors: parsed.sensors,
                  tongueVelocity: parsed.tongueVelocity,
                  timestamp: parsed.timestamp,
                  isAnomalous: parsed.isAnomalous,
                }
                store.addComparisonFrame(frameData.channel, {
                  sensors: frameData.sensors as Record<SensorName, EMASensor>,
                  tongueVelocity: frameData.tongueVelocity,
                  timestamp: frameData.timestamp,
                })
                break
              }

              case 'verdict': {
                hasReceivedEvent = true
                const channelVerdict: ChannelVerdict = {
                  channel: parsed.channel ?? 0,
                  isGenuine: parsed.isGenuine,
                  confidence: parsed.confidence,
                  peakVelocity: parsed.peakVelocity,
                  threshold: parsed.threshold,
                  anomalousFrameCount: parsed.anomalousFrameCount,
                  totalFrameCount: parsed.totalFrameCount,
                  anomalyRatio: parsed.anomalyRatio,
                  reportId: parsed.reportId,
                  processingTimeMs: parsed.processingTimeMs,
                }
                store.setComparisonVerdict(channelVerdict.channel, channelVerdict)
                break
              }

              case 'comparison': {
                hasReceivedEvent = true
                terminalEventSeen = true
                store.setComparisonSummary(parsed.summary || '')
                store.setProgress({ message: 'Comparison complete', percent: 100 })
                break
              }

              case 'error': {
                hasReceivedEvent = true
                terminalEventSeen = true
                store.setStatus('error')
                store.setProgress({ message: parsed.message || 'Comparison failed', percent: 0 })
                break
              }
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
        message: err instanceof Error ? err.message : 'Comparison failed',
        percent: 0,
      })
    } finally {
      useLarynxStore.getState()._setStreamAbort(null)
    }
  }, [])

  const cancelComparison = useCallback(() => {
    abortRef.current?.abort()
    useLarynxStore.getState().reset()
  }, [])

  return { startComparison, cancelComparison }
}
