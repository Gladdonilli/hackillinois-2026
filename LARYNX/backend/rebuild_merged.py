#!/usr/bin/env python3
"""
Rebuild merged dataset from cached sources for Run 3.
All sources are already on disk — no downloads needed.

Sources (FAKE):
  1. ElevenLabs recovery key1 (/tmp) — 1,102 WAVs, 16kHz mono, multilingual_v2
  2. ElevenLabs recovery key2 (/tmp) — 891 WAVs, 16kHz mono, flash_v2_5
  3. skypro1111 zip (314MB) — ~1,388 WAVs, 44.1kHz → resample to 16kHz
  4. garystafford HF cache — 933 fake, needs re-decode
  5. shared/assets/audio/deepfake — 7 WAVs, 16kHz

Sources (REAL):
  1. garystafford HF cache — 933 real, needs re-decode
  2. LibriSpeech train-clean-100 tarball (6.0GB) — 28,539 FLAC → convert
  3. shared/assets/audio/real — 10 WAVs, 16kHz

Strategy:
  - Fake: use ALL available (~4,321)
  - Real: random sample from train-clean-100 to match fake count
  - Quality priority: train-clean-100 > test-clean > garystafford (studio > read > mixed)
"""

import os
import sys
import io
import random
import shutil
import tarfile
import zipfile
import traceback
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
import librosa
import soundfile as sf

TARGET_SR = 16000
SEED = 42
BASE_DIR = Path(__file__).parent / "training_data" / "datasets"
MERGED_REAL = BASE_DIR / "merged" / "real"
MERGED_FAKE = BASE_DIR / "merged" / "fake"

# Source locations
ELEVENLABS_KEY1 = Path("/tmp/elevenlabs_recovery/key1_individual_wav")
ELEVENLABS_KEY2 = Path("/tmp/elevenlabs_recovery/key2_individual_wav")
SKYPRO_ZIP = BASE_DIR / "skypro1111_raw" / "elevenlabs_dataset.zip"
LIBRISPEECH_TARBALL = Path("/tmp/librispeech_train-clean-100.tar.gz")
SHARED_REAL = Path(__file__).parent.parent.parent / "shared" / "assets" / "audio" / "real"
SHARED_FAKE = Path(__file__).parent.parent.parent / "shared" / "assets" / "audio" / "deepfake"


def save_wav_16k_mono(audio_array: np.ndarray, sr: int, out_path: Path):
    """Resample to 16kHz mono, peak-normalize, save as WAV."""
    if audio_array.ndim > 1:
        audio_array = audio_array[0] if audio_array.shape[0] < audio_array.shape[1] else audio_array[:, 0]
    if sr != TARGET_SR:
        audio_array = librosa.resample(audio_array, orig_sr=sr, target_sr=TARGET_SR)
    peak = np.max(np.abs(audio_array))
    if peak > 0:
        audio_array = audio_array / peak
    sf.write(str(out_path), audio_array, TARGET_SR, subtype='PCM_16')


def copy_wav_verified(src: Path, dst: Path):
    """Copy WAV, verify it's 16kHz mono. Resample if not."""
    try:
        info = sf.info(str(src))
        if info.samplerate == TARGET_SR and info.channels == 1:
            shutil.copy2(str(src), str(dst))
        else:
            audio, sr = librosa.load(str(src), sr=None, mono=True)
            save_wav_16k_mono(audio, sr, dst)
        return True
    except Exception as e:
        print(f"  [WARN] Failed to copy {src.name}: {e}")
        return False


def step1_elevenlabs_recovery():
    """Copy ElevenLabs recovery files (already 16kHz mono)."""
    print("\n" + "=" * 60)
    print("STEP 1: ElevenLabs Recovery → merged/fake/")
    print("=" * 60)

    count = 0
    for key_dir, prefix in [(ELEVENLABS_KEY1, "el_key1"), (ELEVENLABS_KEY2, "el_key2")]:
        if not key_dir.exists():
            print(f"  [SKIP] {key_dir} not found")
            continue
        wavs = sorted(key_dir.glob("*.wav"))
        print(f"  Processing {len(wavs)} from {key_dir.name}...")
        for i, wav in enumerate(wavs):
            dst = MERGED_FAKE / f"{prefix}_{i:04d}.wav"
            if dst.exists():
                count += 1
                continue
            if copy_wav_verified(wav, dst):
                count += 1
            if (i + 1) % 500 == 0:
                print(f"    {i + 1}/{len(wavs)} copied")
    print(f"  [DONE] {count} ElevenLabs recovery files")
    return count


