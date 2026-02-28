"""
LARYNX Overnight Training Pipeline — Wave 1
=============================================
Downloads LibriSpeech + generates edge-tts deepfakes → AAI inference on Modal →
acoustic features locally → trains ensemble classifier.

Usage:
  source ~/modal-env/bin/activate
  modal run LARYNX/backend/overnight_pipeline.py

Estimated: ~1-2 hours on Modal A100, ~$15-20 credits
"""

import modal
import io
import json
import struct
import base64
import time
import sys
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Modal App Config (same as csis_modal.py)
# ---------------------------------------------------------------------------
app = modal.App("hackillinois-2026")
model_cache = modal.Volume.from_name("model-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libsndfile1", "ffmpeg", "wget", "sox", "git")
    .pip_install(
        "torch==2.5.1",
        "torchaudio==2.5.1",
        "s3prl==0.4.18",
        "librosa==0.10.2.post1",
        "soundfile==0.12.1",
        "gdown==5.2.0",
        "pyyaml",
        "scipy==1.11.4",
        "numpy<2",
    )
    .run_commands(
        "pip install git+https://github.com/articulatory/articulatory.git",
        # Articulatory currently imports kaiser from scipy.signal directly.
        # Keep scipy <1.12 to preserve that API surface.
        "pip install --no-cache-dir scipy==1.11.4",
        "python3 -c \"from scipy.signal import kaiser; print('scipy.signal.kaiser import OK')\"",
    )
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
LIBRISPEECH_URL = "https://openslr.trmal.net/resources/12/dev-clean.tar.gz"
N_REAL_SAMPLES = 300
N_FAKE_SAMPLES = 300

# Phonetically diverse sentences for TTS generation
SENTENCES = [
    "The quick brown fox jumped over the lazy dog while Peter poked the rolling ball down the long steep hill.",
    "She sells seashells by the seashore and the shells she sells are surely seashells.",
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
    "Peter Piper picked a peck of pickled peppers, a peck of pickled peppers Peter Piper picked.",
    "Betty Botter bought some butter but she said the butter's bitter.",
    "Fuzzy Wuzzy was a bear, Fuzzy Wuzzy had no hair, Fuzzy Wuzzy wasn't very fuzzy, was he?",
    "Around the rugged rocks the ragged rascal ran, racing rapidly toward the river.",
    "A box of biscuits, a batch of mixed biscuits, and a biscuit mixer.",
    "The thirty-three thieves thought that they thrilled the throne throughout Thursday.",
    "Six sick hicks nick six slick bricks with picks and sticks.",
    "I saw Susie sitting in a shoeshine shop. Where she shines, she sits, and where she sits, she shines.",
    "The big black bug bit the big black bear, but the big black bear bit the big black bug back.",
    "I wish to wash my Irish wristwatch, and I wish to wish the wish you wish to wish.",
    "Fred fed Ted bread, and Ted fed Fred bread. Fred's bread fed Ted, and Ted's bread fed Fred.",
    "A proper copper coffee pot makes proper coffee in a copper coffee pot.",
    "Which wristwatches are Swiss wristwatches? Those wristwatches are Swiss wristwatches.",
    "Gobbling gargoyles gobbled gobbling goblins while the goblins gobbled gobbling gargoyles.",
    "If practice makes perfect and perfect needs practice, I'm perfectly practiced and practically perfect.",
    "I scream, you scream, we all scream for ice cream on a hot summer afternoon.",
    "Eleven benevolent elephants elegantly elevated their extensive expectations exponentially.",
    "The sixth sick sheik's sixth sheep's sick, and the sixth sheik sat on a soft cushion.",
    "Can you can a canned can into an uncanned can like a canner can can a canned can?",
    "I thought a thought, but the thought I thought wasn't the thought I thought I thought.",
    "Whether the weather is cold, or whether the weather is hot, we'll weather the weather whatever the weather.",
    "Three free throws from the free throw line flew freely through the freezing February air.",
    "Red lorry, yellow lorry, red lorry, yellow lorry, the lorries rolled rapidly down the road.",
    "Imagine an imaginary menagerie manager managing an imaginary menagerie with imaginary animals.",
    "Specific Pacific spatial specials specially specified by a special specialist specifically.",
    "Freshly fried fresh flesh from the fish fry served on a fresh flat platter.",
    "The two-twenty-two train tore through the tunnel, thundering tremendously as it traveled.",
    "A skunk sat on a stump and thunk the stump stunk, but the stump thunk the skunk stunk.",
    "She stood on the balcony inexplicably mimicking him hiccupping and amicably welcoming him in.",
    "Pad kid poured curd pulled cod, pad kid poured curd pulled cold.",
    "A loyal warrior will rarely worry why we rule, for we surely shall prevail.",
    "The seething sea ceaseth and thus the seething sea sufficeth us, the seaside breeze is soothing.",
    "Brisk brave brigadiers brandished broad bright blades, blunderbusses, and bludgeons.",
    "Give papa a cup of proper coffee in a copper coffee cup, please.",
    "Lesser leather never weathered wetter weather better than higher leather ever could.",
    "Theophilus Thistle, the unsuccessful thistle sifter, thrust three thousand thistles through the thick of his thumb.",
    "Six Czech cricket critics quickly clicked their clicking cricket clickers.",
    "The orchestra played orchestral music while the conductor conducted the orchestral performance.",
    "How can a clam cram in a clean cream can? A clam can cram in a clean cream can.",
    "If you must cross a course cross cow across a crowded cow crossing, cross the cross coarse cow carefully.",
    "Singing Sammy sung songs on sinking sand, Sammy sang all the songs he sang on the sand.",
    "Through three cheese trees, three free fleas flew, while these fleas flew, freezy breeze blew.",
    "The great Greek grape growers grow great Greek grapes in the great green greenhouse.",
    "Amidst the mists and coldest frosts, with stoutest wrists and loudest boasts.",
    "Toy boat, toy boat, toy boat, the tiny toy boats bobbed on the turbulent tidal bay.",
    "Chester cheetah chews a chunk of cheap cheddar cheese, choosing to chew cheerfully.",
    "Unique New York, you know you need unique New York, a unique New York utility unit.",
]

