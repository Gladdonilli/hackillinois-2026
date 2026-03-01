import { create } from 'zustand'
import {
  AnalysisStatus,
  AnalysisProgress,
  EMAFrame,
  EMASensor,
  FormantData,
  Verdict,
  SensorName,
  TTSEngine,
  GeminiVoice,
  OpenAIVoice,
  EngineVerdict,
  GenerateCompareResult,
} from '@/types/larynx'

interface ComparisonState {
  channelFrames: [EMAFrame[], EMAFrame[], EMAFrame[]]
  channelVerdicts: [Verdict | null, Verdict | null, Verdict | null]
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

  comparison: ComparisonState

  showHistory: boolean
  historyItems: Array<{
    reportId: string
    createdAt: string
    verdict: string
    confidence: number
    peakVelocity: number
    threshold: number
    anomalousFrames: number
    totalFrames: number
    anomalyRatio: number
    processingTimeMs: number
  }>
  historyLoading: boolean

  setAudioFile: (file: File | null) => void
  setStatus: (status: AnalysisStatus) => void
  startAnalysis: () => void
  setPostProcessingEnabled: (enabled: boolean) => void
  reset: () => void
  setProgress: (progress: AnalysisProgress) => void
  addFrame: (frame: { sensors: Record<string, { x: number; y: number; velocity?: number }>; tongueVelocity: number; timestamp: number; isAnomalous?: boolean }) => void
  setVerdict: (verdict: Verdict) => void
  addFormant: (formant: FormantData) => void


  resetComparison: () => void
  addComparisonFrame: (channel: 0 | 1 | 2, frame: EMAFrame) => void
  setComparisonVerdict: (channel: 0 | 1 | 2, verdict: Verdict) => void
  setComparisonSummary: (summary: string) => void

  portalState: 'idle' | 'entering' | 'warping' | 'done'
  setPortalState: (state: 'idle' | 'entering' | 'warping' | 'done') => void
  _streamAbort: AbortController | null
  _setStreamAbort: (controller: AbortController | null) => void

  toggleHistory: () => void
  fetchHistory: () => Promise<void>

  generatePromptText: string
  selectedEngine: TTSEngine | 'both'
  geminiVoice: GeminiVoice
  openaiVoice: OpenAIVoice
  isGenerating: boolean
  isTranscribing: boolean
  transcribedText: string | null
  engineVerdicts: EngineVerdict[]
  generateCompareResult: GenerateCompareResult | null

  setGeneratePromptText: (text: string) => void
  setSelectedEngine: (engine: TTSEngine | 'both') => void
  setGeminiVoice: (voice: GeminiVoice) => void
  setOpenaiVoice: (voice: OpenAIVoice) => void
  setIsGenerating: (val: boolean) => void
  setIsTranscribing: (val: boolean) => void
  setTranscribedText: (text: string | null) => void
  addEngineVerdict: (verdict: EngineVerdict) => void
  setGenerateCompareResult: (result: GenerateCompareResult | null) => void
  resetGenerateCompare: () => void
}

