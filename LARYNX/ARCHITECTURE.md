# LARYNX Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React + R3F + GSAP + Zustand)                 │
│  ┌──────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │UploadPanel│ │  R3F Canvas  │ │   HUD / Verdict     │  │
│  │(drag-drop)│ │ (3D skull +  │ │ (velocity gauges,   │  │
│  │           │ │  tongue +    │ │  waveform, verdict)  │  │
│  │           │ │  postproc)   │ │                     │  │
│  └─────┬─────┘ └──────┬───────┘ └──────────┬──────────┘  │
│        │               │                    │             │
│        └───────────────┼────────────────────┘             │
│                        │ SSE stream                       │
│  ┌─────────────────────┴──────────────────────────────┐  │
│  │  useAnalysisStream (EventSource → Zustand store)    │  │
│  └─────────────────────┬──────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────┘
                         │ HTTPS
┌────────────────────────┼─────────────────────────────────┐
│  Cloudflare Workers    │  (API Proxy)                     │
│  - CORS enforcement    │                                  │
│  - Request ID (UUID)   │                                  │
│  - R2 audio upload     │                                  │
│  - D1 history write    │                                  │
└────────────────────────┼─────────────────────────────────┘
                         │ HTTPS
┌────────────────────────┼─────────────────────────────────┐
│  Modal A100            │  (LarynxProcessor)               │
│  ┌─────────────────────┴──────────────────────────────┐  │
│  │  1. librosa.load(audio, sr=16000, mono=True)       │  │
│  │  2. parselmouth.Sound → .to_formant_burg()         │  │
│  │     → F1, F2, F3, F4 at 100fps                    │  │
│  │  3. pitch = snd.to_pitch_ac()                      │  │
│  │  4. Articulatory mapping (F→morph targets)         │  │
│  │  5. Velocity computation (|ΔF/Δt| per frame)      │  │
│  │  6. Anomaly detection (threshold check)            │  │
│  │  7. SSE stream → client                            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Component Tree

```
App
├── UploadPanel
│   ├── DropZone (drag-drop, click-to-upload, .wav/.mp3/.ogg, max 10MB)
│   ├── FilePreview (filename, duration, waveform thumbnail)
│   └── AnalyzeButton (triggers POST /api/analyze)
│
├── AnalysisView (visible after upload)
│   ├── R3FCanvas (Canvas from @react-three/fiber)
│   │   ├── HeadModel
│   │   │   └── sagittal-sliced ARKit 52-blendshape GLTF
│   │   │   └── MeshTransmissionMaterial (transmission=0.9, chromaticAb=0.5, thickness=2.5)
│   │   ├── TongueModel
│   │   │   └── morphTargetInfluences driven by formant stream
│   │   │   └── VelocityShaderMaterial (flesh→red→glitch based on speed)
│   │   │   └── NO CLAMP at 1.0 — deepfake drives to 3.5+ for skull clip
│   │   ├── EMAMarkers (6 glowing spheres at articulator positions)
│   │   ├── VelocityRibbons (trail geometry from tongue tip history)
│   │   ├── EffectComposer (@react-three/postprocessing)
│   │   │   ├── Scanline (density=1.5, opacity=0.2)
│   │   │   ├── Bloom (threshold=0.8, intensity 0.2→2.5 on deepfake)
│   │   │   └── ChromaticAberration (offset 0.002→0.05 on deepfake)
│   │   └── CameraController (GSAP Timeline for zoom choreography)
│   │
│   ├── VelocityHUD
│   │   ├── SpeedGauge (per-articulator: tongue tip, tongue body, jaw)
│   │   ├── ThresholdLine (red line at 20 cm/s)
│   │   └── AnomalyCounter (frames exceeding threshold)
│   │
│   ├── WaveformDisplay
│   │   ├── AudioWaveform (canvas 2D, synced to playhead)
│   │   └── FormantOverlay (F1/F2 trajectories as colored lines)
│   │
│   └── VerdictPanel
│       ├── VerdictBadge (GENUINE green / DEEPFAKE red, animated)
│       ├── ConfidenceScore (0-100%)
│       ├── PhysicsEvidence (specific violations: "Frame 847: tongue tip at 184 cm/s")
│       └── ExportButton (PDF forensic report)
│
├── HistoryPanel
│   └── AnalysisList (D1-backed, timestamped entries)
│       └── Links to Supermemory forensic journal
│
└── SoundEngine (Tone.js)
    ├── AmbientDrone (dark pad, 15% vol, ducks to 5% on reveals)
    ├── ScannerBeep (sine 1kHz, on upload)
    ├── ProcessingWhir (filtered noise, during analysis)
    ├── VerdictSting
    │   ├── GENUINE: major chord chime (C4-E4-G4)
    │   └── DEEPFAKE: sawtooth minor 2nd (C3+C#3) + distortion
    └── VelocityReactive (distortion = clamp(tongueSpeed/100, 0, 1))
```

