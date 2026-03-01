"""LARYNX Classifier — Hybrid ensemble integration for deepfake detection.

Loads the trained model bundle (ensemble_model.pkl or classifier_model.pkl),
extracts articulatory features matching the training pipeline, and returns
a deepfake probability score.

IMPORTANT: Feature extraction MUST match overnight_pipeline.py's predict_ema_batch().
Training produces 108 features: 6 articulators × 3 signals (vel/accel/jerk) × 6 stats
(peak/mean/p95/p99/median/std). The model bundle's 'feature_names' key is authoritative.
"""

from __future__ import annotations

import logging
import pickle
from pathlib import Path
from typing import Any, Optional

import numpy as np

from LARYNX.backend.models import EMAFrame

logger = logging.getLogger(__name__)

# Path to saved classifier model bundle — check both names
# overnight_pipeline.py saves as ensemble_model.pkl, legacy as classifier_model.pkl
MODEL_DIR = Path(__file__).parent
MODEL_PATHS = [
    MODEL_DIR / "training_data" / "ensemble_model.pkl",
    MODEL_DIR / "ensemble_model.pkl",
    MODEL_DIR / "classifier_model.pkl",
]

# Map pipeline sensor names → classifier articulator column indices
# Classifier expects 12D: LI(0,1), UL(2,3), LL(4,5), TT(6,7), TB(8,9), TD(10,11)
SENSOR_TO_CLASSIFIER = {
    "JAW": 0,   # JAW → LI (indices 0, 1)
    "UL": 2,    # UL → UL (indices 2, 3)
    "LL": 4,    # LL → LL (indices 4, 5)
    "T1": 6,    # T1 → TT (indices 6, 7)
    "T2": 8,    # T2 → TB (indices 8, 9)
    "T3": 10,   # T3 → TD (indices 10, 11)
}

# Classifier articulator names and their column indices (must match train_classifier.py)
ARTICULATORS = {
    "LI": (0, 1),
    "UL": (2, 3),
    "LL": (4, 5),
    "TT": (6, 7),
    "TB": (8, 9),
    "TD": (10, 11),
}

# Pipeline runs at 100 fps (formant time step = 0.01s)
# overnight_pipeline trains at 200 Hz — but the model bundle's feature_names
# are scale-invariant (statistics), so dt only affects absolute magnitudes.
# We use pipeline dt to match the live data rate.
PIPELINE_DT = 0.01


def _load_model() -> Optional[dict[str, Any]]:
    """Load classifier model bundle from disk. Checks both naming conventions.

    Returns None if unavailable. Normalizes key names across bundle formats.
    """
    for model_path in MODEL_PATHS:
        try:
            if not model_path.exists():
                continue
            with open(model_path, "rb") as f:
                bundle = pickle.load(f)

            # Support both naming conventions from different training scripts
            # overnight_pipeline.py uses: model, scaler, feature_keys, model_name
            # legacy train_classifier.py uses: classifier, scaler, feature_names, classifier_name
            normalized = {}
            normalized["classifier"] = bundle.get("model") or bundle.get("classifier")
            normalized["scaler"] = bundle.get("scaler")
            normalized["feature_names"] = bundle.get("feature_keys") or bundle.get("feature_names")
            normalized["classifier_name"] = bundle.get("model_name") or bundle.get("classifier_name")

            if not all([normalized["classifier"], normalized["scaler"], normalized["feature_names"], normalized["classifier_name"]]):
                logger.warning("Model bundle at %s missing required keys", model_path)
                continue

            logger.info("Loaded classifier from %s (%s, %d features)",
                        model_path.name, normalized["classifier_name"], len(normalized["feature_names"]))
            return normalized

        except Exception as e:
            logger.error("Failed to load classifier model from %s: %s", model_path, e)
            continue

    logger.warning("No classifier model found in %s", MODEL_DIR)
    return None


# Lazy-loaded model singleton
_model_bundle: Optional[dict[str, Any]] = None
_model_loaded: bool = False


def _get_model() -> Optional[dict[str, Any]]:
    """Get cached model bundle, loading on first call."""
    global _model_bundle, _model_loaded
    if not _model_loaded:
        _model_bundle = _load_model()
        _model_loaded = True
    return _model_bundle


