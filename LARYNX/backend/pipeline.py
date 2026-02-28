from __future__ import annotations

import math
from io import BytesIO
from typing import Generator

import librosa
import numpy as np
import parselmouth
from scipy.ndimage import median_filter

from .config import (
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
from .models import AnalysisProgress, EMAFrame, FormantData, SensorPosition, Verdict

class AudioPreprocessor:
    def load(self, audio_bytes: bytes, filename: str) -> tuple[np.ndarray, int]:
        samples, sr = librosa.load(BytesIO(audio_bytes), sr=16000, mono=True)
        
        # Apply noise gate: compute RMS per frame, zero out frames below -40dB
        rms = librosa.feature.rms(y=samples, frame_length=2048, hop_length=512)[0]
        rms_db = librosa.amplitude_to_db(rms, ref=np.max)
        
        mask = rms_db > -40.0
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
            time_step=0.01, 
            max_number_of_formants=5, 
            maximum_formant=5500.0, 
            window_length=0.025
        )
        pitch = sound.to_pitch_ac(time_step=0.01, pitch_floor=80.0)
        
        num_frames = formants.get_number_of_frames()
        
        f1_track = []
        f2_track = []
        f3_track = []
        
        last_f1, last_f2, last_f3 = 500.0, 1500.0, 2500.0
        
        for i in range(1, num_frames + 1):
            t = formants.get_time_from_frame_number(i)
            p = pitch.get_value_at_time(t)
            
            # Skip frames where pitch < 80Hz (unvoiced)
            if math.isnan(p) or p < 80.0:
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
        f1_track = median_filter(f1_track, size=5).tolist()
        f2_track = median_filter(f2_track, size=5).tolist()
        f3_track = median_filter(f3_track, size=5).tolist()
        
        return [FormantData(f1=f1, f2=f2, f3=f3) for f1, f2, f3 in zip(f1_track, f2_track, f3_track)]


class ArticulatoryMapper:
    def map_formants(self, formants: list[FormantData]) -> list[dict[str, SensorPosition]]:
        frames = []
        for f in formants:
            jaw_y = (f.f1 - 300) / (900 - 300) * 15.0
            
            t1_x = (f.f2 - 800) / (2400 - 800) * 40.0 - 20.0
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
    def compute(self, sensor_frames: list[dict[str, SensorPosition]], dt: float = 0.01) -> list[EMAFrame]:
        ema_frames = []
        
        if not sensor_frames:
            return []
            
        for name, sensor in sensor_frames[0].items():
            sensor.velocity = 0.0
            
        ema_frames.append(EMAFrame(
            sensors=sensor_frames[0],
            tongue_velocity=0.0,
            timestamp=0.0,
            is_anomalous=False
        ))
        
        for i in range(1, len(sensor_frames)):
            prev = sensor_frames[i-1]
            curr = sensor_frames[i]
            
            is_anom = False
            
            for name in curr:
                dx = curr[name].x - prev[name].x
                dy = curr[name].y - prev[name].y
                
                # convert mm/frame to cm/s with scale factor
                vel = math.sqrt(dx*dx + dy*dy) * 1.5 / dt / 10.0
                curr[name].velocity = vel
                
                if vel > VELOCITY_THRESHOLDS.get(name, 100.0):
                    is_anom = True
                    
            tongue_vel = (curr["T1"].velocity + curr["T2"].velocity + curr["T3"].velocity) / 3.0
            
            ema_frames.append(EMAFrame(
                sensors=curr,
                tongue_velocity=tongue_vel,
                timestamp=i * dt,
                is_anomalous=is_anom
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
    
    yield AnalysisProgress(step="verdict", progress=0.90, message="Computing verdict...")
    
    # Yield all frames
    for frame in ema_frames:
        yield frame
    
    # Compute verdict
    anomalous = sum(1 for f in ema_frames if f.is_anomalous)
    total = len(ema_frames)
    peak_v = max((f.tongue_velocity for f in ema_frames), default=0.0)
    ratio = anomalous / total if total > 0 else 0.0
    
    # Genuine if < 5% of frames are anomalous
    is_genuine = ratio < 0.05
    confidence = 1.0 - min(ratio * 5, 1.0)
    
    yield Verdict(
        is_genuine=is_genuine,
        confidence=round(confidence, 3),
        peak_velocity=round(peak_v, 2),
        threshold=22.0,
        anomalous_frame_count=anomalous,
        total_frame_count=total,
        anomaly_ratio=round(ratio, 4),
    )
    
    yield AnalysisProgress(step="complete", progress=1.0, message="Analysis complete")
