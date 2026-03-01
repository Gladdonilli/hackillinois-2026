"""
LARYNX Overnight Training Pipeline — Run 7
=============================================
Loads external dataset (5000 real + 11400 fake, 73 TTS architectures) → AAI inference
on Modal B200 → acoustic features → trains ensemble classifier with StratifiedGroupKFold.

Usage:
  source ~/modal-env/bin/activate
  modal run LARYNX/backend/overnight_pipeline.py

Estimated: ~25 min on Modal B200 (3 passes × 16400 samples, volume-cached)
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

# Volume paths for dataset caching (upload once, read at NVMe speed)
VOLUME_DATASET_BASE = "/model-cache/dataset"


@app.function(
    image=modal.Image.debian_slim(python_version="3.11"),
    volumes={"/model-cache": model_cache},
    timeout=600,
)
def upload_wavs_to_volume(wav_items: list[tuple[str, bytes]], subdir: str) -> int:
    """Upload WAV files to Modal volume under /model-cache/dataset/{subdir}/. Returns count written."""
    from pathlib import Path
    dest = Path(f"/model-cache/dataset/{subdir}")
    dest.mkdir(parents=True, exist_ok=True)
    written = 0
    for filename, wav_bytes in wav_items:
        fpath = dest / filename
        if not fpath.exists():
            with open(fpath, "wb") as f:
                f.write(wav_bytes)
            written += 1
    model_cache.commit()
    return written


@app.function(
    image=modal.Image.debian_slim(python_version="3.11"),
    volumes={"/model-cache": model_cache},
    timeout=120,
)
def list_volume_dataset() -> dict[str, list[str]]:
    """List WAV files on volume. Returns {subdir: [filenames]}."""
    from pathlib import Path
    result: dict[str, list[str]] = {}
    base = Path("/model-cache/dataset")
    if not base.exists():
        return result
    for subdir in sorted(base.iterdir()):
        if subdir.is_dir():
            result[subdir.name] = [f.name for f in sorted(subdir.glob("*.wav"))]
    return result

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
        "articulatory @ git+https://github.com/articulatory/articulatory.git@a50eafd4fb8235643f1523bbbf9ac1d50bbf271b",
        extra_index_url="https://download.pytorch.org/whl/cu128",
    )
    .run_commands(
        # Articulatory pulls scipy>=1.12 which breaks its own kaiser import.
        # Force downgrade AFTER articulatory is installed.
        "pip install --no-cache-dir --no-deps scipy==1.11.4",
        "python3 -c \"from scipy.signal import kaiser; print('scipy OK')\"",
    )
    .env({"PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True"})
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MERGED_REAL_DIR = Path("/home/li859/datasets/larynx-5k/real")
MERGED_FAKE_DIR = Path("/home/li859/datasets/larynx-5k/fake")
# Long-run control: repeat full AAI inference passes to build a much larger
# training table overnight without changing I/O plumbing.
INFERENCE_PASSES = 1  # SMOKE TEST — bump to 3 for full run

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
# Modal Inference Class — dataset + models loaded to local NVMe in __enter__
# ---------------------------------------------------------------------------
@app.cls(
    image=image,
    volumes={"/model-cache": model_cache},
    gpu="B200",
    timeout=600,
    startup_timeout=1200,
    retries=3,
    max_containers=1,  # SMOKE TEST — bump to 8 for full run
    min_containers=0,
)
@modal.concurrent(max_inputs=2)  # SAFE ceiling: each HuBERT pass uses ~56 GiB, 2×56=112 fits B200's 178 GiB
class LarynxInference:
    @modal.enter()
    def setup(self):
        """One-time: copy dataset to local NVMe, load models to GPU."""
        import torch
        import yaml
        import gdown
        from pathlib import Path
        import time as _time

        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        t0 = _time.monotonic()
        print(f"[ENTER] Container starting on {self.device}...")

        # --- Copy dataset + AAI checkpoint from FUSE volume to local NVMe ---
        # Required for multi-container: FUSE can't handle 8 containers × 16 concurrent reads
        import subprocess, shutil
        local_dataset = Path('/tmp/dataset')
        local_aai = Path('/tmp/aai')
        if not local_dataset.exists():
            print('[ENTER] Copying dataset from FUSE volume to local NVMe...')
            t_copy = _time.monotonic()
            local_dataset.mkdir(parents=True, exist_ok=True)
            # tar pipe: streams as single FUSE read — 10x faster than cp -a on 16K files
            subprocess.run(
                'tar cf - -C /model-cache/dataset . | tar xf - -C /tmp/dataset',
                shell=True, check=True,
            )
            n_copied = sum(1 for _ in local_dataset.rglob('*.wav'))
            print(f'[ENTER] Dataset copied: {n_copied} files ({_time.monotonic() - t_copy:.1f}s)')
        if not local_aai.exists():
            print('[ENTER] Copying AAI checkpoint to local NVMe...')
            subprocess.run(['cp', '-a', '/model-cache/aai', '/tmp/aai'], check=True)
            print('[ENTER] AAI checkpoint copied')

        # --- Ensure AAI checkpoint exists on volume ---
        vol_ckpt_dir = Path('/tmp/aai/hprc_h2')
        vol_ckpt = vol_ckpt_dir / 'best_mel_ckpt.pkl'
        vol_config = vol_ckpt_dir / 'config.yml'

        if not vol_ckpt.exists():
            print("[ENTER] Downloading AAI checkpoint from GDrive...")
            vol_ckpt_dir.mkdir(parents=True, exist_ok=True)
            gdown.download_folder(
                id="1O-1kX_ngHf1T8EN7HXWABCaEIJLNqxUI",
                output=str(vol_ckpt_dir),
                quiet=False,
            )
            model_cache.commit()
            print(f"[ENTER] Checkpoint downloaded to {vol_ckpt_dir}")

        # --- Load HuBERT to GPU ---
        print("[ENTER] Loading HuBERT large...")
        import s3prl.hub as hub
        self.hubert_model = hub.hubert_large_ll60k().to(self.device)
        self.hubert_model.eval()

        # --- Load AAI inversion model to GPU ---
        print("[ENTER] Loading AAI inversion model...")
        with open(vol_config) as f:
            inversion_config = yaml.safe_load(f)

        from articulatory.utils import load_model
        self.aai_model = load_model(str(vol_ckpt), inversion_config)
        self.aai_model.remove_weight_norm()
        self.aai_model.to(self.device).eval()
        print(f"[ENTER] Container ready ({_time.monotonic() - t0:.1f}s total)")
    @modal.method()
    def analyze(self, wav_paths: list[str]) -> list[dict]:
        """Process a batch of WAV files through batched HuBERT + per-sample AAI.
        Remaps /model-cache/ paths to local /tmp/ NVMe — zero FUSE during inference."""
        import torch
        import numpy as np
        import soundfile as sf
        from pathlib import Path

        # Remap FUSE volume paths to local NVMe copy
        # --- Preload all WAVs from local NVMe (microseconds per file) ---
        results = []
        loaded_wavs = []

        for local_path in wav_paths:
            filename = Path(local_path).name
            try:
                local_path_nvme = local_path.replace('/model-cache/dataset', '/tmp/dataset')
                audio, sr = sf.read(local_path_nvme)
                if len(audio.shape) > 1:
                    audio = audio[:, 0]
                if sr != 16000:
                    from scipy.signal import resample
                    audio = resample(audio, int(len(audio) * 16000 / sr))
                audio = audio.astype(np.float32)
                if np.max(np.abs(audio)) > 0:
                    audio = audio / np.max(np.abs(audio))
                loaded_wavs.append((filename, audio))
            except Exception as e:
                print(f"    ⚠ Load error {filename}: {e}")
                results.append({"filename": filename, "error": str(e)})

        if not loaded_wavs:
            return results

        # --- Batched HuBERT inference (B=128 per chunk, ~56 GiB VRAM per pass on B200) ---
        HUBERT_BATCH = 128  # 256 caused OOM — do NOT increase
        all_hidden = []
        all_filenames = []

        def _hubert_output_len(input_len: int) -> int:
            """Compute HuBERT CNN feature extractor output length."""
            length = input_len
            for k, s in zip([10, 3, 3, 3, 3, 2, 2], [5, 2, 2, 2, 2, 2, 2]):
                length = (length - k) // s + 1
                if length <= 0:
                    return 0
            return length

        for chunk_start in range(0, len(loaded_wavs), HUBERT_BATCH):
            chunk = loaded_wavs[chunk_start:chunk_start + HUBERT_BATCH]
            wav_tensors = [torch.FloatTensor(audio).to(self.device) for _, audio in chunk]

            with torch.inference_mode(), torch.autocast('cuda', dtype=torch.bfloat16):
                out = self.hubert_model(wav_tensors)
                hidden_batch = out["hidden_states"][-1]  # (B, T_max, 1024)

            for i, (filename, audio) in enumerate(chunk):
                t_valid = _hubert_output_len(len(audio))
                if t_valid <= 0:
                    results.append({"filename": filename, "error": "audio too short for HuBERT"})
                    continue
                all_hidden.append(hidden_batch[i, :t_valid, :])  # (T_i, 1024)
                all_filenames.append(filename)

            del hidden_batch, wav_tensors

        # --- Per-sample AAI + vectorized metrics ---
        dt = 1.0 / 200.0  # 200 Hz EMA rate
        art_names = ["li", "ul", "ll", "tt", "tb", "td"]

        for idx, (hidden_single, filename) in enumerate(zip(all_hidden, all_filenames)):
            try:
                with torch.inference_mode():
                    feat = hidden_single.float().unsqueeze(0).transpose(1, 2)
                    feat = torch.nn.functional.interpolate(feat, scale_factor=2, mode="linear", align_corners=False)
                    feat = feat.transpose(1, 2).squeeze(0)  # (T*2, 1024)
                    ema_pred = self.aai_model.inference(feat, normalize_before=False)

                ema = ema_pred.cpu().numpy()[:, :12]  # (T, 12)
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
                if (idx + 1) % 50 == 0 or idx + 1 == len(all_hidden):
                    print(f"    AAI progress: {idx + 1}/{len(all_hidden)} samples")

            except Exception as e:
                print(f"    ⚠ AAI error {filename}: {e}")
                results.append({"filename": filename, "error": str(e)})

        ok = sum(1 for r in results if "error" not in r)
        print(f"  Batch done: {ok}/{len(results)} OK")
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
    print("LARYNX PIPELINE — RUN 7 (5k real + 11.4k fake, 73 TTS architectures, StratifiedGroupKFold)")
    print("=" * 80)
    start_time = time.time()

    # ---- Step 1: Verify pre-loaded dataset on Modal volume (NO upload) ----
    print("\n📦 Step 1: Verifying dataset on Modal volume (pre-loaded, skip upload)...")
    existing = list_volume_dataset.remote()
    existing_real = sorted(existing.get("real", []))
    existing_fake = sorted(existing.get("fake", []))
    print(f"  Volume has {len(existing_real)} real + {len(existing_fake)} fake WAVs")

    if len(existing_real) < 100 or len(existing_fake) < 100:
        print(f"  ❌ ABORT: Volume nearly empty — got {len(existing_real)} real + {len(existing_fake)} fake")
        print(f"     Re-upload dataset to model-cache volume before running.")
        sys.exit(1)

    real_paths = [f"/model-cache/dataset/real/{n}" for n in existing_real]
    fake_paths = [f"/model-cache/dataset/fake/{n}" for n in existing_fake]
    print(f"  ✅ {len(real_paths)} real + {len(fake_paths)} fake = {len(real_paths) + len(fake_paths)} samples ready on volume (no upload needed)")

    # ---- Step 2: AAI inference on Modal (batched, multi-pass overnight mode) ----
    n_samples_once = len(real_paths) + len(fake_paths)
    print(
        f"\n🧠 Step 2: Running AAI inference on {n_samples_once} samples "
        f"for {INFERENCE_PASSES} passes (~{n_samples_once * INFERENCE_PASSES} total inferences)..."
    )

    # Batch into groups of 20 for fewer scheduling round trips
    BATCH_SIZE = 400  # Larger batches = fewer scheduling round trips (B200 NVMe handles it)
    all_items_labeled = [(p, "real") for p in real_paths] + [(p, "deepfake") for p in fake_paths]
    labels = {Path(p).name: l for p, l in all_items_labeled}

    all_results = []
    for pass_idx in range(INFERENCE_PASSES):
        pass_start = time.time()
        pass_items = all_items_labeled.copy()
        random.Random(42 + pass_idx).shuffle(pass_items)

        batches = []
        for i in range(0, len(pass_items), BATCH_SIZE):
            batch_items = pass_items[i:i + BATCH_SIZE]
            batch = [p for p, _ in batch_items]
            batches.append(batch)

        print(f"  \U0001f501 Pass {pass_idx + 1}/{INFERENCE_PASSES}: dispatching {len(batches)} batches (max_inputs=2)")

        pass_results = []
        for batch_idx, batch_result in enumerate(
            LarynxInference().analyze.map(batches, return_exceptions=True, wrap_returned_exceptions=False)
        ):
            if isinstance(batch_result, Exception):
                err_str = str(batch_result)
                print(f"    \u274c Batch {batch_idx + 1} failed: {err_str[:120]}")
                batch_results = [{"filename": Path(f).name, "error": err_str[:200]} for f in batches[batch_idx]]
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
        # Extract speaker from filename for StratifiedGroupKFold:
        # libri_NNNNN.wav → speaker from LibriSpeech (251 speakers via modulo)
        # elkey1_NNNN.wav / elkey2_NNNN.wav → "elkey1" / "elkey2" (ElevenLabs)
        # wf_WF1_NNNN.wav .. wf_WF7_NNNN.wav → "wf_WF1" .. "wf_WF7" (WaveFake vocoders)
        # mlaad_{tts_system}_{idx}.wav → "mlaad_{tts_system}" (MLAAD-tiny)
        fn = r["filename"]
        if fn.startswith("libri_"):
            parts = fn.replace(".wav", "").split("_")
            speaker = f"libri_{parts[-2]}" if len(parts) >= 4 else f"libri_{parts[-1]}"
        elif fn.startswith("elkey1_"):
            speaker = "elkey1"
        elif fn.startswith("elkey2_"):
            speaker = "elkey2"
        elif fn.startswith("wf_"):
            parts = fn.split("_")
            speaker = f"{parts[0]}_{parts[1]}" if len(parts) >= 3 else "wf_unknown"
        elif fn.startswith("mlaad_"):
            # mlaad_bark_0042.wav → speaker = "mlaad_bark"
            # mlaad_parler_tts_large_v1_0001.wav → speaker = "mlaad_parler_tts_large_v1"
            parts = fn.replace(".wav", "").split("_")
            speaker = "_".join(parts[:-1])  # everything except trailing index
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
    from sklearn.model_selection import StratifiedGroupKFold, cross_val_predict
    from sklearn.metrics import accuracy_score, classification_report
    import pickle

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # StratifiedGroupKFold by speaker — prevents train/test leakage while
    # maintaining class distribution across folds (critical for imbalanced data)
    groups = np.array(speakers)
    n_unique_speakers = len(set(speakers))
    n_splits = min(5, n_unique_speakers)  # Can't have more splits than speakers
    print(f"  Unique speakers: {n_unique_speakers}, using {n_splits}-fold StratifiedGroupKFold")
    cv = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=42)

    # Scale model selection with dataset size
    n_samples = len(y)
    if n_samples > 5000:
        models = {
            "HistGradientBoosting": HistGradientBoostingClassifier(
                max_depth=8,
                learning_rate=0.05,
                max_iter=400,
                class_weight="balanced",
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
    print(f"RUN 7 COMPLETE")
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
