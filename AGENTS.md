# PROJECT KNOWLEDGE BASE

**Project:** HackIllinois 2026 — Parallel Track Hackathon Build
**Updated:** 2026-02-28

## OVERVIEW

Two parallel hackathon projects sharing infrastructure: **LARYNX** (deepfake voice detection via articulatory physics) and **SYNAPSE** (LLM mechanistic interpretability via SAE neural surgery). Decision gate at T-12h kills the weaker track based on core demo loop viability.

## STRUCTURE

```
hackillinois/
├── LARYNX/              # Track 1: voice deepfake detection (formant→tongue velocity→3D skull clip)
├── SYNAPSE/             # Track 2: LLM neural surgery (SAE ablation/steering→3D neuron graph)
├── shared/              # Cross-track contracts, infra configs, runbooks, decision gate
│   ├── contracts/       # ApiResponse<T> envelope, SSE schemas, shared TypeScript interfaces
│   ├── decision-gate/   # T-12h-GATE.md — 5-dimension /25 scorecard
│   ├── infra/           # Modal app layout (single App, two processors), frontend perf rules
│   └── runbooks/        # BOOTSTRAP.md (smoke tests), demo-day-checklist.md
├── research/            # Sound design (LARYNX + SYNAPSE), SYNAPSE architecture research
├── competitive-intel/   # 13 competitor dossiers from Discord #find-a-team
├── _intel/              # Ideation sweep outputs (deep/artistry/ultrabrain analyses)
├── scripts/             # auto-push.sh (5-min interval backup to GitHub)
├── ATTENDEE_GUIDE.md    # Logistics, shuttles, food, WiFi
└── RESOURCES.md         # API keys, Figma, Modal credits, CF config
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Understand a track's architecture | `{TRACK}/ARCHITECTURE.md` | Source of truth: data flow, APIs, component tree |
| Check dependency versions | `{TRACK}/STACK.md` | Pinned versions — do NOT upgrade without checking compat |
| See what's not built yet | `{TRACK}/TODO-FRONTEND.md` | Implementation gap lists |
| Understand demo choreography | `{TRACK}/DEMO-SCRIPT.md` | Timestamped 3-min narratives |
| API contract format | `shared/contracts/api-common.md` | ALL responses use `{success, data, error}` envelope |
| Modal backend layout | `shared/infra/modal/modal-app-layout.md` | Single `modal.App`, two processor classes |
| Frontend perf rules | `shared/infra/frontend/perf-rules.md` | 8 rules — NEVER useState for animation |
| Decision gate criteria | `shared/decision-gate/T-12h-GATE.md` | 5-dimension scorecard, loser gets keep_warm=0 |
| Bootstrap from scratch | `shared/runbooks/BOOTSTRAP.md` | Prerequisites, smoke tests, known-good assets |
| Competitor analysis | `competitive-intel/` | Tier 1-3 threats with GitHub/Devpost profiles |

## CONVENTIONS

- **API envelope**: Every endpoint returns `ApiResponse<T>` = `{ success: boolean, data?: T, error?: string }`
- **SSE streaming**: Progress events use `event: progress\ndata: {step, progress, message}\n\n` format
- **Animation state**: Zustand transient store (`useStore.getState()`) or `useRef`. **NEVER `useState`** for per-frame data
- **Modal backend**: Single `modal.App("hackillinois")` with separate processor classes per track. Shared `/model-cache` volume. `keep_warm=1` on active track
- **Versions**: Pin exact versions in STACK.md. Key constraints: `transformer-lens==2.8.1` (not latest — sae-lens compat), `sae-lens==4.1.1`, `modal==1.3.4`
- **Desktop only**: Both tracks target min-width 1280px. No responsive mobile

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** expose API keys client-side (Vite bundles `VITE_`-prefixed vars into JS). Route through CF Worker
- **NEVER** use `vLLM` — fused CUDA kernels block Python `register_forward_hook()` needed for steering
- **NEVER** use live microphone in demo — 80dB hall noise kills formant extraction. Pre-recorded audio only
- **NEVER** `gsap.to()` for real-time data streams — use `gsap.quickTo()` (4x faster)
- **NEVER** instantiate Tone.js inside React components — module-scoped singletons only (HMR duplication)
- **NEVER** upgrade TransformerLens past 2.8.1 without verifying sae-lens 4.1.1 compatibility

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

## NOTES

- **VCS**: JJ-colocated repo. `synapse` bookmark = working branch. `main` = last stable. No `git add` — working copy IS the commit
- **Remote**: `Gladdonilli/hackillinois-2026` (private)
- **Identity**: Gladdonilli / tianyi35@illinois.edu
- **Strategy**: Modal track (not Stripe). Both projects are fundamentally GPU inference
- **Primary threat**: Aryan Keluskar (3x Modal track winner), Krish Golcha (HackPrinceton Overall Winner)
