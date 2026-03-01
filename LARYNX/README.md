# LARYNX

> Deepfake voice forensics that proves synthetic speech violates the physical laws of the human vocal tract.

**[Live Demo →](https://voxlarynx.tech)** · **[Devpost →](https://devpost.com/software/larynx)**

---

## The Problem

Deepfake voice cloning is indistinguishable to human ears. Current detectors are black-box classifiers that output a confidence score — "87% likely fake" — with no explanation. Judges, journalists, and forensic analysts can't act on a number. They need **evidence**.

LARYNX makes the physics visible. Instead of asking "is this fake?", it asks "is this **physically possible**?"

## How It Works

```
Audio (16kHz WAV)
  → HuBERT Large (Meta, self-supervised speech features)
    → Acoustic-to-Articulatory Inversion (Peter Wu, UC Berkeley)
      → 12D EMA trajectories at 200Hz (tongue tip, tongue body, tongue dorsum,
         jaw, upper lip, lower lip — x/y positions)
      → Articulatory Velocity (|Δposition/Δt| per articulator per frame)
        → 108 kinematic features (velocity, acceleration, jerk, cross-correlations)
        → HistGradientBoosting classifier (89.2% accuracy, 73 TTS architectures)
    → 3D Visualization (React Three Fiber)
      Real speech: smooth tongue animation, green velocity gauges
      Deepfake: tongue at 40+ cm/s → clips through skull → screen glitches red
```

## The Demo Moment

1. Upload a real voice recording → skull materializes in x-ray glass → tongue moves smoothly inside mouth → velocity gauges stay green (3-5 cm/s) → "This is how a human tongue moves."
2. Generate a deepfake LIVE using OpenAI TTS API with the same text → upload result → tongue ACCELERATES → velocity spikes to 40+ cm/s → tongue PUNCHES through the nasal cavity → screen glitches red → bloom spikes → bass drop → **"Your tongue would need to move at 40 centimeters per second. The physics are impossible."**

## Academic Basis

**USENIX Security 2022** — "Who Are You? A Statistical Approach to Measuring User Authenticity" (Logan Blue et al.)

Core insight: speech synthesis models optimize for acoustic plausibility (sounds right) but do NOT model articulatory physics (how the mouth actually moves). The kinematic constraints of the human vocal tract — mass, inertia, muscle speed limits — are a forensic invariant that synthetic speech cannot satisfy.

## Pipeline

**HuBERT + AAI (primary):** Audio → HuBERT Large (facebook/hubert-large-ll60k) extracts self-supervised speech features → Acoustic-to-Articulatory Inversion model (Peter Wu, UC Berkeley, Interspeech 2022 / ICASSP 2023) maps features to 12-dimensional EMA sensor positions (tongue tip, tongue body, tongue dorsum, jaw, upper/lower lip) at 200Hz → decimated to 100fps → velocity/acceleration/jerk computation → 108 kinematic features → HistGradientBoosting classifier.

**Training data:** 5,800+ samples across 73 TTS architectures (LibriSpeech real + deepfake-audio-detection + WaveFake + ElevenLabs dataset). StratifiedGroupKFold cross-validation to prevent speaker leakage.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 · React Three Fiber · Three.js · Zustand · GSAP · Tone.js · Tailwind CSS · Vite |
| **Worker** | Cloudflare Workers · Hono · D1 · R2 · Vectorize · AI |
| **Backend** | Python 3.11 · Modal (B200 GPU) · PyTorch 2.7 · HuBERT · AAI · scikit-learn |
| **TTS Engines** | OpenAI TTS-1 · Google Gemini TTS |
| **Hosting** | Cloudflare Pages (frontend) · Cloudflare Workers (API proxy) · Modal (GPU inference) |

## Sponsor Mapping

| Sponsor | Integration |
|---------|-----------|
| **Modal** | B200 GPU inference — HuBERT + AAI articulatory inversion pipeline, real-time SSE streaming |
| **Cloudflare** | Pages (frontend hosting), Workers (SSE API proxy + routing), D1 (analysis history), R2 (audio storage), Vectorize (voice signature similarity), AI Gateway |
| **OpenAI** | Generate deepfake samples LIVE during demo via TTS-1 API |

## Track

**Modal** — self-hosted PyTorch on B200 GPU. HuBERT feature extraction + articulatory inversion + classifier inference.

## Accuracy

**89.2%** — HistGradientBoosting ensemble trained on 108 articulatory kinematic features across 73 TTS architectures. Validated with StratifiedGroupKFold (no speaker leakage).

## Repo Structure

```
LARYNX/
├── frontend/           React 18 + R3F + Tone.js frontend
│   └── src/
│       ├── components/ UI + 3D visualization (LandingScene, AnalysisView, CompareView)
│       ├── hooks/      useAnalysisStream (SSE), useComparisonStream
│       ├── store/      Zustand state (analysis frames, verdicts, UI state)
│       └── audio/      SoundEngine (IEC alarms, Geiger counter, sonification)
├── worker/             Cloudflare Worker (Hono SSE proxy → Modal)
│   └── src/index.ts    Routes: /api/analyze, /api/compare, /api/generate-and-compare, /api/transcribe
├── backend/            Modal serverless GPU inference
│   ├── app.py          FastAPI endpoints on Modal
│   ├── gpu_inference.py HuBERT → AAI → 108-feature classifier (B200 GPU)
│   ├── tts_clients.py  OpenAI + Gemini TTS generation
│   └── training_data/  ensemble_model.pkl (HistGradientBoosting, 89.2%)
├── CREDITS.md          Full attribution table
└── DEMO-SCRIPT.md      3-minute demo walkthrough
```

## Development Tools & AI Disclosure

I used AI-assisted development tools throughout this project to accelerate iteration and handle boilerplate:

- **OpenCode** — AI-powered development environment with customly refined plugins and tooling not available to the public. Used for rapid full-stack iteration, debugging, deployment automation, and documentation.
- **GitHub Copilot** — Inline code completion during development.

**What the tools helped with:** Scaffolding React components, writing Cloudflare Worker routing, CSS animation tuning, deployment scripting, documentation.

**What I built:** The core scientific approach (articulatory physics for deepfake detection), the HuBERT→AAI→classifier pipeline architecture, the 108-feature kinematic feature set, the training data curation across 73 TTS architectures, the 3D vocal tract visualization concept, the IEC-compliant medical alarm sonification design, and all research and experimental decisions.

The tools made me faster. The ideas, the science, and the system design are mine.

## Team

Solo project. Built at HackIllinois 2026.