def step2_skypro_extract():
    """Extract skypro1111 zip, resample 44.1kHz → 16kHz."""
    print("\n" + "=" * 60)
    print("STEP 2: Skypro1111 ZIP → merged/fake/")
    print("=" * 60)

    if not SKYPRO_ZIP.exists():
        print(f"  [SKIP] {SKYPRO_ZIP} not found")
        return 0

    count = 0
    with zipfile.ZipFile(str(SKYPRO_ZIP), 'r') as zf:
        wav_names = [n for n in zf.namelist() if n.lower().endswith('.wav') and not n.startswith('__MACOSX')]
        print(f"  Found {len(wav_names)} WAVs in zip")

        for i, name in enumerate(sorted(wav_names)):
            dst = MERGED_FAKE / f"sk_fake_{i:04d}.wav"
            if dst.exists():
                count += 1
                continue
            try:
                raw = zf.read(name)
                audio, sr = librosa.load(io.BytesIO(raw), sr=None, mono=True)
                save_wav_16k_mono(audio, sr, dst)
                count += 1
                if (i + 1) % 200 == 0:
                    print(f"    {i + 1}/{len(wav_names)} converted")
            except Exception as e:
                if i < 5:
                    print(f"    [WARN] {name}: {e}")
                continue

    print(f"  [DONE] {count} skypro1111 files")
    return count


def step3_garystafford():
    """Re-extract garystafford from HF cache."""
    print("\n" + "=" * 60)
    print("STEP 3: Garystafford HF cache → merged/{real,fake}/")
    print("=" * 60)

    try:
        from datasets import load_dataset, Audio
    except ImportError:
        print("  [ERROR] datasets package not available")
        return 0, 0

    try:
        ds = load_dataset("garystafford/deepfake-audio-detection", trust_remote_code=True)
        for split_name in ds:
            if "audio" in ds[split_name].column_names:
                ds[split_name] = ds[split_name].cast_column("audio", Audio(decode=False))
    except Exception as e:
        print(f"  [ERROR] Failed to load: {e}")
        traceback.print_exc()
        return 0, 0

    real_count = 0
    fake_count = 0

    for split_name in ds:
        split = ds[split_name]
        print(f"  Processing split '{split_name}' ({len(split)} samples)...")

        for i, example in enumerate(split):
            try:
                audio_data = example.get("audio")
                label = example.get("label")

                if audio_data is None:
                    for col in split.column_names:
                        if "audio" in col.lower():
                            audio_data = example[col]
                            break
                if label is None:
                    for col in split.column_names:
                        if "label" in col.lower() or "class" in col.lower():
                            label = example[col]
                            break
                if audio_data is None:
                    continue

                # Decode
                if isinstance(audio_data, dict) and "bytes" in audio_data and audio_data["bytes"]:
                    audio_array, sr = librosa.load(io.BytesIO(audio_data["bytes"]), sr=None, mono=True)
                elif isinstance(audio_data, dict) and "array" in audio_data:
                    audio_array = np.array(audio_data["array"], dtype=np.float32)
                    sr = audio_data["sampling_rate"]
                else:
                    continue

                # Label
                is_fake = False
                if isinstance(label, (int, np.integer)):
                    is_fake = int(label) == 1
                elif isinstance(label, str):
                    is_fake = label.lower() in ("fake", "deepfake", "spoof", "synthetic", "1")

                if is_fake:
                    dst = MERGED_FAKE / f"gs_fake_{i:04d}.wav"
                    if not dst.exists():
                        save_wav_16k_mono(audio_array, sr, dst)
                    fake_count += 1
                else:
                    dst = MERGED_REAL / f"gs_real_{i:04d}.wav"
                    if not dst.exists():
                        save_wav_16k_mono(audio_array, sr, dst)
                    real_count += 1

                if (i + 1) % 500 == 0:
                    print(f"    {i + 1}/{len(split)} (real: {real_count}, fake: {fake_count})")

            except Exception as e:
                if i < 3:
                    print(f"    [WARN] sample {i}: {e}")
                continue

    print(f"  [DONE] garystafford: {real_count} real + {fake_count} fake")
    return real_count, fake_count


