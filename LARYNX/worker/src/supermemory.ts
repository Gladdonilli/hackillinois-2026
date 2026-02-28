/**
 * LARYNX Forensic Memory — Supermemory Integration
 *
 * Stores voice analysis results as project-scoped forensic memories.
 * Enables recall: "have we seen this voice pattern before?"
 *
 * Uses Supermemory API directly from the Worker.
 * Fail-open throughout — never blocks the analyze flow.
 */

import type { Env, VerdictData, ForensicMemory } from './types';

// ─── Tunable Configuration ───
export const MEMORY_CONFIG = {
  // Supermemory API
  API_BASE: 'https://api.supermemory.ai',

  // Container tag for forensic memory isolation
  // All LARYNX forensic records are partitioned under this tag
  // within the existing Supermemory space (no separate space needed)
  CONTAINER_TAG: 'larynx-forensic',

  // Memory settings
  SCOPE: 'project' as const,
  TYPE: 'learned-pattern' as const,

  // Search settings
  SEARCH_LIMIT: 5,
  SEARCH_MIN_SCORE: 0.5,

  // Timeouts
  WRITE_TIMEOUT_MS: 5000,
  SEARCH_TIMEOUT_MS: 3000,

  // Severity labels (must match intelligence.ts bands)
  SEVERITY_LABELS: {
    critical: 'CRITICAL — physically impossible articulation',
    high: 'HIGH — extreme but borderline velocities',
    moderate: 'MODERATE — elevated articulatory stress',
    normal: 'NORMAL — within human articulatory limits',
  } as Record<string, string>,
};

// ─── Memory Content Builder ───

function classifySeverity(peakVelocity: number): string {
  if (peakVelocity > 80) return 'critical';
  if (peakVelocity > 40) return 'high';
  if (peakVelocity > 20) return 'moderate';
  return 'normal';
}

function buildForensicContent(reportId: string, verdict: VerdictData): string {
  const label = verdict.isGenuine ? 'GENUINE' : 'DEEPFAKE';
  const severity = classifySeverity(verdict.peakVelocity);
  const severityDesc = MEMORY_CONFIG.SEVERITY_LABELS[severity] || severity;
  const confPct = (verdict.confidence * 100).toFixed(1);
  const ratioPct = (verdict.anomalyRatio * 100).toFixed(1);
  const ts = new Date().toISOString();

  const parts = [
    `[FORENSIC] Voice Analysis Report ${reportId}`,
    `Timestamp: ${ts}`,
    `Verdict: ${label} (${confPct}% confidence)`,
    `Articulatory Assessment: ${severityDesc}`,
    `Peak tongue velocity: ${verdict.peakVelocity.toFixed(1)} cm/s (threshold: ${verdict.threshold.toFixed(1)} cm/s)`,
    `Anomalous frames: ${verdict.anomalousFrameCount}/${verdict.totalFrameCount} (${ratioPct}%)`,
  ];

  if (verdict.classifierScore != null) {
    parts.push(`Classifier: ${verdict.classifierModel || 'ensemble'} score ${verdict.classifierScore.toFixed(3)}`);
  }
  if (verdict.ensembleScore != null) {
    parts.push(`Ensemble score: ${verdict.ensembleScore.toFixed(3)}`);
  }

  return parts.join('. ') + '.';
}

// ─── IP Redaction ───

async function hashForPrivacy(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash).slice(0, 6))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Core Operations ───

/**
 * Store a forensic memory entry in Supermemory.
 * Returns the memory ID on success, null on failure.
 */
export async function writeForensicMemory(
  env: Env,
  reportId: string,
  verdict: VerdictData,
  _clientIpHash?: string
): Promise<string | null> {
  if (!env.SUPERMEMORY_API_KEY) {
    console.warn('[supermemory] API key not configured — skipping write');
    return null;
  }

  const content = buildForensicContent(reportId, verdict);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MEMORY_CONFIG.WRITE_TIMEOUT_MS);

    const response = await fetch(`${MEMORY_CONFIG.API_BASE}/v3/memories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPERMEMORY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, containerTag: MEMORY_CONFIG.CONTAINER_TAG }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown');
      console.error(`[supermemory] Write failed: ${response.status} ${errText}`);
      return null;
    }

    const result = await response.json() as { id?: string };
    console.log(`[supermemory] Stored forensic memory for ${reportId}: ${result.id}`);
    return result.id || null;
  } catch (err) {
    console.error('[supermemory] Write error:', err);
    return null;
  }
}

/**
 * Search Supermemory for similar forensic memories.
 * Returns matching memories above minimum score.
 */
export async function searchForensicMemories(
  env: Env,
  query: string,
  options?: { limit?: number }
): Promise<ForensicMemory[]> {
  if (!env.SUPERMEMORY_API_KEY) {
    console.warn('[supermemory] API key not configured — skipping search');
    return [];
  }

  const limit = options?.limit ?? MEMORY_CONFIG.SEARCH_LIMIT;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MEMORY_CONFIG.SEARCH_TIMEOUT_MS);

    const response = await fetch(
      `${MEMORY_CONFIG.API_BASE}/v3/memories/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPERMEMORY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit, containerTags: [MEMORY_CONFIG.CONTAINER_TAG] }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[supermemory] Search failed: ${response.status}`);
      return [];
    }

    const result = await response.json() as {
      results?: Array<{ id: string; content: string; score: number; createdAt: string }>;
    };

    return (result.results || [])
      .filter((r) => r.score >= MEMORY_CONFIG.SEARCH_MIN_SCORE)
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        content: r.content,
        score: Math.round(r.score * 10000) / 10000,
        createdAt: r.createdAt,
      }));
  } catch (err) {
    console.error('[supermemory] Search error:', err);
    return [];
  }
}

/**
 * Full forensic memory pipeline (called via waitUntil after verdict).
 * Fail-open — never throws, never blocks.
 */
export async function storeForensicRecord(
  env: Env,
  reportId: string,
  verdict: VerdictData,
  clientIpHash?: string
): Promise<{ stored: boolean; memoryId: string | null }> {
  const memoryId = await writeForensicMemory(env, reportId, verdict, clientIpHash);
  return { stored: memoryId !== null, memoryId };
}

// Export for testing
export { buildForensicContent, classifySeverity };
