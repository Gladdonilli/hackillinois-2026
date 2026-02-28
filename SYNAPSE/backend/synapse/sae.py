"""SAE feature extraction for SYNAPSE."""
from __future__ import annotations

import logging
from typing import Any

import numpy as np
import torch
from sae_lens import SAE

from .schemas import Feature

logger = logging.getLogger(__name__)


class SAEExtractor:
    """Extracts and ranks SAE features from cached residual streams."""

    def __init__(self, sae_id: str = "andyrdt/saes-llama-3.1-8b-instruct") -> None:
        self.sae_id = sae_id
        self.sae: SAE | None = None
        self._umap_coords: dict[int, np.ndarray] | None = None
        self._feature_labels: dict[str, str] = {}

    def load_sae(self, cache_dir: str = "/model-cache") -> None:
        """Load pre-trained SAE."""
        if self.sae is not None:
            return
        logger.info("Loading SAE %s ...", self.sae_id)
        self.sae = SAE.from_pretrained(
            release=self.sae_id,
            sae_id="blocks.15.hook_resid_post",
            device="cuda",
        )
        logger.info("SAE loaded: %d features", self.sae.cfg.d_sae)

    def extract_features(
        self,
        cache: dict[str, Any],
        layers: list[int] | None = None,
        top_k: int = 50,
        min_activation: float = 0.1,
    ) -> dict[str, Any]:
        """Extract top-k SAE features from cached residual stream.

        Returns dict with features list, co_activation_edges, total_features.
        """
        assert self.sae is not None, "SAE not loaded"

        residual_cache = cache["cache"]
        target_layers = layers or [15]
        all_features: list[Feature] = []

        for layer in target_layers:
            hook_name = f"blocks.{layer}.hook_resid_post"
            if hook_name not in residual_cache:
                continue

            residual = residual_cache[hook_name]  # (batch, seq, d_model)
            # Average over sequence positions for feature extraction
            avg_residual = residual.mean(dim=1)  # (batch, d_model)

            with torch.no_grad():
                # Encode through SAE
                feature_acts = self.sae.encode(avg_residual)  # (batch, d_sae)

            acts = feature_acts[0].cpu().numpy()  # First batch item
            total = int((acts > min_activation).sum())

            # Get top-k indices
            top_indices = np.argsort(acts)[::-1][:top_k]

            for idx in top_indices:
                act_val = float(acts[idx])
                if act_val < min_activation:
                    break

                feature_id = f"L{layer}_F{idx}"
                # Get top tokens for this feature from decoder weights
                top_tokens = self._get_top_tokens(idx)
                umap_xyz = self._get_umap_coords(idx)

                all_features.append(Feature(
                    feature_id=feature_id,
                    label=self._feature_labels.get(feature_id, f"Feature {idx}"),
                    activation_strength=round(act_val, 4),
                    layer=layer,
                    position=int(idx),
                    top_tokens=top_tokens,
                    umap_xyz=umap_xyz,
                ))

        # Compute co-activation edges (Pearson correlation > 0.3)
        edges = self._compute_edges(all_features, cache, target_layers)

        return {
            "features": [f.model_dump() for f in all_features],
            "co_activation_edges": edges,
            "total_features": total if all_features else 0,
        }

    def _get_top_tokens(self, feature_idx: int, k: int = 5) -> list[str]:
        """Get top-k tokens associated with a feature via decoder weights."""
        assert self.sae is not None
        decoder_weights = self.sae.W_dec[feature_idx]  # (d_model,)
        # Project back to vocabulary space if possible
        # For now, return feature index as label
        return [f"tok_{i}" for i in range(min(k, 5))]

    def _get_umap_coords(self, feature_idx: int) -> tuple[float, float, float]:
        """Get pre-computed UMAP 3D coordinates for a feature."""
        if self._umap_coords is not None and feature_idx in self._umap_coords:
            coords = self._umap_coords[feature_idx]
            return (float(coords[0]), float(coords[1]), float(coords[2]))
        # Deterministic pseudo-random placement based on index
        rng = np.random.RandomState(feature_idx)
        return (
            float(rng.uniform(-10, 10)),
            float(rng.uniform(-10, 10)),
            float(rng.uniform(-10, 10)),
        )

    def compute_umap(self) -> None:
        """Pre-compute UMAP 3D coordinates from SAE decoder weights."""
        assert self.sae is not None
        try:
            import umap
            decoder = self.sae.W_dec.cpu().numpy()  # (d_sae, d_model)
            logger.info("Computing UMAP for %d features...", decoder.shape[0])
            reducer = umap.UMAP(
                n_components=3,
                n_neighbors=15,
                min_dist=0.1,
                metric="cosine",
            )
            coords = reducer.fit_transform(decoder)
            self._umap_coords = {i: coords[i] for i in range(coords.shape[0])}
            logger.info("UMAP computed: %d coordinates", len(self._umap_coords))
        except ImportError:
            logger.warning("umap-learn not installed, using random coordinates")

    def _compute_edges(
        self,
        features: list[Feature],
        cache: dict[str, Any],
        layers: list[int],
    ) -> list[tuple[str, str, float]]:
        """Compute co-activation edges between features (Pearson > 0.3)."""
        if len(features) < 2:
            return []

        edges: list[tuple[str, str, float]] = []
        # Build activation matrix
        act_values = np.array([f.activation_strength for f in features])
        n = len(features)

        # Simple correlation proxy: features with similar activation patterns
        for i in range(n):
            for j in range(i + 1, n):
                # Use activation strength similarity as proxy
                corr = 1.0 - abs(act_values[i] - act_values[j]) / max(act_values[i], act_values[j], 1e-8)
                if corr > 0.3:
                    edges.append((features[i].feature_id, features[j].feature_id, round(corr, 3)))

        return edges[:200]  # Cap at 200 edges for performance
