# LARYNX — Subproject Knowledge Base

**Updated:** 2026-03-01

## WHAT IS LARYNX

Deepfake voice detection via articulatory physics. Audio in → formant extraction → tongue/jaw kinematics → flag physically impossible velocities → 3D skull visualization showing the impossibility.

**Core insight:** Real human articulators (tongue, jaw, lips) have biomechanical velocity limits (~20 cm/s for tongue tip). Deepfake generators don't model physics — their outputs imply articulatory movements that would require the tongue to clip through bone.

## ARCHITECTURE

```
Audio File (16kHz mono WAV)
    │
    ▼
┌─────────────────────────────────────────┐
│ Modal Backend (app.py)                  │
│                                         │
│ 1. Noise Gate (-40dB threshold)         │
│ 2. Formant Extraction (Praat-Burg 100Hz)│
│ 3. 5-frame median smoothing            │
│ 4. EMA Mapping (F1→jaw, F2→tongue)     │
│ 5. Velocity via np.diff                │
│ 6. Anomaly detection (>20 cm/s)        │
│ 7. Classifier (108 features → prob)    │
│ 8. Ensemble (0.6×formant + 0.4×ML)     │
│                                         │
│ SSE Events: progress → frame → verdict  │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ CF Worker (Hono)                        │
│ - Proxies SSE from Modal                │
│ - Intercepts verdict → D1 + R2 + Vec   │
│ - CORS: voxlarynx.tech, localhost:5173  │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ Frontend (React + R3F)                  │
│                                         │
│ State Machine:                          │
│ Intro → Idle → Uploading → Analyzing    │
│   → Complete → Compare → Technical      │
│   → Closing                             │
│                                         │
│ Portal: idle → entering → warping → done│
│ (Landing scene → Head model transition) │
└─────────────────────────────────────────┘
```

## BACKEND FILES

