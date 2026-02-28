"""CSIS Phase 2 — AAI Model Validation on Modal (A100).

STANDALONE SCRIPT — not imported by app.py or any other module.
Has its own modal.App('hackillinois-2026') and Modal image definition.

Runs Peter Wu's Acoustic-to-Articulatory Inversion model on real vs deepfake
WAV files and compares EMA tongue velocity profiles.

Usage:
    source ~/modal-env/bin/activate
    modal run LARYNX/backend/csis_modal.py
"""
from __future__ import annotations

import modal

app = modal.App("hackillinois-2026")

model_cache = modal.Volume.from_name("model-cache", create_if_missing=True)

aai_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libsndfile1", "git", "ffmpeg")
    .pip_install(
        "torch==2.5.1",
        "torchaudio==2.5.1",
        "numpy==2.1.3",
        "scipy==1.13.1",
        "soundfile>=0.10.2",
        "librosa==0.10.2.post1",
        "PyYAML",
        "tqdm",
        "gdown",
        "s3prl==0.4.18",
        "kaldiio",
        "h5py",
        "matplotlib",
        "tensorboardX",
    )
    .run_commands(
        "pip install git+https://github.com/articulatory/articulatory.git",
        # articulatory's pqmf.py uses scipy.signal.kaiser which was removed in scipy 1.12+
        # Patch the import in-place using find+sed (can't import the module to find its path)
        "find /usr/local/lib/python3.11 -path '*/articulatory/layers/pqmf.py' -exec sed -i 's/from scipy.signal import kaiser/from scipy.signal.windows import kaiser/g' {} +",
        # Verify the patch worked
        "python -c 'import articulatory.layers.pqmf; print(\"pqmf import OK\")'",
    )
)

CHECKPOINT_GDRIVE_FOLDER = "1O-1kX_ngHf1T8EN7HXWABCaEIJLNqxUI"
CHECKPOINT_DIR = "/model-cache/aai/hprc_h2"
HUBERT_CACHE = "/model-cache/hubert"

# EMA coordinate indices (from predict_ema.py):
# 0:LI_x, 1:LI_y, 2:UL_x, 3:UL_y, 4:LL_x, 5:LL_y,
# 6:TT_x, 7:TT_y, 8:TB_x, 9:TB_y, 10:TD_x, 11:TD_y
LI_X, LI_Y = 0, 1   # Lower Incisor (jaw)
UL_X, UL_Y = 2, 3   # Upper Lip
LL_X, LL_Y = 4, 5   # Lower Lip
TT_X, TT_Y = 6, 7   # Tongue Tip
TB_X, TB_Y = 8, 9   # Tongue Body
TD_X, TD_Y = 10, 11  # Tongue Dorsum

ALL_ARTICULATORS = [
    ("LI", LI_X, LI_Y),
    ("UL", UL_X, UL_Y),
    ("LL", LL_X, LL_Y),
    ("TT", TT_X, TT_Y),
    ("TB", TB_X, TB_Y),
    ("TD", TD_X, TD_Y),
]


