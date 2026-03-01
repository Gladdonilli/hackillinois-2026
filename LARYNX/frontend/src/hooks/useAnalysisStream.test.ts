/**
 * @vitest-environment node
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useLarynxStore } from '@/store/useLarynxStore'

// Mock React's hooks since useAnalysisStream uses them internally
// but we want to test it as a plain function to avoid React production build issues
vi.mock('react', () => ({
  useCallback: (fn: Function) => fn,
  useRef: (initial: unknown) => ({ current: initial }),
}))

// Import directly - must happen after the mock
const { useAnalysisStream } = await import('./useAnalysisStream')

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'blob:mock')
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

describe('useAnalysisStream (Logic Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLarynxStore.getState().reset()
    global.fetch = vi.fn()
  })

  it('a) startStream does nothing if no audioFile set', async () => {
    const { startStream } = useAnalysisStream()
    await startStream()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(useLarynxStore.getState().status).toBe('idle')
  })

  it('b) startStream POSTs to correct URL with FormData containing the file', async () => {
    const mockFile = new File(['audio content'], 'test.wav', { type: 'audio/wav' })
    useLarynxStore.getState().setAudioFile(mockFile)
    
    const mockResponse = {
      ok: true,
      body: createSSEStream([]),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { startStream } = useAnalysisStream()
    await startStream()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/analyze'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
        signal: expect.any(AbortSignal),
      })
    )

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
    const formData = callArgs.body as FormData
    expect(formData.get('file')).toBe(mockFile)
  })

  it('c) Progress events update store progress', async () => {
    const mockFile = new File([''], 'test.wav')
    useLarynxStore.getState().setAudioFile(mockFile)
    
    const mockResponse = {
      ok: true,
      body: createSSEStream([
        { event: 'progress', data: { message: 'Extracting formants', progress: 0.456 } },
      ]),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { startStream } = useAnalysisStream()
    await startStream()

    const progress = useLarynxStore.getState().progress
    expect(progress.message).toBe('Extracting formants')
    expect(progress.percent).toBe(46) // Math.round(0.456 * 100)
  })

  it('d) Frame events call addFrame with correct sensor data', async () => {
    const mockFile = new File([''], 'test.wav')
    useLarynxStore.getState().setAudioFile(mockFile)
    
    const frameData = {
      sensors: { T1: { x: 10, y: 20, velocity: 5 } },
      tongueVelocity: 5,
      timestamp: 0.1,
      isAnomalous: false,
    }

    const mockResponse = {
      ok: true,
      body: createSSEStream([{ event: 'frame', data: frameData }]),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { startStream } = useAnalysisStream()
    await startStream()

    const frames = useLarynxStore.getState().frames
    expect(frames).toHaveLength(1)
    expect(frames[0].sensors.T1).toEqual({ x: 10, y: 20, velocity: 5 })
    expect(frames[0].tongueVelocity).toBe(5)
  })

  it('e) Verdict event sets verdict and status="complete"', async () => {
    const mockFile = new File([''], 'test.wav')
    useLarynxStore.getState().setAudioFile(mockFile)
    
    const verdictData = {
      isGenuine: true,
      confidence: 0.95,
      peakVelocity: 12.5,
      threshold: 20,
      anomalousFrameCount: 0,
      totalFrameCount: 100,
      anomalyRatio: 0,
      reportId: 'rep_123',
      processingTimeMs: 450,
    }

    const mockResponse = {
      ok: true,
      body: createSSEStream([{ event: 'verdict', data: verdictData }]),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { startStream } = useAnalysisStream()
    await startStream()

    const store = useLarynxStore.getState()
    expect(store.status).toBe('complete')
    expect(store.verdict).toEqual(verdictData)
    expect(store.progress.message).toBe('Analysis complete')
    expect(store.progress.percent).toBe(100)
  })

  it('f) Error event sets status="error"', async () => {
    const mockFile = new File([''], 'test.wav')
    useLarynxStore.getState().setAudioFile(mockFile)
    
    const mockResponse = {
      ok: true,
      body: createSSEStream([
        { event: 'error', data: { message: 'Internal Server Error' } },
      ]),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { startStream } = useAnalysisStream()
    await startStream()

    const store = useLarynxStore.getState()
    expect(store.status).toBe('error')
    expect(store.progress.message).toBe('Internal Server Error')
  })

  it('g) cancelStream resets store', () => {
    useLarynxStore.getState().setStatus('analyzing')

    const { cancelStream } = useAnalysisStream()
    cancelStream()

    expect(useLarynxStore.getState().status).toBe('idle')
    expect(useLarynxStore.getState().audioFile).toBeNull()
  })

  it('h) Fetch failure sets status="error" with error message', async () => {
    const mockFile = new File([''], 'test.wav')
    useLarynxStore.getState().setAudioFile(mockFile)
    
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'))

    const { startStream } = useAnalysisStream()
    await startStream()

    const store = useLarynxStore.getState()
    expect(store.status).toBe('error')
    expect(store.progress.message).toBe('Network failure')
  })

  it('i) AbortError is silently ignored (no error status)', async () => {
    const mockFile = new File([''], 'test.wav')
    useLarynxStore.getState().setAudioFile(mockFile)
    
    const abortError = new Error('The user aborted a request.')
    abortError.name = 'AbortError'
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(abortError)

    const { startStream } = useAnalysisStream()
    await startStream()

    const store = useLarynxStore.getState()
    // Status stays at 'uploading' (set before fetch)
    expect(store.status).toBe('uploading')
    expect(store.status).not.toBe('error')
  })

  it('j) Malformed JSON in SSE data is skipped without error', async () => {
    const mockFile = new File([''], 'test.wav')
    useLarynxStore.getState().setAudioFile(mockFile)
    
    const text = `event: progress\ndata: {invalid-json}\n\nevent: progress\ndata: {"message": "Valid", "progress": 0.5}\n\n`
    const encoder = new TextEncoder()
    const mockBody = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(encoder.encode(text))
        ctrl.close()
      },
    })

    const mockResponse = {
      ok: true,
      body: mockBody,
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { startStream } = useAnalysisStream()
    await startStream()

    const store = useLarynxStore.getState()
    expect(store.status).toBe('analyzing')
    expect(store.progress.message).toBe('Valid')
    expect(store.progress.percent).toBe(50)
  })
})