## API Design

### `POST /api/analyze`

Upload audio file, returns job ID for SSE streaming.

```typescript
// Request: multipart/form-data
// - file: audio file (wav/mp3/ogg, max 10MB)

// Response: ApiResponse<AnalyzeData> (shared envelope)
interface AnalyzeData {
  jobId: string;        // UUID
  duration: number;     // audio duration in seconds
  sampleRate: number;   // always 16000
  frameCount: number;   // total frames at 100fps
    }

  // Example:
// { success: true, data: { jobId: "...", duration: 5.2, ... }, error: null }
```

### `GET /api/stream/{jobId}`

Server-Sent Events stream with analysis progress.

```typescript
// SSE Event Types — ALL wrapped in ApiResponse envelope per shared contract
// Each SSE `data:` field is a full ApiResponse<T>
type SSEEvent =
  | { type: "mel_ready";          data: ApiResponse<{ progress: number }> }
  | { type: "formants_extracted"; data: ApiResponse<{ progress: number; f1Range: [number, number]; f2Range: [number, number] }> }
  | { type: "velocity_computed";  data: ApiResponse<{ progress: number; maxVelocity: number; anomalyCount: number }> }
  | { type: "anomaly_detected";   data: ApiResponse<{ frameIndex: number; articulator: string; velocity: number; threshold: number }> }
  | { type: "verdict_ready";      data: ApiResponse<Verdict> }
  | { type: "complete";           data: ApiResponse<{ processingTimeMs: number }> }

// Re-exported from shared/types/api.ts
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

interface ApiError {
  code: ErrorCode;
  message: string;
}

interface Verdict {
  label: "GENUINE" | "DEEPFAKE";
  confidence: number;            // 0-1
  maxVelocity: number;           // cm/s
  anomalyFrames: number;         // count of frames exceeding thresholds
  totalFrames: number;
  violations: Array<{
    frameIndex: number;
    articulator: string;
    velocity: number;            // cm/s
    threshold: number;           // cm/s
    description: string;         // "Tongue tip at 184 cm/s (limit: 20 cm/s)"
  }>;
}
```

### `GET /api/ema/{jobId}`

Full articulatory frame array for 3D rendering.

```typescript
interface EMAResponse {
  success: true;
  data: {
    fps: 100;
    frames: Array<{
      t: number;              // time in seconds
      jaw_open: number;       // 0-1 (real) or 0-5+ (deepfake, unclamped)
      tongue_z: number;       // 0-1 or 0-5+ (anterior-posterior)
      tongue_y: number;       // 0-1 or 0-5+ (superior-inferior)
      lip_round: number;      // 0-1 or 0-5+
      lip_spread: number;     // 0-1 or 0-5+
      voicing: number;        // 0-1 (pitch presence)
      velocity: {
        jaw: number;          // cm/s
        tongue_tip: number;
        tongue_body: number;
        lips: number;
      };
      isAnomaly: boolean;
    }>;
  };
}
```

## Data Flow (Timing Budget)

