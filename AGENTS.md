# PROJECT KNOWLEDGE BASE

**Project:** HackIllinois 2026 — LARYNX (Deepfake Voice Detection via Articulatory Physics)
**Updated:** 2026-03-01

## OVERVIEW

**LARYNX** detects deepfake voices by reverse-engineering articulatory physics from audio — mapping formant trajectories to tongue/jaw kinematics, then flagging physically impossible velocities. The "money shot" is a 3D skull visualization where the tongue clips through bone at 184 cm/s. Targeting the **Modal: Best AI Inference** track.

## STRUCTURE

```
hackillinois/
├── LARYNX/              # Voice deepfake detection (formant→tongue velocity→3D skull clip)
│   ├── backend/         # Modal pipeline, classifier, SSE endpoint (13 .py files)
│   ├── frontend/        # R3F + Zustand + GSAP + Tone.js cinematic UI (39 components)
│   └── worker/          # CF Worker (Hono) — API proxy, D1, R2, Vectorize, AI Gateway
├── SYNAPSE/             # [ARCHIVED] — decision gate chose LARYNX, do not modify
├── shared/              # Infrastructure configs, runbooks, API contracts
│   ├── contracts/       # ApiResponse<T> envelope, SSE schemas, TypeScript interfaces
│   ├── decision-gate/   # T-12h-GATE.md — completed, LARYNX selected
│   ├── infra/           # Modal app layout, frontend perf rules
│   └── runbooks/        # BOOTSTRAP.md (smoke tests), demo-day-checklist.md
├── research/            # Sound design, architecture research
├── competitive-intel/   # 13 competitor dossiers from Discord #find-a-team
├── _intel/              # Ideation sweep outputs, archived code
├── scripts/             # Utility scripts
├── Macroscope.md        # CI bot config — DO NOT DELETE
├── package.json         # Root shim (build delegates to LARYNX/frontend)
├── ATTENDEE_GUIDE.md    # Logistics, shuttles, food, WiFi
└── RESOURCES.md         # API keys, Figma, Modal credits, CF config
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Understand LARYNX architecture | `LARYNX/ARCHITECTURE.md` | Source of truth: data flow, APIs, component tree |
| Check dependency versions | `LARYNX/STACK.md` | Pinned versions — do NOT upgrade without checking compat |
| See what's not built yet | `LARYNX/TODO-FRONTEND.md` | Implementation gap lists |
| Understand demo choreography | `LARYNX/DEMO-SCRIPT.md` | Timestamped 3-min narrative |
| API contract format | `shared/contracts/api-common.md` | ALL responses use `{success, data, error}` envelope |
| Modal backend layout | `shared/infra/modal/modal-app-layout.md` | Single `modal.App`, LARYNX processor class |
| Frontend perf rules | `shared/infra/frontend/perf-rules.md` | 8 rules — NEVER useState for animation |
| Decision gate criteria | `shared/decision-gate/T-12h-GATE.md` | Completed — LARYNX selected |
| Bootstrap from scratch | `shared/runbooks/BOOTSTRAP.md` | Prerequisites, smoke tests, known-good assets |
| Competitor analysis | `competitive-intel/` | Tier 1-3 threats with GitHub/Devpost profiles |

## LIVE DEPLOYMENT

| Service | URL | Notes |
|---------|-----|-------|
| Frontend (CF Pages) | `larynx.pages.dev` / `voxlarynx.tech` / `www.voxlarynx.tech` | Vite static build, deployed via `wrangler pages deploy dist`. Custom domains verified. |
| Worker API | `larynx-api.tianyi35.workers.dev` / `api.voxlarynx.tech` | Hono router, proxies to Modal |
| Modal Backend | `gladdonilli--larynx-analyze.modal.run` | POST only, SSE streaming |

### CF Products (7 — targeting $5K prize)

1. **Workers** — `larynx-api` (Hono, all API routes under `/api/`)
2. **D1** — `larynx-analysis` (analysis_reports table, 16 columns)
3. **R2** — `larynx-audio` (audio file storage)
4. **Workers AI** — AI binding (embeddings via `@cf/baai/bge-base-en-v1.5`)
5. **Vectorize** — `larynx-signatures` (768 dims, cosine metric)
6. **Pages** — `larynx.pages.dev` + custom domains `voxlarynx.tech`, `www.voxlarynx.tech` (static frontend)
7. **AI Gateway** — `larynx-gateway` (rate limiting, caching, logging)

### Frontend→Backend Wiring

```
CF Pages → CF Worker (/api/analyze, /api/compare, /api/history) → Modal SSE
```

- `VITE_API_URL` env var (in `.env`) = `https://larynx-api.tianyi35.workers.dev`
- `useAnalysisStream.ts` — POSTs to `${API_BASE}/api/analyze`
- `useComparisonStream.ts` — POSTs to `${API_BASE}/api/compare`
- `useLarynxStore.ts` fetchHistory — GETs `${API_BASE}/api/history`
- Fallback URL (if no env var): `https://larynx-api.tianyi35.workers.dev`

