# SYNAPSE Stack

Every dependency is pinned. Every choice is justified. No "pick your favorite" nonsense.

## Python Backend (Modal A100)

### Core ML Stack

| Package | Version | Why |
|---------|---------|-----|
| `torch` | `2.5.1+cu124` | PyTorch with CUDA 12.4 for A100. Modal's base image ships this. Don't fight it. |
| `transformer-lens` | `2.8.1` | Neel Nanda's mechanistic interpretability library. Wraps HuggingFace models as `HookedTransformer` with activation hooks at every residual stream, attention head, and MLP layer. This is why we can cache activations and inject steering vectors. **This is why we can't use vLLM.** TransformerLens needs Python-level hooks into the forward pass. vLLM's fused CUDA kernels skip Python entirely for performance, which blocks our hooks. **Pinned to 2.8.1** (not latest 2.17.0) for known compatibility with sae-lens 4.1.1. |
| `sae-lens` | `4.1.1` | SAE training and inference library from Joseph Bloom's group. Loads pre-trained sparse autoencoders. We use it purely for inference: `sae.encode(activation)` decomposes residual stream vectors into sparse interpretable features. **Upgraded from 3.19.0:** 4.0 was a major rewrite — `SAE.from_pretrained()` replaced dict loading, config objects overhauled. |
| `einops` | `0.8.0` | Tensor reshaping. Makes activation manipulation readable. `rearrange(x, 'b s d -> (b s) d')` beats nested `.reshape()` calls every time. |
| `umap-learn` | `0.5.7` | Dimensionality reduction for 3D feature layout. Takes the feature co-activation matrix and outputs 3D coordinates. Runs once per generation, cached thereafter. |
| `numpy` | `1.26.4` | Array operations. Pinned because numpy 2.0 breaks half the ML ecosystem. |
| `scipy` | `1.14.1` | Correlation computation for co-activation edges. |

### Model & SAE Weights

| Asset | Source | Size | Details |
|-------|--------|------|---------|
| Llama-3.1-8B-Instruct | `meta-llama/Llama-3.1-8B-Instruct` | ~16GB (float16) | 8B params, 32 layers, 4096 hidden dim, 32 attention heads. Fits on A100-80GB with 55GB headroom. |
| SAE weights | `andyrdt/saes-llama-3.1-8b-instruct` | ~2GB total | BatchTopK architecture, k=32-256. Pre-trained on Llama 3.1 residual stream activations. One SAE per layer. |

### API Layer

| Package | Version | Why |
|---------|---------|-----|
| `fastapi` | `0.115.6` | API framework. Lightweight, async-native, auto-generates OpenAPI docs. |
| `uvicorn` | `0.32.1` | ASGI server. Runs inside the Modal container. |
| `pydantic` | `2.10.3` | Request/response validation. FastAPI uses it natively. |
| `sse-starlette` | `2.1.3` | Server-sent events for streaming steered responses back to the client. |

### Infrastructure

| Package | Version | Why |
|---------|---------|-----|
| `modal` | `1.3.4` | Serverless GPU platform. A100-80GB with `keep_warm=1` for zero cold starts during demo. Model weights cached in Modal Volume so container startup doesn't re-download 16GB. **Upgraded from 0.73.x:** 1.x replaced `modal.Stub` with `modal.App`. |
| `huggingface-hub` | `0.27.0` | Downloads model weights on first run. Cached to Modal Volume. |

### Modal Configuration

```python
import modal

app = modal.App("synapse")

# Persistent volume for model weights (survives container restarts)
volume = modal.Volume.from_name("synapse-models", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.5.1",
        "transformer-lens==2.7.0",
        "sae-lens==3.19.0",
        "einops==0.8.0",
        "umap-learn==0.5.7",
        "numpy==1.26.4",
        "scipy==1.14.1",
        "fastapi==0.115.6",
        "uvicorn==0.32.1",
        "pydantic==2.10.3",
        "sse-starlette==2.1.3",
        "huggingface-hub==0.27.0",
    )
    .env({"HF_HOME": "/models"})
)

@app.function(
    image=image,
    gpu="A100-80GB",
    volumes={"/models": volume},
    keep_warm=1,             # always-on for demo, no cold start
    timeout=300,             # 5 min max per request
    memory=32768,            # 32GB system RAM
)
@modal.asgi_app()
def serve():
    from synapse.api import app as fastapi_app
    return fastapi_app
```

### Key Constraint: Why Not vLLM

vLLM fuses attention and MLP operations into custom CUDA kernels (PagedAttention, FlashAttention). These kernels bypass Python's forward pass entirely. TransformerLens needs Python-level hooks (`model.add_hook("blocks.15.hook_resid_post", hook_fn)`) to intercept and modify activations mid-forward-pass. With vLLM, those hooks never fire because Python never sees the intermediate activations.

**You MUST use native HuggingFace transformers via TransformerLens.** The performance cost (~40-60 tok/s instead of ~200 tok/s) is acceptable because we're generating short responses (~200 tokens) and the bottleneck is the SAE encoding step anyway.

## Frontend

### Core Framework

| Package | Version | Why |
|---------|---------|-----|
| `react` | `18.3.1` | UI framework. R3F requires React. |
| `react-dom` | `18.3.1` | DOM rendering. Matched to React version. |
| `vite` | `5.4.11` | Build tool. Fast HMR for iterative hackathon development. `vite build` for production. |
| `typescript` | `5.6.3` | Type safety. Catches activation data shape bugs before runtime. |

