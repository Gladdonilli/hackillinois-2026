#!/usr/bin/env python3
"""
Download and organize open-source deepfake voice datasets for LARYNX training.

Sources:
  1. garystafford/deepfake-audio-detection (HuggingFace) — 6,868 samples (3,434 fake + 3,434 real)
  2. skypro1111/elevenlabs_dataset (HuggingFace) — ~1,200 ElevenLabs-generated samples

Output format: 16kHz mono WAV in training_data/datasets/{source}/{real,fake}/
"""

import os
import sys
import io
import struct
import traceback
from pathlib import Path

import numpy as np
import librosa
import soundfile as sf

TARGET_SR = 16000
BASE_DIR = Path(__file__).parent / "training_data" / "datasets"


def ensure_dirs():
    """Create organized directory structure."""
    dirs = [
        BASE_DIR / "garystafford" / "real",
        BASE_DIR / "garystafford" / "fake",
        BASE_DIR / "skypro1111" / "fake",
        # Summary dir for final merged output
        BASE_DIR / "merged" / "real",
        BASE_DIR / "merged" / "fake",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
    print(f"[OK] Directory structure created under {BASE_DIR}")


def save_wav_16k_mono(audio_array: np.ndarray, sr: int, out_path: Path):
    """Resample to 16kHz mono, peak-normalize, save as WAV."""
    # Ensure mono
    if audio_array.ndim > 1:
        audio_array = audio_array[0] if audio_array.shape[0] < audio_array.shape[1] else audio_array[:, 0]

    # Resample if needed
    if sr != TARGET_SR:
        audio_array = librosa.resample(audio_array, orig_sr=sr, target_sr=TARGET_SR)

    # Peak normalize
    peak = np.max(np.abs(audio_array))
    if peak > 0:
        audio_array = audio_array / peak

    sf.write(str(out_path), audio_array, TARGET_SR, subtype='PCM_16')


def download_garystafford():
    """Download garystafford/deepfake-audio-detection from HuggingFace."""
    print("\n" + "=" * 60)
    print("DOWNLOADING: garystafford/deepfake-audio-detection")
    print("=" * 60)

    from datasets import load_dataset, Audio

    real_dir = BASE_DIR / "garystafford" / "real"
    fake_dir = BASE_DIR / "garystafford" / "fake"

    # Check if already downloaded
    existing_real = len(list(real_dir.glob("*.wav")))
    existing_fake = len(list(fake_dir.glob("*.wav")))
    if existing_real > 100 and existing_fake > 100:
        print(f"[SKIP] Already have {existing_real} real + {existing_fake} fake garystafford samples")
        return existing_real, existing_fake

    print("[INFO] Loading dataset from HuggingFace (this may take a few minutes)...")
    try:
        ds = load_dataset("garystafford/deepfake-audio-detection", trust_remote_code=True)
        # Disable auto audio decoding to avoid torchcodec dependency
        for split_name in ds:
            if "audio" in ds[split_name].column_names:
                ds[split_name] = ds[split_name].cast_column("audio", Audio(decode=False))
    except Exception as e:
        print(f"[ERROR] Failed to load garystafford dataset: {e}")
        traceback.print_exc()
        return 0, 0

    real_count = 0
    fake_count = 0

    # Process all splits
    for split_name in ds:
        split = ds[split_name]
        print(f"[INFO] Processing split '{split_name}' with {len(split)} samples...")

        for i, example in enumerate(split):
            try:
                # Dataset audio column returns {'bytes': b'...', 'path': '...'} with decode=False
                audio_data = example.get("audio")
                label = example.get("label")

                if audio_data is None:
                    for col in split.column_names:
                        if "audio" in col.lower():
                            audio_data = example[col]
                            break

                if label is None:
                    for col in split.column_names:
                        if "label" in col.lower() or "class" in col.lower() or "fake" in col.lower():
                            label = example[col]
                            break

                if audio_data is None:
                    if i == 0:
                        print(f"[WARN] No audio column found. Columns: {split.column_names}")
                    continue

                # Decode raw bytes with librosa
                if isinstance(audio_data, dict) and "bytes" in audio_data and audio_data["bytes"]:
                    audio_array, sr = librosa.load(io.BytesIO(audio_data["bytes"]), sr=None, mono=True)
                elif isinstance(audio_data, dict) and "array" in audio_data:
                    audio_array = np.array(audio_data["array"], dtype=np.float32)
                    sr = audio_data["sampling_rate"]
                elif isinstance(audio_data, (bytes, bytearray)):
                    audio_array, sr = librosa.load(io.BytesIO(audio_data), sr=None, mono=True)
                else:
                    continue

                # Determine real vs fake
                # Common labeling: 0=real/bona-fide, 1=fake/spoof
                # Or string labels like "real", "fake", "deepfake", "bona-fide"
                is_fake = False
                if isinstance(label, (int, np.integer)):
                    is_fake = int(label) == 1
                elif isinstance(label, str):
                    is_fake = label.lower() in ("fake", "deepfake", "spoof", "synthetic", "1")
                else:
                    # Default: try to infer from filename or index
                    is_fake = False

                out_dir = fake_dir if is_fake else real_dir
                prefix = "fake" if is_fake else "real"
                filename = f"garystafford_{prefix}_{split_name}_{i:05d}.wav"
                out_path = out_dir / filename

                if out_path.exists():
                    if is_fake:
                        fake_count += 1
                    else:
                        real_count += 1
                    continue

                save_wav_16k_mono(audio_array, sr, out_path)

                if is_fake:
                    fake_count += 1
                else:
                    real_count += 1

                if (i + 1) % 500 == 0:
                    print(f"  [{split_name}] Processed {i + 1}/{len(split)} "
                          f"(real: {real_count}, fake: {fake_count})")

            except Exception as e:
                if i < 5:
                    print(f"  [WARN] Error on sample {i}: {e}")
                continue

    print(f"[DONE] garystafford: {real_count} real + {fake_count} fake")
    return real_count, fake_count


def download_skypro1111():
    """Download skypro1111/elevenlabs_dataset from HuggingFace."""
    print("\n" + "=" * 60)
    print("DOWNLOADING: skypro1111/elevenlabs_dataset")
    print("=" * 60)

    from datasets import load_dataset

    fake_dir = BASE_DIR / "skypro1111" / "fake"

    # Check if already downloaded
    existing_fake = len(list(fake_dir.glob("*.wav")))
    if existing_fake > 100:
        print(f"[SKIP] Already have {existing_fake} skypro1111 samples")
        return existing_fake

    print("[INFO] Loading dataset from HuggingFace...")
    try:
        ds = load_dataset("skypro1111/elevenlabs_dataset", trust_remote_code=True)
    except Exception as e:
        print(f"[ERROR] Failed to load skypro1111 dataset: {e}")
        traceback.print_exc()
        
        # Try alternate loading methods
        try:
            print("[INFO] Trying with streaming...")
            ds = load_dataset("skypro1111/elevenlabs_dataset", streaming=True, trust_remote_code=True)
            fake_count = 0
            for split_name in ds:
                for i, example in enumerate(ds[split_name]):
                    try:
                        audio_data = example.get("audio")
                        if audio_data is None:
                            for col in list(example.keys()):
                                if "audio" in col.lower():
                                    audio_data = example[col]
                                    break

                        if audio_data and isinstance(audio_data, dict):
                            audio_array = np.array(audio_data["array"], dtype=np.float32)
                            sr = audio_data["sampling_rate"]
                            filename = f"skypro1111_el_{split_name}_{i:05d}.wav"
                            out_path = fake_dir / filename
                            if not out_path.exists():
                                save_wav_16k_mono(audio_array, sr, out_path)
                            fake_count += 1

                            if (i + 1) % 200 == 0:
                                print(f"  [{split_name}] Processed {i + 1} samples")
                    except Exception as inner_e:
                        if i < 3:
                            print(f"  [WARN] Error on sample {i}: {inner_e}")
                        continue

            print(f"[DONE] skypro1111: {fake_count} fake (all ElevenLabs)")
            return fake_count
        except Exception as e2:
            print(f"[ERROR] Streaming also failed: {e2}")
            traceback.print_exc()
            return 0

    fake_count = 0
    for split_name in ds:
        split = ds[split_name]
        print(f"[INFO] Processing split '{split_name}' with {len(split)} samples...")
        print(f"[INFO] Columns: {split.column_names}")

        for i, example in enumerate(split):
            try:
                audio_data = example.get("audio")
                if audio_data is None:
                    for col in split.column_names:
                        if "audio" in col.lower() or "wav" in col.lower() or "speech" in col.lower():
                            audio_data = example[col]
                            break

                if audio_data is None:
                    if i == 0:
                        print(f"[WARN] No audio column found. Columns: {split.column_names}")
                        print(f"[WARN] Sample keys: {list(example.keys())}")
                    continue

                if isinstance(audio_data, dict):
                    audio_array = np.array(audio_data["array"], dtype=np.float32)
                    sr = audio_data["sampling_rate"]
                elif isinstance(audio_data, (bytes, bytearray)):
                    audio_array, sr = librosa.load(io.BytesIO(audio_data), sr=None, mono=True)
                else:
                    continue

                filename = f"skypro1111_el_{split_name}_{i:05d}.wav"
                out_path = fake_dir / filename
                if not out_path.exists():
                    save_wav_16k_mono(audio_array, sr, out_path)
                fake_count += 1

                if (i + 1) % 200 == 0:
                    print(f"  [{split_name}] Processed {i + 1}/{len(split)}")

            except Exception as e:
                if i < 5:
                    print(f"  [WARN] Error on sample {i}: {e}")
                continue

    print(f"[DONE] skypro1111: {fake_count} fake (all ElevenLabs)")
    return fake_count


def create_merged_symlinks():
    """Create merged directory with symlinks to all sources for easy pipeline access."""
    print("\n" + "=" * 60)
    print("CREATING MERGED DATASET")
    print("=" * 60)

    merged_real = BASE_DIR / "merged" / "real"
    merged_fake = BASE_DIR / "merged" / "fake"

    # Clear existing symlinks
    for f in merged_real.glob("*.wav"):
        if f.is_symlink():
            f.unlink()
    for f in merged_fake.glob("*.wav"):
        if f.is_symlink():
            f.unlink()

    real_count = 0
    fake_count = 0

    # Link garystafford reals
    for wav in (BASE_DIR / "garystafford" / "real").glob("*.wav"):
        link = merged_real / wav.name
        if not link.exists():
            link.symlink_to(wav.resolve())
            real_count += 1

    # Link garystafford fakes
    for wav in (BASE_DIR / "garystafford" / "fake").glob("*.wav"):
        link = merged_fake / wav.name
        if not link.exists():
            link.symlink_to(wav.resolve())
            fake_count += 1

    # Link skypro1111 fakes
    for wav in (BASE_DIR / "skypro1111" / "fake").glob("*.wav"):
        link = merged_fake / wav.name
        if not link.exists():
            link.symlink_to(wav.resolve())
            fake_count += 1

    # Link existing training_data reals (LibriSpeech)
    existing_real = Path(__file__).parent / "training_data" / "audio" / "real"
    if existing_real.exists():
        for wav in existing_real.glob("*.wav"):
            link_name = f"librispeech_{wav.name}" if not wav.name.startswith("libri") else wav.name
            link = merged_real / link_name
            if not link.exists():
                link.symlink_to(wav.resolve())
                real_count += 1

    # Link existing training_data fakes (ElevenLabs cached)
    existing_fake = Path(__file__).parent / "training_data" / "audio" / "fake"
    if existing_fake.exists():
        for wav in existing_fake.glob("*.wav"):
            link_name = f"cached_el_{wav.name}" if not wav.name.startswith("elevenlabs") else wav.name
            link = merged_fake / link_name
            if not link.exists():
                link.symlink_to(wav.resolve())
                fake_count += 1

    print(f"[DONE] Merged dataset: {real_count} real + {fake_count} fake")
    return real_count, fake_count


def inventory():
    """Print final inventory of all datasets."""
    print("\n" + "=" * 60)
    print("DATASET INVENTORY")
    print("=" * 60)

    sources = {
        "garystafford/real": BASE_DIR / "garystafford" / "real",
        "garystafford/fake": BASE_DIR / "garystafford" / "fake",
        "skypro1111/fake": BASE_DIR / "skypro1111" / "fake",
        "existing/real (LibriSpeech)": Path(__file__).parent / "training_data" / "audio" / "real",
        "existing/fake (ElevenLabs)": Path(__file__).parent / "training_data" / "audio" / "fake",
        "merged/real": BASE_DIR / "merged" / "real",
        "merged/fake": BASE_DIR / "merged" / "fake",
    }

    total_real = 0
    total_fake = 0
    
    for name, path in sources.items():
        count = len(list(path.glob("*.wav"))) if path.exists() else 0
        marker = "✓" if count > 0 else "✗"
        print(f"  {marker} {name}: {count:,} WAV files")
        
        if "merged" not in name:
            if "real" in name:
                total_real += count
            else:
                total_fake += count

    print(f"\n  TOTAL (pre-merge): {total_real:,} real + {total_fake:,} fake")
    print(f"  Class ratio: 1:{total_fake/max(total_real,1):.2f}" if total_real > 0 else "")

    # Check a sample file for format
    for path in sources.values():
        if path.exists():
            samples = list(path.glob("*.wav"))
            if samples:
                try:
                    info = sf.info(str(samples[0]))
                    print(f"\n  Sample format check ({samples[0].name}):")
                    print(f"    SR: {info.samplerate}Hz, Channels: {info.channels}, "
                          f"Duration: {info.duration:.1f}s, Format: {info.format}")
                except:
                    pass
                break


if __name__ == "__main__":
    print("LARYNX Dataset Downloader & Organizer")
    print(f"Target: {TARGET_SR}Hz mono WAV")
    print(f"Output: {BASE_DIR}")
    print()

    ensure_dirs()

    # Download datasets
    gs_real, gs_fake = download_garystafford()
    sp_fake = download_skypro1111()

    # Create merged view
    create_merged_symlinks()

    # Print inventory
    inventory()

    print("\n[ALL DONE] Datasets downloaded and organized.")