### Worker API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/analyze` | Start analysis (proxies to Modal, SSE) |
| POST | `/api/compare` | Start comparison (proxies to Modal, SSE) |
| GET | `/api/history` | List past analyses from D1 |
| GET | `/api/reports/:id` | Get specific report |
| POST | `/api/intelligence/similar` | Vectorize similarity search |
| GET | `/api/intelligence/stats` | Vectorize/gateway stats |

## CONVENTIONS

- **API envelope**: Every endpoint returns `ApiResponse<T>` = `{ success: boolean, data?: T, error?: string }`
- **SSE streaming**: Progress events use `event: progress\ndata: {step, progress, message}\n\n` format
- **Animation state**: Zustand transient store (`useStore.getState()`) or `useRef`. **NEVER `useState`** for per-frame data
- **Modal backend**: Single `modal.App("hackillinois-2026")` with `LarynxProcessor` class. Shared `/model-cache` volume. `min_containers=1`
- **Versions**: Pin exact versions in STACK.md. Key constraints: `modal==1.3.4`, `praat-parselmouth==0.4.5`, `librosa==0.10.2.post1`
- **Desktop only**: Min-width 1280px. No responsive mobile

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** expose API keys client-side (Vite bundles `VITE_`-prefixed vars into JS). Route through CF Worker
- **NEVER** use live microphone in demo — 80dB hall noise kills formant extraction. Pre-recorded audio only
- **NEVER** `gsap.to()` for real-time data streams — use `gsap.quickTo()` (4x faster)
- **NEVER** instantiate Tone.js inside React components — module-scoped singletons only (HMR duplication)
- **NEVER** use Tone.js `rampTo()` for frequency changes — internally uses `exponentialRampTo` which throws `RangeError` when current===target. Use `linearRampTo()` instead
- **NEVER** upgrade parselmouth without regression-testing formant extraction on known-good WAV samples
- **NEVER** use `useGLTF.preload()` with KTX2-compressed models — incompatible with custom loader config. facecap.glb requires KTX2Loader + basis transcoder WASM in `public/basis/`
- **NEVER** use `useRef(new THREE.Color())` inside useFrame or callbacks — React Rules of Hooks violation. All useRef at component top level only
- **NEVER** use `current += (target - current) * factor * delta` without clamping delta — tab throttling sends delta > 0.1, factor exceeds 1.0, causes NaN/Infinity corruption. Always `Math.min(delta, 0.1)`

## COMMANDS

```bash
# JJ (not git)
jj log                    # View history
jj describe -m "msg"      # Commit message
jj new                    # New change
jj git push               # Push to GitHub

# Deploy frontend to CF Pages
cd LARYNX/frontend && npx wrangler pages deploy dist/

# Build frontend
cd LARYNX/frontend && npx vite build

# Type check frontend
cd LARYNX/frontend && npx tsc --noEmit
```

## JJ CONFIG

```toml
# Raised for large training data files (aai_results.json ~25MB)
snapshot.max-new-file-size = 27000000  # 27MB (default 1MB)
```

**Note**: Files exceeding this limit are silently excluded from JJ snapshots.

## .GITIGNORE POLICY

