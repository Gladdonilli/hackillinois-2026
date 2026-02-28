/**
 * LARYNX Intelligence Layer
 *
 * Generates text embeddings from verdict data via Workers AI (BGE-base-en-v1.5),
 * stores them in Vectorize for similarity search across analyses.
 *
 * All thresholds and bands are TUNABLE — the real model (8K training run)
 * will decide final ranges. These are starting defaults.
 */

import type { Env, VerdictData, SimilarityMatch } from './types';

// ─── Tunable Configuration ───
// These will be adjusted once the 8K-sample model finalizes its ranges.
export const INTEL_CONFIG = {
  // Workers AI model for text embeddings (768-dim)
  EMBEDDING_MODEL: '@cf/baai/bge-base-en-v1.5',

  // AI Gateway ID for observability
  GATEWAY_ID: 'larynx-gateway',

  // Vectorize query settings
  SIMILARITY_TOP_K: 5,
  SIMILARITY_MIN_SCORE: 0.7, // Tunable: minimum cosine similarity to return

  // Severity bands (cm/s) — will be updated by 8K model
  SEVERITY_BANDS: {
    critical: 80,  // > 80 cm/s
    high: 40,      // > 40 cm/s
    moderate: 20,  // > 20 cm/s
    // <= 20 cm/s = normal
  } as const,

  // Confidence bands
  CONFIDENCE_BANDS: {
    high: 0.8,     // > 0.8
    medium: 0.5,   // > 0.5
    // <= 0.5 = low
  } as const,

  // Anomaly ratio bands
  ANOMALY_BANDS: {
    severe: 0.15,  // > 15% frames anomalous
    moderate: 0.05, // > 5%
    // <= 5% = minimal
  } as const,

  // Free-tier guardrails
  EMBED_TIMEOUT_MS: 5000,
  UPSERT_TIMEOUT_MS: 3000,
  QUERY_TIMEOUT_MS: 3000,
};

// ─── Severity Classification ───

function classifySeverity(peakVelocity: number): string {
  const { SEVERITY_BANDS } = INTEL_CONFIG;
  if (peakVelocity > SEVERITY_BANDS.critical) return 'critical';
  if (peakVelocity > SEVERITY_BANDS.high) return 'high';
  if (peakVelocity > SEVERITY_BANDS.moderate) return 'moderate';
  return 'normal';
}

function classifyConfidence(confidence: number): string {
  const { CONFIDENCE_BANDS } = INTEL_CONFIG;
  if (confidence > CONFIDENCE_BANDS.high) return 'high';
  if (confidence > CONFIDENCE_BANDS.medium) return 'medium';
  return 'low';
}

function classifyAnomalyRatio(ratio: number): string {
  const { ANOMALY_BANDS } = INTEL_CONFIG;
  if (ratio > ANOMALY_BANDS.severe) return 'severe';
  if (ratio > ANOMALY_BANDS.moderate) return 'moderate';
  return 'minimal';
}

// ─── Text Template for Embedding ───
// Uses categorical tokens to give BGE meaningful clustering,
// not raw floats. This is deliberate — see STATE-AUDIT.md.

function buildEmbeddingText(verdict: VerdictData): string {
  const label = verdict.isGenuine ? 'genuine' : 'deepfake';
  const confBand = classifyConfidence(verdict.confidence);
  const severity = classifySeverity(verdict.peakVelocity);
  const anomalyBand = classifyAnomalyRatio(verdict.anomalyRatio);
  const confPct = (verdict.confidence * 100).toFixed(1);
  const ratioPct = (verdict.anomalyRatio * 100).toFixed(1);

  // Classifier info if available
  const classifierPart = verdict.classifierScore != null
    ? ` Classifier score ${verdict.classifierScore.toFixed(3)}, ensemble score ${(verdict.ensembleScore ?? verdict.classifierScore).toFixed(3)}.`
    : '';

  return [
    `Voice analysis verdict: ${label} detected`,
    `with ${confBand} confidence (${confPct}%).`,
    `Articulatory severity: ${severity}.`,
    `Peak tongue velocity ${verdict.peakVelocity.toFixed(1)} cm/s`,
    `against threshold ${verdict.threshold.toFixed(1)} cm/s.`,
    `${verdict.anomalousFrameCount} of ${verdict.totalFrameCount} frames anomalous`,
    `(${ratioPct}% ratio, ${anomalyBand} anomaly level).`,
    classifierPart,
  ].join(' ').trim();
}

// ─── Core Operations ───

/**
 * Generate a 768-dim embedding from verdict data via Workers AI.
 * Returns null on failure (fail-open — never blocks analyze flow).
 */