def _ema_frames_to_array(ema_frames: list[EMAFrame]) -> np.ndarray:
    """Convert EMAFrame list to (n_frames, 12) numpy array with classifier column layout."""
    n = len(ema_frames)
    ema = np.zeros((n, 12))
    # Build per-sensor x/y lists in a single pass over frames
    sensor_xs: dict[str, list[float]] = {name: [] for name in SENSOR_TO_CLASSIFIER}
    sensor_ys: dict[str, list[float]] = {name: [] for name in SENSOR_TO_CLASSIFIER}
    for frame in ema_frames:
        for sensor_name in SENSOR_TO_CLASSIFIER:
            if sensor_name in frame.sensors:
                sensor_xs[sensor_name].append(frame.sensors[sensor_name].x)
                sensor_ys[sensor_name].append(frame.sensors[sensor_name].y)
            else:
                sensor_xs[sensor_name].append(0.0)
                sensor_ys[sensor_name].append(0.0)
    # Assign to numpy columns with vectorized slicing
    for sensor_name, col_start in SENSOR_TO_CLASSIFIER.items():
        ema[:, col_start] = sensor_xs[sensor_name]
        ema[:, col_start + 1] = sensor_ys[sensor_name]
    return ema


def _compute_kinematics(ema: np.ndarray, ix: int, iy: int) -> dict[str, np.ndarray]:
    """Compute velocity, acceleration, jerk for a 2D articulatory point.

    Matches overnight_pipeline.py's compute_kinematics() logic.
    """
    x = ema[:, ix]
    y = ema[:, iy]

    # Velocity (cm/s)
    dx = np.diff(x)
    dy = np.diff(y)
    vel = np.sqrt(dx**2 + dy**2) / PIPELINE_DT / 10.0  # mm/s → cm/s (match overnight_pipeline.py — NO VELOCITY_SCALE)

    # Acceleration (cm/s²)
    accel = np.abs(np.diff(vel) / PIPELINE_DT)

    # Jerk (cm/s³)
    jerk = np.abs(np.diff(accel) / PIPELINE_DT)

    return {"vel": vel, "accel": accel, "jerk": jerk}


def _extract_features(ema: np.ndarray) -> dict[str, float]:
    """Extract feature vector from EMA trajectory.

    MUST match overnight_pipeline.py's feature extraction exactly.
    Training produces 108 features: 6 articulators × 3 signals × 6 stats.
    Stats: peak, mean, p95, p99, median, std.
    """
    features = {}

    for art_name, (ix, iy) in ARTICULATORS.items():
        kin = _compute_kinematics(ema, ix, iy)
        prefix = art_name.lower()

        for signal_name, signal in kin.items():
            if len(signal) == 0:
                continue

            # 6 statistics — exactly matching overnight_pipeline.py
            features[f"{prefix}_{signal_name}_peak"] = float(np.max(signal))
            features[f"{prefix}_{signal_name}_mean"] = float(np.mean(signal))
            features[f"{prefix}_{signal_name}_p95"] = float(np.percentile(signal, 95))
            features[f"{prefix}_{signal_name}_p99"] = float(np.percentile(signal, 99))
            features[f"{prefix}_{signal_name}_median"] = float(np.median(signal))
            features[f"{prefix}_{signal_name}_std"] = float(np.std(signal))

    return features


def classify_ema_frames(ema_frames: list[EMAFrame]) -> Optional[dict[str, Any]]:
    """Run GBM classifier on EMA frames and return prediction.

    Args:
        ema_frames: List of EMAFrame from the velocity analyzer.

    Returns:
        dict with keys: score (float 0-1, P(deepfake)), model_name (str)
        None if classifier unavailable or extraction fails.
    """
    try:
        bundle = _get_model()
        if bundle is None:
            return None

        if len(ema_frames) < 4:
            logger.warning("Too few EMA frames (%d) for classifier — need at least 4", len(ema_frames))
            return None

        # Convert EMAFrames to numpy array with classifier column layout
        ema = _ema_frames_to_array(ema_frames)

        # Extract features (same as train_classifier.py)
        features = _extract_features(ema)

        # Build feature vector in the same order the classifier was trained on
        feature_names = bundle["feature_names"]
        X = np.array([[features.get(name, 0.0) for name in feature_names]])

        # Scale features with the saved scaler
        X_scaled = bundle["scaler"].transform(X)

        # Predict probability
        classifier = bundle["classifier"]
        if hasattr(classifier, "predict_proba"):
            prob = float(classifier.predict_proba(X_scaled)[0, 1])  # P(deepfake)
        else:
            prob = float(classifier.decision_function(X_scaled)[0])

        return {
            "score": prob,
            "model_name": bundle["classifier_name"],
        }

    except Exception as e:
        logger.error("Classifier failed: %s", e)
        return None
