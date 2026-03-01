import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLarynxStore } from '@/store/useLarynxStore'
import { Verdict, EMAFrame } from '@/types/larynx'

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'blob:mocked-url')
global.URL.revokeObjectURL = vi.fn()

// Mock fetch
global.fetch = vi.fn()

describe('useLarynxStore', () => {
  beforeEach(() => {
    useLarynxStore.getState().reset()
    vi.clearAllMocks()
    useLarynxStore.setState({ showHistory: false, historyItems: [] }) // Ensure history is reset
  })

  it('has correct initial state', () => {
    const state = useLarynxStore.getState()
    expect(state.status).toBe('idle')
    expect(state.audioFile).toBeNull()
    expect(state.frames).toEqual([])
    expect(state.verdict).toBeNull()
    expect(state.tongueVelocity).toBe(0)
    expect(state.portalState).toBe('idle')
    expect(state.showHistory).toBe(false)
  })

  it('setStatus changes status correctly', () => {
    useLarynxStore.getState().setStatus('analyzing')
    expect(useLarynxStore.getState().status).toBe('analyzing')
  })

  it('setAudioFile sets file and creates audioUrl', () => {
    const file = new File([''], 'test.wav', { type: 'audio/wav' })
    useLarynxStore.getState().setAudioFile(file)
    const state = useLarynxStore.getState()
    expect(state.audioFile).toBe(file)
    expect(state.audioUrl).toBe('blob:mocked-url')
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file)
  })

  it('setAudioFile(null) clears file and revokes old url', () => {
    const file = new File([''], 'test.wav', { type: 'audio/wav' })
    useLarynxStore.getState().setAudioFile(file)
    
    useLarynxStore.getState().setAudioFile(null)
    const state = useLarynxStore.getState()
    expect(state.audioFile).toBeNull()
    expect(state.audioUrl).toBeNull()
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mocked-url')
  })

  it('setProgress updates progress message and percent', () => {
    useLarynxStore.getState().setProgress({ message: 'Loading...', percent: 50 })
    expect(useLarynxStore.getState().progress).toEqual({ message: 'Loading...', percent: 50 })
  })

  it('addFrame appends frame and updates tongue parameters', () => {
    const frame = {
      sensors: { T1: { x: 10, y: 20, velocity: 5 } },
      tongueVelocity: 15,
      timestamp: 100
    }
    useLarynxStore.getState().addFrame(frame)
    const state = useLarynxStore.getState()
    expect(state.frames).toHaveLength(1)
    expect(state.currentFrame).toBe(0)
    expect(state.tongueVelocity).toBe(15)
    expect(state.tongueT1).toEqual({ x: 10, y: 20 })
  })

  it('setVerdict stores verdict object', () => {
    const verdict: Verdict = { isGenuine: false, confidence: 0.99, peakVelocity: 180, threshold: 20, anomalyRatio: 0.5, totalFrameCount: 100, anomalousFrameCount: 50, processingTimeMs: 200 }
    useLarynxStore.getState().setVerdict(verdict)
    expect(useLarynxStore.getState().verdict).toEqual(verdict)
  })

  it('reset restores state, aborts stream and revokes url', () => {
    const file = new File([''], 'test.wav', { type: 'audio/wav' })
    useLarynxStore.getState().setAudioFile(file)
    const abortController = new AbortController()
    const abortSpy = vi.spyOn(abortController, 'abort')
    useLarynxStore.getState()._setStreamAbort(abortController)
    useLarynxStore.getState().setStatus('analyzing')

    useLarynxStore.getState().reset()
    const state = useLarynxStore.getState()
    expect(state.status).toBe('idle')
    expect(state.audioFile).toBeNull()
    expect(state.audioUrl).toBeNull()
    expect(state._streamAbort).toBeNull()
    expect(abortSpy).toHaveBeenCalled()
    expect(global.URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('setPostProcessingEnabled toggles postProcessingEnabled', () => {
    useLarynxStore.getState().setPostProcessingEnabled(false)
    expect(useLarynxStore.getState().postProcessingEnabled).toBe(false)
  })

  it('resetComparison clears channelFrames and channelVerdicts', () => {
    useLarynxStore.getState().setComparisonSummary('summary')
    useLarynxStore.getState().resetComparison()
    const state = useLarynxStore.getState()
    expect(state.comparison.channelFrames).toEqual([[], []])
    expect(state.comparison.channelVerdicts).toEqual([null, null])
  })

  it('addComparisonFrame appends frame to correct channel', () => {
    const frame = { sensors: {}, tongueVelocity: 10, timestamp: 0, formants: { f1: 0, f2: 0, f3: 0 } } as unknown as EMAFrame
    useLarynxStore.getState().addComparisonFrame(1, frame)
    expect(useLarynxStore.getState().comparison.channelFrames[1]).toHaveLength(1)
    expect(useLarynxStore.getState().comparison.channelFrames[0]).toHaveLength(0)
  })

  it('setComparisonVerdict sets correct channel', () => {
    const verdict = { isGenuine: true, confidence: 0.8, peakVelocity: 10, threshold: 20 } as Verdict
    useLarynxStore.getState().setComparisonVerdict(0, verdict)
    expect(useLarynxStore.getState().comparison.channelVerdicts[0]).toBe(verdict)
    expect(useLarynxStore.getState().comparison.channelVerdicts[1]).toBeNull()
  })

  it('setComparisonSummary sets summary', () => {
    useLarynxStore.getState().setComparisonSummary('Test summary')
    expect(useLarynxStore.getState().comparison.comparisonSummary).toBe('Test summary')
  })

  it('setPortalState changes portalState', () => {
    useLarynxStore.getState().setPortalState('entering')
    expect(useLarynxStore.getState().portalState).toBe('entering')
  })

  it('_setStreamAbort stores AbortController', () => {
    const controller = new AbortController()
    useLarynxStore.getState()._setStreamAbort(controller)
    expect(useLarynxStore.getState()._streamAbort).toBe(controller)
  })

  it('toggleHistory flips showHistory', () => {
    useLarynxStore.getState().toggleHistory()
    expect(useLarynxStore.getState().showHistory).toBe(true)
    useLarynxStore.getState().toggleHistory()
    expect(useLarynxStore.getState().showHistory).toBe(false)
  })

  it('fetchHistory sets historyItems on success', async () => {
    const mockData = {
      success: true,
      data: [{ report_id: '1', created_at: '2026', verdict: 'fake', confidence: 0.9, peak_velocity: 150, threshold: 20, anomalous_frames: 10, total_frames: 100, anomaly_ratio: 0.1, processing_time_ms: 50 }]
    }
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    } as Response)

    await useLarynxStore.getState().fetchHistory()
    
    const state = useLarynxStore.getState()
    expect(state.historyItems).toHaveLength(1)
    expect(state.historyItems[0].reportId).toBe('1')
    expect(state.historyLoading).toBe(false)
  })

  it('fetchHistory sets historyLoading to false on error', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    await useLarynxStore.getState().fetchHistory()
    
    const state = useLarynxStore.getState()
    expect(state.historyItems).toEqual([])
    expect(state.historyLoading).toBe(false)
  })
})
