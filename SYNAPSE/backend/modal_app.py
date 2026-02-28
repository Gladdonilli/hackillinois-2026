"""Modal deployment for SYNAPSE backend."""
from __future__ import annotations

import modal

app = modal.App("synapse")

volume = modal.Volume.from_name("synapse-models", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.5.1",
        "transformer-lens==2.8.1",
        "sae-lens==4.1.1",
        "einops==0.8.0",
        "umap-learn==0.5.7",
        "numpy==1.26.4",
        "scipy==1.14.1",
        "fastapi==0.115.6",
        "uvicorn==0.32.1",
        "pydantic==2.10.3",
        "sse-starlette==2.1.3",
        "huggingface-hub==0.27.0",
        extra_index_url="https://download.pytorch.org/whl/cu124",
    )
)


@app.cls(
    image=image,
    gpu=modal.gpu.A100(size="80GB"),
    volumes={"/model-cache": volume},
    keep_warm=1,
    timeout=300,
    memory=32768,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class SynapseProcessor:
    """Modal class serving SYNAPSE API via FastAPI."""

    @modal.enter()
    def setup(self) -> None:
        """Load model and SAE on container startup."""
        import os
        os.environ["HF_HOME"] = "/model-cache"
        os.environ["TRANSFORMERS_CACHE"] = "/model-cache"

        from synapse.model import ModelManager
        from synapse.sae import SAEExtractor

        self.model_manager = ModelManager()
        self.model_manager.load_model(cache_dir="/model-cache")

        self.sae_extractor = SAEExtractor()
        self.sae_extractor.load_sae(cache_dir="/model-cache")
        self.sae_extractor.compute_umap()

    @modal.asgi_app()
    def serve(self) -> object:
        """Return the FastAPI app."""
        from synapse.api import create_app
        return create_app(self.model_manager, self.sae_extractor)