### 3D Visualization

| Package | Version | Why |
|---------|---------|-----|
| `three` | `0.169.0` | WebGL renderer. InstancedMesh for 5K nodes in one draw call. |
| `@react-three/fiber` | `8.17.10` | React renderer for Three.js. Declarative scene graph, `useFrame` for render loop. |
| `@react-three/drei` | `9.121.0` | Helpers: OrbitControls, Html (for tooltips in 3D space), Billboard, Text. |
| `@react-three/postprocessing` | `2.16.3` | Bloom effect for feature glow. `EffectComposer` with `Bloom` and `SelectiveBloom` for hovered nodes. |
| `d3-force-3d` | `3.0.6` | Force-directed 3D graph layout. Takes UMAP initial positions and adds spring physics for interactive exploration. Not the full d3 bundle, just the 3D force module. |

### Animation

| Package | Version | Why |
|---------|---------|-----|
| `gsap` | `3.12.5` | Timeline sequencing for the lobotomy reveal. DrawSVG for connection severing animation. `gsap.timeline()` orchestrates: node death → particle burst → edge retraction → response regeneration. Free for non-commercial use (hackathon qualifies). |
| `motion` | `11.11.17` | UI panel animations. Layout transitions for the side-by-side comparator sliding in. Spring physics for the intervention panel. NOT for 3D or high-frequency animation data (Zustand store + useFrame handles that). |

### State Management

| Package | Version | Why |
|---------|---------|-----|
| `zustand` | `5.0.1` | Global state. Stores: current features, selected features, ablation strengths, generation results, sound settings. Transient updates via `useStore.getState()` for 60fps render loop data. **Never `useState` for animation data.** React re-renders kill frame rate. Zustand transient subscriptions bypass React entirely. |

### Utilities

| Package | Version | Why |
|---------|---------|-----|
| `diff` | `7.0.0` | Word-level diffing for the response comparator. Highlights what changed between original and steered responses. |

### `package.json`

```json
{
  "name": "synapse",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.169.0",
    "@react-three/fiber": "^8.17.10",
    "@react-three/drei": "^9.121.0",
    "@react-three/postprocessing": "^2.16.3",
    "d3-force-3d": "^3.0.6",
    "gsap": "^3.12.5",
    "motion": "^11.11.17",
    "zustand": "^5.0.1",
    "diff": "^7.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/three": "^0.169.0",
    "@types/d3-force-3d": "^3.0.2",
    "@types/diff": "^6.0.0",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "@vitejs/plugin-react": "^4.3.4"
  }
}
```

## Infrastructure (Cloudflare)

| Service | Purpose | Config |
|---------|---------|--------|
| **CF Pages** | Static hosting for the React frontend. Push-to-deploy from git. | Build command: `npm run build`, output: `dist/` |
| **CF Workers** | API proxy between frontend and Modal backend. Handles CORS, rate limiting, request validation. | Routes: `/api/*` → proxied to Modal ASGI endpoint |
| **D1** | SQLite database for feature discovery history. Stores: feature_id, label, layer, activation, timestamp, user notes. | Single table, ~100 rows max during demo. |
| **Workers AI** | Generate embeddings for semantic distance computation between original and steered responses. `@cf/baai/bge-base-en-v1.5` model. | Free tier, no GPU cost. |

### Wrangler Config

```toml
name = "synapse-api"
main = "src/worker.ts"
compatibility_date = "2024-12-01"

[[d1_databases]]
binding = "DB"
database_name = "synapse-features"
database_id = "auto-generated"

[ai]
binding = "AI"
```

## File Structure

```
SYNAPSE/
├── README.md
├── ARCHITECTURE.md
├── STACK.md
├── DEMO-SCRIPT.md
├── RISKS.md
├── backend/
│   ├── synapse/
│   │   ├── __init__.py
│   │   ├── api.py              # FastAPI routes
│   │   ├── model.py            # TransformerLens model loading + caching
│   │   ├── sae.py              # SAE encoding + feature extraction
│   │   ├── steering.py         # ActAdd steering vector computation
│   │   ├── ablation.py         # Feature ablation + regeneration
│   │   ├── layout.py           # UMAP 3D projection
│   │   └── schemas.py          # Pydantic request/response models
│   ├── modal_app.py            # Modal entrypoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── store/
│   │   │   └── useSynapseStore.ts   # Zustand store
│   │   ├── components/
│   │   │   ├── PromptConsole.tsx
│   │   │   ├── BrainView.tsx
│   │   │   ├── NeuronGraph.tsx
│   │   │   ├── ActivationEdges.tsx
│   │   │   ├── FeatureGlow.tsx
│   │   │   ├── AblationParticles.tsx
│   │   │   ├── FeatureInspector.tsx
│   │   │   ├── InterventionPanel.tsx
│   │   │   ├── LayerNavigator.tsx
│   │   │   ├── ResponseComparator.tsx
│   │   │   └── FeatureJournal.tsx
│   │   ├── hooks/
│   │   │   ├── useFeatures.ts       # fetch + cache feature data
│   │   │   ├── useAblation.ts       # ablation API calls
│   │   │   └── useSteering.ts       # steering API calls
│   │   ├── audio/
│   │   │   └── SoundEngine.ts       # audio manager
│   │   └── types/
│   │       └── synapse.ts           # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
└── worker/
    ├── src/
    │   └── worker.ts                # CF Workers API proxy
    └── wrangler.toml
```
