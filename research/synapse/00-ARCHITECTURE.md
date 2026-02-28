# SYNAPSE Architecture Research

> Source: Multi-agent research sweep (Feb 28 2026). Covers ActAdd steering, SAE inference, Modal deployment, and R3F visualization architecture.

## Core Concept

"Live brain surgery on an AI" — type a prompt, watch the neural network think in 3D, click neurons to kill/amplify them, see behavior change in real-time.

## Activation Steering: ActAdd (Primary Method)

ActAdd (Turner et al.) achieves ~90% of the wow factor at ~5% of the implementation effort vs full SAE feature circuits.

```python
# 30 lines of Python — the entire steering engine
from transformer_lens import HookedTransformer

model = HookedTransformer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")

def get_activation(text: str, layer: int = 15) -> torch.Tensor:
    """Extract residual stream activation at a specific layer."""
    _, cache = model.run_with_cache(text)
    return cache[f"blocks.{layer}.hook_resid_post"][:, -1, :]  # last token

# Compute steering vector
pos_act = get_activation("I absolutely love this! It's wonderful!")
neg_act = get_activation("I dislike this. It's terrible.")
steering_vector = pos_act - neg_act  # shape: [1, d_model]

# Apply during generation via hook
def steering_hook(activation, hook, alpha=3.0):
    activation[:, :, :] += alpha * steering_vector
    return activation

model.add_hook(f"blocks.15.hook_resid_post", steering_hook)
output = model.generate("Tell me about cats", max_new_tokens=100)
```

**Key constraint:** CANNOT use vLLM — fused CUDA kernels block Python-level hooks. MUST use native HuggingFace transformers / TransformerLens on Modal A100. ~40-60 tok/s on A100 = 1-2s per generation.

## Model Selection

| Model | VRAM | Why |
|-------|------|-----|
| **Gemma-2-2B** (primary) | ~5GB float16 | Small enough for fast inference, Google DeepMind Gemma Scope SAEs available, well-documented in TransformerLens |
| Llama-3.1-8B-Instruct (backup) | ~16GB float16 | More capable responses, andyrdt/saes-llama-3.1-8b-instruct available (BatchTopK, k=32-256) |

**VRAM budget:** <8GB model + <2GB SAE = <10GB total on A100 40GB. Plenty of headroom.

## SAE Inference Pipeline

```python
from sae_lens import SAE

# Load pre-trained SAE for specific layer
sae = SAE.from_pretrained(
    release="gemma-scope-2b-pt-res",
    sae_id="layer_15/width_16k/average_l0_100",
)

# Encode activations → sparse features
features = sae.encode(residual_stream_activation)  # shape: [seq_len, n_features]
# features is sparse — only ~100 of 16K features are non-zero per token

# Decode back (for ablation verification)
reconstructed = sae.decode(features)
```

## Feature Labels

**Neuronpedia** provides human-readable labels via S3 bulk export:
- Download full feature index offline (JSON, ~50MB for 16K features)
- Each feature has: label, top activating examples, activation histogram
- Use for tooltips in 3D visualization
- Fallback: show top-5 activating tokens as proxy label

## Modal Deployment

```python
import modal

app = modal.App("synapse")
volume = modal.Volume.from_name("synapse-weights", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("torch==2.5.1", "transformer-lens==2.8.1", "sae-lens==4.1.1",
                 "einops", "fastapi", "uvicorn", "sse-starlette")
    .run_function(download_weights)  # bake weights into image layer
)

@app.function(
    image=image,
    gpu="A100",
    volumes={"/weights": volume},
    keep_warm=1,  # always-hot container for demo
    timeout=300,
)
@modal.web_endpoint(method="POST")
def generate(request: GenerateRequest) -> GenerateResponse:
    ...
```

**Weight baking:** Download model + SAE weights during image build (`run_function`), not at container startup. Cold start < 5s (just GPU allocation, no download).

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/generate` | Generate text with cached activations |
| POST | `/api/features/{job_id}` | Extract SAE features from cached activations |
| POST | `/api/ablate` | Zero out selected features, regenerate |
| POST | `/api/steer` | Apply ActAdd steering vector, regenerate |

All responses wrapped in `ApiResponse<T>` envelope per `shared/contracts/api-common.md`.

## 3D Visualization Architecture

### UMAP Pre-computation
- SAE features exist in 16K-dimensional space → UMAP reduces to 3D
- Pre-compute UMAP coordinates for all 16K features ONCE at build time
- Store as JSON lookup: `{ feature_id: [x, y, z] }`
- Runtime: just look up coords, no UMAP at inference time

### R3F Rendering
```
InstancedMesh (16K instances, one per feature)
  - Position: UMAP xyz
  - Color: resting (#1A1025) → firing (#00FFFF) → ablated (#111111) → targeted (#FF0044)
  - Scale: activation_strength * baseSize
  - Emissive: firing=2.5, targeted=3.0 (triggers Bloom)

LineSegments (co-activation edges)
  - Source: feature_id A position
  - Target: feature_id B position
  - Opacity: correlation_weight
  - Only render top-500 edges (perf budget)
```

### d3-force-3d Layout
- Initial positions from UMAP
- d3-force-3d simulation for organic clustering
- Forces: charge (repulsion), link (co-activation edges), centering
- Simulation runs 300 ticks at build time, frozen at runtime

## Performance Budget

| Metric | Target | Constraint |
|--------|--------|------------|
| Generation latency | <2s | A100 + keep_warm=1 |
| Feature extraction | <500ms | SAE.encode is a single matmul |
| Ablation + regen | <3s | Same model, just mask features |
| 3D render | 60fps | InstancedMesh + frustum culling |
| Cold start | <5s | Weight baking in image |

## Alternatives (ranked by complexity)

| Method | Lines | Pre-computation | Wow Factor |
|--------|-------|-----------------|------------|
| **ActAdd** | ~30 | None | 90% |
| CAA/Rimsky | 50-100 | Contrastive pairs | 95% |
| RepE/Hendrycks | 150-200 | Direction finding | 95% |
| ITI/Harvard | 250+ | Probing classifiers | 85% |

## Key Insight from Review

**Feature AMPLIFICATION (clamping to 10x) is far more dramatic than ablation (setting to 0).** Reframe from "kill neuron" to "overclock neuron" — when you amplify, the model goes visibly haywire. When you ablate, it just gets slightly worse. The demo moment is cranking a sycophancy feature to 10x and watching the model debase itself.
