# LARYNX Stack

Every dependency is pinned to a specific version. No "latest." No "^". Install exactly these and move on.

---

## Python Backend (Modal)

These run inside a Modal `Image`. You don't install them locally.

```python
# modal_image.py
import modal

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "librosa==0.10.2.post1",
    "praat-parselmouth==0.4.5",
    "numpy==2.1.3",
    "fastapi==0.115.6",
    "uvicorn==0.32.1",
    "sse-starlette==2.1.3",
    "python-multipart==0.0.12",
)
```

| Package | Version | What It Does |
|---------|---------|-------------|
| `librosa` | 0.10.2.post1 | Audio loading, resampling to 16kHz mono, waveform analysis. Handles .wav, .mp3, .ogg, .flac transparently via soundfile/audioread backends. |
| `praat-parselmouth` | 0.4.5 | Formant extraction (F1-F4) and pitch tracking. Python wrapper around Praat, the gold standard in phonetics since 1992. `to_formant_burg()` gives us 100fps formant trajectories. `to_pitch()` gives fundamental frequency for voicing detection. |
| `numpy` | 2.1.3 | Array operations for velocity computation, smoothing, and threshold detection. Velocity = `np.diff(params) / dt`. |
| `fastapi` | 0.115.6 | API framework. Three endpoints: upload, SSE stream, and EMA data download. |
| `uvicorn` | 0.32.1 | ASGI server. FastAPI needs this to run. |
| `sse-starlette` | 2.1.3 | Server-Sent Events for FastAPI. Wraps async generators into proper SSE responses with `event:` and `data:` fields. |
| `python-multipart` | 0.0.12 | FastAPI needs this for `UploadFile` multipart form parsing. Without it, file uploads silently fail. |

**Modal SDK** (installed locally for deployment):

```bash
pip install modal==0.73.45
modal token set --token-id <YOUR_TOKEN_ID> --token-secret <YOUR_TOKEN_SECRET>
```

| Package | Version | What It Does |
|---------|---------|-------------|
| `modal` | 0.73.45 | Serverless GPU platform. Deploys Python functions to A100 GPUs with `keep_warm=1` (one container always hot, prevents cold start). `modal deploy` pushes code, `modal serve` for local dev with hot reload. |

---

## Frontend

```bash
npm create vite@latest larynx-web -- --template react-ts
cd larynx-web
npm install react@18.3.1 react-dom@18.3.1
npm install three@0.169.0 @react-three/fiber@8.17.10 @react-three/drei@9.121.0 @react-three/postprocessing@2.16.3
npm install gsap@3.12.5 motion@11.11.17 zustand@5.0.1 tone@15.0.4
npm install -D typescript@5.6.3 @types/three@0.169.0
```

### Core Rendering

| Package | Version | What It Does |
|---------|---------|-------------|
| `react` | 18.3.1 | UI framework. React 18 for concurrent rendering. |
| `react-dom` | 18.3.1 | DOM renderer. Must match React version exactly. |
| `vite` | 5.4.11 | Build tool. Fast HMR during dev, optimized production builds. Handles GLTF/GLB file imports natively. |
| `typescript` | 5.6.3 | Type safety. Catches morph target index errors, SSE event type mismatches, and store shape bugs at compile time instead of during the demo. |

### 3D Graphics

| Package | Version | What It Does |
|---------|---------|-------------|
| `three` | 0.169.0 | 3D engine. WebGL renderer, mesh geometry, morph targets, materials, lights. The foundation for everything visual. |
| `@react-three/fiber` | 8.17.10 | React renderer for Three.js. Declarative scene graph. `useFrame()` hook runs every animation frame at 60fps. `Canvas` component sets up renderer, camera, scene automatically. |
| `@react-three/drei` | 9.121.0 | Three.js helpers. `useGLTF` loads the head model. `MeshTransmissionMaterial` creates the x-ray glass skull effect. `Environment` provides HDR lighting with zero setup. `Html` overlays DOM elements in 3D space. |
| `@react-three/postprocessing` | 2.16.3 | GPU post-processing effects. `Bloom` for the glow on anomaly detection. `Scanline` for the forensic/clinical aesthetic. `ChromaticAberration` for the glitch effect when deepfake is detected. All composited in a single `EffectComposer` pass. |
| `@types/three` | 0.169.0 | TypeScript definitions for Three.js. Must match `three` major version. |

### Animation

| Package | Version | What It Does |
|---------|---------|-------------|
| `gsap` | 3.12.5 | Animation engine. `gsap.quickTo()` creates a reusable tween function that's 4x faster than `gsap.to()` for repeated calls (velocity gauge updates, HUD number tickers). `gsap.timeline()` choreographs the reveal sequence: skull zoom → tongue appear → data overlay. |
| `motion` | 11.11.17 | React motion library (formerly Framer Motion). `AnimatePresence` for panel mount/unmount transitions. Spring physics for verdict badge animation. Layout animations for the history panel. Only for DOM elements, never for Three.js objects. |

### State & Audio

