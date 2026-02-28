export type SensorName = 'UL' | 'LL' | 'JAW' | 'T1' | 'T2' | 'T3'

export interface EMASensor {
  x: number
  y: number
  velocity?: number
}

export interface EMAFrame {
  sensors: Record<SensorName, EMASensor>
  tongueVelocity: number
  timestamp: number
}

export interface FormantData {
  f1: number
  f2: number
  f3: number
}

export interface Verdict {
  isGenuine: boolean
  confidence: number
  peakVelocity: number
  threshold: number
}

export interface AnalysisProgress {
  message: string
  percent: number
}

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'comparing' | 'technical' | 'closing' | 'error'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface SSEProgressEvent {
  step: string
  progress: number
  message: string
}

export const VELOCITY_THRESHOLDS: Record<string, number> = {
  UL: 15,
  LL: 15,
  JAW: 20,
  T1: 25,
  T2: 25,
  T3: 25,
  tongue: 25,
  TONGUE: 25,
  jaw: 20,
  JAW_CAT: 20,
  lip: 15,
  LIP: 15,
  ul: 15,
  ll: 15,
}