def step4_shared_assets():
    """Copy shared assets (10 real + 7 fake)."""
    print("\n" + "=" * 60)
    print("STEP 4: Shared assets → merged/{real,fake}/")
    print("=" * 60)

    real_count = 0
    fake_count = 0

    if SHARED_REAL.exists():
        for wav in sorted(SHARED_REAL.glob("*-16k.wav")):
            dst = MERGED_REAL / f"asset_real_{real_count:04d}.wav"
            if not dst.exists():
                copy_wav_verified(wav, dst)
            real_count += 1

    if SHARED_FAKE.exists():
        for wav in sorted(SHARED_FAKE.glob("*-16k.wav")):
            dst = MERGED_FAKE / f"asset_fake_{fake_count:04d}.wav"
            if not dst.exists():
                copy_wav_verified(wav, dst)
            fake_count += 1

    print(f"  [DONE] assets: {real_count} real + {fake_count} fake")
    return real_count, fake_count


def step5_librispeech_reals(target_count: int):
    """Extract random sample of LibriSpeech train-clean-100 reals.
    
    Quality priority: train-clean-100 is studio-quality read speech with
    251 speakers — best for GroupKFold cross-validation.
    """
    print("\n" + "=" * 60)
    print(f"STEP 5: LibriSpeech train-clean-100 → {target_count} reals")
    print("=" * 60)

    if not LIBRISPEECH_TARBALL.exists():
        print(f"  [ERROR] {LIBRISPEECH_TARBALL} not found")
        return 0

    # First pass: index all FLAC files in tarball
    print("  Indexing tarball...")
    flac_members = []
    with tarfile.open(str(LIBRISPEECH_TARBALL), 'r:gz') as tf:
        for member in tf.getmembers():
            if member.name.endswith('.flac') and member.isfile():
                flac_members.append(member.name)

    print(f"  Found {len(flac_members)} FLAC files")

    if len(flac_members) == 0:
        print("  [ERROR] No FLAC files found in tarball")
        return 0

    # Random sample for quality — deterministic
    random.seed(SEED)
    if len(flac_members) > target_count:
        selected = sorted(random.sample(flac_members, target_count))
    else:
        selected = sorted(flac_members)

    print(f"  Selected {len(selected)} files (seed={SEED})")

    # Extract speaker IDs for diversity check
    speakers = set()
    for name in selected:
        # Format: LibriSpeech/train-clean-100/SPEAKER_ID/CHAPTER_ID/SPEAKER-CHAPTER-UTTERANCE.flac
        parts = name.split('/')
        if len(parts) >= 3:
            speakers.add(parts[-3])
    print(f"  Speaker diversity: {len(speakers)} unique speakers")

    # Second pass: extract selected files
    print("  Extracting and converting...")
    selected_set = set(selected)
    count = 0

    with tarfile.open(str(LIBRISPEECH_TARBALL), 'r:gz') as tf:
        for member in tf.getmembers():
            if member.name not in selected_set:
                continue

            dst = MERGED_REAL / f"libri_tc100_{count:05d}.wav"
            if dst.exists():
                count += 1
                if count % 1000 == 0:
                    print(f"    {count}/{len(selected)} (skipped existing)")
                continue

            try:
                f = tf.extractfile(member)
                if f is None:
                    continue
                audio, sr = librosa.load(f, sr=None, mono=True)
                save_wav_16k_mono(audio, sr, dst)
                count += 1

                if count % 500 == 0:
                    print(f"    {count}/{len(selected)} converted")
            except Exception as e:
                print(f"    [WARN] {member.name}: {e}")
                continue

    print(f"  [DONE] {count} LibriSpeech reals extracted")
    return count


