# PROJECT KNOWLEDGE BASE

**Project:** HackIllinois 2026 — LARYNX (Deepfake Voice Detection via Articulatory Physics)
**Updated:** 2026-02-28 (Sound Phase 2)

## OVERVIEW

**LARYNX** detects deepfake voices by reverse-engineering articulatory physics from audio — mapping formant trajectories to tongue/jaw kinematics, then flagging physically impossible velocities. The "money shot" is a 3D skull visualization where the tongue clips through bone at 184 cm/s. Targeting the **Modal: Best AI Inference** track.

## STRUCTURE

```
hackillinois/
├── LARYNX/              # Voice deepfake detection (formant→tongue velocity→3D skull clip)
│   ├── backend/         # Modal pipeline, classifier, SSE endpoint
│   └── frontend/        # R3F + Zustand + GSAP + Tone.js cinematic UI
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

## NOTES

- **VCS**: JJ-colocated repo. `synapse` bookmark = working branch (legacy name, still LARYNX code). `main` = last stable. No `git add` — working copy IS the commit
- **Remote**: `Gladdonilli/hackillinois-2026` (private)
- **Identity**: Gladdonilli / tianyi35@illinois.edu
- **Strategy**: Modal track. LARYNX is fundamentally GPU inference (AAI model) — perfect fit for sponsor track
- **Primary threat**: Aryan Keluskar (3x Modal track winner), Krish Golcha (HackPrinceton Overall Winner)