const initialComparison: ComparisonState = {
  channelFrames: [[], [], []],
  channelVerdicts: [null, null, null],
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
  showHistory: false,
  historyItems: [],
  historyLoading: false,
  generatePromptText: '',
  selectedEngine: 'gemini',
  geminiVoice: 'Puck',
  openaiVoice: 'alloy',
  isGenerating: false,
  isTranscribing: false,
  transcribedText: null,
  engineVerdicts: [],
  generateCompareResult: null,

  setAudioFile: (file) => {
    const currentUrl = get().audioUrl
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    set({
      audioFile: file,
      audioUrl: file ? URL.createObjectURL(file) : null,
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
      tongueT1: t1 && isFinite(t1.x) && isFinite(t1.y) ? { x: t1.x, y: t1.y } : state.tongueT1,
      formants: state.formants,
    })
  },

  setVerdict: (verdict) => set({ verdict }),

  startAnalysis: () => set({ 
    status: 'uploading', 
    frames: [], 
    formants: [], 
    currentFrame: 0, 
    progress: { message: 'Initializing...', percent: 0 }, 
    verdict: null, 
    tongueVelocity: 0 
  }),


  reset: () => {
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
      comparison: { ...initialComparison, channelFrames: [[], [], []], channelVerdicts: [null, null, null] },
      portalState: 'idle',
      _streamAbort: null,
      generatePromptText: '',
      selectedEngine: 'gemini',
      geminiVoice: 'Puck',
      openaiVoice: 'alloy',
      isGenerating: false,
      isTranscribing: false,
      transcribedText: null,
      engineVerdicts: [],
      generateCompareResult: null,
    })
  },

  resetComparison: () =>
    set({ comparison: { ...initialComparison, channelFrames: [[], [], []], channelVerdicts: [null, null, null] } }),

  addComparisonFrame: (channel, frame) => {
    const state = get()
    const newFrames: [EMAFrame[], EMAFrame[], EMAFrame[]] = [
      [...state.comparison.channelFrames[0]],
      [...state.comparison.channelFrames[1]],
      [...state.comparison.channelFrames[2]],
    ]
    newFrames[channel] = [...newFrames[channel], frame]
    set({ comparison: { ...state.comparison, channelFrames: newFrames } })
  },

  setComparisonVerdict: (channel, verdict) => {
    const state = get()
    const newVerdicts: [Verdict | null, Verdict | null, Verdict | null] = [...state.comparison.channelVerdicts]
    newVerdicts[channel] = verdict
    set({ comparison: { ...state.comparison, channelVerdicts: newVerdicts } })
  },

  setComparisonSummary: (summary) => {
    const state = get()
    set({ comparison: { ...state.comparison, comparisonSummary: summary } })
  },

  setPortalState: (state) => set({ portalState: state }),
  _setStreamAbort: (controller) => set({ _streamAbort: controller } as Partial<LarynxState>),
  toggleHistory: () => set((state) => ({ showHistory: !state.showHistory })),
  fetchHistory: async () => {
    set({ historyLoading: true })
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://larynx-api.tianyi35.workers.dev'
      const res = await fetch(`${apiUrl}/api/history?limit=20`)
      if (!res.ok) throw new Error('Failed to fetch history')
      const json = await res.json()
      if (json.success && json.data) {
        const mappedItems = json.data.map((row: any) => ({
          reportId: row.report_id,
          createdAt: row.created_at,
          verdict: row.verdict,
          confidence: row.confidence,
          peakVelocity: row.peak_velocity,
          threshold: row.threshold,
          anomalousFrames: row.anomalous_frames,
          totalFrames: row.total_frames,
          anomalyRatio: row.anomaly_ratio,
          processingTimeMs: row.processing_time_ms,
        }))
        set({ historyItems: mappedItems, historyLoading: false })
      } else {
        set({ historyItems: [], historyLoading: false })
      }
    } catch (e) {
      console.error('Failed to fetch history', e)
      set({ historyLoading: false })
    }
  },

  setGeneratePromptText: (text) => set({ generatePromptText: text }),
  setSelectedEngine: (engine) => set({ selectedEngine: engine }),
  setGeminiVoice: (voice) => set({ geminiVoice: voice }),
  setOpenaiVoice: (voice) => set({ openaiVoice: voice }),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setIsTranscribing: (val) => set({ isTranscribing: val }),
  setTranscribedText: (text) => set({ transcribedText: text }),
  addEngineVerdict: (verdict) => set((state) => ({ engineVerdicts: [...state.engineVerdicts, verdict] })),
  setGenerateCompareResult: (result) => set({ generateCompareResult: result }),
  resetGenerateCompare: () =>
    set({
      engineVerdicts: [],
      generateCompareResult: null,
      isGenerating: false,
      isTranscribing: false,
      transcribedText: null,
    }),

  addFormant: (formant) => {
    set((state) => ({
      formants: [...state.formants, formant]
    }))
  },
}))

export { useLarynxStore }
export default useLarynxStore
