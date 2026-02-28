# Shared Infrastructure

Two parallel hackathon tracks — **LARYNX** and **SYNAPSE** — sharing common infrastructure. Decision gate at **T-12h** determines which track gets all remaining effort.

## What's Shared

| Component | Details |
|-----------|---------|
| **Modal Runtime** | Single Modal App, A100-80GB, two route classes (one per project). `keep_warm=1` for active, `0` for inactive. |
| **Cloudflare** | Pages (frontend hosting), Workers (API proxy), D1 (history DB), R2 (file storage) |
| **React Three Fiber** | `@react-three/fiber` + `drei` + `postprocessing` — 3D rendering for both scenes |
| **GSAP** | Timeline choreography (macro), `quickTo()` for real-time data streams (micro) |
| **Motion** | UI panel animations only (AnimatePresence, springs). NEVER for canvas/3D. |
| **Zustand** | State management. Transient subscriptions (`getState()`) for animation. NEVER `useState` in render loop. |
| **Vite + TypeScript** | Build tooling, strict types, no `any` |
| **API Conventions** | JSON envelope, SSE format, error codes — see `contracts/api-common.md` |

## What's Project-Specific

| Component | LARYNX | SYNAPSE |
|-----------|--------|---------|
| **ML Pipeline** | Formant extraction (parselmouth) → velocity analysis | TransformerLens → SAE → ActAdd steering |
| **3D Scene** | Sagittal-sliced skull with tongue morph targets | 5K-node brain graph with feature activation glow |
| **API Endpoints** | `/api/analyze`, `/api/stream/{id}`, `/api/ema/{id}` | `/api/generate`, `/api/features/{id}`, `/api/ablate`, `/api/steer` |
| **Demo Narrative** | "Tongue clips through skull at 184 cm/s" | "We lobotomized the sycophancy neuron" |
| **Key Dependencies** | `praat-parselmouth`, `librosa`, `tone` | `transformer-lens`, `sae-lens`, `d3-force-3d` |

## Decision Gate

At **T-12h before submission**, score both tracks on the rubric in `decision-gate/T-12h-GATE.md`. The winner gets all remaining development time. The loser's `keep_warm` drops to 0.

## Directory Structure

```
shared/
├── README.md                          ← you are here
├── decision-gate/
│   └── T-12h-GATE.md                 ← scoring rubric, hard kill rules
├── contracts/
│   └── api-common.md                 ← JSON envelope, SSE format, TS interfaces
├── infra/
│   ├── modal/
│   │   └── modal-app-layout.md       ← single app, two routes, keep_warm policy
│   ├── cloudflare/                   ← deploy plan (future)
│   └── frontend/
│       └── perf-rules.md            ← non-negotiable animation performance rules
└── runbooks/
    └── demo-day-checklist.md         ← 30-min pre-demo countdown
```
