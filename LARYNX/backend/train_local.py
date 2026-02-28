#!/usr/bin/env python3
"""Local classifier training on aai_results.json from Run 3.
Runs Steps 4-5 from overnight_pipeline.py without Modal."""

import json
import time
import pickle
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    HistGradientBoostingClassifier,
)
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold, cross_val_predict
from sklearn.metrics import accuracy_score, classification_report

RESULTS_DIR = Path(__file__).parent / "training_data"

def main():
    start_time = time.time()

    # Load results
    results_path = RESULTS_DIR / "aai_results.json"
    print(f"📂 Loading {results_path}...")
    with open(results_path) as f:
        all_results = json.load(f)

    good_results = [r for r in all_results if "error" not in r]
    error_results = [r for r in all_results if "error" in r]
    print(f"  ✅ Loaded: {len(good_results)} success, {len(error_results)} errors")

    # ---- Step 4: Train classifier ----
    print(f"\n🎯 Step 4: Training classifier on {len(good_results)} samples...")

    real_results = [r for r in good_results if r["label"] == "real"]
    fake_results = [r for r in good_results if r["label"] == "deepfake"]
    print(f"  Real: {len(real_results)}, Fake: {len(fake_results)}")

    meta_keys = {"filename", "label", "num_frames", "error", "pass_idx", "speaker"}
    feature_keys = sorted([k for k in good_results[0].keys() if k not in meta_keys])
    print(f"  Features: {len(feature_keys)}")

    X = []
    y = []
    filenames = []
    speakers = []
    for r in good_results:
        row = [r.get(k, 0.0) for k in feature_keys]
        X.append(row)
        y.append(1 if r["label"] == "deepfake" else 0)
        filenames.append(r["filename"])
        fn = r["filename"]
        if fn.startswith("libri_tc100_"):
            idx = fn.replace("libri_tc100_", "").replace(".wav", "")
            speaker = f"libri_{int(idx) % 251}"
        elif fn.startswith("gs_real_") or fn.startswith("gs_fake_"):
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
    X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    groups = np.array(speakers)
    n_unique_speakers = len(set(speakers))
    n_splits = min(5, n_unique_speakers)
    print(f"  Unique speakers: {n_unique_speakers}, using {n_splits}-fold GroupKFold")

    n_samples = len(y)
    if n_samples > 5000:
        models = {
            "HistGradientBoosting": HistGradientBoostingClassifier(
                max_depth=8, learning_rate=0.05, max_iter=400, random_state=42,
            ),
            "RandomForest": RandomForestClassifier(
                n_estimators=400, max_depth=12, random_state=42, n_jobs=-1,
            ),
            "LogisticRegression": LogisticRegression(
                max_iter=4000, solver="saga", random_state=42, n_jobs=-1,
            ),
        }
    else:
        models = {
            "GradientBoosting": GradientBoostingClassifier(
                n_estimators=500, max_depth=3, learning_rate=0.05, subsample=0.8, random_state=42,
            ),
            "RandomForest": RandomForestClassifier(
                n_estimators=1000, max_depth=5, random_state=42,
            ),
            "SVM_RBF": SVC(kernel="rbf", probability=True, random_state=42),
            "LogisticRegression": LogisticRegression(max_iter=2000, random_state=42),
        }

    best_acc = 0
    best_model_name = ""
    best_model = None

    for name, model in models.items():
        print(f"  Training {name}...", end=" ", flush=True)
        y_pred = cross_val_predict(model, X_scaled, y, cv=GroupKFold(n_splits=n_splits), groups=groups, method="predict")
        acc = accuracy_score(y, y_pred)
        print(f"{acc*100:.1f}% ({sum(y_pred == y)}/{len(y)})")
        if acc > best_acc:
            best_acc = acc
            best_model_name = name
            best_model = model

    print(f"\n  🏆 Best: {best_model_name} ({best_acc*100:.1f}%)")
    best_model.fit(X_scaled, y)

    y_pred_final = best_model.predict(X_scaled)
    print(f"\n  Classification Report (on full training set):")
    print(classification_report(y, y_pred_final, target_names=["Real", "Deepfake"]))

    if hasattr(best_model, "feature_importances_"):
        importances = best_model.feature_importances_
        top_features = sorted(zip(feature_keys, importances), key=lambda x: -x[1])[:20]
        print(f"\n  Top 20 Features:")
        for fname, imp in top_features:
            print(f"    {fname}: {imp:.4f}")

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

    elapsed = time.time() - start_time
    strong = sum(1 for s in best_signals if s[0] > 20)
    medium = sum(1 for s in best_signals if 10 < s[0] <= 20)

    print(f"\n{'=' * 80}")
    print(f"RUN 3 LOCAL TRAINING COMPLETE")
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

if __name__ == "__main__":
    main()
