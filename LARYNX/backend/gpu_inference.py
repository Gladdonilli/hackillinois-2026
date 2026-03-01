"""LARYNX GPU Inference — HuBERT → AAI → Classifier pipeline on Modal B200.

Standalone module containing all GPU-side logic:
- Image definition (torch/cuda/s3prl/articulatory)
- GpuInference @modal.cls with @modal.enter() model loading
- analyze_single() with configurable multi-pass TTA inference
- Feature extraction (108 articulatory features)

Imported by app.py — endpoints call GpuInference().analyze_single.remote().
"""

from __future__ import annotations

import time
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    import numpy as np

import modal

# ---------------------------------------------------------------------------
# Image — matches overnight_pipeline.py exactly
# ---------------------------------------------------------------------------

gpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libsndfile1", "ffmpeg", "wget", "sox", "git")
    .pip_install(
        "torch==2.7.0+cu128",
        "torchaudio==2.7.0+cu128",
        "numpy>=2.0",
        "s3prl==0.4.18",
        "librosa==0.10.2.post1",
        "soundfile==0.12.1",
        "pyyaml",
        "scipy>=1.12",
        "scikit-learn>=1.5.2",
        extra_index_url="https://download.pytorch.org/whl/cu128",
    )
    .run_commands(
        # Install articulatory with --no-build-isolation (its setup.py does `import pip`
        # which breaks in PEP 517 isolated builds)
        "pip install --no-build-isolation 'articulatory @ git+https://github.com/articulatory/articulatory.git@a50eafd4fb8235643f1523bbbf9ac1d50bbf271b'",
        # Patch scipy 1.12+ kaiser move: scipy.signal.kaiser -> scipy.signal.windows.kaiser
        "sed -i 's/from scipy.signal import kaiser/from scipy.signal.windows import kaiser/g' $(python3 -c 'import articulatory.layers.pqmf; import inspect; print(inspect.getfile(articulatory.layers.pqmf))')",
        # Verify kaiser patch applied
        "python3 -c 'from articulatory.layers.pqmf import PQMF; print(\"kaiser patch OK\")'",
        # Pre-download HuBERT into the image so cold starts don't need 1.18GB download
        "python3 -c \"import s3prl.hub; s3prl.hub.hubert_large_ll60k(); print('HuBERT cached')\"",
    )
    .env({"PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True", "LARYNX_BUILD": "v5-kaiser-fix"})
    .add_local_file(
        "training_data/ensemble_model.pkl",
        "/root/ensemble_model.pkl",
    )
    .add_local_dir(
        "aai_model",
        "/root/aai",
    )
)

# ---------------------------------------------------------------------------
# App & Volume (shared with app.py — Modal deduplicates by name)
# ---------------------------------------------------------------------------

app = modal.App("hackillinois-2026")
model_cache = modal.Volume.from_name("hackillinois-model-cache", create_if_missing=True)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ARTICULATORS = ["li", "ul", "ll", "tt", "tb", "td"]
EMA_DT = 1.0 / 200.0  # 200 Hz EMA sampling rate

SENSOR_NAMES = {
    "tt": "tongueTip",
    "tb": "tongueBody",
    "td": "tongueDorsum",
    "li": "lowerIncisor",
    "ul": "upperLip",
    "ll": "lowerLip",
}

VELOCITY_THRESHOLDS = {"tt": 20.0, "tb": 15.0, "td": 12.0, "li": 10.0, "ul": 15.0, "ll": 18.0}
ABSOLUTE_MAX_VELOCITY = 22.0  # cm/s

HUBERT_KERNELS = [10, 3, 3, 3, 3, 2, 2]
HUBERT_STRIDES = [5, 2, 2, 2, 2, 2, 2]

# Default inference passes — can be overridden per request
DEFAULT_INFERENCE_PASSES = 3

# TTA augmentation ranges (subtle — don't distort formants)
TTA_GAIN_RANGE = (-0.05, 0.05)  # ±5% peak amplitude
TTA_NOISE_STDDEV = 1e-4  # tiny additive noise