EDGE_TTS_VOICES = [
    "en-AU-NatashaNeural", "en-AU-WilliamMultilingualNeural",
    "en-CA-ClaraNeural", "en-CA-LiamNeural",
    "en-GB-LibbyNeural", "en-GB-MaisieNeural", "en-GB-RyanNeural",
    "en-GB-SoniaNeural", "en-GB-ThomasNeural",
    "en-HK-YanNeural", "en-HK-SamNeural",
    "en-IN-NeerjaNeural", "en-IN-NeerjaExpressiveNeural", "en-IN-PrabhatNeural",
    "en-IE-ConnorNeural", "en-IE-EmilyNeural",
    "en-KE-AsiliaNeural", "en-KE-ChilembaNeural",
    "en-NZ-MitchellNeural", "en-NZ-MollyNeural",
    "en-NG-AbeoNeural", "en-NG-EzinneNeural",
    "en-PH-JamesNeural", "en-PH-RosaNeural",
    "en-SG-LunaNeural", "en-SG-WayneNeural",
    "en-ZA-LeahNeural", "en-ZA-LukeNeural",
    "en-TZ-ElimuNeural", "en-TZ-ImaniNeural",
    "en-US-AnaNeural", "en-US-AndrewNeural", "en-US-AndrewMultilingualNeural",
    "en-US-AriaNeural", "en-US-AvaNeural", "en-US-AvaMultilingualNeural",
    "en-US-BrianNeural", "en-US-BrianMultilingualNeural",
    "en-US-ChristopherNeural", "en-US-EmmaNeural", "en-US-EmmaMultilingualNeural",
    "en-US-EricNeural", "en-US-GuyNeural", "en-US-JennyNeural",
    "en-US-MichelleNeural", "en-US-RogerNeural", "en-US-SteffanNeural",
]


