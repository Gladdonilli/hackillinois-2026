# LARYNX State Audit — Pre-Intelligence Layer

**Date:** 2026-02-28 ~20:00 UTC  
**Audited by:** Oracle + Deep + Ultrabrain (parallel specialist agents)  
**Purpose:** Validate project state before adding CF Workers AI + Vectorize + AI Gateway + Supermemory

---

## Current Disk State

### JJ History
- **Working copy:** `omwtpxlk` (no description), parent: `qnyzsqor` main (auto checkpoint 19:36)
- **Working copy changes:** D `.sisyphus/ralph-loop.local.md`, M `overnight_pipeline.py`
- **Latest meaningful commits:** ElevenLabs audio recovery (1,993 files), training data merging, frontend landing page overhaul

### Infrastructure Status

| Component | Status | Details |
|-----------|--------|---------|
| Modal backend | ✅ Deployed | 3 endpoints: analyze, compare, health. `keep_warm=1` on A100 |
| CF Worker | ✅ Deployed | `https://larynx-api.tianyi35.workers.dev`, 436 lines, Hono |
| D1 database | ⚠️ Empty | Provisioned (`larynx-analysis`) but **NO TABLES** — migration never run |
| R2 bucket | ✅ Provisioned | `larynx-audio` |
| DNS | ⏳ Propagating | `voxlarynx.tech` → Cloudflare nameservers |
| Frontend | 🔧 In Progress | Separate session, ~75% complete |

---

## Spec vs Reality Gaps (Prioritized)

### 🔴 CRITICAL

#### 1. D1 Schema Mismatch
- **Spec (ARCHITECTURE.md):** `analyses` table
- **Migration (0000_init.sql):** Creates `analyses` table (wrong columns, no report_id/classifier fields)
- **Code (index.ts):** Expects `analysis_reports` table (14 columns including classifier_score, ensemble_score)
- **schema.sql:** Has CORRECT schema matching code
- **D1 state:** **NO TABLES EXIST**
- **Fix:** Create `0001_analysis_reports.sql` from `schema.sql`, execute via wrangler

### 🟠 HIGH — API Flow Divergence

#### 2. Endpoint Architecture
- **Spec:** POST `/api/analyze` returns `{jobId}`, then GET `/api/stream/{jobId}` opens SSE
- **Reality:** POST `/api/analyze` streams SSE **directly** from response body
- **Impact:** Frontend must connect to reality (POST → SSE), not spec. Spec is aspirational.

#### 3. SSE Event Names
| Spec Event | Reality Event | Notes |
|------------|--------------|-------|
| `mel_ready` | — | Never implemented |
| `formants_extracted` | — | Never implemented |
| `velocity_computed` | — | Never implemented |
| `anomaly_detected` | — | Never implemented |
| `verdict_ready` / `complete` | `verdict` | Different name |
| — | `progress` | Not in spec (step/progress/message) |
| — | `frame` | Not in spec (EMA sensor data per frame) |
| — | `heartbeat` | Not in spec (15s keepalive) |
| — | `error` | Not in spec |

#### 4. Verdict Shape
```
// Spec (ARCHITECTURE.md):
{ label: 'GENUINE'|'DEEPFAKE', confidence, maxVelocity, anomalyFrames, totalFrames, violations[] }

// Reality (app.py):
{ isGenuine: bool, confidence, peakVelocity, threshold, anomalousFrameCount, totalFrameCount, anomalyRatio, classifierScore?, classifierModel?, ensembleScore? }
```

#### 5. Missing Spec Endpoint
- GET `/api/ema/{jobId}` — defined in ARCHITECTURE.md, never implemented anywhere

### 🟡 MEDIUM

#### 6. Missing Frontend Components
- `HistoryPanel` — referenced in ARCHITECTURE.md component tree, does not exist
- `AnalysisList` — referenced, does not exist

#### 7. MODAL_COMPARE_URL Missing from wrangler.toml
- `types.ts` declares it as required in `Env`
- `wrangler.toml` doesn't set it
- **Mitigated:** Line 304 of index.ts has fallback: `c.env.MODAL_COMPARE_URL || c.env.MODAL_API_URL.replace('analyze', 'compare')`

#### 8. Classifier Model Path
- `classifier.py` loads from `backend/` root first, then `backend/training_data/`
- `classifier_model.pkl` (104KB) exists at `backend/` root ← **this is what gets loaded**
- `ensemble_model.pkl` (860KB) exists at `backend/training_data/` ← **loaded as fallback**
- **Risk:** The 104KB model may be older/worse than the 860KB ensemble. Verify which is current.

### 🟢 PASSED

| Check | Status |
|-------|--------|
| Velocity thresholds (config.py vs ARCHITECTURE.md) | ✅ Match exactly |
| CORS origins (Worker + Modal) | ✅ pages.dev, voxlarynx.tech, localhost:5173 |
| cf-types.d.ts (D1/R2 declarations) | ✅ Correct |
| TODO/FIXME/HACK in source | ✅ Zero in production code |
| Rate limiter (graceful degradation) | ✅ Optional binding, skips if absent |
| ApiResponse<T> envelope | ✅ All Worker routes use it |