| Package | Version | What It Does |
|---------|---------|-------------|
| `zustand` | 5.0.1 | State management. Transient subscriptions via `getState()` let `useFrame()` read animation state without triggering React re-renders. `subscribeWithSelector` middleware enables fine-grained subscriptions for UI components that do need to re-render (verdict, status). |
| `tone` | 15.0.4 | Procedural audio synthesis. `Tone.Synth` for the scanner beep. `Tone.MetalSynth` for the ticking clock. `Tone.Oscillator` with sawtooth wave for the deepfake reveal distortion sting. `Tone.Filter` and `Tone.Distortion` chain for velocity-reactive audio: `distortion.distortion = Math.min(tongueSpeed / 100, 1.0)`. |

---

## Infrastructure

No packages to install. These are cloud services configured via dashboards and CLI.

| Service | Purpose | Setup |
|---------|---------|-------|
| **Cloudflare Pages** | Frontend hosting | `npx wrangler pages deploy dist/` after `npm run build`. Free tier. Custom domain optional. |
| **Cloudflare Workers** | API proxy | Thin proxy between frontend and Modal. Handles CORS, stores files in R2, writes analysis records to D1. `npx wrangler deploy worker.ts`. |
| **Cloudflare D1** | Analysis history database | SQLite at the edge. One table: `analyses` (job_id, verdict, confidence, peak_velocity, timestamp). `npx wrangler d1 create larynx-db`. |
| **Cloudflare R2** | Audio file storage | S3-compatible object store. Uploaded audio files stored by job_id. Free egress. `npx wrangler r2 bucket create larynx-audio`. |
| **Modal** | GPU compute | A100 (80GB VRAM, overkill for formants but it's what they sponsor). `keep_warm=1` keeps one container hot. Files processed in 2-4 seconds for a 10-second clip. |
| **OpenAI API** | Deepfake generation | `tts-1` model, `alloy` voice. Used live during demo to generate the deepfake sample from text. ~$0.015 per request. |

**OpenAI TTS call (for live demo deepfake generation):**

```python
from openai import OpenAI

client = OpenAI()

response = client.audio.speech.create(
    model="tts-1",
    voice="alloy",
    input="The quick brown fox jumps over the lazy dog.",
    response_format="wav",
    speed=1.0,
)

response.stream_to_file("deepfake_sample.wav")
```

---

## 3D Asset Pipeline

You need one 3D model: a human head with ARKit-compatible blendshapes, sliced in half (sagittal plane) to reveal the inside of the mouth.

| Tool | Version | What It Does |
|------|---------|-------------|
| **Blender** | 4.x | Boolean modifier to slice the head mesh along the midsagittal plane. Export as .glb (binary GLTF). Vertex count target: 15K for the head, 5K for the tongue. |
| **Ready Player Me** or **Sketchfab** | N/A | Source for ARKit 52-blendshape head model. RPM generates them for free (readyplayer.me/avatar). Sketchfab has CC-licensed alternatives. The critical blendshapes: `jawOpen`, `tongueOut`, `mouthClose`, `mouthPucker`. |
| **gltfjsx** | CLI | Generates a typed React Three Fiber component from a .glb file. Run once after export from Blender. |

```bash
npx gltfjsx model.glb --transform --types
# Outputs: Model.tsx with typed refs for every mesh and morph target
# --transform optimizes geometry (deduplication, quantization)
# --types generates TypeScript interfaces
```

**Blender workflow (15 minutes):**

1. Import ARKit head (.glb) into Blender
2. Add a Cube, scale it to cover the right half of the head
3. Add Boolean modifier to the head mesh, set to "Difference" with the cube
4. Apply the modifier
5. Delete the cube
6. Add a simple tongue mesh (extruded bezier curve, 5K vertices max)
7. Add 3 shape keys to the tongue: `jawOpen`, `tongueForward`, `tongueSide`
8. Parent tongue to head
9. Export as .glb with "Export Shape Keys" checked

**Material setup in R3F:**

```tsx
import { MeshTransmissionMaterial } from '@react-three/drei';

function HeadModel() {
  return (
    <mesh geometry={headGeometry}>
      <MeshTransmissionMaterial
        transmission={0.9}        // almost fully transparent
        thickness={1.5}           // refraction depth
        roughness={0.1}           // glossy glass
        chromaticAberration={0.5} // rainbow refraction at edges
        anisotropy={0.3}          // directional reflections
        color="#88ccff"            // slight blue tint (x-ray feel)
        backside                  // render both sides
      />
    </mesh>
  );
}
```

---

## Environment Variables

```bash
# .env.local (frontend, Vite prefix required)
VITE_API_URL=https://larynx.your-worker.workers.dev
VITE_OPENAI_API_KEY=sk-...    # only for demo deepfake generation button

# wrangler.toml (Cloudflare Worker)
# [vars]
# MODAL_TOKEN = "your-modal-deploy-token"

# Modal secrets (set via CLI)
# modal secret create larynx-secrets OPENAI_API_KEY=sk-...
```

---

## Dev Workflow

Two terminals. That's it.

```bash
# Terminal 1: Frontend dev server
cd larynx-web
npm run dev
# → http://localhost:5173

# Terminal 2: Modal backend (hot reload)
source ~/modal-env/bin/activate
modal serve backend.py
# → https://your-user--larynx-dev.modal.run
```

For production deployment:

```bash
# Deploy backend
modal deploy backend.py

# Build and deploy frontend
cd larynx-web
npm run build
npx wrangler pages deploy dist/

# Deploy worker proxy
npx wrangler deploy worker.ts
```
