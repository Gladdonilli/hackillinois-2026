# LARYNX Integration API Reference

> **For the frontend session** — everything needed to wire UI to the live backend.
> Last updated: Feb 28, 2026 (mid-hackathon)

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│   Frontend   │────▶│   CF Worker       │────▶│   Modal Backend          │
│  (Vite+R3F)  │◀────│ api.voxlarynx.tech│◀────│ hackillinois-2026        │
│  :5173       │ SSE │   D1 logging      │ SSE │ larynx-analyze (GPU)     │
└─────────────┘     └──────────────────┘     └─────────────────────────┘
```

**Data flow**: User drops audio → Frontend posts FormData → CF Worker proxies to Modal → Modal streams SSE (progress → frames → verdict) → Frontend Zustand store → R3F 3D animation

---

## Endpoints

### 1. `POST /` — Single File Analysis

**Modal label**: `larynx-analyze`
**Direct URL**: `https://gladdonilli--larynx-analyze.modal.run/`
**Dev URL**: `https://gladdonilli--larynx-analyze-dev.modal.run/`
**Via CF Worker**: `https://api.voxlarynx.tech/analyze` (preferred)

**Request**:
```
Content-Type: multipart/form-data

file: <binary WAV/MP3/FLAC/OGG, max 10MB>
```

**Response**: `text/event-stream` (SSE)

**Resource config**: CPU=2, Memory=2048MB, Timeout=300s, min_containers=1, max_inputs=10

---

### 2. `POST /` — Two-File Comparison

**Modal label**: `larynx-compare`
**Direct URL**: `https://gladdonilli--larynx-compare.modal.run/`
**Via CF Worker**: `https://api.voxlarynx.tech/compare`

**Request**:
```
Content-Type: multipart/form-data

file_a: <binary audio, max 10MB>
file_b: <binary audio, max 10MB>
```

**Response**: `text/event-stream` (SSE) with channel-prefixed events

**Resource config**: CPU=2, Memory=2048MB, Timeout=600s

---

### 3. `GET /` — Health Check

**Modal label**: `larynx-health`
**URL**: `https://gladdonilli--larynx-health.modal.run/`

**Response**:
```json
{
  "success": true,
  "data": {
    "service": "larynx",
    "status": "healthy",
    "timestamp": "2026-02-28T12:00:00Z"
  }
}
```

---

## SSE Event Schema

All events follow: `event: <type>\ndata: <JSON>\n\n`

### `progress` — Processing stage updates

```json
{
  "step": "formant_extraction" | "articulatory_mapping" | "velocity_analysis" | "classification",
  "progress": 0.0-1.0,
  "message": "Extracting formant trajectories..."
}
```

**Steps in order**: `loading` → `formant_extraction` → `articulatory_mapping` → `velocity_analysis` → `classification` → done

### `frame` — EMA frame data (streamed per-frame, ~100fps)

```json
{
  "sensors": {
    "T1": { "x": 12.5, "y": -3.2, "velocity": 18.7 },
    "T2": { "x": 10.0, "y": -2.6, "velocity": 15.1 },
    "T3": { "x": 6.0,  "y": -1.5, "velocity": 11.3 },
    "JAW": { "x": 0.0, "y": -8.1, "velocity": 5.2 },
    "UL":  { "x": 0.0, "y": 2.3,  "velocity": 3.1 },
    "LL":  { "x": 0.0, "y": -4.5, "velocity": 7.8 }
  },
  "tongueVelocity": 15.03,
  "timestamp": 0.42,
  "isAnomalous": false
}
```

**Sensor names**: `T1` (tongue tip), `T2` (tongue body), `T3` (tongue dorsum), `JAW`, `UL` (upper lip), `LL` (lower lip)

**Units**: x/y in mm, velocity in cm/s, timestamp in seconds

**Anomaly thresholds** (cm/s): T1=20, T2=15, T3=12, JAW=10, UL=15, LL=18

### `verdict` — Final classification result

```json
{
  "isGenuine": false,
  "confidence": 0.94,
  "peakVelocity": 184.2,
  "threshold": 22.0,
  "anomalousFrameCount": 47,
  "totalFrameCount": 312,
  "anomalyRatio": 0.1506,
  "classifierScore": 0.87,
  "classifierModel": "HistGradientBoosting",
  "ensembleScore": 0.91
}
```

