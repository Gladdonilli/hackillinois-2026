# LARYNX — Project Knowledge

## OVERVIEW

Deepfake voice detection via articulatory physics. Real human tongues move at 15-20 cm/s; TTS-generated speech shows impossible velocities (80+ cm/s) because mel-loss optimization doesn't enforce kinematic constraints. The "wow moment" = tongue punches through skull in 3D visualization.

## DATA FLOW

```
Browser → CF Worker (R2 upload) → Modal (Parselmouth)
  → F1/F2 formants at 100fps → 50ms median filter → velocity calc
  → SSE stream → Zustand transient → useFrame (R3F morph targets)
                                    → GSAP (camera choreography)
                                    → Tone.js (velocity-reactive distortion)
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| System architecture + API shapes | ARCHITECTURE.md | 520 lines, source of truth |
| Pinned dependency versions | STACK.md | Modal 1.3.4, Parselmouth 0.4.5 |
| What needs building | TODO-FRONTEND.md | Tailwind/shadcn, GLB asset, shaders |
| Demo choreography | DEMO-SCRIPT.md | 3-min timestamped script |
| Risk mitigations | RISKS.md | Noise gate, dual-threshold, false positive prevention |
| Scientific basis | README.md | USENIX 2022 (Logan Blue), AAI→Formant pivot rationale |

## CONVENTIONS (LARYNX-SPECIFIC)

- **Formant preprocessing is MANDATORY**: noise gate at -40dB RMS → pitch filter rejecting <80Hz → 5-frame median filter (50ms at 100fps) on F1/F2 trajectories
- **Velocity thresholds per sensor** (cm/s): TT=20, TB=15, TD=12, UL=15, LL=18, JAW=10
- **Morph target mapping**: `Jaw_Drop = clamp(-Δy_JAW / 20mm)`, `Tongue_Out = Δx_T1 / 15mm`. Do NOT clamp at 1.0 — deepfake drives to 3.5+ for skull-clipping effect
- **3D asset pipeline**: ARKit 52-blendshape head → Blender Boolean sagittal slice → `npx gltfjsx --transform --types`
- **Material**: drei `MeshTransmissionMaterial` (transmission=0.9, chromaticAberration=0.5, thickness=2.5) for x-ray glass skull
- **Post-processing**: Scanline (density=1.5) + Bloom (0.2→2.5 on deepfake) + ChromaticAberration (0.002→0.05)

## ANTI-PATTERNS (LARYNX-SPECIFIC)

- **NEVER** use live microphone — >80dB ambient destroys formant extraction. Pre-recorded clean audio ONLY
- **NEVER** use forced phoneme alignment — TTS systems align phonemes perfectly, destroying the deepfake velocity signal
- **NEVER** skip formant preprocessing — raw Praat output on noisy audio generates false positives
- **NEVER** clamp morph targets at 1.0 — the skull-clipping wow factor requires 3.5+

## CRITICAL PATH

1. Validate F2 velocity gap: OpenAI TTS vs real voice via Parselmouth (30 min, no GPU)
2. Source + slice 3D head model (Blender, highest risk item)
3. Modal endpoint: audio → formants → velocity → SSE stream
4. R3F: morph target wiring + transmission material + post-processing
5. GSAP: demo timeline (reveal → zoom → clip → data overlay)

## STATUS

Spec-complete. Zero implementation code. Highest risk = Blender sagittal slice of ARKit head (asset pipeline). Scientific basis validated by review agents (184 cm/s IS reproducible on standard TTS).
