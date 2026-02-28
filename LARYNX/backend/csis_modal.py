"""CSIS Phase 2 — AAI Model Validation on Modal (A100).

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
TT_X, TT_Y = 6, 7  # Tongue Tip
TB_X, TB_Y = 8, 9  # Tongue Body
TD_X, TD_Y = 10, 11  # Tongue Dorsum


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

    tt_vel = compute_velocity(ema, TT_X, TT_Y)
    tb_vel = compute_velocity(ema, TB_X, TB_Y)
    td_vel = compute_velocity(ema, TD_X, TD_Y)

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
        # Tongue Tip velocities
        "tt_peak_vel": round(float(np.max(tt_vel)), 4),
        "tt_mean_vel": round(float(np.mean(tt_vel)), 4),
        "tt_p95_vel": round(float(np.percentile(tt_vel, 95)), 4),
        "tt_p99_vel": round(float(np.percentile(tt_vel, 99)), 4),
        "tt_median_vel": round(float(np.median(tt_vel)), 4),
        # Tongue Body velocities
        "tb_peak_vel": round(float(np.max(tb_vel)), 4),
        "tb_mean_vel": round(float(np.mean(tb_vel)), 4),
        "tb_p95_vel": round(float(np.percentile(tb_vel, 95)), 4),
        # Tongue Dorsum velocities
        "td_peak_vel": round(float(np.max(td_vel)), 4),
        "td_mean_vel": round(float(np.mean(td_vel)), 4),
        "td_p95_vel": round(float(np.percentile(td_vel, 95)), 4),
        # Raw EMA for visualization
        "raw_ema_b64": ema_b64,
    }

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
    print("\n" + "=" * 120)
    print(f"{'File':<28} {'Label':<10} {'Frames':>7} {'Dur(s)':>7} "
          f"{'TT_Peak':>8} {'TT_Mean':>8} {'TT_P95':>8} {'TT_P99':>8} "
          f"{'TB_Peak':>8} {'TD_Peak':>8}")
    print("-" * 120)

    for r in results:
        print(f"{r['filename']:<28} {r['label']:<10} {r['num_frames']:>7} {r['duration_s']:>7.2f} "
              f"{r['tt_peak_vel']:>8.2f} {r['tt_mean_vel']:>8.2f} {r['tt_p95_vel']:>8.2f} {r['tt_p99_vel']:>8.2f} "
              f"{r['tb_peak_vel']:>8.2f} {r['td_peak_vel']:>8.2f}")

    print("-" * 120)

    # ---- Step 5: Separation analysis ----
    import numpy as np

    real_results = [r for r in results if r["label"] == "real"]
    fake_results = [r for r in results if r["label"] == "deepfake"]

    if real_results and fake_results:
        print("\nSEPARATION ANALYSIS (AAI EMA Velocities):")

        for metric, key in [
            ("TT Peak", "tt_peak_vel"),
            ("TT P95", "tt_p95_vel"),
            ("TT P99", "tt_p99_vel"),
            ("TT Mean", "tt_mean_vel"),
            ("TT Median", "tt_median_vel"),
            ("TB Peak", "tb_peak_vel"),
            ("TD Peak", "td_peak_vel"),
        ]:
            real_avg = np.mean([r[key] for r in real_results])
            fake_avg = np.mean([r[key] for r in fake_results])
            sep = abs(fake_avg - real_avg)
            direction = "FAKE>REAL" if fake_avg > real_avg else "REAL>FAKE"

            # Threshold varies by metric
            threshold = 3.0 if "peak" in key.lower() else 1.5
            signal = "✅ SIGNAL" if sep > threshold else "❌ NO SIGNAL"

            print(f"  {metric:<12}: Real={real_avg:>8.3f}  Fake={fake_avg:>8.3f}  "
                  f"Sep={sep:>7.3f} ({direction})  {signal}")

        # Overall verdict
        peak_sep = abs(np.mean([r["tt_peak_vel"] for r in fake_results]) -
                       np.mean([r["tt_peak_vel"] for r in real_results]))
        p95_sep = abs(np.mean([r["tt_p95_vel"] for r in fake_results]) -
                      np.mean([r["tt_p95_vel"] for r in real_results]))
        mean_sep = abs(np.mean([r["tt_mean_vel"] for r in fake_results]) -
                       np.mean([r["tt_mean_vel"] for r in real_results]))

        signals = sum([peak_sep > 3.0, p95_sep > 2.0, mean_sep > 1.0])

        print()
        if signals >= 2:
            print("🟢 CSIS PHASE 2 PASS — AAI model shows EMA velocity separation!")
            print("   The articulatory inversion approach CAN discriminate real from deepfake.")
            print("   LARYNX thesis validated. Proceed with production pipeline.")
        elif signals == 1:
            print("🟡 CSIS PHASE 2 MARGINAL — Weak signal detected.")
            print("   Some separation exists but may not be robust.")
            print("   Consider fine-tuning AAI model on more varied data.")
        else:
            print("🔴 CSIS PHASE 2 FAIL — No velocity separation detected.")
            print("   The AAI model does NOT produce different velocities for real vs synthetic.")
            print("   LARYNX thesis may need fundamental rethinking.")

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
