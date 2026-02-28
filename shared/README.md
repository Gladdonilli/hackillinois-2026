# Shared Infrastructure

Shared infrastructure for **LARYNX** — deepfake voice detection via articulatory physics. SYNAPSE (LLM neural surgery) was evaluated at the T-12h decision gate and archived.

## What's Shared

| Component | Details |
|-----------|---------|
| **Modal Runtime** | Single Modal App, A100-80GB, `LarynxProcessor` class. `keep_warm=1`. |
| **Cloudflare** | Pages (frontend hosting), Workers (API proxy), D1 (history DB), R2 (file storage) |
| **React Three Fiber** | `@react-three/fiber` + `drei` + `postprocessing` — 3D skull/tongue rendering |
| **GSAP** | Timeline choreography (macro), `quickTo()` for real-time data streams (micro) |
| **Motion** | UI panel animations only (AnimatePresence, springs). NEVER for canvas/3D. |
| **Zustand** | State management. Transient subscriptions (`getState()`) for animation. NEVER `useState` in render loop. |
| **Vite + TypeScript** | Build tooling, strict types, no `any` |
| **API Conventions** | JSON envelope, SSE format, error codes — see `contracts/api-common.md` |

## LARYNX-Specific

| Component | Details |
|-----------|---------|
| **ML Pipeline** | AAI model (Wav2Vec2 backbone) → EMA prediction → tongue velocity analysis |
| **3D Scene** | Procedural cranium with tongue morph targets, skull-clip effect at high velocity |
| **API Endpoints** | `/api/analyze`, `/api/stream/{id}`, `/api/ema/{id}` |
| **Demo Narrative** | "Tongue clips through skull at 184 cm/s" |
| **Key Dependencies** | `praat-parselmouth`, `librosa`, `tone`, Peter Wu AAI weights |

## Directory Structure

```
shared/
├── README.md                          ← you are here
├── decision-gate/
│   └── T-12h-GATE.md                 ← completed: LARYNX selected
├── contracts/
│   └── api-common.md                 ← JSON envelope, SSE format, TS interfaces
├── infra/
│   ├── modal/
│   │   └── modal-app-layout.md       ← single app, LarynxProcessor, keep_warm policy
│   ├── cloudflare/                   ← deploy plan (future)
│   └── frontend/
│       └── perf-rules.md            ← non-negotiable animation performance rules
└── runbooks/
    ├── BOOTSTRAP.md                  ← prerequisites, smoke tests
    └── demo-day-checklist.md         ← 30-min pre-demo countdown
```
