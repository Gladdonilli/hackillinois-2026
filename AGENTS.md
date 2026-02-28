# PROJECT KNOWLEDGE BASE

**Project:** HackIllinois 2026 — LARYNX (Deepfake Voice Detection via Articulatory Physics)
**Updated:** 2026-02-28 (Deployment Sprint Complete)

## OVERVIEW

**LARYNX** detects deepfake voices by reverse-engineering articulatory physics from audio — mapping formant trajectories to tongue/jaw kinematics, then flagging physically impossible velocities. The "money shot" is a 3D skull visualization where the tongue clips through bone at 184 cm/s. Targeting the **Modal: Best AI Inference** track.

## STRUCTURE

```
hackillinois/
├── LARYNX/              # Voice deepfake detection (formant→tongue velocity→3D skull clip)
│   ├── backend/         # Modal pipeline, classifier, SSE endpoint
│   ├── frontend/        # R3F + Zustand + GSAP + Tone.js cinematic UI
│   └── worker/          # CF Worker (Hono) — API proxy, D1, R2, Vectorize, AI Gateway
├── SYNAPSE/             # [ARCHIVED] — decision gate chose LARYNX, do not modify
├── shared/              # Infrastructure configs, runbooks, API contracts
│   ├── contracts/       # ApiResponse<T> envelope, SSE schemas, TypeScript interfaces
│   ├── decision-gate/   # T-12h-GATE.md — completed, LARYNX selected
│   ├── infra/           # Modal app layout, frontend perf rules
│   └── runbooks/        # BOOTSTRAP.md (smoke tests), demo-day-checklist.md
├── research/            # Sound design, architecture research
├── competitive-intel/   # 13 competitor dossiers from Discord #find-a-team
├── _intel/              # Ideation sweep outputs (deep/artistry/ultrabrain analyses)
├── scripts/             # auto-push.sh (5-min interval backup to GitHub)
├── package.json         # Root shim for Aedify (delegates build to LARYNX/frontend)
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
| Frontend (CF Pages) | `larynx.pages.dev` / `voxlarynx.tech` | Vite static build, deployed via `wrangler pages deploy dist` |
| Worker API | `larynx-api.tianyi35.workers.dev` / `api.voxlarynx.tech` | Hono router, proxies to Modal |
| Modal Backend | `gladdonilli--larynx-analyze.modal.run` | POST only, SSE streaming |
| Aedify | Auto-deploys from GitHub | Container via Nixpacks, port 8000, root package.json shim |

### CF Products (7 — targeting $5K prize)

1. **Workers** — `larynx-api` (Hono, all API routes under `/api/`)
2. **D1** — `larynx-analysis` (analysis_reports table, 16 columns)
3. **R2** — `larynx-audio` (audio file storage)
4. **Workers AI** — AI binding (embeddings via `@cf/baai/bge-base-en-v1.5`)
5. **Vectorize** — `larynx-signatures` (768 dims, cosine metric)
6. **Pages** — `larynx.pages.dev` (static frontend)
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
- **Modal backend**: Single `modal.App("hackillinois")` with `LarynxProcessor` class. Shared `/model-cache` volume. `keep_warm=1`
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

## COMMANDS

```bash
# Auto-push backup (already running as PID, logs to /tmp/auto-push.log)
./scripts/auto-push.sh &

# JJ (not git)
jj log                    # View history
jj describe -m "msg"      # Commit message
jj new                    # New change
jj git push               # Push to GitHub
```

## JJ CONFIG

```toml
# Raised for large training data files (aai_results.json ~25MB)
snapshot.max-new-file-size = 27000000  # 27MB (default 1MB)
```

**Note**: Files exceeding this limit are silently excluded from JJ snapshots.
The `elevenlabs_dataset.zip` (314MB) is above this limit AND in `.gitignore` — doubly excluded.

## .GITIGNORE POLICY

**What gets pushed to GitHub (code, docs, configs, small artifacts):**
- `LARYNX/backend/*.py` — pipeline code, classifier, API
- `LARYNX/frontend/src/` — React components, shaders, stores
- `LARYNX/worker/` — CF Worker (Hono router, D1/R2/Vectorize/AI bindings)
- `LARYNX/frontend/public/` — static assets (facecap.glb is <1MB, OK)
- `LARYNX/*.md` — architecture docs, stack, demo script, todos
- `LARYNX/backend/training_data/ensemble_model.pkl` — trained model (<1MB, whitelisted)
- `shared/`, `competitive-intel/`, `research/`, `scripts/`, `_intel/`
- Top-level docs: `AGENTS.md`, `ATTENDEE_GUIDE.md`, `RESOURCES.md`
- Config files: `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.toml`

**What is .gitignored (NEVER push):**
- `LARYNX/backend/training_data/datasets/` — 14GB of WAVs (merged/real, merged/fake, intermediate dirs)
- `LARYNX/backend/training_data/audio/` — 270MB intermediate audio
- `LARYNX/backend/training_data/aai_results.json` — 52MB AAI inference results
- `LARYNX/backend/training_data/aai_results_checkpoint.json` — large checkpoint
- `LARYNX/backend/training_data/ema_outputs/` — EMA trajectory outputs
- `*.zip`, `*.tar.gz`, `*.tar.bz2` — raw dataset downloads
- `node_modules/`, `dist/`, `.vite/`, `.wrangler/` — build artifacts
- `__pycache__/`, `*.pyc` — Python bytecode
- `.env`, `.env.*` — secrets

**If adding new large files**: Add to `.gitignore` BEFORE they get tracked by JJ.
Once JJ snapshots a file, it's in git objects — removing it from `.gitignore` later
requires `jj file untrack <path>` and history rewriting to avoid pushing bloated commits.

## NOTES

- **VCS**: JJ-colocated repo. `main` = primary branch. `synapse` bookmark exists on GitHub (legacy, research docs only). No `git add` — working copy IS the commit
- **Remote**: `Gladdonilli/hackillinois-2026` (private)
- **Identity**: Gladdonilli / tianyi35@illinois.edu
- **Strategy**: Modal track. LARYNX is fundamentally GPU inference (AAI model) — perfect fit for sponsor track
- **Primary threat**: Aryan Keluskar (3x Modal track winner), Krish Golcha (HackPrinceton Overall Winner)

## AGENT-BROWSER SETUP

Remote CDP architecture — zero Chromium on VM:

```
VM (100.123.15.7)  →  WSL (100.102.224.118:9222)  →  Chrome 145 (127.0.0.1:9223)
  agent-browser          Node TCP proxy                headless, --no-sandbox
```

- **Chrome**: WSL host `gladdoncope2`, port 9223, `--no-sandbox` required for WSL
- **Proxy**: `~/.local/bin/cdp-proxy.mjs` on `0.0.0.0:9222` → `127.0.0.1:9223` (Chrome 145 ignores `--remote-debugging-address`)
- **Auto-start**: Both Chrome and proxy start from WSL bashrc on new interactive shells
- **VM wrapper**: `~/.local/bin/agent-browser` auto-injects `--cdp ws://100.102.224.118:9222`
- **Env var**: `AGENT_BROWSER_CDP_HOST=100.102.224.118` in VM bashrc
- All rendering uses WSL GPU. No socat (no sudo), hence Node proxy.
