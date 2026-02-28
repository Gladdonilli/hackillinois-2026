"""Feature ablation for SYNAPSE."""
from __future__ import annotations

import logging
from typing import Any, Callable

import torch
from transformer_lens import HookedTransformer

from .model import ModelManager
from .sae import SAEExtractor
from .schemas import AblateData, AblationEntry

logger = logging.getLogger(__name__)


def _compute_semantic_distance(text_a: str, text_b: str) -> float:
    """Compute semantic distance between two texts.

    Simple word-overlap based distance (0.0 = identical, 1.0 = completely different).
    For production, use embedding cosine similarity via Workers AI bge-base-en-v1.5.
    """
    words_a = set(text_a.lower().split())
    words_b = set(text_b.lower().split())
    if not words_a and not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    jaccard = len(intersection) / len(union) if union else 0.0
    return round(1.0 - jaccard, 4)


def make_ablation_hook(
    sae: Any,
    ablations: list[AblationEntry],
) -> Callable[..., torch.Tensor]:
    """Create a hook that modifies SAE feature activations during forward pass.

    For each ablation entry:
    - strength=1.0 → full ablation (clamp to -10, effectively zeroing feature)
    - strength=0.5 → partial ablation (clamp to -5)
    - strength=0.0 → no change

    The hook encodes through SAE, modifies activations, then decodes back.
    """
    def hook_fn(value: torch.Tensor, hook: Any) -> torch.Tensor:
        # value: (batch, seq, d_model)
        batch, seq, d_model = value.shape
        flat = value.reshape(-1, d_model)  # (batch*seq, d_model)

        # Encode through SAE
        feature_acts = sae.encode(flat)  # (batch*seq, d_sae)

        # Apply ablations
        for entry in ablations:
            # Parse feature index from feature_id (format: "L{layer}_F{idx}")
            parts = entry.feature_id.split("_F")
            if len(parts) != 2:
                continue
            try:
                feat_idx = int(parts[1])
            except ValueError:
                continue

            clamp_value = (1.0 - entry.strength) * -10.0
            feature_acts[:, feat_idx] = feature_acts[:, feat_idx].clamp(max=clamp_value)

        # Decode back to residual space
        modified = sae.decode(feature_acts)  # (batch*seq, d_model)
        return modified.reshape(batch, seq, d_model)

    return hook_fn


def ablate_features(
    model_manager: ModelManager,
    sae_extractor: SAEExtractor,
    job_id: str,
    ablations: list[AblationEntry],
    regenerate: bool = True,
) -> AblateData:
    """Ablate specified features and optionally regenerate response."""
    assert model_manager.model is not None, "Model not loaded"
    assert sae_extractor.sae is not None, "SAE not loaded"

    cached = model_manager.get_residual_stream(job_id)
    original_response = cached["response"]
    prompt = cached["prompt"]

    if not regenerate:
        return AblateData(
            original_response=original_response,
            steered_response=original_response,
            semantic_distance=0.0,
        )

    # Create ablation hook on the SAE's target layer
    hook_name = "blocks.15.hook_resid_post"
    hook_fn = make_ablation_hook(sae_extractor.sae, ablations)

    steered_response = model_manager.regenerate_with_hooks(
        prompt=prompt,
        hooks=[(hook_name, hook_fn)],
    )

    distance = _compute_semantic_distance(original_response, steered_response)

    logger.info(
        "Ablation complete: %d features modified, semantic_distance=%.4f",
        len(ablations),
        distance,
    )

    return AblateData(
        original_response=original_response,
        steered_response=steered_response,
        semantic_distance=distance,
    )
