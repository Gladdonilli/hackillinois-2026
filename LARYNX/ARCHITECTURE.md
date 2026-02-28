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

// Response
interface AnalyzeResponse {
  success: true;
  data: {
    jobId: string;        // UUID
    duration: number;     // audio duration in seconds
    sampleRate: number;   // always 16000
    frameCount: number;   // total frames at 100fps
  };
}
```

### `GET /api/stream/{jobId}`

Server-Sent Events stream with analysis progress.

```typescript
// SSE Event Types
type SSEEvent =
  | { type: "mel_ready";          data: { progress: number } }
  | { type: "formants_extracted"; data: { progress: number; f1Range: [number, number]; f2Range: [number, number] } }
  | { type: "velocity_computed";  data: { progress: number; maxVelocity: number; anomalyCount: number } }
  | { type: "anomaly_detected";   data: { frameIndex: number; articulator: string; velocity: number; threshold: number } }
  | { type: "verdict_ready";      data: Verdict }
  | { type: "complete";           data: { processingTimeMs: number } }

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
  → parselmouth formant extraction, 100fps (300ms for 5s audio)
  → SSE: formants_extracted
  → Articulatory mapping (50ms)
  → Velocity computation, frame-by-frame Δ (50ms)
  → SSE: velocity_computed
  → Threshold check (10ms)
  → SSE: anomaly_detected (per anomaly frame)
  → Verdict generation (10ms)
  → SSE: verdict_ready
  → SSE: complete
  
Total: ~700ms for 5s audio. Target: <2.5s including network.
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
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      // Upload audio to R2
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const key = `audio/${requestId}.wav`;
      await env.AUDIO_BUCKET.put(key, file.stream());
      
      // Forward to Modal
      const modalResp = await fetch(`${env.MODAL_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioKey: key, requestId }),
      });
      
      return new Response(modalResp.body, {
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
      });
    }
    
    if (url.pathname.startsWith("/api/stream/")) {
      // Proxy SSE stream from Modal
      const jobId = url.pathname.split("/").pop();
      const modalResp = await fetch(`${env.MODAL_URL}/stream/${jobId}`);
      return new Response(modalResp.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Request-ID": requestId,
        },
      });
    }
    
    return new Response("Not Found", { status: 404 });
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

## Performance Rules (Non-Negotiable)

1. **NEVER `useState`** for animation data. Use `useLarynxStore.getState()` in `useFrame`.
2. **LERP smoothing** = 0.15 factor. Resolves 100fps EMA data to 60fps display.
3. **`gsap.quickTo()`** for real-time formant stream → morph target values. 4x faster than `gsap.to()`.
4. **Morph target unclamped** — values > 1.0 are the demo trick. Don't fix this "bug."
5. **PostProcessing kill switch** — if `useFrame` delta > 33ms (< 30fps), disable Bloom + ChromaticAberration.
6. **Preload head GLTF** — `useGLTF.preload('/models/head.glb')` at app init.