| File | Lines | Purpose |
|------|-------|---------|
| `app.py` | 367 | Modal App definition, FastAPI SSE endpoints (/analyze, /compare), image config |
| `pipeline.py` | 270 | Core analysis: noise gate → formant → EMA → velocity → anomaly |
| `classifier.py` | 232 | Loads ensemble_model.pkl, 108-feature extraction, probability output |
| `config.py` | 55 | Physics thresholds (T1: 20cm/s), Hz-to-mm mappings, audio constraints |
| `models.py` | 50 | Pydantic schemas: EMAFrame, Verdict, AnalysisProgress |
| `overnight_pipeline.py` | 894 | B200 GPU training pipeline, GroupKFold speaker-aware splits |
| `train_classifier.py` | 366 | HistGradientBoosting ensemble training script |
| `train_local.py` | 210 | Local CPU training alternative |
| `download_datasets.py` | 425 | LibriSpeech / WaveFake dataset download scripts |
| `rebuild_merged.py` | 460 | 5K balanced training set construction and verification |
| `csis_modal.py` | 461 | Alternative AAI model (Peter Wu / ICASSP '23) |
| `csis_validate.py` | 210 | Validation for CSIS approach |
| `__init__.py` | 0 | Package marker |

## FRONTEND STRUCTURE

```
src/
├── components/          # 39 files
│   ├── HeadModel.tsx    # R3F skull + morph targets
│   ├── TongueModel.tsx  # Animated tongue with velocity-driven color
│   ├── LandingScene.tsx # 387 lines — intro 3D scene with fog
│   ├── WaveformDisplay.tsx  # 392 lines — audio waveform visualization
│   ├── VelocityHUD.tsx  # 325 lines — real-time velocity graphs
│   ├── TechnicalDetailPanel.tsx  # 378 lines — detailed analysis view
│   ├── ConvergenceLines.tsx  # 8-beam TubeGeometry convergence effect
│   ├── MouthGlow.tsx    # Warm white emission ring
│   ├── PostProcessingEffects.tsx  # Vignette + noise
│   ├── IntroSequence.tsx  # Animated intro text
│   ├── UploadPanel.tsx  # File upload UI
│   ├── CompareView.tsx  # Side-by-side comparison
│   ├── ClosingScreen.tsx  # End state
│   └── ...              # Supporting components
├── hooks/               # 5 files
│   ├── useAnalysisStream.ts   # SSE POST to /api/analyze
│   ├── useComparisonStream.ts # SSE POST to /api/compare
│   └── ...
├── store/               # 2 files
│   └── useLarynxStore.ts  # Zustand transient store (status, frames, comparison, tongue state)
├── audio/               # 3 files
│   └── SoundEngine.ts   # Module-scoped Tone.js singleton
├── test-utils/          # 1 file
│   └── mockStore.ts     # Zustand mock with createMockState()
└── assets/              # Shaders, images
```

## FRONTEND CONVENTIONS

### State Management
- **Zustand transient store** — `useLarynxStore.ts` is the single source of truth
- **NEVER `useState`** for animation/per-frame data — use `useRef` or `useStore.getState()`
- Store selectors: `useLarynxStore((s) => s.field)` — NOT `useLarynxStore()`
- For mocking: `mockImplementation((sel) => sel ? sel(state) : state)`

### Animation
- **GSAP**: Use `gsap.quickTo()` for real-time streams, NOT `gsap.to()`
- **Tone.js**: Module-scoped singletons only. Never instantiate inside components (HMR duplication)
- **Tone.js frequency**: Use `linearRampTo()`, NEVER `rampTo()` (exponentialRampTo throws RangeError)
- **Delta clamping**: Always `Math.min(delta, 0.1)` before `current += (target - current) * factor * delta`
- **useRef placement**: ALL `useRef` calls at component top level, never inside useFrame/callbacks

### 3D (R3F)
- **Overlays**: `depthTest={false}` + `renderOrder` for anything in front of head mesh
- **Thick lines**: Use TubeGeometry with CatmullRomCurve3 (WebGL LineBasicMaterial lineWidth always 1px)
- **KTX2**: `useGLTF.preload()` incompatible with KTX2 — use custom loader config
- **Teeth hiding**: Traverse scene clone, set `child.visible = false` when `child.name === 'teeth'`

### Testing
- Vitest + React Testing Library
- Mock store via `src/test-utils/mockStore.ts`
- `vitest.config.ts` needs `mode: 'development'` (VM has NODE_ENV=production)
- `vitest.setup.ts` must set `process.env.NODE_ENV = 'test'`

## CLASSIFIER

- **Type**: HistGradientBoostingClassifier (lr=0.05, depth=8, 400 iterations)
- **Features**: 108 (6 articulators × 3 kinematic derivatives × 6 stats)
- **Accuracy**: 76.75% cross-validated (GroupKFold, speaker-aware)
- **Training data**: 43,210 real + 43,210 fake (balanced)
- **Model file**: `training_data/ensemble_model.pkl` (1.66MB, whitelisted in .gitignore)
- **Deepfake signature**: T1 (Tongue Tip) and F2 velocity jumps >22 cm/s

## VISUAL POLISH STATUS

The `visual-polish-isolated` branch (tkzuptzw) contains visual improvements NOT on main:
- ConvergenceLines: 8 TubeGeometry beams, cool white/silver HDR
- MouthGlow: warm white ring, emissiveIntensity 2.0
- LandingScene: tightened fog [#030305, 5, 25], Vignette+Noise post-processing
- Teeth hidden via scene traversal
- Period removed from "LARYNX." title

**These need merging to main before demo.**

## SOUND ENGINE

SoundEngine.ts is a module-scoped Tone.js singleton. The hardened version (1189 lines) exists on the `visual-polish` branch (wzlxmwkt) but may not be on main — verify before demo. The un-hardened version (1015 lines) is on `pipeline-run`/main.

To restore: `jj restore --from wzlxmwkt -- LARYNX/frontend/src/audio/SoundEngine.ts`
