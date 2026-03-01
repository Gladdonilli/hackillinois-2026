export interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  RATE_LIMITER?: {
    limit: (opts: { key: string }) => Promise<{ success: boolean }>;
  };
  MODAL_API_URL: string;
  MODAL_COMPARE_URL: string;
  // Intelligence layer (Workers AI + Vectorize)
  AI?: Ai;
  VECTOR_SIGNATURES?: VectorizeIndex;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface Report {
  reportId: string;
  createdAt: string;
  verdict: 'GENUINE' | 'DEEPFAKE';
  confidence: number;
  peakVelocity: number;
  threshold: number;
  anomalousFrameCount: number;
  totalFrameCount: number;
  anomalyRatio: number;
  audioKey: string;
  durationSeconds: number;
  processingTimeMs: number;
  classifierScore?: number;
  classifierModel?: string;
  ensembleScore?: number;
}

// ─── Intelligence Layer Types ───

export interface VerdictData {
  isGenuine: boolean;
  confidence: number;
  peakVelocity: number;
  threshold: number;
  anomalousFrameCount: number;
  totalFrameCount: number;
  anomalyRatio: number;
  classifierScore?: number;
  classifierModel?: string;
  ensembleScore?: number;
  reportId?: string;
  processingTimeMs?: number;
}

export interface SimilarityMatch {
  reportId: string;
  score: number;
  verdict: string;
  confidence: number;
  peakVelocity: number;
  timestamp: string;
}

