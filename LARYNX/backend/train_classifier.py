"""
LARYNX Deepfake Classifier — Phase A+B
=======================================
Loads saved EMA .npy outputs from CSIS Phase 2, computes comprehensive
articulatory features (velocity, acceleration, jerk × 6 articulators × 
multiple statistics), trains a classifier, and outputs confidence scores.

Usage:
    python3 LARYNX/backend/train_classifier.py

Outputs:
    - Feature importance ranking
    - Leave-one-out cross-validation accuracy
    - Per-sample confidence scores
    - Saved model + scaler for production use
"""

import json
import os
import pickle
import sys
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import LeaveOneOut, cross_val_predict
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
EMA_DIR = Path(__file__).parent / "ema_outputs"
RESULTS_JSON = Path(__file__).parent / "csis_phase2_results.json"
MODEL_OUT = Path(__file__).parent / "classifier_model.pkl"

# EMA channel indices (12D: 6 articulators × 2 coords)
ARTICULATORS = {
    "LI": (0, 1),   # Lower Incisor (jaw)
    "UL": (2, 3),   # Upper Lip
    "LL": (4, 5),   # Lower Lip
    "TT": (6, 7),   # Tongue Tip
    "TB": (8, 9),   # Tongue Body
    "TD": (10, 11), # Tongue Dorsum
}

EMA_RATE = 200  # Hz (from AAI model output)
DT = 1.0 / EMA_RATE


def compute_kinematics(ema: np.ndarray, ix: int, iy: int) -> dict:
    """Compute velocity, acceleration, jerk for a 2D articulatory point."""
    # Position trajectory (mm)
    x = ema[:, ix]
    y = ema[:, iy]

    # Velocity (cm/s)
    dx = np.diff(x)
    dy = np.diff(y)
    vel = np.sqrt(dx**2 + dy**2) / DT / 10.0  # mm/s → cm/s

    # Acceleration (cm/s²)
    accel = np.diff(vel) / DT

    # Jerk (cm/s³)
    jerk = np.abs(np.diff(accel) / DT)

    # Absolute acceleration
    abs_accel = np.abs(accel)

    return {"vel": vel, "accel": abs_accel, "jerk": jerk}


def extract_features(ema: np.ndarray) -> dict:
    """Extract comprehensive feature vector from EMA trajectory."""
    features = {}

    for art_name, (ix, iy) in ARTICULATORS.items():
        kin = compute_kinematics(ema, ix, iy)
        prefix = art_name.lower()

        for signal_name, signal in kin.items():
            if len(signal) == 0:
                continue

            # Statistical features
            features[f"{prefix}_{signal_name}_peak"] = float(np.max(signal))
            features[f"{prefix}_{signal_name}_mean"] = float(np.mean(signal))
            features[f"{prefix}_{signal_name}_median"] = float(np.median(signal))
            features[f"{prefix}_{signal_name}_std"] = float(np.std(signal))
            features[f"{prefix}_{signal_name}_p75"] = float(np.percentile(signal, 75))
            features[f"{prefix}_{signal_name}_p90"] = float(np.percentile(signal, 90))
            features[f"{prefix}_{signal_name}_p95"] = float(np.percentile(signal, 95))
            features[f"{prefix}_{signal_name}_p99"] = float(np.percentile(signal, 99))

            # Shape features
            features[f"{prefix}_{signal_name}_skew"] = float(
                np.mean(((signal - np.mean(signal)) / (np.std(signal) + 1e-8)) ** 3)
            )
            features[f"{prefix}_{signal_name}_kurtosis"] = float(
                np.mean(((signal - np.mean(signal)) / (np.std(signal) + 1e-8)) ** 4) - 3
            )

            # Ratio features (tail heaviness)
            mean_val = np.mean(signal) + 1e-8
            features[f"{prefix}_{signal_name}_p99_mean_ratio"] = float(
                np.percentile(signal, 99) / mean_val
            )
            features[f"{prefix}_{signal_name}_peak_mean_ratio"] = float(
                np.max(signal) / mean_val
            )

    # Cross-articulator features (ratios between articulators)
    for art1 in ["ul", "ll", "li"]:
        for art2 in ["tt", "tb", "td"]:
            key1 = f"{art1}_vel_mean"
            key2 = f"{art2}_vel_mean"
            if key1 in features and key2 in features:
                features[f"{art1}_{art2}_vel_ratio"] = features[key1] / (features[key2] + 1e-8)

            key1j = f"{art1}_jerk_mean"
            key2j = f"{art2}_jerk_mean"
            if key1j in features and key2j in features:
                features[f"{art1}_{art2}_jerk_ratio"] = features[key1j] / (features[key2j] + 1e-8)

    # Temporal correlation features (how correlated are articulator movements?)
    for art1_name, (ix1, iy1) in list(ARTICULATORS.items())[:3]:  # lips/jaw
        for art2_name, (ix2, iy2) in list(ARTICULATORS.items())[3:]:  # tongue
            min_len = min(len(ema[:, ix1]), len(ema[:, ix2]))
            corr_x = np.corrcoef(ema[:min_len, ix1], ema[:min_len, ix2])[0, 1]
            corr_y = np.corrcoef(ema[:min_len, iy1], ema[:min_len, iy2])[0, 1]
            features[f"{art1_name.lower()}_{art2_name.lower()}_corr_x"] = float(
                corr_x if np.isfinite(corr_x) else 0
            )
            features[f"{art1_name.lower()}_{art2_name.lower()}_corr_y"] = float(
                corr_y if np.isfinite(corr_y) else 0
            )

    return features


