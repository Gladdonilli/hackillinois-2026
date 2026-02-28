from __future__ import annotations

import math
from io import BytesIO
from typing import Generator

import librosa
import numpy as np
import parselmouth
from scipy.ndimage import median_filter

from LARYNX.backend.config import (
    ABSOLUTE_MAX_VELOCITY,
    F1_CLOSED_HZ,
    F1_OPEN_HZ,
    F2_BACK_HZ,
    F2_FRONT_HZ,
    FORMANT_TIME_STEP,
    JAW_MAX_MM,
    MAX_FORMANT_HZ,
    MAX_FORMANTS,
    MEDIAN_FILTER_SIZE,
    NOISE_GATE_DB,
    PITCH_FILTER_HZ,
    SAMPLE_RATE,
    TONGUE_BACK_MM,
    TONGUE_FRONT_MM,
    VELOCITY_SCALE,
    VELOCITY_THRESHOLDS,
    WINDOW_LENGTH,
)
from LARYNX.backend.models import AnalysisProgress, EMAFrame, FormantData, SensorPosition, Verdict
from LARYNX.backend.classifier import classify_ema_frames

class AudioPreprocessor:
    def load(self, audio_bytes: bytes, filename: str) -> tuple[np.ndarray, int]:
        samples, sr = librosa.load(BytesIO(audio_bytes), sr=SAMPLE_RATE, mono=True)
        
        # Apply noise gate: compute RMS per frame, zero out frames below -40dB
        rms = librosa.feature.rms(y=samples, frame_length=2048, hop_length=512)[0]
        rms_db = librosa.amplitude_to_db(rms, ref=np.max)
        
        mask = rms_db > NOISE_GATE_DB
        expanded_mask = np.repeat(mask, 512)
        
        if len(expanded_mask) > len(samples):
            expanded_mask = expanded_mask[:len(samples)]
        else:
            expanded_mask = np.pad(expanded_mask, (0, len(samples) - len(expanded_mask)), mode='edge')
            
        samples[~expanded_mask] = 0.0
        return samples, sr


class FormantExtractor:
    def extract(self, samples: np.ndarray, sample_rate: int) -> list[FormantData]:
        sound = parselmouth.Sound(samples, sampling_frequency=sample_rate)
        formants = sound.to_formant_burg(
            time_step=FORMANT_TIME_STEP,
            max_number_of_formants=MAX_FORMANTS,
            maximum_formant=MAX_FORMANT_HZ,
            window_length=WINDOW_LENGTH,
        )
        pitch = sound.to_pitch_ac(time_step=FORMANT_TIME_STEP, pitch_floor=PITCH_FILTER_HZ)
        
        num_frames = formants.get_number_of_frames()
        
        f1_track = []
        f2_track = []
        f3_track = []
        
        last_f1, last_f2, last_f3 = 500.0, 1500.0, 2500.0
        
        for i in range(1, num_frames + 1):
            t = formants.get_time_from_frame_number(i)
            p = pitch.get_value_at_time(t)
            
            # Skip frames where pitch < 80Hz (unvoiced)
            if math.isnan(p) or p < PITCH_FILTER_HZ:
                f1_track.append(last_f1)
                f2_track.append(last_f2)
                f3_track.append(last_f3)
                continue
                
            f1 = formants.get_value_at_time(1, t)
            f2 = formants.get_value_at_time(2, t)
            f3 = formants.get_value_at_time(3, t)
            
            # Forward fill NaNs
            if math.isnan(f1): f1 = last_f1
            if math.isnan(f2): f2 = last_f2
            if math.isnan(f3): f3 = last_f3
            
            f1_track.append(f1)
            f2_track.append(f2)
            f3_track.append(f3)
            
            last_f1, last_f2, last_f3 = f1, f2, f3
            
        # Apply 5-frame median filter
        f1_track = median_filter(f1_track, size=MEDIAN_FILTER_SIZE).tolist()
        f2_track = median_filter(f2_track, size=MEDIAN_FILTER_SIZE).tolist()
        f3_track = median_filter(f3_track, size=MEDIAN_FILTER_SIZE).tolist()
        
        return [FormantData(f1=f1, f2=f2, f3=f3) for f1, f2, f3 in zip(f1_track, f2_track, f3_track)]


class ArticulatoryMapper:
    def map_formants(self, formants: list[FormantData]) -> list[dict[str, SensorPosition]]:
        frames = []
        for f in formants:
            jaw_y = (f.f1 - F1_CLOSED_HZ) / (F1_OPEN_HZ - F1_CLOSED_HZ) * JAW_MAX_MM
            
            t_range = TONGUE_FRONT_MM - TONGUE_BACK_MM
            t1_x = (f.f2 - F2_BACK_HZ) / (F2_FRONT_HZ - F2_BACK_HZ) * t_range + TONGUE_BACK_MM
            t1_y = jaw_y * 0.7 + 2.0
            
            sensors = {
                "JAW": SensorPosition(x=0.0, y=jaw_y),
                "T1": SensorPosition(x=t1_x, y=t1_y),
                "T2": SensorPosition(x=t1_x * 0.8, y=t1_y * 0.9),
                "T3": SensorPosition(x=t1_x * 0.6, y=t1_y * 0.7),
                "UL": SensorPosition(x=0.0, y=12.0 - jaw_y * 0.3),
                "LL": SensorPosition(x=0.0, y=jaw_y * 0.5)
            }
            frames.append(sensors)
        return frames


