"""
LARYNX Overnight Training Pipeline — Run 3
=============================================
Loads local merged dataset (4321 real + 4321 fake) → AAI inference
on Modal → acoustic features → trains ensemble classifier with GroupKFold by speaker.

Usage:
  source ~/modal-env/bin/activate
  modal run LARYNX/backend/overnight_pipeline.py

Estimated: ~2-4 hours on Modal A100 (10 passes × ~8642 samples)
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
        "torch==2.7.0+cu128",
        "torchaudio==2.7.0+cu128",
        "s3prl==0.4.18",
        "librosa==0.10.2.post1",
        "soundfile==0.12.1",
        "gdown==5.2.0",
        "pyyaml",
        "scipy==1.11.4",
        "numpy<2",
        extra_index_url="https://download.pytorch.org/whl/cu128",
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
MERGED_REAL_DIR = Path(__file__).resolve().parent / "training_data" / "datasets" / "merged" / "real"
MERGED_FAKE_DIR = Path(__file__).resolve().parent / "training_data" / "datasets" / "merged" / "fake"
# Long-run control: repeat full AAI inference passes to build a much larger
# training table overnight without changing I/O plumbing.
INFERENCE_PASSES = 30

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

# ElevenLabs voices — diverse set of premade voices for deepfake generation
# Each tuple: (voice_id, voice_name) for speaker tracking in GroupKFold
ELEVENLABS_VOICES = [
    ("21m00Tcm4TlvDq8ikWAM", "Rachel"),
    ("pNInz6obpgDQGcFmaJgB", "Adam"),
    ("EXAVITQu4vr4xnSDxMaL", "Bella"),
    ("ErXwobaYiN019PkySvjV", "Antoni"),
    ("MF3mGyEYCl7XYWbV9V6O", "Elli"),
    ("TxGEqnHWrfWFTfGW9XjX", "Josh"),
    ("VR6AewLTigWG4xSOukaG", "Arnold"),
    ("pqHfZKP75CvOlQylNhV4", "Bill"),
    ("nPczCjzI2devNBz1zQrb", "Brian"),
    ("N2lVS1w4EtoT3dr4eOWO", "Callum"),
    ("IKne3meq5aSn9XLyUdCD", "Charlie"),
    ("XB0fDUnXU5powFXDhCwa", "Charlotte"),
    ("Xb7hH8MSUJpSbSDYk0k2", "Alice"),
    ("iP95p4xoKVk53GoZ742B", "Chris"),
    ("cjVigY5qzO86Huf0OWal", "Eric"),
    ("cgSgspJ2msm6clMCkdW9", "Jessica"),
    ("FGY2WhTYpPnrIDTdsKH5", "Laura"),
    ("TX3LPaxmHKxFdv7VOQHJ", "Liam"),
    ("bIHbv24MWmeRgasZH58o", "Will"),
    ("XrExE9yKIg1WjnnlVkGX", "Matilda"),
]


# ---------------------------------------------------------------------------
# Modal Functions
# ---------------------------------------------------------------------------
@app.function(
    image=image,
    volumes={"/model-cache": model_cache},
    gpu="B200",                      # 192GB VRAM ($6.25/hr) — 7× FP16 TFLOPS vs A100, faster wall-clock
    timeout=600,
    retries=3,
    max_containers=10,            # 10 GPU cap on Modal account
    )
@modal.concurrent(max_inputs=10) # 10 concurrent batches per container — model loaded once, CPU handles preprocessing
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


@app.function(image=image, timeout=1200, volumes={"/model-cache": model_cache})
def download_librispeech() -> list[tuple[str, bytes]]:
    """Download LibriSpeech dev-clean and return (filename, wav_bytes) pairs.
    Caches converted WAVs to /model-cache/librispeech/ for instant reuse."""
    import subprocess
    import soundfile as sf
    import random
    import pickle
    from pathlib import Path

    cache_dir = Path("/model-cache/librispeech")
    cache_file = cache_dir / f"dev_clean_{N_REAL_SAMPLES}.pkl"

    # Check volume cache first — must match requested sample count
    if cache_file.exists():
        print("Loading LibriSpeech from volume cache...")
        with open(cache_file, "rb") as f:
            items = pickle.load(f)
        if len(items) >= N_REAL_SAMPLES:
            print(f"  Loaded {len(items)} cached WAV files (skipped 337MB download)")
            return items[:N_REAL_SAMPLES]
        print(f"  Cache has {len(items)} but need {N_REAL_SAMPLES}, re-downloading...")

    # Fresh download
    work_dir = Path("/tmp/librispeech")
    work_dir.mkdir(exist_ok=True)

    tar_path = work_dir / "dev-clean.tar.gz"
    if not tar_path.exists():
        print("Downloading LibriSpeech dev-clean (337MB)...")
        subprocess.run(
            ["wget", "-q", LIBRISPEECH_URL, "-O", str(tar_path)],
            check=True,
        )
    print("Extracting...")
    subprocess.run(["tar", "xzf", str(tar_path), "-C", str(work_dir)], check=True)

    flac_files = sorted(work_dir.rglob("*.flac"))
    print(f"Found {len(flac_files)} FLAC files")

    random.seed(42)
    selected = random.sample(flac_files, min(N_REAL_SAMPLES, len(flac_files)))

    items: list[tuple[str, bytes]] = []
    for flac_path in selected:
        audio, sr = sf.read(str(flac_path))
        buf = io.BytesIO()
        sf.write(buf, audio, sr, format="WAV", subtype="PCM_16")
        buf.seek(0)
        filename = f"libri_{flac_path.stem}.wav"
        items.append((filename, buf.read()))

    # Cache to volume for future runs
    cache_dir.mkdir(parents=True, exist_ok=True)
    with open(cache_file, "wb") as f:
        pickle.dump(items, f)
    model_cache.commit()
    print(f"Prepared {len(items)} real WAVs (cached to volume for next run)")
    return items


@app.function(
    image=(
        modal.Image.debian_slim(python_version="3.11")
        .apt_install("ffmpeg")
        .pip_install("requests")
    ),
    timeout=600,
    secrets=[modal.Secret.from_name("elevenlabs-api-key")],
    max_containers=3,            # ElevenLabs rate limits: 2-4 concurrent requests
    volumes={"/model-cache": model_cache},
    )
@modal.concurrent(max_inputs=1)  # One chunk per container, sequential within chunk
def generate_elevenlabs_chunk(chunk: list[tuple[int, str, str, str, str]]) -> list[tuple[str, bytes]]:
    """Generate a chunk of ElevenLabs deepfakes in one container.

    Args:
        chunk: List of (idx, voice_id, voice_name, model_id, sentence) tuples
    Returns:
        List of (filename, wav_bytes) pairs
    """
    import requests
    import subprocess
    from pathlib import Path

    work_dir = Path("/tmp/elevenlabs")
    work_dir.mkdir(exist_ok=True)

    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY not set")

    items = []
    for idx, voice_id, voice_name, model_id, sentence in chunk:
        model_tag = "flash" if "flash" in model_id else ("v3" if "v3" in model_id else "v2")
        filename = f"elevenlabs_{voice_name}_{model_tag}_{idx:04d}"
        mp3_path = work_dir / f"{filename}.mp3"
        wav_path = work_dir / f"{filename}.wav"

        try:
            # Retry with exponential backoff on 429 rate limits
            max_retries = 5
            for attempt in range(max_retries):
                resp = requests.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers={
                        "xi-api-key": api_key,
                        "Content-Type": "application/json",
                        "Accept": "audio/mpeg",
                    },
                    json={
                        "text": sentence,
                        "model_id": model_id,
                        "voice_settings": {
                            "stability": 0.5,
                            "similarity_boost": 0.75,
                        },
                    },
                    timeout=30,
                )
                if resp.status_code == 429:
                    wait = (2 ** attempt) * 5  # 5, 10, 20, 40, 80 seconds
                    print(f"    Rate limited on {filename}, waiting {wait}s (attempt {attempt + 1}/{max_retries})")
                    import time
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                break  # Success
            else:
                print(f"  FAIL {filename}: rate limited after {max_retries} retries")
                continue

            with open(mp3_path, "wb") as f:
                f.write(resp.content)

            subprocess.run(
                ["ffmpeg", "-y", "-i", str(mp3_path), "-ar", "16000", "-ac", "1", str(wav_path)],
                capture_output=True, check=True,
            )

            with open(wav_path, "rb") as f:
                wav_bytes = f.read()

            mp3_path.unlink(missing_ok=True)
            wav_path.unlink(missing_ok=True)
            items.append((f"{filename}.wav", wav_bytes))

        except Exception as e:
            print(f"  FAIL {filename}: {e}")
            continue

    # Save to volume cache
    if items:
        from pathlib import Path as _P
        cache_dir = _P("/model-cache/elevenlabs")
        cache_dir.mkdir(parents=True, exist_ok=True)
        for fname, wav_bytes in items:
            cache_path = cache_dir / fname
            if not cache_path.exists():
                with open(cache_path, "wb") as f:
                    f.write(wav_bytes)
        model_cache.commit()
        print(f"  Cached {len(items)} fakes to volume")

    return items


@app.function(image=image, volumes={"/model-cache": model_cache}, timeout=600)
def load_elevenlabs_cache() -> list[tuple[str, bytes]]:
    """Load cached ElevenLabs fakes from volume. Returns (filename, wav_bytes) pairs."""
    from pathlib import Path
    cache_dir = Path("/model-cache/elevenlabs")
    if not cache_dir.exists():
        return []
    items: list[tuple[str, bytes]] = []
    for wav_path in sorted(cache_dir.glob("*.wav")):
        with open(wav_path, "rb") as f:
            items.append((wav_path.name, f.read()))
    print(f"  Volume cache: found {len(items)} cached ElevenLabs fakes")
    return items


# ---------------------------------------------------------------------------
# Local entrypoint
# ---------------------------------------------------------------------------
@app.local_entrypoint()
def main():
    import numpy as np
    import random
    from pathlib import Path

    PROJECT_DIR = Path("/home/li859/projects/hackillinois")
    RESULTS_DIR = PROJECT_DIR / "LARYNX" / "backend" / "training_data"
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("LARYNX PIPELINE — RUN 3 (Local Merged Dataset + GroupKFold)")
    print("=" * 80)
    start_time = time.time()

    # ---- Step 1: Load local merged dataset ----
    print("\n📦 Step 1: Loading local merged dataset...")

    all_real: list[tuple[str, bytes]] = []
    all_fake: list[tuple[str, bytes]] = []

    for wav_path in sorted(MERGED_REAL_DIR.glob("*.wav")):
        with open(wav_path, "rb") as f:
            all_real.append((wav_path.name, f.read()))

    for wav_path in sorted(MERGED_FAKE_DIR.glob("*.wav")):
        with open(wav_path, "rb") as f:
            all_fake.append((wav_path.name, f.read()))

    print(f"  ✅ Loaded {len(all_real)} real + {len(all_fake)} fake = {len(all_real) + len(all_fake)} samples")

    # ---- Step 2: AAI inference on Modal (batched, multi-pass overnight mode) ----
    n_samples_once = len(all_real) + len(all_fake)
    print(
        f"\n🧠 Step 2: Running AAI inference on {n_samples_once} samples "
        f"for {INFERENCE_PASSES} passes (~{n_samples_once * INFERENCE_PASSES} total inferences)..."
    )

    # Batch into groups of 20 for fewer scheduling round trips
    BATCH_SIZE = 20
    all_items_labeled = [(f, b, "real") for f, b in all_real] + [(f, b, "deepfake") for f, b in all_fake]
    labels = {f: l for f, _, l in all_items_labeled}

    all_results = []
    for pass_idx in range(INFERENCE_PASSES):
        pass_start = time.time()
        pass_items = all_items_labeled.copy()
        random.Random(42 + pass_idx).shuffle(pass_items)

        batches = []
        for i in range(0, len(pass_items), BATCH_SIZE):
            batch_items = pass_items[i:i + BATCH_SIZE]
            batch = [(f, b) for f, b, _ in batch_items]
            batches.append(batch)

        print(f"  \U0001f501 Pass {pass_idx + 1}/{INFERENCE_PASSES}: dispatching {len(batches)} batches across 10 GPUs")

        pass_results = []
        for batch_idx, batch_result in enumerate(
            predict_ema_batch.map(batches, return_exceptions=True, wrap_returned_exceptions=False)
        ):
            if isinstance(batch_result, Exception):
                err_str = str(batch_result)
                print(f"    \u274c Batch {batch_idx + 1} failed: {err_str[:120]}")
                batch_results = [{"filename": f, "error": err_str[:200]} for f, _ in batches[batch_idx]]
            else:
                batch_results = batch_result
            for r in batch_results:
                if "filename" in r:
                    r["pass_idx"] = pass_idx + 1
            pass_results.extend(batch_results)
            if (batch_idx + 1) % 20 == 0 or batch_idx + 1 == len(batches):
                print(
                    f"    \u2705 Pass {pass_idx + 1}: batch {batch_idx + 1}/{len(batches)} "
                    f"complete ({len(batch_results)} results)"
                )

        # Add labels for this pass and append to global results.
        for r in pass_results:
            if "filename" in r:
                r["label"] = labels.get(r["filename"], "unknown")
        all_results.extend(pass_results)

        pass_good = sum(1 for r in pass_results if "error" not in r)
        pass_err = len(pass_results) - pass_good
        elapsed_hours = (time.time() - start_time) / 3600
        pass_minutes = (time.time() - pass_start) / 60
        print(
            f"  ✅ Pass {pass_idx + 1}/{INFERENCE_PASSES} complete: "
            f"{pass_good} success, {pass_err} errors, {pass_minutes:.1f} min "
            f"(elapsed {elapsed_hours:.2f}h)"
        )

        # Checkpoint results after each pass so we don't lose everything on crash
        checkpoint_path = RESULTS_DIR / "aai_results_checkpoint.json"
        checkpoint_good = [r for r in all_results if "error" not in r]
        with open(checkpoint_path, "w") as f:
            json.dump(checkpoint_good, f)
        print(f"    💾 Checkpoint: {len(checkpoint_good)} results saved")

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
    meta_keys = {"filename", "label", "num_frames", "error", "pass_idx", "speaker"}
    feature_keys = sorted([k for k in good_results[0].keys() if k not in meta_keys])
    print(f"  Features: {len(feature_keys)}")

    # Build X, y
    X = []
    y = []
    filenames = []
    speakers = []  # For GroupKFold
    for r in good_results:
        row = [r.get(k, 0.0) for k in feature_keys]
        X.append(row)
        y.append(1 if r["label"] == "deepfake" else 0)
        filenames.append(r["filename"])
        # Extract speaker from filename for GroupKFold:
        # libri_tc100_NNNNN.wav → speaker from LibriSpeech (251 speakers via modulo)
        # gs_real_NNNN.wav / gs_fake_NNNN.wav → "gs_NNNN" (garystafford sample ID)
        # el_key1_NNNN.wav / el_key2_NNNN.wav → "el_key1" / "el_key2" (ElevenLabs recovery)
        # sk_fake_NNNN.wav → "sk" (skypro1111, all ElevenLabs)
        # asset_real_NNNN.wav / asset_fake_NNNN.wav → "asset"
        fn = r["filename"]
        if fn.startswith("libri_tc100_"):
            # Use sample index as pseudo-speaker (251 speakers mapped by seed)
            idx = fn.replace("libri_tc100_", "").replace(".wav", "")
            speaker = f"libri_{int(idx) % 251}"
        elif fn.startswith("gs_real_") or fn.startswith("gs_fake_"):
            # garystafford — use sample index for diversity
            idx = fn.split("_")[-1].replace(".wav", "")
            speaker = f"gs_{idx}"
        elif fn.startswith("el_key1_"):
            speaker = "el_key1"
        elif fn.startswith("el_key2_"):
            speaker = "el_key2"
        elif fn.startswith("sk_fake_"):
            speaker = "sk"
        elif fn.startswith("asset_"):
            speaker = "asset"
        else:
            speaker = fn.split("_")[0]
        speakers.append(speaker)

    X = np.array(X, dtype=np.float64)
    y = np.array(y)

    # Handle NaN/Inf
    X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)

    # Standardize
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, HistGradientBoostingClassifier
    from sklearn.svm import SVC
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import GroupKFold, cross_val_predict
    from sklearn.metrics import accuracy_score, classification_report
    import pickle

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # GroupKFold by speaker — prevents train/test leakage
    groups = np.array(speakers)
    n_unique_speakers = len(set(speakers))
    n_splits = min(5, n_unique_speakers)  # Can't have more splits than speakers
    print(f"  Unique speakers: {n_unique_speakers}, using {n_splits}-fold GroupKFold")
    cv = GroupKFold(n_splits=n_splits)

    # Scale model selection with dataset size
    n_samples = len(y)
    if n_samples > 5000:
        models = {
            "HistGradientBoosting": HistGradientBoostingClassifier(
                max_depth=8,
                learning_rate=0.05,
                max_iter=400,
                random_state=42,
            ),
            "RandomForest": RandomForestClassifier(
                n_estimators=400,
                max_depth=12,
                random_state=42,
                n_jobs=-1,
            ),
            "LogisticRegression": LogisticRegression(
                max_iter=4000,
                solver="saga",
                random_state=42,
                n_jobs=-1,
            ),
        }
    else:
        models = {
            "GradientBoosting": GradientBoostingClassifier(
                n_estimators=500,
                max_depth=3,
                learning_rate=0.05,
                subsample=0.8,
                random_state=42,
            ),
            "RandomForest": RandomForestClassifier(
                n_estimators=1000,
                max_depth=5,
                random_state=42,
            ),
            "SVM_RBF": SVC(kernel="rbf", probability=True, random_state=42),
            "LogisticRegression": LogisticRegression(max_iter=2000, random_state=42),
        }

    best_acc = 0
    best_model_name = ""
    best_model = None

    for name, model in models.items():
        y_pred = cross_val_predict(model, X_scaled, y, cv=cv, groups=groups, method="predict")
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
    print(f"RUN 3 COMPLETE")
    print(f"{'=' * 80}")
    print(f"  Samples: {len(real_results)} real + {len(fake_results)} fake = {len(good_results)} total")
    print(f"  Features: {len(feature_keys)}")
    print(f"  Best CV Accuracy: {best_acc*100:.1f}% ({best_model_name})")
    print(f"  Strong signals (>20% sep): {strong}")
    print(f"  Medium signals (10-20% sep): {medium}")
    print(f"  Time: {elapsed/60:.1f} minutes")
    print(f"  Model: {model_path}")
    print(f"  Results: {results_path}")

    if best_acc >= 0.95:
        print(f"\n🟢 STRONG: {best_acc*100:.1f}% GroupKFold accuracy — generalizes across speakers.")
    elif best_acc >= 0.85:
        print(f"\n🟡 GOOD: {best_acc*100:.1f}% GroupKFold accuracy. Model shows real generalization.")
    elif best_acc >= 0.70:
        print(f"\n🔵 MODERATE: {best_acc*100:.1f}% GroupKFold accuracy. Useful but needs more diverse data.")
    else:
        print(f"\n🔴 NEEDS WORK: {best_acc*100:.1f}% GroupKFold accuracy. Model may not generalize.")