# ---------------------------------------------------------------------------
# Modal Functions
# ---------------------------------------------------------------------------
@app.function(
    image=image,
    volumes={"/model-cache": model_cache},
    gpu="A100",
    timeout=600,
    retries=2,
)
def predict_ema_batch(wav_items: list[tuple[str, bytes]]) -> list[dict]:
    """Process a batch of WAV files through AAI model. Each item is (filename, wav_bytes)."""
    import torch
    import numpy as np
    import soundfile as sf
    import yaml
    import gdown
    from pathlib import Path
    from scipy.interpolate import interp1d

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

    # --- Download checkpoint if needed ---
    ckpt_dir = Path("/model-cache/aai/hprc_h2")
    ckpt_path = ckpt_dir / "best_mel_ckpt.pkl"
    config_path = ckpt_dir / "config.yml"

    if not ckpt_path.exists():
        ckpt_dir.mkdir(parents=True, exist_ok=True)
        gdown.download_folder(
            id="1O-1kX_ngHf1T8EN7HXWABCaEIJLNqxUI",
            output=str(ckpt_dir),
            quiet=False,
        )
        model_cache.commit()
        print(f"Checkpoint downloaded to {ckpt_dir}")

    # --- Load HuBERT ---
    print("Loading HuBERT large...")
    import s3prl.hub as hub
    hubert_model = hub.hubert_large_ll60k().to(device)
    hubert_model.eval()

    # --- Load AAI inversion model ---
    print("Loading AAI inversion model...")
    with open(config_path) as f:
        inversion_config = yaml.safe_load(f)

    from articulatory.utils import load_model

    model = load_model(str(ckpt_path), inversion_config)
    model.remove_weight_norm()
    model.to(device).eval()
    print("Models loaded.")

    # --- Process batch ---
    results = []
    for filename, wav_bytes in wav_items:
        try:
            audio, sr = sf.read(io.BytesIO(wav_bytes))
            if len(audio.shape) > 1:
                audio = audio[:, 0]
            if sr != 16000:
                # Resample
                from scipy.signal import resample
                audio = resample(audio, int(len(audio) * 16000 / sr))
                sr = 16000

            audio = audio.astype(np.float32)
            if np.max(np.abs(audio)) > 0:
                audio = audio / np.max(np.abs(audio))

            wavs = torch.FloatTensor(audio).unsqueeze(0).to(device)

            with torch.no_grad():
                hidden = hubert_model(wavs)["hidden_states"][-1].squeeze(0)  # (T, 1024)
                feat = hidden.unsqueeze(0).transpose(1, 2)
                feat = torch.nn.functional.interpolate(feat, scale_factor=2, mode="linear", align_corners=False)
                feat = feat.transpose(1, 2).squeeze(0)  # (T*2, 1024)
                ema_pred = model.inference(feat, normalize_before=False)

            ema = ema_pred.cpu().numpy()  # (T, 12+)
            ema = ema[:, :12]  # Keep only 12 EMA dims

            # Compute velocity, acceleration, jerk for all 6 articulators
            dt = 1.0 / 200.0  # 200 Hz EMA rate
            art_names = ["li", "ul", "ll", "tt", "tb", "td"]
            result = {"filename": filename, "num_frames": ema.shape[0]}

            for i, name in enumerate(art_names):
                ix, iy = i * 2, i * 2 + 1
                dx = np.diff(ema[:, ix])
                dy = np.diff(ema[:, iy])
                vel = np.sqrt(dx**2 + dy**2) / dt / 10.0  # cm/s
                accel = np.abs(np.diff(vel) / dt)
                jerk = np.abs(np.diff(accel) / dt)

                for metric, arr in [("vel", vel), ("accel", accel), ("jerk", jerk)]:
                    if len(arr) > 0:
                        result[f"{name}_{metric}_peak"] = float(np.max(arr))
                        result[f"{name}_{metric}_mean"] = float(np.mean(arr))
                        result[f"{name}_{metric}_p95"] = float(np.percentile(arr, 95))
                        result[f"{name}_{metric}_p99"] = float(np.percentile(arr, 99))
                        result[f"{name}_{metric}_median"] = float(np.median(arr))
                        result[f"{name}_{metric}_std"] = float(np.std(arr))
                    else:
                        for s in ["peak", "mean", "p95", "p99", "median", "std"]:
                            result[f"{name}_{metric}_{s}"] = 0.0

            results.append(result)
            print(f"  OK: {filename} ({ema.shape[0]} frames)")

        except Exception as e:
            print(f"  FAIL: {filename}: {e}")
            results.append({"filename": filename, "error": str(e)})

    return results