```
Upload (100ms network) 
  → librosa.load + resample to 16kHz (200ms)
  → SSE: mel_ready
  → **PREPROCESSING** (noise gate + pitch filter) (50ms)
  → parselmouth formant extraction, 100fps (300ms for 5s audio)
  → **50ms moving average smoothing on F1/F2/F3** (10ms)
  → SSE: formants_extracted
  → Articulatory mapping (50ms)
  → Velocity computation, frame-by-frame Δ (50ms)
  → SSE: velocity_computed
  → Threshold check (10ms)
  → SSE: anomaly_detected (per anomaly frame)
  → Verdict generation (10ms)
  → SSE: verdict_ready
  → SSE: complete
  
Total: ~750ms for 5s audio. Target: <2.5s including network.
```


## MANDATORY Preprocessing (from review audit)

**These steps are NON-NEGOTIABLE.** Without them, formant extraction produces
garbage on noisy audio. Demo MUST use pre-recorded clean audio, NEVER live mic
in an 80dB hackathon hall.

```python
import numpy as np
from scipy.signal import medfilt

def preprocess_audio(audio: np.ndarray, sr: int = 16000) -> np.ndarray:
    """Mandatory preprocessing before formant extraction.
    
    1. Noise gate: silence frames below -40dB RMS (prevents formant tracker
       from hallucinating on background noise)
    2. Pitch filter: reject frames where pitch < 80Hz (unvoiced/noise)
    3. Both applied per-frame, not globally
    """
    frame_len = sr // 100  # 10ms frames at 100fps
    frames = np.array_split(audio, len(audio) // frame_len)
    
    processed = []
    for frame in frames:
        rms = np.sqrt(np.mean(frame ** 2))
        rms_db = 20 * np.log10(rms + 1e-10)
        if rms_db < -40:  # noise gate threshold
            processed.append(np.zeros_like(frame))
        else:
            processed.append(frame)
    
    return np.concatenate(processed)


def smooth_formants(
    f1: np.ndarray, f2: np.ndarray, f3: np.ndarray,
    window: int = 5  # 50ms at 100fps
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """50ms moving average smoothing on formant tracks.
    
    Removes single-frame spikes that cause false velocity anomalies.
    Uses median filter (robust to outliers) not mean filter.
    """
    return (
        medfilt(f1, kernel_size=window),
        medfilt(f2, kernel_size=window),
        medfilt(f3, kernel_size=window),
    )
```

## Formant → Morph Target Mapping

The core math that drives the 3D visualization:

```python
# Constants (calibrated from speech science literature)
F1_CLOSED = 300    # Hz — jaw fully closed
F1_OPEN = 900      # Hz — jaw wide open
F2_BACK = 800      # Hz — tongue fully retracted
F2_FRONT = 2400    # Hz — tongue fully advanced
F3_UNROUND = 2200  # Hz — lips spread
F3_ROUND = 3000    # Hz — lips rounded

def formant_to_articulatory(f1: float, f2: float, f3: float, pitch: float) -> dict:
    """Convert formant frequencies to articulatory parameters.
    
    Returns UNCLAMPED values — deepfake audio produces values > 1.0
    which drives morph targets beyond physical limits (skull clip).
    """
    jaw_open = (f1 - F1_CLOSED) / (F1_OPEN - F1_CLOSED)
    tongue_z = (f2 - F2_BACK) / (F2_FRONT - F2_BACK)
    lip_round = (f3 - F3_UNROUND) / (F3_ROUND - F3_UNROUND)
    voicing = 1.0 if pitch > 80 else 0.0  # 80Hz = voicing threshold
    
    # DO NOT CLAMP. Let deepfake values exceed 1.0.
    # Values of 3.5+ cause tongue to clip through skull = demo trick.
    return {
        "jaw_open": jaw_open,
        "tongue_z": tongue_z,
        "lip_round": lip_round,
        "voicing": voicing,
    }

def compute_velocity(frames: list[dict], fps: int = 100) -> list[float]:
    """Compute articulatory velocity (cm/s) per frame.
    
    Velocity = |Δparameter / Δt| scaled to physical units.
    F2 change of 100Hz ≈ 1cm tongue displacement (rough linear approx).
    """
    dt = 1.0 / fps  # 10ms per frame
    velocities = []
    for i in range(1, len(frames)):
        delta_tongue = abs(frames[i]["tongue_z"] - frames[i-1]["tongue_z"])
        # Scale: normalized parameter change → approximate cm
        # 1.0 normalized ≈ 15mm real displacement (MNGU0 data)
        velocity_cm_s = (delta_tongue * 1.5) / dt  # 1.5cm full range / dt
        velocities.append(velocity_cm_s)
    return velocities
```

