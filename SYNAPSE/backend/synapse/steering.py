"""ActAdd steering vectors for SYNAPSE."""
from __future__ import annotations

import logging
from typing import Any, Callable

import torch
from transformer_lens import HookedTransformer

logger = logging.getLogger(__name__)


def compute_steering_vector(
    model: HookedTransformer,
    pos_prompt: str,
    neg_prompt: str,
    layer: int = 15,
) -> torch.Tensor:
    """Compute ActAdd steering vector: activation(pos) - activation(neg).

    The steering vector captures the direction in activation space that
    differentiates the positive and negative prompts.
    """
    hook_name = f"blocks.{layer}.hook_resid_post"

    with torch.no_grad():
        _, pos_cache = model.run_with_cache(pos_prompt)
        _, neg_cache = model.run_with_cache(neg_prompt)

    # Average over sequence positions to get a single direction
    pos_act = pos_cache[hook_name].mean(dim=1)  # (1, d_model)
    neg_act = neg_cache[hook_name].mean(dim=1)  # (1, d_model)

    steering_vector = pos_act - neg_act  # (1, d_model)

    torch.cuda.empty_cache()
    logger.info(
        "Steering vector computed: layer=%d, norm=%.4f",
        layer,
        steering_vector.norm().item(),
    )
    return steering_vector


def make_steering_hook(
    steering_vector: torch.Tensor,
    alpha: float = 1.0,
) -> Callable[..., torch.Tensor]:
    """Create a forward hook that adds the steering vector to activations.

    Hook signature: (value, hook) -> modified_value
    """
    def hook_fn(value: torch.Tensor, hook: Any) -> torch.Tensor:
        # value shape: (batch, seq, d_model)
        # steering_vector shape: (1, d_model) — broadcast over seq
        return value + alpha * steering_vector.unsqueeze(1)

    return hook_fn


def generate_steered(
    model: HookedTransformer,
    prompt: str,
    steering_vector: torch.Tensor,
    layer: int = 15,
    alpha: float = 1.0,
    max_new_tokens: int = 256,
    temperature: float = 0.7,
) -> str:
    """Generate text with ActAdd steering applied.

    Registers a forward hook that adds alpha * steering_vector to the
    residual stream at the specified layer during generation.
    """
    hook_name = f"blocks.{layer}.hook_resid_post"
    hook_fn = make_steering_hook(steering_vector, alpha)

    with model.hooks(fwd_hooks=[(hook_name, hook_fn)]):
        output = model.generate(
            prompt,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
        )

    result = model.to_string(output)[0]
    if result.startswith(prompt):
        result = result[len(prompt):]

    torch.cuda.empty_cache()
    return result.strip()