@app.function(
    image=aai_image,
    gpu="A100",
    volumes={"/model-cache": model_cache},
    timeout=600,
    memory=16384,
)
def download_checkpoint():
    """Download AAI checkpoint from Google Drive to modal volume."""
    import os
    import gdown

    ckpt_path = os.path.join(CHECKPOINT_DIR, "best_mel_ckpt.pkl")
    config_path = os.path.join(CHECKPOINT_DIR, "config.yml")

    if os.path.exists(ckpt_path) and os.path.exists(config_path):
        print(f"Checkpoint already exists at {CHECKPOINT_DIR}")
        model_cache.commit()
        return True

    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

    print(f"Downloading checkpoint from Google Drive folder {CHECKPOINT_GDRIVE_FOLDER}...")
    gdown.download_folder(
        id=CHECKPOINT_GDRIVE_FOLDER,
        output=CHECKPOINT_DIR,
        quiet=False,
    )

    if not os.path.exists(ckpt_path):
        # gdown may create a subfolder — check one level down
        for subdir in os.listdir(CHECKPOINT_DIR):
            subpath = os.path.join(CHECKPOINT_DIR, subdir)
            if os.path.isdir(subpath):
                candidate = os.path.join(subpath, "best_mel_ckpt.pkl")
                if os.path.exists(candidate):
                    import shutil
                    for f in os.listdir(subpath):
                        shutil.move(os.path.join(subpath, f), os.path.join(CHECKPOINT_DIR, f))
                    os.rmdir(subpath)
                    break

    exists = os.path.exists(ckpt_path)
    print(f"Checkpoint download {'SUCCESS' if exists else 'FAILED'}: {ckpt_path}")

    # List what we got
    for f in sorted(os.listdir(CHECKPOINT_DIR)):
        fpath = os.path.join(CHECKPOINT_DIR, f)
        size = os.path.getsize(fpath) if os.path.isfile(fpath) else 0
        print(f"  {f}: {size / 1024 / 1024:.1f} MB")

    model_cache.commit()
    return exists