**Scoring**: `ensembleScore = 0.6 × formant_confidence + 0.4 × classifierScore`

- `confidence`: Physics-based anomaly confidence (formant velocity analysis)
- `classifierScore`: ML classifier probability of deepfake (from ensemble_model.pkl)
- `ensembleScore`: Blended final score
- `isGenuine`: true if ensembleScore < 0.5
- `threshold`: ABSOLUTE_MAX_VELOCITY = 22 cm/s (human biomechanical limit)

### `heartbeat` — Keep-alive (every 15s)

```json
{ "timestamp": "2026-02-28T12:00:15Z" }
```

### `error` — Processing failure

```json
{
  "message": "Audio file too short for analysis",
  "code": "PROCESSING_ERROR"
}
```

---

## Comparison-Specific Events

For the `/compare` endpoint, events are prefixed with channel:

### `frame_0` / `frame_1` — Channel-specific frames

Same schema as `frame` but with `event: frame_0` or `event: frame_1`.

### `verdict_0` / `verdict_1` — Per-channel verdicts

Same schema as `verdict`.

### `comparison` — Final comparison summary

```json
{
  "summary": {
    "velocityDelta": 162.5,
    "confidenceDelta": 0.88,
    "verdict": "Channel B shows physically impossible articulatory velocities"
  }
}
```

---

## Frontend Integration Points

### Environment Variables

```env
# .env (Vite)
VITE_API_URL=https://api.voxlarynx.tech

# Fallback (hardcoded in useAnalysisStream.ts)
# https://gladdonilli--larynx-analyze-dev.modal.run
```

### Zustand Store (`useLarynxStore.ts`)

**Key state fields consumed by UI components**:

| Field | Type | Updated by | Consumed by |
|-------|------|-----------|-------------|
| `status` | `AnalysisStatus` | SSE events | App.tsx (view routing), all components |
| `frames` | `EMAFrame[]` | `frame` events via `addFrame()` | 3D skull animation, WaveformDisplay |
| `tongueVelocity` | `number` | Each frame | VelocityGauge, post-processing intensity |
| `tongueT1` | `{x, y}` | Each frame (T1 sensor) | Tongue morph target positioning |
| `verdict` | `Verdict \| null` | `verdict` event | VerdictPanel |
| `progress` | `{message, percent}` | `progress` events | Upload progress indicator |
| `comparison` | `{channelFrames, channelVerdicts, comparisonSummary}` | Compare events | CompareView |
| `portalState` | state enum | Transitions | LandingScene → Analysis warp |

### Status Flow

```
idle → uploading → analyzing → complete
                              → comparing → complete
                              → technical
                              → closing
                              → error
```

### SSE Hook (`useAnalysisStream.ts`)

```typescript
// Usage (already wired):
const { startAnalysis, cancelAnalysis } = useAnalysisStream();

// Trigger analysis:
startAnalysis(audioFile);  // File object from drag/drop or input

// Cancel:
cancelAnalysis();  // AbortController.abort()
```

### TypeScript Types (`src/types/larynx.ts`)

```typescript
type SensorName = 'UL' | 'LL' | 'JAW' | 'T1' | 'T2' | 'T3';

interface EMASensor {
  x: number;      // mm
  y: number;      // mm
  velocity?: number; // cm/s
}

interface EMAFrame {
  sensors: Record<SensorName, EMASensor>;
  tongueVelocity: number;  // cm/s, average of T1+T2+T3
  timestamp: number;       // seconds
}

interface Verdict {
  isGenuine: boolean;
  confidence: number;       // 0-1, physics-based
  peakVelocity: number;     // cm/s
  threshold: number;        // cm/s (22.0)
  anomalousFrameCount?: number;
  totalFrameCount?: number;
  anomalyRatio?: number;
  reportId?: string;
  processingTimeMs?: number;
  // ML classifier fields (present when model loaded):
  classifierScore?: number;  // 0-1 P(deepfake)
  classifierModel?: string;  // e.g. "HistGradientBoosting"
  ensembleScore?: number;    // 0.6×confidence + 0.4×classifierScore
}

type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete'
                    | 'comparing' | 'technical' | 'closing' | 'error';
```

