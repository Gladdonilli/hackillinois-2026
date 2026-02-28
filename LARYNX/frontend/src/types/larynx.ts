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
  isAnomalous?: boolean
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
  anomalousFrameCount?: number
  totalFrameCount?: number
  anomalyRatio?: number
  reportId?: string
  processingTimeMs?: number
}

export interface ChannelVerdict extends Verdict {
  channel: 0 | 1
}

export interface ComparisonResult {
  verdicts: [Verdict, Verdict]
  summary: string
}

export interface ChannelProgress extends AnalysisProgress {
  channel: 0 | 1
}

export interface ChannelFrame {
  channel: 0 | 1
  sensors: Record<SensorName, EMASensor>
  tongueVelocity: number
  timestamp: number
  isAnomalous: boolean
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

// Per-sensor thresholds moved to constants.ts as SENSOR_THRESHOLDS
// Re-exported here for backward compatibility
export { SENSOR_THRESHOLDS as VELOCITY_THRESHOLDS } from '@/constants'