def load_samples() -> tuple:
    """Load EMA outputs and labels."""
    # Load results JSON for labels
    with open(RESULTS_JSON) as f:
        results = json.load(f)

    label_map = {}
    for r in results:
        label_map[r["filename"]] = 1 if r["label"] == "deepfake" else 0

    X_list = []
    y_list = []
    names = []

    for npy_file in sorted(EMA_DIR.glob("*.npy")):
        # Map .npy filename back to .wav filename
        stem = npy_file.stem  # e.g., "deepfake_aria-neural-16k"
        # Strip real_ / deepfake_ prefix to match results JSON filenames
        if stem.startswith("real_"):
            bare = stem[len("real_"):]
        elif stem.startswith("deepfake_"):
            bare = stem[len("deepfake_"):]
        else:
            bare = stem
        wav_name = bare + ".wav"

        if wav_name not in label_map:
            print(f"  SKIP {wav_name} — not in results JSON")
            continue

        ema = np.load(npy_file)
        # Use only first 12 dims (EMA), rest may be vocoder features
        ema_12d = ema[:, :12]

        features = extract_features(ema_12d)
        X_list.append(features)
        y_list.append(label_map[wav_name])
        names.append(wav_name)

    # Convert to numpy array (consistent feature order)
    feature_names = sorted(X_list[0].keys())
    X = np.array([[f[k] for k in feature_names] for f in X_list])
    y = np.array(y_list)

    return X, y, names, feature_names


