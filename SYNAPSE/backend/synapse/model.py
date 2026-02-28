"""TransformerLens model manager for SYNAPSE."""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any

import torch
from transformer_lens import HookedTransformer

logger = logging.getLogger(__name__)

# Cache for residual streams keyed by job_id
_residual_cache: dict[str, dict[str, Any]] = {}


class ModelManager:
    """Manages TransformerLens HookedTransformer lifecycle."""

    def __init__(self, model_name: str = "meta-llama/Llama-3.1-8B-Instruct") -> None:
        self.model_name = model_name
        self.model: HookedTransformer | None = None

    def load_model(self, cache_dir: str = "/model-cache") -> None:
        """Load model with float16 on CUDA."""
        if self.model is not None:
            return
        logger.info("Loading %s ...", self.model_name)
        self.model = HookedTransformer.from_pretrained(
            self.model_name,
            cache_dir=cache_dir,
            torch_dtype=torch.float16,
            device="cuda",
        )
        logger.info("Model loaded on %s", self.model.cfg.device)

    def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_new_tokens: int = 256,
    ) -> dict[str, Any]:
        """Generate text and cache the residual stream for later SAE extraction.

        Returns dict with job_id, response, token_count, layers_cached, generation_time_ms.
        """
        assert self.model is not None, "Model not loaded"
        job_id = uuid.uuid4().hex[:12]
        start = time.perf_counter()

        # Run with cache to capture residual stream
        tokens = self.model.to_tokens(prompt)
        with torch.no_grad():
            logits, cache = self.model.run_with_cache(tokens)

        # Greedy / sampled generation
        generated_tokens = self.model.generate(
            prompt,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
        )
        response = self.model.to_string(generated_tokens)[0]
        # Strip the prompt from the response
        if response.startswith(prompt):
            response = response[len(prompt):]

        elapsed_ms = (time.perf_counter() - start) * 1000
        n_layers = self.model.cfg.n_layers

        # Cache residual stream for feature extraction
        _residual_cache[job_id] = {
            "cache": cache,
            "prompt": prompt,
            "response": response,
            "tokens": tokens,
        }

        torch.cuda.empty_cache()

        return {
            "job_id": job_id,
            "response": response.strip(),
            "token_count": int(generated_tokens.shape[-1]),
            "layers_cached": n_layers,
            "generation_time_ms": round(elapsed_ms, 1),
        }

    def get_residual_stream(self, job_id: str) -> dict[str, Any]:
        """Retrieve cached residual stream for a job."""
        if job_id not in _residual_cache:
            raise KeyError(f"Job {job_id} not found in cache")
        return _residual_cache[job_id]

    def regenerate_with_hooks(
        self,
        prompt: str,
        hooks: list[tuple[str, Any]],
        max_new_tokens: int = 256,
        temperature: float = 0.7,
    ) -> str:
        """Generate with custom forward hooks applied."""
        assert self.model is not None, "Model not loaded"
        fwd_hooks = []
        for hook_name, hook_fn in hooks:
            fwd_hooks.append((hook_name, hook_fn))

        with self.model.hooks(fwd_hooks=fwd_hooks):
            output = self.model.generate(
                prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                do_sample=temperature > 0,
            )

        result = self.model.to_string(output)[0]
        if result.startswith(prompt):
            result = result[len(prompt):]

        torch.cuda.empty_cache()
        return result.strip()