---

## CORS

Allowed origins:
- `https://larynx.pages.dev` (production)
- `https://*.larynx.pages.dev` (preview deploys)
- `https://voxlarynx.tech`
- `https://*.voxlarynx.tech`
- `http://localhost:5173` (dev)

---

## Backend Pipeline Internals (for debugging)

### Processing Pipeline (`pipeline.py`)

```
Audio bytes (WAV/MP3/FLAC/OGG)
  │
  ▼
AudioPreprocessor.load()
  - librosa, 16kHz mono
  - RMS noise gate at -40dB
  │
  ▼
FormantExtractor.extract()
  - Praat formant_burg (100fps, 5 formants, 5500Hz max, 25ms window)
  - Pitch filter <80Hz
  - Forward-fill NaN
  - 5-frame median filter
  - → List[FormantData(f1, f2, f3)]
  │
  ▼
ArticulatoryMapper.map_formants()
  - F1 (300-900Hz) → jaw_y (0-15mm)
  - F2 (800-2400Hz) → tongue_x (-20 to +20mm)
  - T1 = primary tongue position
  - T2 = 0.8 × T1, T3 = 0.6 × T1
  - UL/LL derived from jaw
  - → EMAFrame[]
  │
  ▼
VelocityAnalyzer.compute()
  - mm/frame → cm/s (VELOCITY_SCALE=1.5)
  - Per-sensor anomaly flagging
  - tongue_velocity = avg(T1, T2, T3)
  │
  ▼
classifier.py → classify_ema_frames()
  - Loads ensemble_model.pkl (trained on 108 features)
  - 6 articulators × 3 signals (vel/accel/jerk) × 6 stats
  - → { score: 0-1, model_name: str }
  │
  ▼
Verdict
  - ensemble_score = 0.6 × formant_confidence + 0.4 × classifier_score
  - isGenuine = ensemble_score < 0.5
```

### Key Constants (`config.py`)

| Constant | Value | Description |
|----------|-------|-------------|
| `SAMPLE_RATE` | 16000 | Audio sample rate |
| `FORMANT_TIME_STEP` | 0.01 | 100fps formant extraction |
| `VELOCITY_SCALE` | 1.5 | mm/frame to cm/s multiplier |
| `ABSOLUTE_MAX_VELOCITY` | 22.0 | Human biomechanical limit (cm/s) |
| `MAX_FILE_SIZE_MB` | 10 | Upload limit |
| `SSE_HEARTBEAT` | 15 | Seconds between keepalives |
| `ALLOWED_FORMATS` | wav, mp3, flac, ogg | Accepted audio types |

### Anomaly Thresholds (cm/s)

| Sensor | Threshold | What it represents |
|--------|-----------|-------------------|
| T1 (tongue tip) | 20 | /t/, /d/, /n/ articulation |
| T2 (tongue body) | 15 | Vowel shaping |
| T3 (tongue dorsum) | 12 | /k/, /g/ articulation |
| JAW | 10 | Jaw opening/closing |
| UL (upper lip) | 15 | /p/, /b/, /m/ |
| LL (lower lip) | 18 | /f/, /v/ labiodental |

---

## Known Issues / Caveats

1. **Trajectory mismatch**: The training pipeline uses HuBERT→AAI neural inversion for EMA trajectories, while the live pipeline uses Praat formant→articulatory mapping. Different methods, same feature schema. The ensemble scoring (0.6 formant + 0.4 classifier) cushions this — formant-based anomaly detection still works even if classifier accuracy degrades.

2. **Cold start**: Modal containers take 15-30s on first request. `min_containers=1` keeps one warm but may sleep after inactivity. Health check endpoint can pre-warm.

3. **File size**: Max 10MB. Longer audio = more frames = longer processing. 10s of audio ≈ 1000 frames ≈ 5-10s processing.

4. **FLAC/OGG**: Supported but converted to WAV internally. MP3 lossy compression may slightly affect formant extraction quality.