class VelocityAnalyzer:
    def compute(self, sensor_frames: list[dict[str, SensorPosition]], dt: float = FORMANT_TIME_STEP) -> list[EMAFrame]:
        ema_frames = []
        
        if not sensor_frames:
            return []
        
        n = len(sensor_frames)
        sensor_names = list(sensor_frames[0].keys())
        
        # Extract all sensor x/y values into numpy arrays upfront
        coords: dict[str, tuple[np.ndarray, np.ndarray]] = {}
        for name in sensor_names:
            xs = np.array([frame[name].x for frame in sensor_frames])
            ys = np.array([frame[name].y for frame in sensor_frames])
            coords[name] = (xs, ys)
        
        # Vectorized velocity computation for all sensors
        scale = VELOCITY_SCALE / dt / 10.0
        velocities: dict[str, np.ndarray] = {}
        for name in sensor_names:
            xs, ys = coords[name]
            dx = np.diff(xs)
            dy = np.diff(ys)
            velocities[name] = np.sqrt(dx * dx + dy * dy) * scale
        
        # Vectorized anomaly detection across all frames
        is_anomalous = np.zeros(n - 1, dtype=bool)
        for name in sensor_names:
            threshold = VELOCITY_THRESHOLDS.get(name, 100.0)
            is_anomalous |= velocities[name] > threshold
        
        # Vectorized tongue velocity
        tongue_vel = (velocities["T1"] + velocities["T2"] + velocities["T3"]) / 3.0
        
        # First frame: set velocities to 0.0
        for name, sensor in sensor_frames[0].items():
            sensor.velocity = 0.0
        
        ema_frames.append(EMAFrame(
            sensors=sensor_frames[0],
            tongue_velocity=0.0,
            timestamp=0.0,
            is_anomalous=False
        ))
        
        # Remaining frames: assign computed velocities and construct EMAFrame objects
        for i in range(n - 1):
            curr = sensor_frames[i + 1]
            for name in sensor_names:
                curr[name].velocity = float(velocities[name][i])
            
            ema_frames.append(EMAFrame(
                sensors=curr,
                tongue_velocity=float(tongue_vel[i]),
                timestamp=(i + 1) * dt,
                is_anomalous=bool(is_anomalous[i])
            ))
        
        return ema_frames


def analyze_audio(audio_bytes: bytes, filename: str) -> Generator[AnalysisProgress | EMAFrame | Verdict, None, None]:
    """Full pipeline. Yields progress events, then frames, then verdict."""
    yield AnalysisProgress(step="loading", progress=0.05, message="Loading audio...")
    
    preprocessor = AudioPreprocessor()
    samples, sr = preprocessor.load(audio_bytes, filename)
    
    yield AnalysisProgress(step="formants", progress=0.15, message="Extracting formant frequencies...")
    
    extractor = FormantExtractor()
    formants = extractor.extract(samples, sr)
    
    yield AnalysisProgress(step="mapping", progress=0.50, message="Computing articulatory trajectories...")
    
    mapper = ArticulatoryMapper()
    sensor_frames = mapper.map_formants(formants)
    
    yield AnalysisProgress(step="velocity", progress=0.75, message="Analyzing velocity anomalies...")
    
    analyzer = VelocityAnalyzer()
    ema_frames = analyzer.compute(sensor_frames)
    
    yield AnalysisProgress(step="running_classifier", progress=0.85, message="Running ensemble classifier...")

    # Run GBM classifier (optional — falls back gracefully)
    classifier_result = classify_ema_frames(ema_frames)

    yield AnalysisProgress(step="verdict", progress=0.90, message="Computing verdict...")

    # Yield all frames
    for frame in ema_frames:
        yield frame

    # Compute formant-based verdict
    anomalous = sum(1 for f in ema_frames if f.is_anomalous)
    total = len(ema_frames)
    peak_v = max((f.tongue_velocity for f in ema_frames), default=0.0)
    ratio = anomalous / total if total > 0 else 0.0

    # Genuine if < 5% of frames are anomalous
    is_genuine = ratio < 0.05
    formant_confidence = 1.0 - min(ratio * 5, 1.0)

    # Compute ensemble score: 0.6 * formant + 0.4 * classifier
    classifier_score = None
    classifier_model = None
    ensemble_score = None

    if classifier_result is not None:
        classifier_score = round(classifier_result["score"], 4)
        classifier_model = classifier_result["model_name"]
        # classifier_score is P(deepfake), so confidence-of-genuine = 1 - P(deepfake)
        classifier_confidence = 1.0 - classifier_score
        ensemble_score = round(0.6 * formant_confidence + 0.4 * classifier_confidence, 4)
        # Override verdict if ensemble disagrees with formant-only
        is_genuine = ensemble_score > 0.5
        confidence = ensemble_score
    else:
        # Fallback: formant-only
        confidence = formant_confidence
        ensemble_score = None

    yield Verdict(
        is_genuine=is_genuine,
        confidence=round(confidence, 3),
        peak_velocity=round(peak_v, 2),
        threshold=ABSOLUTE_MAX_VELOCITY,
        anomalous_frame_count=anomalous,
        total_frame_count=total,
        anomaly_ratio=round(ratio, 4),
        classifier_score=classifier_score,
        classifier_model=classifier_model,
        ensemble_score=ensemble_score,
    )

    yield AnalysisProgress(step="complete", progress=1.0, message="Analysis complete")