export async function generateEmbedding(
  ai: Ai,
  verdict: VerdictData
): Promise<number[] | null> {
  const text = buildEmbeddingText(verdict);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INTEL_CONFIG.EMBED_TIMEOUT_MS);

    const result = await ai.run(
      INTEL_CONFIG.EMBEDDING_MODEL,
      { text: [text] },
      { gateway: { id: INTEL_CONFIG.GATEWAY_ID, skipCache: false, cacheTtl: 3600 } }
    ) as { data: number[][] };

    clearTimeout(timeout);

    if (result?.data?.[0]?.length === 768) {
      return result.data[0];
    }

    console.error('[intelligence] Unexpected embedding shape:', result?.data?.[0]?.length);
    return null;
  } catch (err) {
    console.error('[intelligence] Embedding failed:', err);
    return null;
  }
}

/**
 * Store verdict embedding in Vectorize with metadata for filtering.
 * Returns true on success, false on failure (fail-open).
 */
export async function upsertSignature(
  vectorize: VectorizeIndex,
  reportId: string,
  embedding: number[],
  verdict: VerdictData
): Promise<boolean> {
  try {
    await vectorize.upsert([
      {
        id: reportId,
        values: embedding,
        metadata: {
          reportId,
          verdict: verdict.isGenuine ? 'GENUINE' : 'DEEPFAKE',
          confidence: Math.round(verdict.confidence * 1000) / 1000,
          peakVelocity: Math.round(verdict.peakVelocity * 10) / 10,
          severity: classifySeverity(verdict.peakVelocity),
          anomalyRatio: Math.round(verdict.anomalyRatio * 1000) / 1000,
          timestamp: new Date().toISOString(),
        },
      },
    ]);
    return true;
  } catch (err) {
    console.error('[intelligence] Vectorize upsert failed:', err);
    return false;
  }
}

/**
 * Query Vectorize for similar voice signatures.
 * Returns matches above minimum similarity threshold.
 */
export async function querySimilar(
  vectorize: VectorizeIndex,
  embedding: number[],
  options?: { topK?: number; minScore?: number; excludeId?: string }
): Promise<SimilarityMatch[]> {
  const topK = options?.topK ?? INTEL_CONFIG.SIMILARITY_TOP_K;
  const minScore = options?.minScore ?? INTEL_CONFIG.SIMILARITY_MIN_SCORE;

  try {
    const result = await vectorize.query(embedding, {
      topK: topK + 1, // +1 to account for self-match exclusion
      returnMetadata: 'all',
    });

    return result.matches
      .filter((m) => {
        if (options?.excludeId && m.id === options.excludeId) return false;
        return m.score >= minScore;
      })
      .slice(0, topK)
      .map((m) => ({
        reportId: (m.metadata?.reportId as string) || m.id,
        score: Math.round(m.score * 10000) / 10000,
        verdict: (m.metadata?.verdict as string) || 'UNKNOWN',
        confidence: (m.metadata?.confidence as number) || 0,
        peakVelocity: (m.metadata?.peakVelocity as number) || 0,
        timestamp: (m.metadata?.timestamp as string) || '',
      }));
  } catch (err) {
    console.error('[intelligence] Vectorize query failed:', err);
    return [];
  }
}

/**
 * Get Vectorize index stats (for /api/intelligence/stats).
 */
export async function getIndexStats(
  vectorize: VectorizeIndex
): Promise<{ dimensions: number; vectorCount: number } | null> {
  try {
    const info = await vectorize.describe();
    return {
      dimensions: info.dimensions,
      vectorCount: info.vectorCount,
    };
  } catch (err) {
    console.error('[intelligence] Vectorize describe failed:', err);
    return null;
  }
}

/**
 * Full embed-and-store pipeline (called via waitUntil after verdict).
 * Fail-open throughout — never throws, never blocks.
 */
export async function embedAndStore(
  env: Env,
  reportId: string,
  verdict: VerdictData
): Promise<{ embedded: boolean; stored: boolean }> {
  const result = { embedded: false, stored: false };

  if (!env.AI || !env.VECTOR_SIGNATURES) {
    console.warn('[intelligence] AI or Vectorize not bound — skipping embed');
    return result;
  }

  const embedding = await generateEmbedding(env.AI, verdict);
  if (!embedding) return result;
  result.embedded = true;

  const stored = await upsertSignature(env.VECTOR_SIGNATURES, reportId, embedding, verdict);
  result.stored = stored;

  console.log(`[intelligence] reportId=${reportId} embedded=${result.embedded} stored=${result.stored}`);
  return result;
}

// Export for testing / tuning
export { buildEmbeddingText, classifySeverity, classifyConfidence, classifyAnomalyRatio };
