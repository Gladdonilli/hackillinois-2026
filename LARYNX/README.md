# LARYNX

> Deepfake voice forensics that proves synthetic speech violates the physical laws of the human vocal tract.

## The Problem

Deepfake voice cloning is indistinguishable to human ears. Current detectors are black-box classifiers that output a confidence score — "87% likely fake" — with no explanation. Judges, journalists, and forensic analysts can't act on a number. They need **evidence**.

LARYNX makes the physics visible. Instead of asking "is this fake?", we ask "is this **physically possible**?"

## How It Works

```
Audio (16kHz WAV)
  → F1/F2 Formant Extraction (parselmouth, 100fps)
    → Articulatory Parameter Mapping
      F1 → jaw openness (300Hz=closed, 900Hz=wide open)
      F2 → tongue position (800Hz=back, 2400Hz=front)
      F3 → lip rounding (proxy)
      pitch → voicing
    → Velocity Calculation (|ΔF/Δt| per articulator per frame)
    → Threshold Check (tongue tip max ~15-20 cm/s in humans)
    → 3D Visualization (React Three Fiber)
      Real speech: smooth tongue animation, green velocity gauges
      Deepfake: tongue at 184 cm/s → clips through skull → screen glitches red
```

## The Demo Moment

1. Upload a real voice recording → skull materializes in x-ray glass → tongue moves smoothly inside mouth → velocity gauges stay green (8-12 cm/s) → "This is how a human tongue moves."
2. Generate a deepfake LIVE using OpenAI TTS API with the same text → upload result → tongue ACCELERATES → velocity spikes to 184 cm/s → tongue PUNCHES through the nasal cavity → screen glitches red → bloom spikes → bass drop → **"Your tongue would need to move at 184 centimeters per second. That's faster than a rattlesnake strike. The physics are impossible."**

## Academic Basis

**USENIX Security 2022** — "Who Are You? A Statistical Approach to Measuring User Authenticity" (Logan Blue et al.)

Core insight: speech synthesis models optimize for acoustic plausibility (sounds right) but do NOT model articulatory physics (how the mouth actually moves). The kinematic constraints of the human vocal tract — mass, inertia, muscle speed limits — are a forensic invariant that synthetic speech cannot satisfy.

## Why Formants, Not Full AAI

We verified every acoustic-to-articulatory inversion (AAI) model available:
- `haoyunlf/aai` (Interspeech 2024) — training scripts only, **no pre-trained weights**
- `sarthaxxxxx/AAI-ALS` (ICASSP 2021) — training scripts only, **no pre-trained weights**
- HuggingFace — **zero** audio-to-EMA models exist

F1/F2 formant tracking via parselmouth/Praat is the gold standard in phonetics research. F1 inversely correlates with jaw openness of tongue, F2 with tongue advancement. Same physics, same demo impact, zero training time.

**DO NOT USE** forced phoneme alignment (MFA/WhisperX) — it quantizes into discrete phonemes, forcing smooth interpolation that destroys the deepfake signal.

## Sponsor Mapping

| Sponsor | Integration |
|---------|------------|
| **Modal** | A100 GPU inference — formant extraction + analysis pipeline |
| **Cloudflare** | Pages (frontend), Workers (API proxy), D1 (analysis history), R2 (audio storage) |
| **OpenAI** | Generate deepfake samples LIVE during demo via TTS API |
| **Supermemory** | Voice analysis history graph — forensic case journal |

## Track

**Modal** — self-hosted PyTorch on A100. Every component runs on Modal GPU.

## Confidence

**~75%** — Primary risk is formant instability on noisy/compressed audio producing false positives. Mitigated by noise gating, voiced-frame filtering, and temporal smoothing. Demo uses clean pre-recorded samples as backup.
