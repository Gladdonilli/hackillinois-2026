"""LARYNX Classifier — GBM ensemble integration for hybrid deepfake detection.

Loads the trained classifier_model.pkl, extracts the same 252 articulatory
features from live EMA frames, and returns a deepfake probability score.
"""

from __future__ import annotations

import logging
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

from LARYNX.backend.models import EMAFrame

logger = logging.getLogger(__name__)

# Path to saved classifier model bundle
MODEL_PATH = Path(__file__).parent / "classifier_model.pkl"

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
PIPELINE_DT = 0.01


def _load_model() -> Optional[dict]:
    """Load classifier model bundle from disk. Returns None if unavailable."""
    try:
        if not MODEL_PATH.exists():
            logger.warning("Classifier model not found at %s", MODEL_PATH)
            return None
        with open(MODEL_PATH, "rb") as f:
            bundle = pickle.load(f)
        # Validate required keys
        required = {"classifier", "scaler", "feature_names", "classifier_name"}
        if not required.issubset(bundle.keys()):
            logger.warning("Classifier model missing required keys: %s", required - bundle.keys())
            return None
        return bundle
    except Exception as e:
        logger.error("Failed to load classifier model: %s", e)
        return None


# Lazy-loaded model singleton
_model_bundle: Optional[dict] = None
_model_loaded: bool = False


def _get_model() -> Optional[dict]:
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
    for i, frame in enumerate(ema_frames):
        for sensor_name, col_start in SENSOR_TO_CLASSIFIER.items():
            if sensor_name in frame.sensors:
                ema[i, col_start] = frame.sensors[sensor_name].x
                ema[i, col_start + 1] = frame.sensors[sensor_name].y
    return ema


def _compute_kinematics(ema: np.ndarray, ix: int, iy: int) -> dict:
    """Compute velocity, acceleration, jerk for a 2D articulatory point.

    Mirrors train_classifier.py compute_kinematics() exactly.
    """
    x = ema[:, ix]
    y = ema[:, iy]

    # Velocity (cm/s)
    dx = np.diff(x)
    dy = np.diff(y)
    vel = np.sqrt(dx**2 + dy**2) / PIPELINE_DT / 10.0  # mm/s → cm/s

    # Acceleration (cm/s²)
    accel = np.diff(vel) / PIPELINE_DT

    # Jerk (cm/s³)
    jerk = np.abs(np.diff(accel) / PIPELINE_DT)

    # Absolute acceleration
    abs_accel = np.abs(accel)

    return {"vel": vel, "accel": abs_accel, "jerk": jerk}


def _extract_features(ema: np.ndarray) -> dict:
    """Extract comprehensive feature vector from EMA trajectory.

    Mirrors train_classifier.py extract_features() exactly — same feature names,
    same statistics, same cross-articulator ratios, same temporal correlations.
    """
    features = {}

    for art_name, (ix, iy) in ARTICULATORS.items():
        kin = _compute_kinematics(ema, ix, iy)
        prefix = art_name.lower()

        for signal_name, signal in kin.items():
            if len(signal) == 0:
                continue

            # Statistical features
            features[f"{prefix}_{signal_name}_peak"] = float(np.max(signal))
            features[f"{prefix}_{signal_name}_mean"] = float(np.mean(signal))
            features[f"{prefix}_{signal_name}_median"] = float(np.median(signal))
            features[f"{prefix}_{signal_name}_std"] = float(np.std(signal))
            features[f"{prefix}_{signal_name}_p75"] = float(np.percentile(signal, 75))
            features[f"{prefix}_{signal_name}_p90"] = float(np.percentile(signal, 90))
            features[f"{prefix}_{signal_name}_p95"] = float(np.percentile(signal, 95))
            features[f"{prefix}_{signal_name}_p99"] = float(np.percentile(signal, 99))

            # Shape features
            features[f"{prefix}_{signal_name}_skew"] = float(
                np.mean(((signal - np.mean(signal)) / (np.std(signal) + 1e-8)) ** 3)
            )
            features[f"{prefix}_{signal_name}_kurtosis"] = float(
                np.mean(((signal - np.mean(signal)) / (np.std(signal) + 1e-8)) ** 4) - 3
            )

            # Ratio features (tail heaviness)
            mean_val = np.mean(signal) + 1e-8
            features[f"{prefix}_{signal_name}_p99_mean_ratio"] = float(
                np.percentile(signal, 99) / mean_val
            )
            features[f"{prefix}_{signal_name}_peak_mean_ratio"] = float(
                np.max(signal) / mean_val
            )

    # Cross-articulator features (ratios between articulators)
    for art1 in ["ul", "ll", "li"]:
        for art2 in ["tt", "tb", "td"]:
            key1 = f"{art1}_vel_mean"
            key2 = f"{art2}_vel_mean"
            if key1 in features and key2 in features:
                features[f"{art1}_{art2}_vel_ratio"] = features[key1] / (features[key2] + 1e-8)

            key1j = f"{art1}_jerk_mean"
            key2j = f"{art2}_jerk_mean"
            if key1j in features and key2j in features:
                features[f"{art1}_{art2}_jerk_ratio"] = features[key1j] / (features[key2j] + 1e-8)

    # Temporal correlation features (how correlated are articulator movements?)
    for art1_name, (ix1, iy1) in list(ARTICULATORS.items())[:3]:  # lips/jaw
        for art2_name, (ix2, iy2) in list(ARTICULATORS.items())[3:]:  # tongue
            min_len = min(len(ema[:, ix1]), len(ema[:, ix2]))
            corr_x = np.corrcoef(ema[:min_len, ix1], ema[:min_len, ix2])[0, 1]
            corr_y = np.corrcoef(ema[:min_len, iy1], ema[:min_len, iy2])[0, 1]
            features[f"{art1_name.lower()}_{art2_name.lower()}_corr_x"] = float(
                corr_x if np.isfinite(corr_x) else 0
            )
            features[f"{art1_name.lower()}_{art2_name.lower()}_corr_y"] = float(
                corr_y if np.isfinite(corr_y) else 0
            )

    return features


def classify_ema_frames(ema_frames: list[EMAFrame]) -> Optional[dict]:
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
