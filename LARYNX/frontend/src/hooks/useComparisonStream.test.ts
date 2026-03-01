import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useComparisonStream } from './useComparisonStream'
import { useLarynxStore } from '@/store/useLarynxStore'

// Mock React hooks to allow calling the "hook" as a plain function
vi.mock('react', () => ({
  useCallback: (fn: any) => fn,
  useRef: (initial: any) => ({ current: initial }),
}))

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'blob:url')
global.URL.revokeObjectURL = vi.fn()

// Helper to create SSE stream
function createSSEStream(events: Array<{ event: string; data: object }>) {
  const text = events
    .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
    .join('')
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(encoder.encode(text))
      ctrl.close()
    },
  })
}

describe('useComparisonStream', () => {
  let startComparison: (fileA: File, fileB: File) => Promise<void>
  let cancelComparison: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    useLarynxStore.getState().reset()
    global.fetch = vi.fn()
    
    // Get the functions directly by calling the "hook" function
    const result = useComparisonStream()
    startComparison = result.startComparison
    cancelComparison = result.cancelComparison
  })

  it('starts comparison and POSTs to /api/compare with FormData', async () => {
    const mockResponse = {
      ok: true,
      body: createSSEStream([]),
    }
    ;(global.fetch as any).mockResolvedValue(mockResponse)

    const fileA = new File(['audio1'], 'fileA.wav', { type: 'audio/wav' })
    const fileB = new File(['audio2'], 'fileB.wav', { type: 'audio/wav' })

    await startComparison(fileA, fileB)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/compare'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    )

    const formData = (global.fetch as any).mock.calls[0][1].body as FormData
    expect(formData.get('file_a')).toBe(fileA)
    expect(formData.get('file_b')).toBe(fileB)
  })

  it('sets status to comparing and resets comparison state on start', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      body: createSSEStream([]),
    })

    const file = new File([], 'test.wav')
    const promise = startComparison(file, file)
    
    // Check intermediate state
    const state = useLarynxStore.getState()
    expect(state.status).toBe('comparing')
    expect(state.comparison.channelFrames).toEqual([[], []])
    
    await promise
  })

  it('handles progress events with channel info', async () => {
    const events = [
      { event: 'progress', data: { channel: 0, message: 'Analyzing', progress: 0.5 } },
      { event: 'progress', data: { channel: 1, message: 'Processing', progress: 0.8 } },
    ]
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    })

    const file = new File([], 'test.wav')
    await startComparison(file, file)

    const state = useLarynxStore.getState()
    expect(state.progress.message).toBe('[File B] Processing')
    expect(state.progress.percent).toBe(80)
  })

  it('routes frame events to correct channels', async () => {
    const frame0 = { channel: 0, sensors: { T1: { x: 1, y: 1 } }, tongueVelocity: 10, timestamp: 0.1 }
    const frame1 = { channel: 1, sensors: { T1: { x: 2, y: 2 } }, tongueVelocity: 20, timestamp: 0.2 }
    
    const events = [
      { event: 'frame', data: frame0 },
      { event: 'frame', data: frame1 },
    ]
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    })

    const file = new File([], 'test.wav')
    await startComparison(file, file)

    const state = useLarynxStore.getState()
    expect(state.comparison.channelFrames[0]).toHaveLength(1)
    expect(state.comparison.channelFrames[1]).toHaveLength(1)
    expect(state.comparison.channelFrames[0][0].tongueVelocity).toBe(10)
    expect(state.comparison.channelFrames[1][0].tongueVelocity).toBe(20)
  })

  it('sets verdict events for correct channels', async () => {
    const verdict0 = { channel: 0, isGenuine: true, confidence: 0.9, peakVelocity: 12 }
    const verdict1 = { channel: 1, isGenuine: false, confidence: 0.95, peakVelocity: 85 }

    const events = [
      { event: 'verdict', data: verdict0 },
      { event: 'verdict', data: verdict1 },
    ]
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    })

    const file = new File([], 'test.wav')
    await startComparison(file, file)

    const state = useLarynxStore.getState()
    expect(state.comparison.channelVerdicts[0]?.isGenuine).toBe(true)
    expect(state.comparison.channelVerdicts[1]?.isGenuine).toBe(false)
  })

  it('completes comparison on comparison event', async () => {
    const events = [
      { event: 'comparison', data: { summary: 'Distinct difference found' } }
    ]
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    })

    const file = new File([], 'test.wav')
    await startComparison(file, file)

    const state = useLarynxStore.getState()
    expect(state.status).toBe('comparing')
    expect(state.comparison.comparisonSummary).toBe('Distinct difference found')
    expect(state.progress.message).toBe('Comparison complete')
  })

  it('handles error events from stream', async () => {
    const events = [
      { event: 'error', data: { message: 'Server explosion' } }
    ]
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    })

    const file = new File([], 'test.wav')
    await startComparison(file, file)

    const state = useLarynxStore.getState()
    expect(state.status).toBe('error')
    expect(state.progress.message).toBe('Server explosion')
  })

  it('cancels comparison and resets store', async () => {
    cancelComparison()

    const state = useLarynxStore.getState()
    expect(state.status).toBe('idle')
    expect(state.audioFile).toBe(null)
  })

  it('handles fetch failure', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network failure'))

    const file = new File([], 'test.wav')
    await startComparison(file, file)

    const state = useLarynxStore.getState()
    expect(state.status).toBe('error')
    expect(state.progress.message).toBe('Network failure')
  })

  it('silently ignores AbortError', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    ;(global.fetch as any).mockRejectedValue(abortError)

    const file = new File([], 'test.wav')
    await startComparison(file, file)

    const state = useLarynxStore.getState()
    // It should NOT be 'error' because it was aborted
    // Since we called startComparison, it would have set status to 'comparing' first
    expect(state.status).toBe('comparing')
  })

})