@app.function(image=image, timeout=1200)
def download_librispeech() -> list[tuple[str, bytes]]:
    """Download LibriSpeech dev-clean and return (filename, wav_bytes) pairs."""
    import subprocess
    import soundfile as sf
    import random
    from pathlib import Path

    work_dir = Path("/tmp/librispeech")
    work_dir.mkdir(exist_ok=True)

    # Download and extract
    tar_path = work_dir / "dev-clean.tar.gz"
    if not tar_path.exists():
        print("Downloading LibriSpeech dev-clean (337MB)...")
        subprocess.run(
            ["wget", "-q", LIBRISPEECH_URL, "-O", str(tar_path)],
            check=True,
        )
    print("Extracting...")
    subprocess.run(["tar", "xzf", str(tar_path), "-C", str(work_dir)], check=True)

    # Find all FLAC files
    flac_files = sorted(work_dir.rglob("*.flac"))
    print(f"Found {len(flac_files)} FLAC files")

    # Random sample N_REAL_SAMPLES
    random.seed(42)
    selected = random.sample(flac_files, min(N_REAL_SAMPLES, len(flac_files)))

    # Convert to WAV bytes (already 16kHz mono)
    items = []
    for flac_path in selected:
        audio, sr = sf.read(str(flac_path))
        buf = io.BytesIO()
        sf.write(buf, audio, sr, format="WAV", subtype="PCM_16")
        buf.seek(0)
        filename = f"libri_{flac_path.stem}.wav"
        items.append((filename, buf.read()))

    print(f"Prepared {len(items)} real speech WAV files")
    return items


@app.function(
    image=(
        modal.Image.debian_slim(python_version="3.11")
        .apt_install("ffmpeg")
        .pip_install("edge-tts", "aiofiles")
    ),
    timeout=1800,
)
def generate_deepfakes() -> list[tuple[str, bytes]]:
    """Generate N_FAKE_SAMPLES edge-tts deepfakes with diverse voices."""
    import asyncio
    import edge_tts
    import subprocess
    from pathlib import Path

    work_dir = Path("/tmp/deepfakes")
    work_dir.mkdir(exist_ok=True)

    async def generate_one(idx: int, sentence: str, voice: str) -> tuple[str, bytes] | None:
        filename = f"fake_{voice}_{idx:04d}"
        mp3_path = work_dir / f"{filename}.mp3"
        wav_path = work_dir / f"{filename}.wav"

        try:
            comm = edge_tts.Communicate(sentence, voice)
            await comm.save(str(mp3_path))

            # Convert to 16kHz mono WAV
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(mp3_path), "-ar", "16000", "-ac", "1", str(wav_path)],
                capture_output=True, check=True,
            )

            with open(wav_path, "rb") as f:
                wav_bytes = f.read()

            # Cleanup
            mp3_path.unlink(missing_ok=True)
            wav_path.unlink(missing_ok=True)

            return (f"{filename}.wav", wav_bytes)
        except Exception as e:
            print(f"  FAIL {filename}: {e}")
            return None

    async def generate_all():
        tasks = []
        for idx in range(N_FAKE_SAMPLES):
            sentence = SENTENCES[idx % len(SENTENCES)]
            voice = EDGE_TTS_VOICES[idx % len(EDGE_TTS_VOICES)]
            tasks.append(generate_one(idx, sentence, voice))

        # Process in batches of 20 to avoid overwhelming edge-tts
        results = []
        batch_size = 20
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i + batch_size]
            batch_results = await asyncio.gather(*batch)
            results.extend([r for r in batch_results if r is not None])
            print(f"  Generated {len(results)}/{N_FAKE_SAMPLES} deepfakes...")

        return results

    items = asyncio.run(generate_all())
    print(f"Generated {len(items)} deepfake WAV files")
    return items


