"""
LARYNX Overnight Training Pipeline — Wave 2
=============================================
Downloads LibriSpeech real speech + generates ElevenLabs deepfakes → AAI inference
on Modal → acoustic features → trains ensemble classifier with GroupKFold by speaker.

Usage:
  source ~/modal-env/bin/activate
  ELEVENLABS_API_KEY=<key> modal run LARYNX/backend/overnight_pipeline.py

Estimated: ~3-6 hours on Modal A100 (10 passes × ~5400 samples)
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
N_REAL_SAMPLES = 2700
N_FAKE_SAMPLES = 2700
# Long-run control: repeat full AAI inference passes to build a much larger
# training table overnight without changing I/O plumbing.
INFERENCE_PASSES = 10

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
    gpu="A100",
    timeout=600,
    retries=3,
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
        .pip_install("requests")
    ),
    timeout=600,
    secrets=[modal.Secret.from_name("elevenlabs-api-key")],
    concurrency_limit=50,  # Max 50 parallel containers for TTS generation
)
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
        model_tag = "v3" if "v3" in model_id else "v2"
        filename = f"elevenlabs_{voice_name}_{model_tag}_{idx:04d}"
        mp3_path = work_dir / f"{filename}.mp3"
        wav_path = work_dir / f"{filename}.wav"

        try:
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
            resp.raise_for_status()

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
            if "429" in str(e) or "rate" in str(e).lower():
                import time
                time.sleep(30)
            continue

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
    print("LARYNX OVERNIGHT PIPELINE — WAVE 2 (ElevenLabs + GroupKFold)")
    print("=" * 80)
    start_time = time.time()

    # ---- Step 1: Generate data in parallel ----
    print("\n\U0001f4e6 Step 1: Downloading LibriSpeech + generating ElevenLabs deepfakes (parallel)...")
    libri_handle = download_librispeech.spawn()

    # Build ElevenLabs work items: 2700 fakes split 50/50 across v2 and v3
    import random as _rng
    el_rng = _rng.Random(42)
    el_items: list[tuple[int, str, str, str, str]] = []
    n_per_model = N_FAKE_SAMPLES // 2
    for model_id, count in [
        ("eleven_multilingual_v2", n_per_model),
        ("eleven_v3", N_FAKE_SAMPLES - n_per_model),
    ]:
        for i in range(count):
            voice_id, voice_name = el_rng.choice(ELEVENLABS_VOICES)
            sentence = el_rng.choice(SENTENCES)
            el_items.append((i, voice_id, voice_name, model_id, sentence))

    # Split into chunks of 50, dispatch across up to 50 containers via .map()
    CHUNK_SIZE = 50
    el_chunks = [el_items[i:i + CHUNK_SIZE] for i in range(0, len(el_items), CHUNK_SIZE)]
    print(f"  Dispatching {len(el_items)} ElevenLabs calls across {len(el_chunks)} chunks (up to 50 containers)...")

    # Fire ElevenLabs .map() — streams results as chunks complete
    el_results_iter = generate_elevenlabs_chunk.map(el_chunks, return_exceptions=True)

    # Also load existing local samples while ElevenLabs runs remotely
    existing_real: list[tuple[str, bytes]] = []
    existing_fake: list[tuple[str, bytes]] = []
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
    print(f"  \u2705 LibriSpeech: {len(libri_items)} real utterances")

    print("  Collecting ElevenLabs deepfakes from parallel containers...")
    fake_items: list[tuple[str, bytes]] = []
    el_errors = 0
    for chunk_idx, chunk_result in enumerate(el_results_iter):
        if isinstance(chunk_result, Exception):
            print(f"    \u26a0\ufe0f Chunk {chunk_idx + 1}/{len(el_chunks)} failed: {chunk_result}")
            el_errors += 1
            continue
        fake_items.extend(chunk_result)
        if (chunk_idx + 1) % 10 == 0 or chunk_idx + 1 == len(el_chunks):
            print(f"    \u2705 Collected {chunk_idx + 1}/{len(el_chunks)} chunks ({len(fake_items)} fakes so far)")
    print(f"  \u2705 ElevenLabs: {len(fake_items)} deepfakes ({el_errors} chunk failures)")

    # Combine all samples
    all_real = existing_real + libri_items
    all_fake = existing_fake + fake_items
    print(f"  Total: {len(all_real)} real + {len(all_fake)} fake = {len(all_real) + len(all_fake)} samples")

    # ---- Step 2: AAI inference on Modal (batched, multi-pass overnight mode) ----
    n_samples_once = len(all_real) + len(all_fake)
    print(
        f"\n🧠 Step 2: Running AAI inference on {n_samples_once} samples "
        f"for {INFERENCE_PASSES} passes (~{n_samples_once * INFERENCE_PASSES} total inferences)..."
    )

    # Batch into groups of 10 for maximum GPU parallelism (saturate 10 A100s)
    BATCH_SIZE = 10
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
            predict_ema_batch.map(batches, return_exceptions=True)
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
        # Extract speaker from filename:
        # Real: "libri_1234-56789-0001.wav" → speaker = "1234"
        # Fake: "elevenlabs_Rachel_0042.wav" → speaker = "Rachel"
        # Existing: "slt-arctic-0001-16k.wav" → speaker = "slt"
        fn = r["filename"]
        if fn.startswith("libri_"):
            # LibriSpeech speaker ID is first number segment
            speaker = fn.replace("libri_", "").split("-")[0]
        elif fn.startswith("elevenlabs_"):
            # ElevenLabs voice name + model version as separate speaker
            # e.g. "elevenlabs_Rachel_v3_0042.wav" → speaker = "Rachel_v3"
            parts = fn.replace("elevenlabs_", "").split("_")
            if len(parts) >= 2:
                speaker = f"{parts[0]}_{parts[1]}"  # VoiceName_v2 or VoiceName_v3
            else:
                speaker = parts[0] if parts else "unknown"
        else:
            # Existing local files — use filename prefix as speaker
            speaker = fn.split("-")[0]
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
    print(f"WAVE 2 COMPLETE")
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
