# Modal App Layout

One Modal App. Two route classes. At the decision gate, the loser's `keep_warm` drops to zero and you never think about it again.

---

## Architecture

```
modal_app.py
├── app = modal.App("hackillinois-2026")
├── shared_image (base container)
├── model_cache (persistent volume)
├── LarynxProcessor (cls, GPU=A100-80GB)
└── SynapseProcessor (cls, GPU=A100-80GB)
```

Both classes live in the same file. They share the base image and the model cache volume. Only one should have `keep_warm=1` at any time during the final push (after decision gate). During parallel development, both can be warm if you're actively testing.

## GPU

**A100-80GB** for both tracks. Non-negotiable.

- LARYNX needs it for the AAI model (Wav2Vec2 backbone, ~3GB VRAM) and optional real-time spectrogram generation. Could technically run on A10G, but cold starts are 2x longer.
- SYNAPSE needs it for Llama-3.1-8B (16-bit = ~16GB VRAM) plus TransformerLens overhead for SAE extraction. Won't fit on anything smaller.

## Container Image

```python
shared_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        # Core ML
        "torch==2.5.1",
        "torchaudio==2.5.1",
        "transformers==4.47.0",
        "safetensors==0.4.5",
        # Audio processing (LARYNX)
        "librosa==0.10.2",
        "parselmouth==0.4.4",
        "soundfile==0.12.1",
        # SAE / interpretability (SYNAPSE)
        "transformer-lens==2.8.1",
        "sae-lens==4.1.1",
        # Shared
        "numpy==1.26.4",
        "scipy==1.14.1",
        "pydantic==2.10.3",
        "fastapi==0.115.6",
    )
    .env({"HF_HOME": "/model-cache"})
)
```

Yes, both tracks' deps are in one image. The image builds once, and unused packages don't cost runtime memory. Splitting into two images doubles your cold-start debugging surface for zero gain in a 36-hour sprint.

## Persistent Volume

```python
model_cache = modal.Volume.from_name("model-cache", create_if_missing=True)
```

Mounted at `/model-cache`. Stores HuggingFace model weights so cold starts don't re-download 16GB of Llama weights every time.

Pre-warm the volume early in the hackathon:

```bash
modal run modal_app.py::download_models
```

## Secrets

```python
hf_secret = modal.Secret.from_name("huggingface")
# Set via: modal secret create huggingface HF_TOKEN=hf_xxx
```

Needed for Llama-3.1-8B (gated model). Set this up before you need it, not during a demo.

## App Definition

```python
import modal

app = modal.App("hackillinois-2026")

shared_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.5.1", "torchaudio==2.5.1", "transformers==4.47.0",
        "safetensors==0.4.5", "librosa==0.10.2", "parselmouth==0.4.4",
        "soundfile==0.12.1", "transformer-lens==2.8.1", "sae-lens==4.1.1",
        "numpy==1.26.4", "scipy==1.14.1", "pydantic==2.10.3", "fastapi==0.115.6",
    )
    .env({"HF_HOME": "/model-cache"})
)

model_cache = modal.Volume.from_name("model-cache", create_if_missing=True)
hf_secret = modal.Secret.from_name("huggingface")


@app.function(
    image=shared_image,
    gpu="A100-80GB",
    volumes={"/model-cache": model_cache},
    timeout=300,
    keep_warm=1,  # Set to 0 after decision gate if LARYNX loses
    container_idle_timeout=120,
)
class LarynxProcessor:
    @modal.enter()
    def load_models(self):
        import parselmouth
        # Load AAI model if available, otherwise formant-only mode
        self.formant_ready = True
        self.aai_ready = False  # flip to True once AAI weights confirmed

    @modal.method()
    def health(self):
        return {"status": "warm", "formant": self.formant_ready, "aai": self.aai_ready}

    @modal.method()
    def analyze(self, audio_bytes: bytes, sample_rate: int = 16000):
        # 1. Extract formants via parselmouth
        # 2. Run AAI model if available
        # 3. Compute tongue velocity
        # 4. Return verdict + EMA frames
        pass


@app.function(
    image=shared_image,
    gpu="A100-80GB",
    volumes={"/model-cache": model_cache},
    secrets=[hf_secret],
    timeout=300,
    keep_warm=1,  # Set to 0 after decision gate if SYNAPSE loses
    container_idle_timeout=120,
)
class SynapseProcessor:
    @modal.enter()
    def load_models(self):
        from transformer_lens import HookedTransformer
        # Load Llama-3.1-8B + pre-trained SAEs
        self.model = HookedTransformer.from_pretrained(
            "meta-llama/Llama-3.1-8B",
            device="cuda",
            torch_dtype="float16",
        )
        self.model_ready = True

    @modal.method()
    def health(self):
        return {"status": "warm", "model": self.model_ready}

    @modal.method()
    def steer(self, prompt: str, features_to_ablate: list[int]):
        # 1. Run base generation
        # 2. Extract SAE features at target layers
        # 3. Ablate specified features (set activation to 0)
        # 4. Re-run generation with ablated features
        # 5. Return before/after comparison
        pass


@app.function(image=shared_image, volumes={"/model-cache": model_cache}, secrets=[hf_secret])
def download_models():
    """Pre-warm the model cache. Run this early: `modal run modal_app.py::download_models`"""
    from transformers import AutoModel, AutoTokenizer
    # Downloads to /model-cache via HF_HOME env var
    AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B")
    AutoModel.from_pretrained("meta-llama/Llama-3.1-8B")
    print("Models cached to /model-cache")
```

## Hitting the Endpoints

From your CF Worker or local dev:

```typescript
// Deploy gives you a URL like: https://your-workspace--hackillinois-2026-larynxprocessor-analyze.modal.run
const LARYNX_URL = import.meta.env.VITE_LARYNX_ENDPOINT;
const SYNAPSE_URL = import.meta.env.VITE_SYNAPSE_ENDPOINT;

// Health check (GET)
const health = await fetch(`${LARYNX_URL}/health`);

// Analyze (POST)
const result = await fetch(`${LARYNX_URL}/analyze`, {
  method: 'POST',
  body: audioBytes,
  headers: { 'Content-Type': 'application/octet-stream' },
});
```

## Timeouts and Cold Starts

| Config | Value | Why |
|--------|-------|-----|
| `timeout` | 300s | Llama generation + SAE extraction can take 60-90s. 300s gives headroom. |
| `keep_warm` | 1 | One container always hot. Cold start on A100 is 45-90s, which kills a live demo. |
| `container_idle_timeout` | 120s | Container stays alive 2 min after last request. Covers back-to-back demo runs. |

## At the Decision Gate

1. Open `modal_app.py`
2. Find the loser's class
3. Change `keep_warm=1` to `keep_warm=0`
4. `modal deploy modal_app.py`
5. Done. The loser's container drains in ~2 minutes. You're no longer paying for it.

Don't delete the loser's class. Just zero out `keep_warm`. If something goes catastrophically wrong in the last 12 hours, you can flip it back in 30 seconds.