def step6_downsample(target: int):
    """Downsample both sides to target count."""
    print("\n" + "=" * 60)
    print(f"STEP 6: Downsample both sides to {target}")
    print("=" * 60)

    random.seed(SEED)

    for label, d in [("REAL", MERGED_REAL), ("FAKE", MERGED_FAKE)]:
        wavs = sorted(d.glob("*.wav"))
        current = len(wavs)
        print(f"  {label}: {current} files")

        if current <= target:
            print(f"    → No downsample needed (at or below target)")
            continue

        # Keep random subset, remove rest
        keep = set(random.sample(range(current), target))
        removed = 0
        for i, wav in enumerate(wavs):
            if i not in keep:
                wav.unlink()
                removed += 1

        remaining = len(list(d.glob("*.wav")))
        print(f"    → Removed {removed}, kept {remaining}")


def verify():
    """Final verification of merged dataset."""
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)

    for label, d in [("REAL", MERGED_REAL), ("FAKE", MERGED_FAKE)]:
        wavs = sorted(d.glob("*.wav"))
        print(f"\n  {label}: {len(wavs)} files")

        if not wavs:
            print(f"    [ERROR] No files!")
            continue

        # Check random sample for quality
        random.seed(SEED)
        check = random.sample(wavs, min(20, len(wavs)))
        bad = 0
        for wav in check:
            try:
                info = sf.info(str(wav))
                if info.samplerate != TARGET_SR:
                    print(f"    [BAD SR] {wav.name}: {info.samplerate}Hz")
                    bad += 1
                if info.channels != 1:
                    print(f"    [BAD CH] {wav.name}: {info.channels}ch")
                    bad += 1
            except Exception as e:
                print(f"    [BAD FILE] {wav.name}: {e}")
                bad += 1

        if bad == 0:
            print(f"    Quality check: ✓ All {len(check)} samples are {TARGET_SR}Hz mono")
        else:
            print(f"    Quality check: ✗ {bad} issues in {len(check)} samples")

        # Prefix breakdown
        prefixes = {}
        for wav in wavs:
            # Extract prefix up to first digit sequence
            name = wav.stem
            for j, c in enumerate(name):
                if c.isdigit():
                    prefix = name[:j].rstrip('_')
                    break
            else:
                prefix = name
            prefixes[prefix] = prefixes.get(prefix, 0) + 1

        print(f"    Sources: {dict(sorted(prefixes.items(), key=lambda x: -x[1]))}")


if __name__ == "__main__":
    print("LARYNX Run 3 — Merged Dataset Rebuild")
    print(f"Target: {TARGET_SR}Hz mono WAV, balanced classes")
    print(f"Output: {BASE_DIR / 'merged'}")
    print()

    # Create dirs
    MERGED_REAL.mkdir(parents=True, exist_ok=True)
    MERGED_FAKE.mkdir(parents=True, exist_ok=True)

    # === FAKE SIDE ===
    el_count = step1_elevenlabs_recovery()
    sk_count = step2_skypro_extract()
    gs_real, gs_fake = step3_garystafford()
    asset_real, asset_fake = step4_shared_assets()

    total_fake = len(list(MERGED_FAKE.glob("*.wav")))
    total_real_so_far = len(list(MERGED_REAL.glob("*.wav")))
    print(f"\n  Intermediate: {total_real_so_far} real (gs+assets), {total_fake} fake (all sources)")

    # === REAL SIDE ===
    # We need enough reals to match fakes. Get slightly more than fake count
    # to account for any extraction failures, then downsample
    reals_needed = max(0, total_fake - total_real_so_far) + 100  # +100 buffer
    libri_count = step5_librispeech_reals(reals_needed)

    total_real = len(list(MERGED_REAL.glob("*.wav")))
    total_fake = len(list(MERGED_FAKE.glob("*.wav")))
    print(f"\n  Pre-downsample: {total_real} real, {total_fake} fake")

    # === DOWNSAMPLE ===
    target = min(total_real, total_fake)
    print(f"  Downsample target: {target} (limited by {'real' if total_real < total_fake else 'fake'} side)")
    step6_downsample(target)

    # === VERIFY ===
    verify()

    final_real = len(list(MERGED_REAL.glob("*.wav")))
    final_fake = len(list(MERGED_FAKE.glob("*.wav")))
    print(f"\n{'=' * 60}")
    print(f"FINAL: {final_real} real + {final_fake} fake = {final_real + final_fake} total")
    print(f"{'=' * 60}")