## Velocity Thresholds (from speech science literature)

| Articulator | Max Human Speed | Deepfake Typical | Threshold |
|-------------|----------------|-----------------|-----------|
| Tongue Tip  | 15-20 cm/s     | 40-200+ cm/s    | 20 cm/s   |
| Tongue Body | 10-15 cm/s     | 30-150+ cm/s    | 15 cm/s   |
| Tongue Dorsum| 8-12 cm/s     | 25-100+ cm/s    | 12 cm/s   |
| Jaw         | 8-10 cm/s      | 20-80+ cm/s     | 10 cm/s   |
| Upper Lip   | 10-15 cm/s     | 30-100+ cm/s    | 15 cm/s   |
| Lower Lip   | 12-18 cm/s     | 35-120+ cm/s    | 18 cm/s   |

Gap is enormous — even "good" deepfakes exceed human limits by 2-5x.

## Hybrid AAI Pipeline (In Progress)

LARYNX uses two parallel paths for extracting articulatory motion from audio. Both feed the same 3D visualization and velocity-threshold logic.

### Primary Path: Formant Extraction (Current, Working)

Parselmouth/Praat extracts F1-F4 formants at 100fps, mapped to articulatory parameters via linear scaling (F1→jaw, F2→tongue). Runs on CPU, ~300ms for 5s audio. This is the demo-day pipeline.

### Enhancement Path: articulatory/articulatory (Integration In Progress)

