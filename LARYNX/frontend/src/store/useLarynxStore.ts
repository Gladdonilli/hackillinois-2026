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
  startAnalysis: () => void
  setPostProcessingEnabled: (enabled: boolean) => void
  reset: () => void
  setProgress: (progress: AnalysisProgress) => void
  addFrame: (frame: { sensors: Record<string, { x: number; y: number; velocity?: number }>; tongueVelocity: number; timestamp: number }) => void
  setVerdict: (verdict: Verdict) => void
}

const generateMockFrames = (): EMAFrame[] => {
  const frames: EMAFrame[] = []
  const sensors: SensorName[] = ['UL', 'LL', 'JAW', 'T1', 'T2', 'T3']
  
  for (let i = 0; i < 120; i++) {
    const frameSensors = {} as Record<SensorName, any>
    let tVelSum = 0
    
    sensors.forEach(sensor => {
      const velocity = 5 + Math.random() * 25 // 5 to 30 cm/s
      if (sensor.startsWith('T')) tVelSum += velocity
      
      frameSensors[sensor] = {
        x: -0.5 + Math.random(),
        y: -0.5 + Math.random(),
        velocity
      }
    })
    
    frames.push({
      sensors: frameSensors,
      tongueVelocity: tVelSum / 3,
      timestamp: i * 33
    })
  }
  return frames
}

const generateMockFormants = (): FormantData[] => {
  const formants: FormantData[] = []
  for (let i = 0; i < 120; i++) {
    formants.push({
      f1: 300 + Math.random() * 500, // 300 to 800 Hz
      f2: 800 + Math.random() * 1700, // 800 to 2500 Hz
      f3: 1800 + Math.random() * 1700 // 1800 to 3500 Hz
    })
  }
  return formants
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
    const frames = generateMockFrames()
    const formants = generateMockFormants()
    
    set({
      status: 'analyzing',
      frames,
      formants,
      currentFrame: 0,
      progress: { message: 'Analyzing acoustic characteristics...', percent: 0 }
    })

    let frameIndex = 0
    const intervalId = setInterval(() => {
      frameIndex++
      
      if (frameIndex >= 120) {
        clearInterval(intervalId)
        
        const maxVelocity = Math.max(...frames.map(f => f.tongueVelocity))
        
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
        const currentFrameData = frames[frameIndex]
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
