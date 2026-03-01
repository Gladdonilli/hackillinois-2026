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
  f1Hz?: number
  f2Hz?: number
  f3Hz?: number
}

export interface FormantData {
  f1: number
  f2: number
  f3: number
  timestamp: number
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
  channel: 0 | 1 | 2
}

export interface ComparisonResult {
  verdicts: [Verdict, Verdict, Verdict]
  summary: string
}

export interface ChannelProgress extends AnalysisProgress {
  channel: 0 | 1 | 2
}

export interface ChannelFrame {
  channel: 0 | 1 | 2
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

export type TTSEngine = 'gemini' | 'openai'

export type GeminiVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede'
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
export type TTSVoice = GeminiVoice | OpenAIVoice

export interface GenerateCompareRequest {
  text: string
  engine: TTSEngine | 'both'
  voice?: TTSVoice
  geminiVoice?: GeminiVoice
  openaiVoice?: OpenAIVoice
}

export interface GenerateCompareProgress extends AnalysisProgress {
  engine?: TTSEngine
  phase?: 'generating' | 'analyzing'
}

export interface EngineVerdict extends Verdict {
  engine: TTSEngine
}

export interface GenerateCompareResult {
  realVerdict: Verdict
  engineVerdicts: EngineVerdict[]
  summary: string
}

export interface TranscribeResult {
  text: string
  language?: string
  duration?: number
}

// Per-sensor thresholds moved to constants.ts as SENSOR_THRESHOLDS
// Re-exported here for backward compatibility
export { SENSOR_THRESHOLDS as VELOCITY_THRESHOLDS } from '@/constants'
