import { useCallback, useRef } from 'react'
import { useLarynxStore } from '@/store/useLarynxStore'
import type { SensorName, EMASensor, Verdict } from '@/types/larynx'

const API_BASE = import.meta.env.VITE_API_URL || 'https://larynx-api.tianyi35.workers.dev'

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

      store.setStatus('comparing')

      // Parse SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
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
                const channel = parsed.channel as 0 | 1 | undefined
                store.setProgress({
                  message: `[${channel === 1 ? 'File B' : 'File A'}] ${parsed.message}`,
                  percent: Math.round(parsed.progress * 100),
                })
                break
              }

              case 'frame': {
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
                store.setComparisonSummary(parsed.summary || '')
                store.setStatus('complete')
                store.setProgress({ message: 'Comparison complete', percent: 100 })
                break
              }

              case 'error': {
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
    }
  }, [])

  const cancelComparison = useCallback(() => {
    abortRef.current?.abort()
    useLarynxStore.getState().reset()
  }, [])

  return { startComparison, cancelComparison }
}