def _hubert_output_len(input_len: int) -> int:
    """Compute HuBERT CNN feature extractor output length."""
    length = input_len
    for k, s in zip(HUBERT_KERNELS, HUBERT_STRIDES):
        length = (length - k) // s + 1
    return length


# ---------------------------------------------------------------------------
# GpuInference — single GPU class, multi-pass TTA
# ---------------------------------------------------------------------------

@app.cls(
    image=gpu_image,
    volumes={"/model-cache": model_cache},
    gpu="B200",
    timeout=300,
    startup_timeout=600,
    retries=2,
    max_containers=8,
    min_containers=1,
    scaledown_window=300,
)
@modal.concurrent(max_inputs=2)
class GpuInference:
    """Loads HuBERT + AAI + classifier on A100, processes single audio samples.

    Supports multi-pass test-time augmentation (TTA): runs N slightly-augmented
    copies through the pipeline, averages classifier scores for more robust predictions.
    """

    @modal.enter()
    def setup(self) -> None:
        import os
        import pickle

        import torch
        import yaml

        self.device = torch.device("cuda:0")
        print(f"[GpuInference] Setting up on {torch.cuda.get_device_name(0)}")
        print(f"[GpuInference] VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GiB")

        # --- Load HuBERT (pre-cached in image, no download needed) ---
        print("[GpuInference] Loading HuBERT Large...")
        import s3prl.hub  # type: ignore[import-untyped]

        self.hubert = s3prl.hub.hubert_large_ll60k().to(self.device).eval()
        print("[GpuInference] HuBERT loaded")

        # --- Load AAI ---
        print("[GpuInference] Loading AAI model...")
        # --- Patch scipy.signal.kaiser at runtime (before articulatory import) ---
        # articulatory/layers/pqmf.py does `from scipy.signal import kaiser`
        # but scipy >= 1.12 moved kaiser to scipy.signal.windows
        import scipy.signal
        from scipy.signal.windows import kaiser as _kaiser
        scipy.signal.kaiser = _kaiser
        print("[GpuInference] scipy.signal.kaiser patched")

        from articulatory import utils as aai_utils  # type: ignore[import-untyped]

        ckpt_path = "/root/aai/hprc_h2/best_mel_ckpt.pkl"
        with open("/root/aai/hprc_h2/config.yml") as f:
            aai_config = yaml.safe_load(f)

        self.aai_model = aai_utils.load_model(ckpt_path, aai_config)
        # Weight norm removal is a training optimization — doesn't affect inference output.
        # Skipping to avoid torch 2.7 old/new weight_norm API incompatibility on B200/A100.
        self.aai_model = self.aai_model.to(self.device).eval()
        print("[GpuInference] AAI loaded")

        # --- Load classifier ---
        print("[GpuInference] Loading classifier...")
        with open("/root/ensemble_model.pkl", "rb") as f:
            bundle = pickle.load(f)

        self.classifier = bundle.get("classifier") or bundle["model"]
        self.scaler = bundle["scaler"]
        self.feature_names: list[str] = bundle.get("feature_names") or bundle.get("feature_keys", [])
        self.classifier_name: str = bundle.get("classifier_name") or bundle.get("model_name", "unknown")
        print(f"[GpuInference] Classifier loaded: {self.classifier_name}, {len(self.feature_names)} features")

        print("[GpuInference] Setup complete — ready for inference")

    # ------------------------------------------------------------------
    # Core inference
    # ------------------------------------------------------------------

    @modal.method()
    def analyze_single(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        inference_passes: int = DEFAULT_INFERENCE_PASSES,
    ) -> dict[str, Any]:
        """Process a single audio file through HuBERT → AAI → classifier.

        Args:
            audio_bytes: Raw audio file bytes (WAV/MP3/FLAC/OGG).
            filename: Original filename for logging.
            inference_passes: Number of TTA passes (1 = no augmentation, >1 = averaged).

        Returns:
            dict with keys: frames, verdict, processing_time_ms, pass_scores
        """
        import io

        import librosa
        import numpy as np
        import soundfile as sf
        import torch
        import torch.nn.functional as F

        start = time.time()
        inference_passes = max(1, inference_passes)

        # --- 1. Load and preprocess audio ---
        wav_raw, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32")
        if wav_raw.ndim > 1:
            wav_raw = wav_raw.mean(axis=1)  # stereo → mono
        if sr != 16000:
            wav_raw = librosa.resample(wav_raw, orig_sr=sr, target_sr=16000)
        peak = np.max(np.abs(wav_raw))
        if peak > 0:
            wav_raw = wav_raw / peak

        # --- 2. Multi-pass TTA loop ---
        pass_scores: list[float] = []
        # We'll keep the LAST pass's frames/features for visualization
        # (all passes produce nearly identical EMA — augmentation is subtle)
        final_frames: list[dict] = []
        final_features: dict[str, float] = {}
        final_ema: np.ndarray | None = None
        rng = np.random.default_rng(seed=42)  # deterministic TTA

        for pass_idx in range(inference_passes):
            # Apply TTA augmentation (pass 0 = original, unaugmented)
            if pass_idx == 0:
                wav = wav_raw.copy()
            else:
                # Slight gain perturbation
                gain = 1.0 + rng.uniform(TTA_GAIN_RANGE[0], TTA_GAIN_RANGE[1])
                wav = wav_raw * gain
                # Tiny additive noise
                wav = wav + rng.normal(0, TTA_NOISE_STDDEV, size=wav.shape).astype(np.float32)
                # Re-normalize
                p = np.max(np.abs(wav))
                if p > 0:
                    wav = wav / p

            # --- HuBERT inference (BF16) ---
            wav_tensor = torch.FloatTensor(wav).unsqueeze(0).to(self.device)

            with torch.no_grad(), torch.autocast("cuda", dtype=torch.bfloat16):
                hubert_out = self.hubert(wav_tensor)

            hidden = hubert_out["hidden_states"][-1]  # (1, T_enc, 1024) BF16
            t_valid = _hubert_output_len(len(wav))
            hidden = hidden[0, :t_valid, :]  # (T_valid, 1024)

            # --- AAI inference (FP32 required) ---
            feat = hidden.float().unsqueeze(0).transpose(1, 2)  # (1, 1024, T)
            feat = F.interpolate(feat, scale_factor=2, mode="linear", align_corners=False)
            feat = feat.transpose(1, 2)  # (1, T*2, 1024)

            with torch.no_grad():
                ema_pred = self.aai_model.inference(feat, normalize_before=False)

            ema = ema_pred.cpu().numpy()[:, :12]  # (T_ema, 12) — 6 articulators × 2 coords

            # --- Compute kinematics ---
            all_features: dict[str, float] = {}
            art_velocities: dict[str, np.ndarray] = {}

            for i, art in enumerate(ARTICULATORS):
                x = ema[:, i * 2]
                y = ema[:, i * 2 + 1]
                dx = np.diff(x)
                dy = np.diff(y)
                vel = np.sqrt(dx**2 + dy**2) / EMA_DT / 10.0  # cm/s

                art_velocities[art] = vel

                accel = np.abs(np.diff(vel)) / EMA_DT
                jerk = np.abs(np.diff(accel)) / EMA_DT

                for metric_name, metric_data in [("vel", vel), ("accel", accel), ("jerk", jerk)]:
                    if len(metric_data) == 0:
                        for stat in ["peak", "mean", "p95", "p99", "median", "std"]:
                            all_features[f"{art}_{metric_name}_{stat}"] = 0.0
                        continue
                    all_features[f"{art}_{metric_name}_peak"] = float(np.max(metric_data))
                    all_features[f"{art}_{metric_name}_mean"] = float(np.mean(metric_data))
                    all_features[f"{art}_{metric_name}_p95"] = float(np.percentile(metric_data, 95))
                    all_features[f"{art}_{metric_name}_p99"] = float(np.percentile(metric_data, 99))
                    all_features[f"{art}_{metric_name}_median"] = float(np.median(metric_data))
                    all_features[f"{art}_{metric_name}_std"] = float(np.std(metric_data))

            # --- Classifier prediction ---
            feature_vector = np.array(
                [all_features.get(fn, 0.0) for fn in self.feature_names]
            ).reshape(1, -1)
            feature_scaled = self.scaler.transform(feature_vector)
            proba = self.classifier.predict_proba(feature_scaled)[0]
            p_deepfake = float(proba[1]) if len(proba) > 1 else float(proba[0])
            pass_scores.append(p_deepfake)

            # Keep last pass data for frames/visualization
            final_features = all_features
            final_ema = ema

            # Build frames only on last pass (avoid redundant work)
            if pass_idx == inference_passes - 1:
                final_frames = self._build_frames(ema, art_velocities)

        # --- 3. Aggregate multi-pass scores ---
        avg_p_deepfake = sum(pass_scores) / len(pass_scores)
        is_genuine = avg_p_deepfake < 0.5
        confidence = abs(avg_p_deepfake - 0.5) * 2  # 0-1 scale

        # Compute frame-level stats from final pass
        peak_velocity = 0.0
        anomalous_count = 0
        for frame in final_frames:
            if frame["tongueVelocity"] > peak_velocity:
                peak_velocity = frame["tongueVelocity"]
            if frame["isAnomalous"]:
                anomalous_count += 1

        n_frames = len(final_frames)
        anomaly_ratio = anomalous_count / max(n_frames, 1)
        processing_time_ms = int((time.time() - start) * 1000)

        verdict = {
            "isGenuine": is_genuine,
            "confidence": round(confidence, 4),
            "peakVelocity": round(peak_velocity, 2),
            "threshold": ABSOLUTE_MAX_VELOCITY,
            "anomalousFrameCount": anomalous_count,
            "totalFrameCount": n_frames,
            "anomalyRatio": round(anomaly_ratio, 4),
            "classifierScore": round(avg_p_deepfake, 4),
            "classifierModel": self.classifier_name,
            "inferencePasses": inference_passes,
            "passScores": [round(s, 4) for s in pass_scores],
            "processingTimeMs": processing_time_ms,
        }

        return {
            "frames": final_frames,
            "verdict": verdict,
            "processing_time_ms": processing_time_ms,
        }

    # ------------------------------------------------------------------
    # Frame building (extracted for clarity)
    # ------------------------------------------------------------------

    def _build_frames(
        self,
        ema: "np.ndarray",  # type: ignore[name-defined]
        art_velocities: dict[str, "np.ndarray"],  # type: ignore[name-defined]
    ) -> list[dict]:
        """Build EMA frames for frontend visualization from raw EMA + velocities."""
        frames: list[dict] = []
        n_frames = len(ema) - 1  # velocity has one fewer sample than position

        for t in range(n_frames):
            timestamp = t * EMA_DT
            sensors: dict[str, dict[str, float]] = {}
            frame_max_vel = 0.0

            for art in ARTICULATORS:
                vel_val = float(art_velocities[art][t])
                x_val = float(ema[t, ARTICULATORS.index(art) * 2])
                y_val = float(ema[t, ARTICULATORS.index(art) * 2 + 1])

                display_name = SENSOR_NAMES[art]
                sensors[display_name] = {"x": x_val, "y": y_val, "velocity": vel_val}

                if vel_val > frame_max_vel:
                    frame_max_vel = vel_val

            # Anomaly detection
            is_anomalous = False
            for art in ARTICULATORS:
                vel_val = float(art_velocities[art][t])
                threshold = VELOCITY_THRESHOLDS.get(art, ABSOLUTE_MAX_VELOCITY)
                if vel_val > threshold or vel_val > ABSOLUTE_MAX_VELOCITY:
                    is_anomalous = True
                    break

            frames.append({
                "sensors": sensors,
                "tongueVelocity": frame_max_vel,
                "timestamp": timestamp,
                "isAnomalous": is_anomalous,
            })

        return frames
