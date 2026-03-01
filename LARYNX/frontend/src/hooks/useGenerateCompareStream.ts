import { useCallback, useRef } from 'react'
import { STREAM } from '@/constants'
import { useLarynxStore } from '@/store/useLarynxStore'
import type { SensorName, EMASensor, Verdict, EngineVerdict, GenerateCompareResult } from '@/types/larynx'

const API_BASE = import.meta.env.VITE_API_URL || 'https://larynx-api.tianyi35.workers.dev'

function normalizeProgressPercent(progress: unknown): number {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return 0
  const scaled = progress <= 1 ? progress * 100 : progress
  return Math.max(0, Math.min(100, Math.round(scaled)))
}

export function useGenerateCompareStream() {
  const abortRef = useRef<AbortController | null>(null)

  const startGenerateCompare = useCallback(async (realFile: File) => {
    const store = useLarynxStore.getState()
    
    // Cancel any existing stream
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    store._setStreamAbort(controller)

    // Reset state before starting
    store.resetGenerateCompare()
    store.resetComparison()
    store.setIsGenerating(true)
    store.setStatus('comparing')
    store.setProgress({ message: 'Initializing generation pipeline...', percent: 0 })

    const { generatePromptText, selectedEngine, geminiVoice, openaiVoice } = store

    const formData = new FormData()
    formData.append('real_file', realFile)
    formData.append('text', generatePromptText)
    formData.append('engine', selectedEngine)
    formData.append('gemini_voice', geminiVoice)
    formData.append('openai_voice', openaiVoice)

    const url = `${API_BASE.replace(/\/$/, '')}/api/generate-and-compare`

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Generation failed: ${response.status} ${text}`)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

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
                const engine = parsed.engine ? `[${parsed.engine.toUpperCase()}] ` : ''
                const phase = parsed.phase === 'generating' ? 'Generating...' : 'Analyzing...'
                store.setProgress({
                  message: `${engine}${phase} ${parsed.message || ''}`,
                  percent: normalizeProgressPercent(parsed.progress),
                })
                break
              }

              case 'frame': {
                hasReceivedEvent = true
                const channel = parsed.channel as 0 | 1 | 2
                store.addComparisonFrame(channel, {
                  sensors: parsed.sensors as Record<SensorName, EMASensor>,
                  tongueVelocity: parsed.tongueVelocity,
                  timestamp: parsed.timestamp,
                  isAnomalous: parsed.isAnomalous,
                })
                break
              }

              case 'verdict': {
                hasReceivedEvent = true
                if (parsed.engine) {
                  // Engine-specific verdict (Gemini or OpenAI)
                  const engineVerdict: EngineVerdict = {
                    ...parsed,
                    engine: parsed.engine,
                  }
                  store.addEngineVerdict(engineVerdict)
                  // Also add to comparison verdicts for visualization (1=Gemini, 2=OpenAI)
                  const channel = parsed.engine === 'gemini' ? 1 : 2
                  store.setComparisonVerdict(channel, parsed)
                } else {
                  // Real file verdict
                  store.setVerdict(parsed as Verdict)
                  store.setComparisonVerdict(0, parsed as Verdict)
                }
                break
              }

              case 'comparison': {
                hasReceivedEvent = true
                terminalEventSeen = true
                const result = parsed as GenerateCompareResult
                store.setGenerateCompareResult(result)
                if (result.summary) {
                  store.setComparisonSummary(result.summary)
                }
                store.setProgress({ message: 'Generation and comparison complete', percent: 100 })
                store.setStatus('complete')
                store.setIsGenerating(false)
                break
              }

              case 'error': {
                hasReceivedEvent = true
                terminalEventSeen = true
                store.setStatus('error')
                store.setProgress({ message: parsed.message || 'Pipeline failed', percent: 0 })
                store.setIsGenerating(false)
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
        message: err instanceof Error ? err.message : 'Pipeline failed',
        percent: 0,
      })
      store.setIsGenerating(false)
    } finally {
      store._setStreamAbort(null)
    }
  }, [])

  const cancelGenerateCompare = useCallback(() => {
    abortRef.current?.abort()
    useLarynxStore.getState().resetGenerateCompare()
    useLarynxStore.getState().reset()
  }, [])

  return { 
    startGenerateCompare, 
    cancelGenerateCompare,
    isGenerating: useLarynxStore((s) => s.isGenerating)
  }
}