---

## Embedding Strategy Decision

### Context
We need to store voice analysis results in Vectorize for similarity search. Three options evaluated:

### Option A: Text Embeddings via Workers AI ← **SELECTED**
- Use `@cf/baai/bge-base-en-v1.5` (768-dim) with categorical token binning
- Template: `"Voice analysis verdict: {label} detected with {confidence_band} confidence ({pct}%). Articulatory severity: {severity}. Peak tongue velocity {vel} cm/s against threshold {thresh} cm/s. {anomalous} of {total} frames anomalous ({ratio}% ratio)."`
- Severity bands: critical (>80cm/s), high (>40), moderate (>20), normal
- Confidence bands: high (>0.8), medium (>0.5), low

### Option B: Direct Numeric Vectors (108-dim classifier features)
- Oracle's recommendation for mathematical precision
- **Rejected:** Loses Workers AI product credit (drops to 6 CF products, below 7 target)

### Option C: Hybrid (text + numeric metadata)
- **Rejected:** Overcomplicated for hackathon, Vectorize metadata only supports equality/range filtering

### Rationale for Option A
- Oracle correctly noted BGE is a text model — numeric precision will be imprecise
- Ultrabrain overruled: hackathon judges won't test sub-cm/s fingerprint precision
- Similarity only needs to visually cluster deepfakes with deepfakes
- Workers AI product credit worth more than marginal precision gain
- Free tier math: ~10 demo embeddings vs 10K/day limit = 0.1% usage

---

## Corrected Implementation Plan

### Wave 1: D1 Migration (5 min, zero risk)
1. Create `migrations/0001_analysis_reports.sql` from `src/schema.sql`
2. Execute: `npx wrangler d1 execute larynx-analysis --remote --file=./migrations/0001_analysis_reports.sql`
3. Validate: `npx wrangler d1 execute larynx-analysis --remote --command="SELECT name FROM sqlite_master WHERE type='table'"`

### Wave 2: CF Intelligence Layer (additive, no degradation)
1. Create Vectorize index: `npx wrangler vectorize create larynx-signatures --dimensions=768 --metric=cosine`
2. Create AI Gateway: `npx wrangler ai-gateway create larynx-gateway`
3. Update `wrangler.toml`: add `[ai]` binding + `[[vectorize]]` binding
4. Update `types.ts`: add `AI: Ai`, `VECTOR_SIGNATURES: VectorizeIndex` to Env
5. Update `cf-types.d.ts`: add `Ai` and `VectorizeIndex` type declarations
6. Create `intelligence.ts`: embed generation (categorical binning → BGE → 768-dim), upsert, similarity query
7. Add routes: `POST /api/intelligence/similar`, `GET /api/intelligence/stats`
8. Wire auto-embed in `/api/analyze` verdict path via `c.executionCtx.waitUntil()` — non-blocking, fail-silent
9. Free-tier guardrails: skip-on-failure, console.error logging (visible in `wrangler tail`)

### Wave 3: Supermemory Forensic Integration
1. Create `supermemory.ts`: project-scoped memory write + search, fail-open with timeout
2. Wire forensic memory write after verdict via `waitUntil()` — never blocks SSE
3. Add/extend `/api/intelligence/similar` to fuse Vectorize + Supermemory results
4. Redaction: hash IP, no raw PII, compact verdict signature text

### Zero Degradation Guarantees
- Existing 5 routes **unchanged structurally**
- SSE passthrough loop untouched — side effects via `waitUntil()` only
- All new routes return `ApiResponse<T>` envelope
- AI/Vectorize/Supermemory failures **skip silently** — never fail `/api/analyze`

### Prize Coverage After Completion

| Product | Status |
|---------|--------|
| Workers | ✅ Deployed |
| Pages | ✅ (frontend) |
| D1 | ✅ After Wave 1 |
| R2 | ✅ Deployed |
| Workers AI | ✅ After Wave 2 |
| Vectorize | ✅ After Wave 2 |
| AI Gateway | ✅ After Wave 2 |
| **Total** | **7 CF products** ✓ |

---

## Open Items (Not Blocking Intelligence Layer)

1. **Reconcile ARCHITECTURE.md with reality** — spec doc is aspirational, not source of truth
2. **Verify classifier_model.pkl vs ensemble_model.pkl** — which is the current best model?
3. **Add MODAL_COMPARE_URL to wrangler.toml** — currently relies on string replacement fallback
4. **Frontend HistoryPanel/AnalysisList** — referenced in spec, not built yet
5. **VITE_OPENAI_API_KEY exposure risk** — referenced in STACK.md, Vite bundles VITE_-prefixed vars client-side