**What gets pushed to GitHub (code, docs, configs, small artifacts):**
- `LARYNX/backend/*.py` — pipeline code, classifier, API
- `LARYNX/frontend/src/` — React components, shaders, stores
- `LARYNX/worker/` — CF Worker (Hono router, D1/R2/Vectorize/AI bindings)
- `LARYNX/frontend/public/` — static assets (facecap.glb is <1MB, OK)
- `LARYNX/*.md` — architecture docs, stack, demo script, todos
- `LARYNX/backend/training_data/ensemble_model.pkl` — trained model (<2MB, whitelisted)
- `shared/`, `competitive-intel/`, `research/`, `scripts/`, `_intel/`
- Top-level docs: `AGENTS.md`, `ATTENDEE_GUIDE.md`, `RESOURCES.md`, `Macroscope.md`
- Config files: `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.toml`

**What is .gitignored (NEVER push):**
- `LARYNX/backend/training_data/datasets/` — 14GB of WAVs
- `LARYNX/backend/training_data/audio/` — 270MB intermediate audio
- `LARYNX/backend/training_data/aai_results.json` — 52MB AAI inference results
- `LARYNX/backend/training_data/aai_results_checkpoint.json` — large checkpoint
- `LARYNX/backend/training_data/ema_outputs/` — EMA trajectory outputs
- `LARYNX/backend/classifier_model.pkl` — OLD superseded model
- `LARYNX/backend/csis_phase2_results.json` — research artifact
- `*.npy` — numpy debug artifacts
- `*.zip`, `*.tar.gz`, `*.tar.bz2` — raw dataset downloads
- `node_modules/`, `dist/`, `.vite/`, `.wrangler/` — build artifacts
- `__pycache__/`, `*.pyc` — Python bytecode
- `bun.lock` — wrong package manager
- `.env`, `.env.*` — secrets
- `.opencode/`, `.sisyphus/` — AI agent internal state
- `Dockerfile`, `nixpacks.toml` — abandoned Aedify configs

**If adding new large files**: Add to `.gitignore` BEFORE they get tracked by JJ.
Once JJ snapshots a file, it's in git objects — removing requires `jj file untrack <path>`.

## NOTES

- **VCS**: JJ-colocated repo. `main` = primary branch. No `git add` — working copy IS the commit
- **Remote**: `Gladdonilli/hackillinois-2026` (private)
- **Identity**: Gladdonilli / tianyi35@illinois.edu
- **Strategy**: Modal track. LARYNX is fundamentally GPU inference (AAI model) — perfect fit for sponsor track
- **Primary threat**: Aryan Keluskar (3x Modal track winner), Krish Golcha (HackPrinceton Overall Winner)
- **Model accuracy**: 76.75% CV (HistGradientBoostingClassifier, 108 features, trained on 43,210 balanced samples)
- **Visual polish**: convergence lines, mouth glow, teeth hiding, fog — exist on `visual-polish-isolated` branch (tkzuptzw), NOT yet merged to main

## TRAINING DATASET

**Location:** `/home/li859/datasets/larynx-5k/` (OUTSIDE repo — not tracked by JJ)

| Split | Count | Prefix Pattern | Source |
|-------|-------|---------------|--------|
| Real | 5,000 | `libri_*.wav` | LibriSpeech train-clean-100 (seed=42) |
| Fake | 1,102 | `elkey1_*.wav` | ElevenLabs multilingual_v2 |
| Fake | 891 | `elkey2_*.wav` | ElevenLabs flash_v2_5 |
| Fake | 3,007 | `wf_WF[1-7]_*.wav` | WaveFake (7 vocoders from HF `ajaykarthick/wavefake-audio`) |

**Format:** 16kHz mono 16-bit WAV, 2.8GB total
**Backup:** `/home/li859/datasets/larynx-merged/` (4,877 fake + 33,302 real, all sources)

## BROWSER VERIFICATION

Playwright MCP via `@playwright/mcp` connects to WSL Chrome via CDP. All rendering on WSL GPU.

```
VM (100.123.15.7) → WSL (100.102.224.118:9222) → Chrome 145 (127.0.0.1:9223)
```

**MANDATORY** after any frontend change. Build-green does NOT guarantee runtime rendering.

- **Vision mode** (default): PNG screenshots, pixel-coordinate clicks. Best for visual debugging.
- **Snapshot mode**: Accessibility tree text, element ref clicks. Best for functional testing.
- For WebGL/Canvas: screenshots + `look_at` (snapshot misses canvas content)