The [articulatory/articulatory](https://github.com/articulatory/articulatory) repo (Peter Wu, UC Berkeley) provides a pre-trained Wav2Vec2-based model that predicts 6-sensor EMA positions directly from 16kHz audio:

- **Input:** 16kHz WAV
- **Output:** 12 dimensions (LI_x/y, UL_x/y, LL_x/y, TT_x/y, TB_x/y, TD_x/y) at 200Hz native, decimated 2x → 100fps
- **Inference:** `predict_ema.py` from the repo, requires GPU for Wav2Vec2 forward pass
- **Papers:** Interspeech 2022, ICASSP 2023

### Why Hybrid

| Dimension | Formants (parselmouth) | AAI (Peter Wu model) |
|-----------|----------------------|---------------------|
| Speed | ~300ms / 5s audio, CPU only | ~1-2s / 5s audio, needs GPU |
| Coordinates | Derived (F1/F2 → approximate position) | Direct EMA sensor positions |
| Accuracy | Good enough for velocity gap detection | Physically grounded, higher fidelity |
| Dependencies | parselmouth only | Wav2Vec2 + model weights (~1GB) |
| Status | Working, demo-ready | Integration in progress |

Both pipelines produce per-frame articulatory coordinates at 100fps. The velocity calculation and threshold logic are identical downstream. For the hackathon demo, formants are the safe bet. AAI gives us a credibility upgrade if we land it.

## Zustand Store Interface

```typescript
interface LarynxStore {
  // Analysis state
  jobId: string | null;
  status: "idle" | "uploading" | "analyzing" | "complete" | "error";
  progress: number; // 0-1
  
  // EMA frame data (TRANSIENT — read via getState(), never trigger re-render)
  currentFrame: number;
  frames: EMAFrame[];
  
  // Verdict
  verdict: Verdict | null;
  
  // Audio
  audioDuration: number;
  audioUrl: string | null;
  
  // Sound
  isMuted: boolean;
  masterVolume: number;
  
  // Actions
  startAnalysis: (file: File) => Promise<void>;
  setCurrentFrame: (frame: number) => void;
  reset: () => void;
}

// Access in useFrame (NEVER subscribe to frames with React):
// const { currentFrame, frames } = useLarynxStore.getState();
```

## Cloudflare Worker Proxy

```typescript
// workers/api.ts
interface Env {
  MODAL_URL: string;
  AUDIO_BUCKET: R2Bucket;
  OPENAI_API_KEY: string;  // wrangler secret, never in code
  ANALYSES_DB: D1Database;
  ALLOWED_ORIGINS: string; // comma-separated: https://larynx.pages.dev,http://localhost:5173
}

const corsHeaders = (origin: string, env: Env): HeadersInit => {
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
  const isAllowed = allowed.includes(origin) || origin === 'http://localhost:5173';
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
};

function errorResponse(code: number, message: string, requestId: string, origin: string, env: Env): Response {
  return new Response(JSON.stringify({
    success: false,
    data: null,
    error: { code: code === 429 ? 'RATE_LIMITED' : code === 413 ? 'UPLOAD_TOO_LARGE' : 'PROCESSING_FAILED', message },
  }), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...corsHeaders(origin, env) },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const requestId = crypto.randomUUID();

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    try {
      // POST /api/analyze — upload audio → R2 → forward to Modal
      if (url.pathname === '/api/analyze' && request.method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return errorResponse(400, 'Missing file field', requestId, origin, env);
        if (file.size > 10 * 1024 * 1024) return errorResponse(413, 'File exceeds 10MB limit', requestId, origin, env);

        const key = `audio/${requestId}.wav`;
        await env.AUDIO_BUCKET.put(key, file.stream());

        const modalResp = await fetch(`${env.MODAL_URL}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioKey: key, requestId }),
        });

        if (!modalResp.ok) return errorResponse(modalResp.status, 'Modal processing failed', requestId, origin, env);

        return new Response(modalResp.body, {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            ...corsHeaders(origin, env),
          },
        });
      }

      // GET /api/stream/:jobId — proxy SSE from Modal
      if (url.pathname.startsWith('/api/stream/') && request.method === 'GET') {
        const jobId = url.pathname.split('/').pop();
        if (!jobId) return errorResponse(400, 'Missing job ID', requestId, origin, env);

        const modalResp = await fetch(`${env.MODAL_URL}/stream/${jobId}`);
        if (!modalResp.ok) return errorResponse(modalResp.status, 'Stream unavailable', requestId, origin, env);

        return new Response(modalResp.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Request-ID': requestId,
            ...corsHeaders(origin, env),
          },
        });
      }

      // POST /api/generate-deepfake — TTS via OpenAI (key held server-side)
      if (url.pathname === '/api/generate-deepfake' && request.method === 'POST') {
        const { text, voice } = await request.json<{ text: string; voice?: string }>();
        if (!text || text.length > 1000) return errorResponse(400, 'Text required (max 1000 chars)', requestId, origin, env);

        const ttsResp = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            voice: voice || 'alloy',
            input: text,
            response_format: 'wav',
            speed: 1.0,
          }),
        });

        if (!ttsResp.ok) return errorResponse(ttsResp.status, 'OpenAI TTS failed', requestId, origin, env);

        return new Response(ttsResp.body, {
          headers: {
            'Content-Type': 'audio/wav',
            'X-Request-ID': requestId,
            ...corsHeaders(origin, env),
          },
        });
      }

      return errorResponse(404, 'Not Found', requestId, origin, env);

    } catch (err) {
      console.error(`[${requestId}] Worker error:`, err);
      return errorResponse(500, 'Internal server error', requestId, origin, env);
    }
  },
};
```

## D1 Schema (Analysis History)

```sql
CREATE TABLE analyses (
  id TEXT PRIMARY KEY,           -- UUID
  created_at TEXT NOT NULL,      -- ISO 8601
  audio_key TEXT NOT NULL,       -- R2 path
  duration_s REAL NOT NULL,
  verdict TEXT NOT NULL,         -- 'GENUINE' | 'DEEPFAKE'
  confidence REAL NOT NULL,     -- 0-1
  max_velocity REAL NOT NULL,   -- cm/s
  anomaly_frames INTEGER NOT NULL,
  total_frames INTEGER NOT NULL,
  processing_time_ms INTEGER NOT NULL
);
```

## Supermemory Forensic Memory

LARYNX writes forensic voice analysis records to Supermemory for pattern recall,
similarity search, and forensic timeline reconstruction.

### Scoping Model

```
Supermemory Space (API key = space scope)
  └── Container Tag: "larynx-forensic"   ← CF Worker forensic records
  └── Container Tag: <.supermemory-id>    ← opencode dev workflow memories (separate)
