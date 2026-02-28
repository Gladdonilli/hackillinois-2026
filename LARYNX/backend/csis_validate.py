#!/usr/bin/env python3
"""CSIS — Core Science Integration Smoke-test.

Runs the existing parselmouth→formant→velocity pipeline against real vs deepfake
WAV files and reports whether there's any velocity separation signal.

Usage:
    python -m LARYNX.backend.csis_validate

Expects test audio in shared/assets/audio/{real,deepfake}/*.wav
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import NamedTuple

import numpy as np

# Ensure repo root is importable
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from LARYNX.backend.pipeline import (
    AudioPreprocessor,
    FormantExtractor,
    ArticulatoryMapper,
    VelocityAnalyzer,
)
from LARYNX.backend.models import EMAFrame


class AudioResult(NamedTuple):
    """Summary statistics for one audio file."""
    filename: str
    label: str  # "real" or "deepfake"
    total_frames: int
    anomalous_frames: int
    anomaly_ratio: float
    peak_tongue_vel: float
    mean_tongue_vel: float
    p95_tongue_vel: float
    peak_jaw_vel: float
    verdict: str  # "GENUINE" or "DEEPFAKE"


def analyze_file(wav_path: Path, label: str) -> AudioResult:
    """Run full pipeline on a single WAV file."""
    audio_bytes = wav_path.read_bytes()

    preprocessor = AudioPreprocessor()
    samples, sr = preprocessor.load(audio_bytes, wav_path.name)

    extractor = FormantExtractor()
    formants = extractor.extract(samples, sr)

    mapper = ArticulatoryMapper()
    sensor_frames = mapper.map_formants(formants)

    analyzer = VelocityAnalyzer()
    ema_frames = analyzer.compute(sensor_frames)

    if not ema_frames:
        return AudioResult(
            filename=wav_path.name, label=label,
            total_frames=0, anomalous_frames=0, anomaly_ratio=0.0,
            peak_tongue_vel=0.0, mean_tongue_vel=0.0, p95_tongue_vel=0.0,
            peak_jaw_vel=0.0, verdict="NO_DATA",
        )

    tongue_vels = [f.tongue_velocity for f in ema_frames]
    jaw_vels = [f.sensors["JAW"].velocity for f in ema_frames]
    anomalous = sum(1 for f in ema_frames if f.is_anomalous)
    total = len(ema_frames)
    ratio = anomalous / total if total > 0 else 0.0

    tongue_arr = np.array(tongue_vels)
    jaw_arr = np.array(jaw_vels)

    return AudioResult(
        filename=wav_path.name,
        label=label,
        total_frames=total,
        anomalous_frames=anomalous,
        anomaly_ratio=round(ratio, 4),
        peak_tongue_vel=round(float(np.max(tongue_arr)), 2),
        mean_tongue_vel=round(float(np.mean(tongue_arr)), 2),
        p95_tongue_vel=round(float(np.percentile(tongue_arr, 95)), 2),
        peak_jaw_vel=round(float(np.max(jaw_arr)), 2),
        verdict="GENUINE" if ratio < 0.05 else "DEEPFAKE",
    )


def main() -> None:
    audio_dir = REPO_ROOT / "shared" / "assets" / "audio"
    real_dir = audio_dir / "real"
    deepfake_dir = audio_dir / "deepfake"

    results: list[AudioResult] = []

    # Process real files
    if real_dir.exists():
        for wav in sorted(real_dir.glob("*.wav")):
            if wav.stat().st_size < 1000:
                print(f"  SKIP {wav.name} (too small, likely corrupt)")
                continue
            print(f"  Processing REAL: {wav.name}...")
            results.append(analyze_file(wav, "real"))

    # Process deepfake files
    if deepfake_dir.exists():
        for wav in sorted(deepfake_dir.glob("*.wav")):
            if wav.stat().st_size < 1000:
                print(f"  SKIP {wav.name} (too small, likely corrupt)")
                continue
            print(f"  Processing DEEPFAKE: {wav.name}...")
            results.append(analyze_file(wav, "deepfake"))

    if not results:
        print("\n❌ No valid WAV files found!")
        sys.exit(1)

    # Print results table
    print("\n" + "=" * 100)
    print("CSIS PHASE 1 — Parselmouth Formant → Velocity Pipeline Validation")
    print("=" * 100)
    print(f"{'File':<28} {'Label':<10} {'Frames':>7} {'Anom':>5} {'Ratio':>7} "
          f"{'PeakTng':>8} {'MeanTng':>8} {'P95Tng':>8} {'PeakJaw':>8} {'Verdict':<10}")
    print("-" * 100)

    for r in results:
        print(f"{r.filename:<28} {r.label:<10} {r.total_frames:>7} {r.anomalous_frames:>5} "
              f"{r.anomaly_ratio:>7.4f} {r.peak_tongue_vel:>8.2f} {r.mean_tongue_vel:>8.2f} "
              f"{r.p95_tongue_vel:>8.2f} {r.peak_jaw_vel:>8.2f} {r.verdict:<10}")

    print("-" * 100)

    # Compute separation metrics
    real_results = [r for r in results if r.label == "real"]
    fake_results = [r for r in results if r.label == "deepfake"]

    if real_results and fake_results:
        real_peak_avg = np.mean([r.peak_tongue_vel for r in real_results])
        fake_peak_avg = np.mean([r.peak_tongue_vel for r in fake_results])
        real_p95_avg = np.mean([r.p95_tongue_vel for r in real_results])
        fake_p95_avg = np.mean([r.p95_tongue_vel for r in fake_results])
        real_anom_avg = np.mean([r.anomaly_ratio for r in real_results])
        fake_anom_avg = np.mean([r.anomaly_ratio for r in fake_results])

        print("\nSEPARATION ANALYSIS:")
        print(f"  Real avg peak tongue vel:     {real_peak_avg:.2f} cm/s")
        print(f"  Deepfake avg peak tongue vel: {fake_peak_avg:.2f} cm/s")
        print(f"  Peak separation:              {abs(fake_peak_avg - real_peak_avg):.2f} cm/s "
              f"({'✅ SIGNAL' if abs(fake_peak_avg - real_peak_avg) > 5.0 else '❌ NO SIGNAL'})")
        print()
        print(f"  Real avg P95 tongue vel:      {real_p95_avg:.2f} cm/s")
        print(f"  Deepfake avg P95 tongue vel:  {fake_p95_avg:.2f} cm/s")
        print(f"  P95 separation:               {abs(fake_p95_avg - real_p95_avg):.2f} cm/s "
              f"({'✅ SIGNAL' if abs(fake_p95_avg - real_p95_avg) > 3.0 else '❌ NO SIGNAL'})")
        print()
        print(f"  Real avg anomaly ratio:       {real_anom_avg:.4f}")
        print(f"  Deepfake avg anomaly ratio:   {fake_anom_avg:.4f}")
        print(f"  Anomaly separation:           {abs(fake_anom_avg - real_anom_avg):.4f} "
              f"({'✅ SIGNAL' if abs(fake_anom_avg - real_anom_avg) > 0.02 else '❌ NO SIGNAL'})")

        signals = sum([
            abs(fake_peak_avg - real_peak_avg) > 5.0,
            abs(fake_p95_avg - real_p95_avg) > 3.0,
            abs(fake_anom_avg - real_anom_avg) > 0.02,
        ])

        print()
        if signals >= 2:
            print("🟢 CSIS PHASE 1 PASS — Parselmouth pipeline shows velocity separation.")
            print("   The naive formant→velocity approach has detectable signal.")
            print("   AAI (Phase 2) should amplify this further.")
        elif signals == 1:
            print("🟡 CSIS PHASE 1 MARGINAL — Weak signal detected.")
            print("   Parselmouth pipeline shows some separation but not robust.")
            print("   AAI (Phase 2) is CRITICAL for reliable detection.")
        else:
            print("🔴 CSIS PHASE 1 FAIL — No velocity separation detected.")
            print("   Parselmouth formant→velocity approach does NOT discriminate.")
            print("   Peter Wu AAI (Phase 2) is MANDATORY for the thesis to work.")
    else:
        print("\n⚠ Need both real and deepfake files for separation analysis.")

    print("\n" + "=" * 100)


if __name__ == "__main__":
    main()
