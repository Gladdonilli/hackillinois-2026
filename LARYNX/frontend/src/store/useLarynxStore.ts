import { create } from 'zustand'
import {
  AnalysisStatus,
  AnalysisProgress,
  EMAFrame,
  FormantData,
  Verdict,
  SensorName
} from '@/types/larynx'

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

  setAudioFile: (file: File | null) => void
  setStatus: (status: AnalysisStatus) => void
  startAnalysis: () => void // Legacy mock fallback — prefer useAnalysisStream
  setPostProcessingEnabled: (enabled: boolean) => void
  reset: () => void
  setProgress: (progress: AnalysisProgress) => void
  addFrame: (frame: { sensors: Record<string, { x: number; y: number; velocity?: number }>; tongueVelocity: number; timestamp: number }) => void
  setVerdict: (verdict: Verdict) => void
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
    const newFrames = [...state.frames, {
      sensors: frame.sensors as Record<SensorName, { x: number; y: number; velocity?: number }>,
      tongueVelocity: frame.tongueVelocity,
      timestamp: frame.timestamp,
    }]
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
    // Mock fallback: generate inline data when no backend is available
    const mockFrames: EMAFrame[] = Array.from({ length: 120 }, (_, i) => {
      const t = i / 120
      const makeSensor = () => ({
        x: (Math.random() - 0.5) * 0.8,
        y: (Math.random() - 0.5) * 0.8,
        velocity: 5 + Math.random() * 25,
      })
      const sensors: Record<SensorName, { x: number; y: number; velocity?: number }> = {
        UL: makeSensor(),
        LL: makeSensor(),
        JAW: makeSensor(),
        T1: makeSensor(),
        T2: makeSensor(),
        T3: makeSensor(),
      }
      const tongueVelocity = (
        (sensors.T1.velocity ?? 0) +
        (sensors.T2.velocity ?? 0) +
        (sensors.T3.velocity ?? 0)
      ) / 3
      return { sensors, tongueVelocity, timestamp: t }
    })

    const mockFormants: FormantData[] = Array.from({ length: 120 }, () => ({
      f1: 300 + Math.random() * 500,
      f2: 800 + Math.random() * 1700,
      f3: 1800 + Math.random() * 1700,
    }))

    set({
      status: 'analyzing',
      frames: mockFrames,
      formants: mockFormants,
      currentFrame: 0,
      progress: { message: 'Analyzing acoustic characteristics...', percent: 0 }
    })

    let frameIndex = 0
    const intervalId = setInterval(() => {
      frameIndex++

      if (frameIndex >= 120) {
        clearInterval(intervalId)

        const maxVelocity = Math.max(...mockFrames.map((frame) => frame.tongueVelocity))

        set({
          status: 'complete',
          currentFrame: 119,
          progress: { message: 'Analysis complete', percent: 100 },
          verdict: {
            isGenuine: Math.random() > 0.3,
            confidence: 0.7 + Math.random() * 0.25,
            peakVelocity: maxVelocity,
            threshold: 25
          }
        })
      } else {
        const currentFrameData = mockFrames[frameIndex]
        set({
          currentFrame: frameIndex,
          tongueVelocity: currentFrameData.tongueVelocity,
          tongueT1: {
            x: currentFrameData.sensors.T1.x,
            y: currentFrameData.sensors.T1.y
          },
          progress: {
            message: 'Inverting formants to articulatory kinematics...',
            percent: Math.floor((frameIndex / 120) * 100)
          }
        })
      }
    }, 33)
  },

  reset: () => {
    const currentUrl = get().audioUrl
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
      formants: []
    })
  }
}))

export { useLarynxStore }
export default useLarynxStore