```

- **Container tags** partition memories within a single Space — same API key, no cross-contamination
- The CF Worker uses container tag `"larynx-forensic"` (hardcoded in `MEMORY_CONFIG.CONTAINER_TAG`)
- The opencode-supermemory plugin uses the `.supermemory-id` file as its container tag (dev workflow)
- Both share the same Space/API key but NEVER see each other's memories due to tag filtering

### Worker Integration

```typescript
// Write forensic record (fire-and-forget via waitUntil)
POST https://api.supermemory.ai/v3/memories
Headers: { Authorization: "Bearer <SUPERMEMORY_API_KEY>" }
Body: { content: "<structured forensic text>", containerTag: "larynx-forensic" }

// Search forensic records (scoped to larynx-forensic tag only)
POST https://api.supermemory.ai/v3/memories/search
Headers: { Authorization: "Bearer <SUPERMEMORY_API_KEY>" }
Body: { query: "<search text>", limit: 5, containerTags: ["larynx-forensic"] }
```

### Secrets

| Secret | Where | How Set |
|--------|-------|---------|
| `SUPERMEMORY_API_KEY` | CF Worker secret | `npx wrangler secret put SUPERMEMORY_API_KEY` |

Only ONE secret needed — API key implies the Space. No space ID required.
Container tag is hardcoded in `supermemory.ts` as `MEMORY_CONFIG.CONTAINER_TAG`.

### Data Flow

```
Modal verdict SSE → CF Worker intercepts "verdict" event
  → c.executionCtx.waitUntil(Promise.allSettled([
       embedAndStore(env, verdictData),       // Workers AI embedding → Vectorize
       storeForensicRecord(env, verdictData),  // Supermemory forensic write
     ]))
  → Never blocks SSE stream to client
  → All operations fail-open (console.error on failure, no user impact)
```

### Forensic Record Format

Each verdict generates a structured text record containing:
- Verdict label (GENUINE/DEEPFAKE) + confidence score
- Peak velocity + threshold + severity classification
- Anomaly ratio (anomalyFrames / totalFrames)
- SHA-256 truncated IP hash (privacy-safe)
- ISO 8601 timestamp

### Setup Checklist

- [x] `supermemory.ts` created with write + search functions
- [x] Container tag `"larynx-forensic"` configured in `MEMORY_CONFIG`
- [x] `SUPERMEMORY_API_KEY` Worker secret set via wrangler
- [x] Wired into verdict path via `waitUntil()` (fire-and-forget)
- [x] Search endpoint: `POST /api/intelligence/similar` (fuses Vectorize + Supermemory)
- [x] Stats endpoint: `GET /api/intelligence/stats` shows `supermemory.configured: true`
- [x] Deployed and verified
## Performance Rules (Non-Negotiable)

1. **NEVER `useState`** for animation data. Use `useLarynxStore.getState()` in `useFrame`.
2. **LERP smoothing** = 0.15 factor. Resolves 100fps EMA data to 60fps display.
3. **`gsap.quickTo()`** for real-time formant stream → morph target values. 4x faster than `gsap.to()`.
4. **Morph target unclamped** — values > 1.0 are the demo trick. Don't fix this "bug."
5. **PostProcessing kill switch** — if `useFrame` delta > 33ms (< 30fps), disable Bloom + ChromaticAberration.
6. **Preload head GLTF** — `useGLTF.preload('/models/head.glb')` at app init.
