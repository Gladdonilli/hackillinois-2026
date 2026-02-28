# Modal App Layout

One Modal App. One route class — `LarynxProcessor`. SYNAPSE was archived at the decision gate; its processor class has been removed.

---

## Architecture

```
modal_app.py
├── app = modal.App("hackillinois-2026")
├── shared_image (base container)
├── model_cache (persistent volume)
└── LarynxProcessor (cls, GPU=A100-80GB)
```

Only `LarynxProcessor` remains active.

- LARYNX needs A100 for the AAI model (Wav2Vec2 backbone, ~3GB VRAM) and optional real-time spectrogram generation. Could technically run on A10G, but cold starts are 2x longer.

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
        # Shared
        "numpy==1.26.4",
        "scipy==1.14.1",
        "pydantic==2.10.3",
        "fastapi==0.115.6",
    )
    .env({"HF_HOME": "/model-cache"})
)
```

SYNAPSE deps (`transformer-lens`, `sae-lens`) removed — no longer needed.

## Persistent Volume

```python
model_cache = modal.Volume.from_name("model-cache", create_if_missing=True)
```

Mounted at `/model-cache`. Stores HuggingFace model weights (AAI Wav2Vec2 backbone) so cold starts don't re-download.

Pre-warm the volume early in the hackathon:

```bash
modal run modal_app.py::download_models
```

## Secrets

```python
hf_secret = modal.Secret.from_name("huggingface")
# Set via: modal secret create huggingface HF_TOKEN=hf_xxx
```

Needed for AAI model weights if hosted as a gated model. Set this up before you need it, not during a demo.

## App Definition

```python
import modal

app = modal.App("hackillinois-2026")

shared_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.5.1", "torchaudio==2.5.1", "transformers==4.47.0",
        "safetensors==0.4.5", "librosa==0.10.2", "parselmouth==0.4.4",
        "soundfile==0.12.1",
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
    min_containers=1,
    scaledown_window=120,
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


@app.function(image=shared_image, volumes={"/model-cache": model_cache}, secrets=[hf_secret])
def download_models():
    """Pre-warm the model cache. Run this early: `modal run modal_app.py::download_models`"""
    from transformers import AutoModel, AutoTokenizer
    # Downloads AAI model weights to /model-cache
    print("Models cached to /model-cache")
```

## Hitting the Endpoints

From your CF Worker or local dev:

```typescript
// Deploy gives you a URL like: https://your-workspace--hackillinois-2026-larynxprocessor-analyze.modal.run
const LARYNX_URL = import.meta.env.VITE_LARYNX_ENDPOINT;

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
| `timeout` | 300s | AAI inference + formant extraction can take 30-60s. 300s gives headroom. |
| `min_containers` | 1 | One container always hot. Cold start on A100 is 45-90s, which kills a live demo. |
| `scaledown_window` | 120s | Container stays alive 2 min after last request. Covers back-to-back demo runs. |

Decision gate complete — LARYNX won. SYNAPSE processor class removed from this layout. Only `LarynxProcessor` remains active.

If you need to reference the old SYNAPSE processor code, check git history.