@app.function(
    image=aai_image,
    gpu="A100",
    volumes={"/model-cache": model_cache},
    timeout=600,
    memory=16384,
)
def predict_ema_velocity(wav_bytes: bytes, filename: str) -> dict:
    """Run AAI inference on a single WAV file, return velocity statistics.

    Returns dict with:
        filename, num_frames, duration_s,
        tt_peak_vel, tt_mean_vel, tt_p95_vel, tt_p99_vel,
        tb_peak_vel, tb_mean_vel, tb_p95_vel,
        td_peak_vel, td_mean_vel, td_p95_vel,
        ema_shape, raw_ema (base64 encoded numpy)
    """
    import os
    import io
    import base64
    import tempfile

    import numpy as np
    import torch
    import soundfile as sf
    import yaml

    # ---- Load HuBERT ----
    os.environ["TORCH_HOME"] = HUBERT_CACHE
    os.environ["HF_HOME"] = HUBERT_CACHE
    import s3prl.hub as hub

    device = torch.device("cuda:0")
    hubert_model = getattr(hub, "hubert_large_ll60k")()
    hubert_device = device
    hubert_model = hubert_model.to(hubert_device)

    # ---- Load AAI inversion model (match predict_ema.py exactly) ----
    from articulatory.utils import load_model
    # NOTE: ar_loop import removed — it transitively imports tkinter (GUI) which
    # is not available in headless Modal containers. We only need model.inference().

    config_path = os.path.join(CHECKPOINT_DIR, "config.yml")
    ckpt_path = os.path.join(CHECKPOINT_DIR, "best_mel_ckpt.pkl")

    if not os.path.exists(ckpt_path):
        return {"error": f"Checkpoint not found at {ckpt_path}. Run download_checkpoint first."}

    with open(config_path) as f:
        inversion_config = yaml.load(f, Loader=yaml.Loader)

    inversion_model = load_model(ckpt_path, inversion_config)
    inversion_model.remove_weight_norm()
    inversion_model = inversion_model.eval().to(device)

    # ---- HuBERT parameters for hprc_h2 ----
    interp_factor = 2
    hop_length = 160
    sr = 16000
    ema_rate = sr / hop_length * interp_factor  # 200 Hz

    # ---- Load audio ----
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(wav_bytes)
        tmp_path = tmp.name

    wav_data, wav_sr = sf.read(tmp_path)
    os.unlink(tmp_path)

    if wav_sr != sr:
        import librosa
        wav_data = librosa.resample(wav_data, orig_sr=wav_sr, target_sr=sr)

    duration_s = len(wav_data) / sr

    # ---- Extract HuBERT features (matching predict_ema.py lines 84-94 exactly) ----
    with torch.no_grad():
        wavs = [torch.from_numpy(wav_data).float().to(hubert_device)]
        states = hubert_model(wavs)["hidden_states"]
        feature = states[-1].squeeze(0)  # (seq_len, 1024)
        target_length = len(feature) * interp_factor
        feature = torch.nn.functional.interpolate(
            feature.unsqueeze(0).transpose(1, 2),
            size=target_length, mode="linear", align_corners=False
        )
        feature = feature.transpose(1, 2).squeeze(0)  # (seq_len*2, 1024)
        feat = feature.to(device)

        # ---- Run inversion model (check use_ar like original) ----
        if inversion_config.get("generator_params", {}).get("use_ar", False):
            raise RuntimeError(
                "use_ar=True requires ar_loop which depends on tkinter (not available in Modal). "
                "This checkpoint should not need AR decoding — check config.yml."
            )
        else:
            pred = inversion_model.inference(feat, normalize_before=False)
        ema = pred.squeeze(0).cpu().numpy()  # (T, 12)

    # ---- Compute velocities ----
    dt = 1.0 / ema_rate  # 0.005s at 200Hz

    def compute_velocity(ema_arr: np.ndarray, ix: int, iy: int) -> np.ndarray:
        """Euclidean velocity in cm/s for a 2D articulatory point."""
        dx = np.diff(ema_arr[:, ix])
        dy = np.diff(ema_arr[:, iy])
        dist_mm = np.sqrt(dx**2 + dy**2)
        vel_cm_s = dist_mm / dt / 10.0  # mm/s -> cm/s
        return vel_cm_s

    def compute_jerk(vel: np.ndarray) -> np.ndarray:
        """Jerk = d(acceleration)/dt = d²v/dt². Units: cm/s³."""
        accel = np.diff(vel) / dt
        jerk = np.diff(accel) / dt
        return np.abs(jerk)

    # Compute velocity AND jerk for ALL 6 articulators
    art_stats = {}
    for name, ix, iy in ALL_ARTICULATORS:
        vel = compute_velocity(ema, ix, iy)
        jerk = compute_jerk(vel)
        art_stats[name] = {
            "vel": vel,
            "jerk": jerk,
        }

    # ---- Encode raw EMA for downstream analysis ----
    buf = io.BytesIO()
    np.save(buf, ema)
    ema_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    result = {
        "filename": filename,
        "num_frames": ema.shape[0],
        "ema_shape": list(ema.shape),
        "duration_s": round(duration_s, 3),
        "ema_rate_hz": ema_rate,
    }

    # Add velocity + jerk stats for ALL articulators
    for name, stats in art_stats.items():
        prefix = name.lower()
        vel = stats["vel"]
        jerk = stats["jerk"]
        result[f"{prefix}_peak_vel"] = round(float(np.max(vel)), 4)
        result[f"{prefix}_mean_vel"] = round(float(np.mean(vel)), 4)
        result[f"{prefix}_p95_vel"] = round(float(np.percentile(vel, 95)), 4)
        result[f"{prefix}_p99_vel"] = round(float(np.percentile(vel, 99)), 4)
        result[f"{prefix}_median_vel"] = round(float(np.median(vel)), 4)
        result[f"{prefix}_peak_jerk"] = round(float(np.max(jerk)), 4)
        result[f"{prefix}_mean_jerk"] = round(float(np.mean(jerk)), 4)
        result[f"{prefix}_p95_jerk"] = round(float(np.percentile(jerk, 95)), 4)
        result[f"{prefix}_p99_jerk"] = round(float(np.percentile(jerk, 99)), 4)

    # Raw EMA for visualization
    result["raw_ema_b64"] = ema_b64

    return result