def main():
    print("=" * 80)
    print("LARYNX DEEPFAKE CLASSIFIER — Phase A+B")
    print("=" * 80)

    # Load data
    print("\n[1] Loading EMA outputs and extracting features...")
    X, y, names, feature_names = load_samples()
    print(f"    Samples: {len(names)} ({sum(y == 0)} real, {sum(y == 1)} deepfake)")
    print(f"    Features: {len(feature_names)}")

    # Deduplicate identical samples (cmu-arctic-16k and cmu-arctic-sample are same)
    # Keep only unique EMA data
    unique_mask = []
    seen_hashes = set()
    for i, row in enumerate(X):
        h = hash(row.tobytes())
        if h not in seen_hashes:
            seen_hashes.add(h)
            unique_mask.append(i)
        else:
            print(f"    DEDUP: {names[i]} (identical to previous sample)")

    X = X[unique_mask]
    y = y[unique_mask]
    names = [names[i] for i in unique_mask]
    print(f"    After dedup: {len(names)} samples ({sum(y == 0)} real, {sum(y == 1)} deepfake)")

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ---- Phase A: Feature importance ----
    print("\n[2] Phase A — Feature importance analysis...")

    # Use RF for feature importance
    rf = RandomForestClassifier(n_estimators=500, random_state=42, max_depth=3)
    rf.fit(X_scaled, y)

    importances = rf.feature_importances_
    top_indices = np.argsort(importances)[::-1][:25]

    print("\n    Top 25 discriminative features:")
    print(f"    {'Rank':<5} {'Feature':<45} {'Importance':>10}")
    print(f"    {'-'*65}")
    for rank, idx in enumerate(top_indices, 1):
        print(f"    {rank:<5} {feature_names[idx]:<45} {importances[idx]:>10.4f}")

    # ---- Phase B: Classifier training with LOO-CV ----
    print("\n[3] Phase B — Classifier training (Leave-One-Out CV)...")

    classifiers = {
        "Logistic Regression": LogisticRegression(C=1.0, max_iter=1000, random_state=42),
        "SVM (RBF)": SVC(C=10, gamma="scale", probability=True, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=500, max_depth=3, random_state=42),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=200, max_depth=2, learning_rate=0.1, random_state=42
        ),
    }

    loo = LeaveOneOut()
    best_acc = 0
    best_name = ""
    best_clf = None

    for clf_name, clf in classifiers.items():
        y_pred = cross_val_predict(clf, X_scaled, y, cv=loo)
        acc = accuracy_score(y, y_pred)
        correct = sum(y_pred == y)
        total = len(y)
        print(f"    {clf_name:<25} LOO Accuracy: {acc:.1%} ({correct}/{total})")

        if acc > best_acc:
            best_acc = acc
            best_name = clf_name
            best_clf = clf

    print(f"\n    Best: {best_name} ({best_acc:.1%})")

    # ---- Train best classifier on full data and get confidence scores ----
    print("\n[4] Training final model and computing confidence scores...")

    best_clf.fit(X_scaled, y)

    # Get probability scores
    if hasattr(best_clf, "predict_proba"):
        probas = best_clf.predict_proba(X_scaled)[:, 1]  # P(deepfake)
    else:
        probas = best_clf.decision_function(X_scaled)

    print(f"\n    {'Sample':<35} {'True Label':<12} {'P(Deepfake)':>12} {'Verdict':>10}")
    print(f"    {'-'*75}")
    for i, name in enumerate(names):
        label = "REAL" if y[i] == 0 else "DEEPFAKE"
        prob = probas[i]
        verdict = "✅" if (prob > 0.5) == (y[i] == 1) else "❌"
        print(f"    {name:<35} {label:<12} {prob:>11.1%} {verdict:>10}")

    # ---- LOO confidence scores (unbiased) ----
    print("\n[5] Leave-One-Out confidence scores (UNBIASED)...")

    loo_probas = []
    for train_idx, test_idx in loo.split(X_scaled):
        clf_loo = type(best_clf)(**best_clf.get_params())
        clf_loo.fit(X_scaled[train_idx], y[train_idx])
        if hasattr(clf_loo, "predict_proba"):
            prob = clf_loo.predict_proba(X_scaled[test_idx])[:, 1][0]
        else:
            prob = clf_loo.decision_function(X_scaled[test_idx])[0]
        loo_probas.append(prob)

    print(f"\n    {'Sample':<35} {'True Label':<12} {'P(Deepfake)':>12} {'Verdict':>10}")
    print(f"    {'-'*75}")
    for i, name in enumerate(names):
        label = "REAL" if y[i] == 0 else "DEEPFAKE"
        prob = loo_probas[i]
        verdict = "✅" if (prob > 0.5) == (y[i] == 1) else "❌"
        print(f"    {name:<35} {label:<12} {prob:>11.1%} {verdict:>10}")

    loo_preds = [1 if p > 0.5 else 0 for p in loo_probas]
    loo_acc = accuracy_score(y, loo_preds)
    print(f"\n    LOO Accuracy (unbiased): {loo_acc:.1%}")

    # ---- Separation visualization ----
    print("\n[6] Confidence distribution:")
    real_probs = [loo_probas[i] for i in range(len(y)) if y[i] == 0]
    fake_probs = [loo_probas[i] for i in range(len(y)) if y[i] == 1]

    print(f"    Real samples:     min={min(real_probs):.1%}, max={max(real_probs):.1%}, mean={np.mean(real_probs):.1%}")
    print(f"    Deepfake samples: min={min(fake_probs):.1%}, max={max(fake_probs):.1%}, mean={np.mean(fake_probs):.1%}")

    gap = min(fake_probs) - max(real_probs)
    if gap > 0:
        print(f"    🟢 CLEAN SEPARATION — {gap:.1%} gap between worst fake and best real")
    else:
        print(f"    🟡 OVERLAP — some samples cross the decision boundary")

    # ---- Save model ----
    print(f"\n[7] Saving model to {MODEL_OUT}...")
    model_bundle = {
        "classifier": best_clf,
        "scaler": scaler,
        "feature_names": feature_names,
        "classifier_name": best_name,
        "loo_accuracy": loo_acc,
        "training_samples": len(names),
    }
    with open(MODEL_OUT, "wb") as f:
        pickle.dump(model_bundle, f)

    print(f"    Saved: {best_name}, {len(feature_names)} features, LOO acc={loo_acc:.1%}")

    # ---- Summary ----
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"  Classifier: {best_name}")
    print(f"  Features: {len(feature_names)} (velocity/acceleration/jerk × 6 articulators × statistics)")
    print(f"  LOO Accuracy: {loo_acc:.1%} ({sum(1 for a, b in zip(loo_preds, y) if a == b)}/{len(y)})")
    print(f"  Model saved to: {MODEL_OUT}")

    if loo_acc == 1.0:
        print("\n  🟢 PERFECT CLASSIFICATION — All samples correctly classified with LOO-CV")
        print("  The articulatory feature space cleanly separates real from deepfake speech.")
    elif loo_acc >= 0.9:
        print(f"\n  🟢 STRONG CLASSIFICATION — {loo_acc:.0%} accuracy")
    elif loo_acc >= 0.7:
        print(f"\n  🟡 MODERATE CLASSIFICATION — {loo_acc:.0%} accuracy, needs more data or fine-tuning")
    else:
        print(f"\n  🔴 WEAK CLASSIFICATION — {loo_acc:.0%} accuracy, consider AAI fine-tuning")

    return loo_acc


if __name__ == "__main__":
    main()