# ---------------------------------------------------------------------------
# Local entrypoint
# ---------------------------------------------------------------------------
@app.local_entrypoint()
def main():
    import numpy as np
    from pathlib import Path

    PROJECT_DIR = Path("/home/li859/projects/hackillinois")
    RESULTS_DIR = PROJECT_DIR / "LARYNX" / "backend" / "training_data"
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("LARYNX OVERNIGHT PIPELINE — WAVE 1")
    print("=" * 80)
    start_time = time.time()

    # ---- Step 1: Generate data in parallel ----
    print("\n📦 Step 1: Downloading LibriSpeech + generating deepfakes (parallel)...")
    libri_handle = download_librispeech.spawn()
    fake_handle = generate_deepfakes.spawn()

    # Also load existing samples
    existing_real = []
    existing_fake = []
    real_dir = PROJECT_DIR / "shared" / "assets" / "audio" / "real"
    fake_dir = PROJECT_DIR / "shared" / "assets" / "audio" / "deepfake"

    for wav_path in sorted(real_dir.glob("*-16k.wav")):
        with open(wav_path, "rb") as f:
            existing_real.append((wav_path.name, f.read()))
    for wav_path in sorted(fake_dir.glob("*-16k.wav")):
        with open(wav_path, "rb") as f:
            existing_fake.append((wav_path.name, f.read()))

    print(f"  Existing: {len(existing_real)} real + {len(existing_fake)} fake")

    # Collect remote results
    print("  Waiting for LibriSpeech download...")
    libri_items = libri_handle.get()
    print(f"  ✅ LibriSpeech: {len(libri_items)} real utterances")

    print("  Waiting for deepfake generation...")
    fake_items = fake_handle.get()
    print(f"  ✅ Edge-TTS: {len(fake_items)} deepfake utterances")

    # Combine all samples
    all_real = existing_real + libri_items
    all_fake = existing_fake + fake_items
    print(f"  Total: {len(all_real)} real + {len(all_fake)} fake = {len(all_real) + len(all_fake)} samples")

    # ---- Step 2: AAI inference on Modal (batched) ----
    print(f"\n🧠 Step 2: Running AAI inference on {len(all_real) + len(all_fake)} samples...")

    # Batch into groups of 30 for parallel GPU processing
    BATCH_SIZE = 30
    all_items_labeled = [(f, b, "real") for f, b in all_real] + [(f, b, "deepfake") for f, b in all_fake]

    # Create batches of (filename, bytes) for Modal
    batches = []
    labels = {}
    for i in range(0, len(all_items_labeled), BATCH_SIZE):
        batch_items = all_items_labeled[i:i + BATCH_SIZE]
        batch = [(f, b) for f, b, _ in batch_items]
        for f, _, l in batch_items:
            labels[f] = l
        batches.append(batch)

    print(f"  Dispatching {len(batches)} batches of ~{BATCH_SIZE} samples each...")

    # Launch all batches in parallel
    handles = [predict_ema_batch.spawn(batch) for batch in batches]

    # Collect results
    all_results = []
    for i, handle in enumerate(handles):
        batch_results = handle.get()
        all_results.extend(batch_results)
        print(f"  ✅ Batch {i+1}/{len(batches)} complete ({len(batch_results)} results)")

    # Add labels
    for r in all_results:
        if "filename" in r:
            r["label"] = labels.get(r["filename"], "unknown")

    # Filter out errors
    good_results = [r for r in all_results if "error" not in r]
    error_results = [r for r in all_results if "error" in r]
    print(f"  ✅ AAI inference complete: {len(good_results)} success, {len(error_results)} errors")

    if error_results:
        print(f"  ⚠️ Errors:")
        for r in error_results[:10]:
            print(f"    {r['filename']}: {r.get('error', 'unknown')}")

    # ---- Step 3: Save results ----
    results_path = RESULTS_DIR / "aai_results.json"
    with open(results_path, "w") as f:
        json.dump(good_results, f, indent=2)
    print(f"\n💾 Results saved to {results_path}")

    # ---- Step 4: Train classifier ----
    print(f"\n🎯 Step 4: Training classifier on {len(good_results)} samples...")

    # Extract feature matrix
    real_results = [r for r in good_results if r["label"] == "real"]
    fake_results = [r for r in good_results if r["label"] == "deepfake"]
    print(f"  Real: {len(real_results)}, Fake: {len(fake_results)}")

    # Get all feature keys (exclude metadata)
    meta_keys = {"filename", "label", "num_frames", "error"}
    feature_keys = sorted([k for k in good_results[0].keys() if k not in meta_keys])
    print(f"  Features: {len(feature_keys)}")

    # Build X, y
    X = []
    y = []
    filenames = []
    for r in good_results:
        row = [r.get(k, 0.0) for k in feature_keys]
        X.append(row)
        y.append(1 if r["label"] == "deepfake" else 0)
        filenames.append(r["filename"])

    X = np.array(X, dtype=np.float64)
    y = np.array(y)

    # Handle NaN/Inf
    X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)

    # Standardize
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.svm import SVC
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_predict
    from sklearn.metrics import accuracy_score, classification_report
    import pickle

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Stratified 5-fold CV (much better than LOO for 600+ samples)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    models = {
        "GradientBoosting": GradientBoostingClassifier(
            n_estimators=500, max_depth=3, learning_rate=0.05,
            subsample=0.8, random_state=42
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=1000, max_depth=5, random_state=42
        ),
        "SVM_RBF": SVC(kernel="rbf", probability=True, random_state=42),
        "LogisticRegression": LogisticRegression(max_iter=2000, random_state=42),
    }

    best_acc = 0
    best_model_name = ""
    best_model = None

    for name, model in models.items():
        y_pred = cross_val_predict(model, X_scaled, y, cv=cv, method="predict")
        acc = accuracy_score(y, y_pred)
        print(f"  {name}: {acc*100:.1f}% ({sum(y_pred == y)}/{len(y)})")

        if acc > best_acc:
            best_acc = acc
            best_model_name = name
            best_model = model

    # Train best model on all data
    print(f"\n  🏆 Best: {best_model_name} ({best_acc*100:.1f}%)")
    best_model.fit(X_scaled, y)

    # Get probabilities for all samples
    if hasattr(best_model, "predict_proba"):
        probs = best_model.predict_proba(X_scaled)[:, 1]
    else:
        probs = best_model.decision_function(X_scaled)

    # Print classification report
    y_pred_final = best_model.predict(X_scaled)
    print(f"\n  Classification Report (on full training set):")
    print(classification_report(y, y_pred_final, target_names=["Real", "Deepfake"]))

    # Feature importance (if available)
    if hasattr(best_model, "feature_importances_"):
        importances = best_model.feature_importances_
        top_features = sorted(zip(feature_keys, importances), key=lambda x: -x[1])[:20]
        print(f"\n  Top 20 Features:")
        for fname, imp in top_features:
            print(f"    {fname}: {imp:.4f}")

    # Save model + scaler + feature keys
    model_data = {
        "model": best_model,
        "scaler": scaler,
        "feature_keys": feature_keys,
        "model_name": best_model_name,
        "cv_accuracy": best_acc,
        "n_real": len(real_results),
        "n_fake": len(fake_results),
        "n_features": len(feature_keys),
    }
    model_path = RESULTS_DIR / "ensemble_model.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model_data, f)
    print(f"\n💾 Model saved to {model_path}")

    # ---- Step 5: Separation analysis ----
    print(f"\n📊 Step 5: Separation analysis...")

    best_signals = []
    for key in feature_keys:
        real_vals = [r[key] for r in real_results if key in r]
        fake_vals = [r[key] for r in fake_results if key in r]
        if not real_vals or not fake_vals:
            continue
        real_avg = np.mean(real_vals)
        fake_avg = np.mean(fake_vals)
        mean_val = (real_avg + fake_avg) / 2
        if mean_val == 0:
            continue
        sep = abs(fake_avg - real_avg)
        rel_sep = sep / mean_val * 100
        direction = "FAKE>REAL" if fake_avg > real_avg else "REAL>FAKE"
        best_signals.append((rel_sep, key, real_avg, fake_avg, sep, direction))

    best_signals.sort(reverse=True)

    print(f"\n  Top 20 Separation Signals:")
    print(f"  {'Feature':<28} {'Real':>12} {'Fake':>12} {'RelSep%':>8} {'Direction'}")
    print(f"  {'-'*80}")
    for rel_sep, key, real_avg, fake_avg, sep, direction in best_signals[:20]:
        signal = "✅" if rel_sep > 20 else ("🟡" if rel_sep > 10 else "  ")
        print(f"  {key:<28} {real_avg:>12.3f} {fake_avg:>12.3f} {rel_sep:>7.1f}% {direction} {signal}")

    # ---- Summary ----
    elapsed = time.time() - start_time
    strong = sum(1 for s in best_signals if s[0] > 20)
    medium = sum(1 for s in best_signals if 10 < s[0] <= 20)

    print(f"\n{'=' * 80}")
    print(f"WAVE 1 COMPLETE")
    print(f"{'=' * 80}")
    print(f"  Samples: {len(real_results)} real + {len(fake_results)} fake = {len(good_results)} total")
    print(f"  Features: {len(feature_keys)}")
    print(f"  Best CV Accuracy: {best_acc*100:.1f}% ({best_model_name})")
    print(f"  Strong signals (>20% sep): {strong}")
    print(f"  Medium signals (10-20% sep): {medium}")
    print(f"  Time: {elapsed/60:.1f} minutes")
    print(f"  Model: {model_path}")
    print(f"  Results: {results_path}")

    if best_acc >= 0.99:
        print(f"\n🟢 TARGET ACHIEVED: {best_acc*100:.1f}% accuracy. Pipeline is production-ready.")
    elif best_acc >= 0.95:
        print(f"\n🟡 GOOD: {best_acc*100:.1f}% accuracy. Consider adding acoustic features or fine-tuning AAI.")
    else:
        print(f"\n🔴 NEEDS WORK: {best_acc*100:.1f}% accuracy. More data or model changes needed.")