@app.local_entrypoint()
def main():
    """Run CSIS Phase 2: AAI velocity comparison on real vs deepfake audio."""
    import os
    import json
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[2]
    audio_dir = repo_root / "shared" / "assets" / "audio"
    real_dir = audio_dir / "real"
    deepfake_dir = audio_dir / "deepfake"

    # ---- Step 1: Ensure checkpoint exists ----
    print("=" * 80)
    print("CSIS PHASE 2 — AAI Model Validation on Modal (A100)")
    print("=" * 80)
    print("\nStep 1: Downloading AAI checkpoint...")
    ckpt_ok = download_checkpoint.remote()
    if not ckpt_ok:
        print("ERROR: Checkpoint download failed. Cannot proceed.")
        return

    # ---- Step 2: Collect WAV files ----
    files: list[tuple[str, str, bytes]] = []  # (label, filename, bytes)

    for label, directory in [("real", real_dir), ("deepfake", deepfake_dir)]:
        if not directory.exists():
            print(f"WARNING: {directory} does not exist, skipping")
            continue
        for wav in sorted(directory.glob("*.wav")):
            if wav.stat().st_size < 1000:
                print(f"  SKIP {wav.name} (< 1KB, likely corrupt)")
                continue
            files.append((label, wav.name, wav.read_bytes()))

    if not files:
        print("ERROR: No valid WAV files found!")
        return

    print(f"\nStep 2: Processing {len(files)} audio files on A100...")
    for label, name, _ in files:
        print(f"  [{label.upper():>9}] {name}")

    # ---- Step 3: Run inference in parallel via .map() ----
    print("\nStep 3: Running AAI inference (HuBERT → Inversion → EMA)...")

    # Use starmap for parallel GPU inference
    results_raw = list(
        predict_ema_velocity.starmap(
            [(wav_bytes, filename) for _, filename, wav_bytes in files]
        )
    )

    # Attach labels
    results = []
    for (label, filename, _), result in zip(files, results_raw):
        if "error" in result:
            print(f"  ERROR on {filename}: {result['error']}")
            continue
        result["label"] = label
        results.append(result)

    if not results:
        print("ERROR: All inference calls failed!")
        return

    # ---- Step 4: Print results table ----
    print("\n" + "=" * 160)
    header = f"{'File':<30} {'Label':<10} {'Dur':>5}"
    for art in ['TT', 'TB', 'TD', 'LI', 'UL', 'LL']:
        header += f" | {art+'_Vpk':>7} {art+'_Vm':>7} {art+'_Jpk':>8} {art+'_Jp95':>8}"
    print(header)
    print("-" * 160)

    for r in results:
        row = f"{r['filename']:<30} {r['label']:<10} {r['duration_s']:>5.1f}"
        for art in ['tt', 'tb', 'td', 'li', 'ul', 'll']:
            row += f" | {r[f'{art}_peak_vel']:>7.2f} {r[f'{art}_mean_vel']:>7.2f} {r[f'{art}_peak_jerk']:>8.1f} {r[f'{art}_p95_jerk']:>8.1f}"
        print(row)

    print("-" * 160)

    # ---- Step 5: Separation analysis ----
    import numpy as np

    real_results = [r for r in results if r["label"] == "real"]
    fake_results = [r for r in results if r["label"] == "deepfake"]

    if real_results and fake_results:
        print("\nSEPARATION ANALYSIS (AAI EMA — All Articulators, Velocity + Jerk):")
        print(f"  Real samples: {len(real_results)}, Deepfake samples: {len(fake_results)}")
        print()

        # Build comprehensive metric list: velocity + jerk for all 6 articulators
        metrics = []
        for art in ['TT', 'TB', 'TD', 'LI', 'UL', 'LL']:
            prefix = art.lower()
            for stat, label in [('peak_vel', 'PeakVel'), ('mean_vel', 'MeanVel'), ('p95_vel', 'P95Vel'),
                                ('p99_vel', 'P99Vel'), ('peak_jerk', 'PeakJerk'), ('mean_jerk', 'MeanJerk'),
                                ('p95_jerk', 'P95Jerk'), ('p99_jerk', 'P99Jerk')]:
                metrics.append((f"{art} {label}", f"{prefix}_{stat}"))

        best_signals = []
        for metric_name, key in metrics:
            real_avg = np.mean([r[key] for r in real_results])
            fake_avg = np.mean([r[key] for r in fake_results])
            if real_avg == 0 and fake_avg == 0:
                continue
            sep = abs(fake_avg - real_avg)
            # Relative separation (% of mean)
            mean_val = (real_avg + fake_avg) / 2
            rel_sep = (sep / mean_val * 100) if mean_val > 0 else 0
            direction = "FAKE>REAL" if fake_avg > real_avg else "REAL>FAKE"
            signal = "✅" if rel_sep > 20 else ("🟡" if rel_sep > 10 else "  ")
            best_signals.append((rel_sep, metric_name, real_avg, fake_avg, sep, direction, signal))

        # Sort by relative separation descending
        best_signals.sort(reverse=True)

        print(f"  {'Metric':<18} {'Real':>10} {'Fake':>10} {'AbsSep':>10} {'RelSep%':>8} {'Dir':<10} {'Signal'}")
        print(f"  {'-'*80}")
        for rel_sep, metric_name, real_avg, fake_avg, sep, direction, signal in best_signals[:20]:
            print(f"  {metric_name:<18} {real_avg:>10.3f} {fake_avg:>10.3f} {sep:>10.3f} {rel_sep:>7.1f}% {direction:<10} {signal}")

        # Overall verdict based on top signals
        top_signals = [s for s in best_signals if s[0] > 20]  # >20% relative separation
        mid_signals = [s for s in best_signals if 10 < s[0] <= 20]

        print()
        if len(top_signals) >= 3:
            print("🟢 CSIS PHASE 2 PASS — Multiple strong separation signals found!")
            print("   The articulatory inversion approach CAN discriminate real from deepfake.")
            print("   LARYNX thesis validated. Proceed with production pipeline.")
        elif len(top_signals) >= 1 or len(mid_signals) >= 3:
            print("🟡 CSIS PHASE 2 MARGINAL — Some separation signals detected.")
            print("   May work with feature combination or model fine-tuning.")
        else:
            print("🔴 CSIS PHASE 2 FAIL — No strong separation signals.")
            print("   Consider: different deepfake sources, model fine-tuning, or fallback to Wav2Vec2 classifier.")

        # Also check if velocities are physiologically plausible
        all_tt_peaks = [r["tt_peak_vel"] for r in results]
        max_peak = max(all_tt_peaks)
        print(f"\n  Max tongue tip peak velocity across all files: {max_peak:.2f} cm/s")
        if max_peak < 30:
            print("  ✅ All velocities within physiological range (<30 cm/s)")
            print("  (Unlike parselmouth Phase 1 which hit 458 cm/s on real speech)")
        elif max_peak < 50:
            print("  ⚠️  Some velocities slightly above typical range but plausible")
        else:
            print("  ❌ Velocities exceed physiological limits — model may need calibration")
    else:
        print("\n⚠ Need both real and deepfake files for separation analysis.")

    # ---- Step 6: Save results (without raw EMA) ----
    output_path = repo_root / "LARYNX" / "backend" / "csis_phase2_results.json"
    save_results = [{k: v for k, v in r.items() if k != "raw_ema_b64"} for r in results]
    with open(output_path, "w") as f:
        json.dump(save_results, f, indent=2)
    print(f"\nResults saved to {output_path}")

    # Save raw EMA arrays for visualization
    ema_dir = repo_root / "LARYNX" / "backend" / "ema_outputs"
    ema_dir.mkdir(exist_ok=True)
    import base64
    for r in results:
        if "raw_ema_b64" in r:
            ema_path = ema_dir / f"{r['label']}_{r['filename'].replace('.wav', '.npy')}"
            ema_bytes = base64.b64decode(r["raw_ema_b64"])
            with open(ema_path, "wb") as f:
                f.write(ema_bytes)
            print(f"  EMA saved: {ema_path.name}")

    print("\n" + "=" * 80)
