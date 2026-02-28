import { create } from 'zustand'
import {
  AnalysisStatus,
  AnalysisProgress,
  EMAFrame,
  EMASensor,
  FormantData,
  Verdict,
  SensorName
} from '@/types/larynx'

interface ComparisonState {
  channelFrames: [EMAFrame[], EMAFrame[]]
  channelVerdicts: [Verdict | null, Verdict | null]
  comparisonSummary: string | null
}

interface LarynxState {
  status: AnalysisStatus
  audioFile: File | null
  audioUrl: string | null
  frames: EMAFrame[]
  currentFrame: number
  progress: AnalysisProgress
  verdict: Verdict | null
  tongueVelocity: number
  tongueT1: { x: number; y: number }
  postProcessingEnabled: boolean
  formants: FormantData[]

  // Comparison state
  comparison: ComparisonState

  setAudioFile: (file: File | null) => void
  setStatus: (status: AnalysisStatus) => void
  startAnalysis: () => void
  setPostProcessingEnabled: (enabled: boolean) => void
  reset: () => void
  setProgress: (progress: AnalysisProgress) => void
  addFrame: (frame: { sensors: Record<string, { x: number; y: number; velocity?: number }>; tongueVelocity: number; timestamp: number }) => void
  setVerdict: (verdict: Verdict) => void

  // Comparison actions
  resetComparison: () => void
  addComparisonFrame: (channel: 0 | 1, frame: EMAFrame) => void
  setComparisonVerdict: (channel: 0 | 1, verdict: Verdict) => void
  setComparisonSummary: (summary: string) => void

  // Portal animation state
  portalState: 'idle' | 'entering' | 'warping' | 'done'
  setPortalState: (state: 'idle' | 'entering' | 'warping' | 'done') => void
  // Stream abort registry — hooks register their AbortController here
  _streamAbort: AbortController | null
  _setStreamAbort: (controller: AbortController | null) => void
}

const initialComparison: ComparisonState = {
  channelFrames: [[], []],
  channelVerdicts: [null, null],
  comparisonSummary: null,
}

const useLarynxStore = create<LarynxState>((set, get) => ({
  status: 'idle',
  audioFile: null,
  audioUrl: null,
  frames: [],
  currentFrame: 0,
  progress: { message: '', percent: 0 },
  verdict: null,
  tongueVelocity: 0,
  tongueT1: { x: 0, y: 0 },
  postProcessingEnabled: true,
  formants: [],
  comparison: { ...initialComparison },
  portalState: 'idle',
  _streamAbort: null,

  setAudioFile: (file) => {
    const currentUrl = get().audioUrl
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    set({
      audioFile: file,
      audioUrl: file ? URL.createObjectURL(file) : null
    })
  },

  setStatus: (status) => set({ status }),

  setPostProcessingEnabled: (enabled) => set({ postProcessingEnabled: enabled }),

  setProgress: (progress) => set({ progress }),

  addFrame: (frame) => {
    const state = get()
    const newFrames = state.frames.concat({
      sensors: frame.sensors as Record<SensorName, EMASensor>,
      tongueVelocity: frame.tongueVelocity,
      timestamp: frame.timestamp,
    })
    const currentFrame = newFrames.length - 1
    const t1 = frame.sensors['T1'] || frame.sensors.T1
    set({
      frames: newFrames,
      currentFrame,
      tongueVelocity: frame.tongueVelocity,
      tongueT1: t1 ? { x: t1.x, y: t1.y } : state.tongueT1,
      formants: [...state.formants], // Keep existing formants
    })
  },

  setVerdict: (verdict) => set({ verdict }),

  startAnalysis: () => {
    // No-op — use useAnalysisStream hook for real analysis
  },

  reset: () => {
    // C3 fix: abort any active SSE stream before resetting state
    const state = get()
    if (state._streamAbort) {
      state._streamAbort.abort()
    }
    const currentUrl = state.audioUrl
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    set({
      status: 'idle',
      audioFile: null,
      audioUrl: null,
      frames: [],
      currentFrame: 0,
      progress: { message: '', percent: 0 },
      verdict: null,
      tongueVelocity: 0,
      tongueT1: { x: 0, y: 0 },
      formants: [],
      comparison: { ...initialComparison, channelFrames: [[], []], channelVerdicts: [null, null] },
      portalState: 'idle',
      _streamAbort: null,
    })
  },

  resetComparison: () => set({ comparison: { ...initialComparison, channelFrames: [[], []], channelVerdicts: [null, null] } }),

  addComparisonFrame: (channel, frame) => {
    const state = get()
    const newFrames: [EMAFrame[], EMAFrame[]] = [
      [...state.comparison.channelFrames[0]],
      [...state.comparison.channelFrames[1]],
    ]
    newFrames[channel] = [...newFrames[channel], frame]
    set({ comparison: { ...state.comparison, channelFrames: newFrames } })
  },

  setComparisonVerdict: (channel, verdict) => {
    const state = get()
    const newVerdicts: [Verdict | null, Verdict | null] = [...state.comparison.channelVerdicts]
    newVerdicts[channel] = verdict
    set({ comparison: { ...state.comparison, channelVerdicts: newVerdicts } })
  },

  setComparisonSummary: (summary) => {
    const state = get()
    set({ comparison: { ...state.comparison, comparisonSummary: summary } })
  },

  setPortalState: (state) => set({ portalState: state }),
  _setStreamAbort: (controller) => set({ _streamAbort: controller } as Partial<LarynxState>),
}))

export { useLarynxStore }
export default useLarynxStore
