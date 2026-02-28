"""LARYNX Backend Models — Pydantic schemas for API request/response."""

from __future__ import annotations

import uuid
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class AnalysisStatus(str, Enum):
    """Analysis job status."""
    IDLE = "idle"
    UPLOADING = "uploading"
    ANALYZING = "analyzing"
    COMPLETE = "complete"
    ERROR = "error"


class SensorPosition(BaseModel):
    """2D midsagittal position of an EMA sensor."""
    x: float = Field(description="Horizontal position (mm), negative=back, positive=front")
    y: float = Field(description="Vertical position (mm), 0=closed, positive=open")
    velocity: float = Field(default=0.0, description="Instantaneous velocity in cm/s")


class EMAFrame(BaseModel):
    """Single frame of pseudo-EMA articulatory data."""
    sensors: dict[str, SensorPosition] = Field(description="Sensor name → position")
    tongue_velocity: float = Field(description="Average tongue velocity cm/s (T1+T2+T3)")
    timestamp: float = Field(description="Time in seconds from audio start")
    is_anomalous: bool = Field(default=False, description="Velocity exceeds human limit")


class FormantData(BaseModel):
    """Formant frequencies for a single frame."""
    f1: float = Field(description="First formant Hz (jaw opening)")
    f2: float = Field(description="Second formant Hz (tongue frontness)")
    f3: float = Field(description="Third formant Hz (lip rounding)")
    f4: Optional[float] = Field(default=None, description="Fourth formant Hz")


class Verdict(BaseModel):
    """Final analysis verdict."""
    is_genuine: bool = Field(description="True if audio passes articulatory physics test")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence 0-1")
    peak_velocity: float = Field(description="Maximum velocity observed cm/s")
    threshold: float = Field(description="Threshold used for anomaly detection cm/s")
    anomalous_frame_count: int = Field(default=0, description="Number of frames exceeding threshold")
    total_frame_count: int = Field(default=0, description="Total frames analyzed")
    anomaly_ratio: float = Field(default=0.0, description="Ratio of anomalous frames")
    classifier_score: Optional[float] = Field(default=None, description="GBM classifier P(deepfake) 0-1")
    classifier_model: Optional[str] = Field(default=None, description="Classifier model name")
    ensemble_score: Optional[float] = Field(default=None, description="Hybrid ensemble score 0-1")

class AnalysisProgress(BaseModel):
    """Progress update during analysis."""
    step: str = Field(description="Current processing step name")
    progress: float = Field(ge=0.0, le=1.0, description="0-1 progress fraction")
    message: str = Field(description="Human-readable status message")


class AnalyzeRequest(BaseModel):
    """Response to POST /api/analyze."""
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique analysis job identifier")
    duration: float = Field(description="Audio duration in seconds")
    sample_rate: int = Field(description="Sample rate used")
    frame_count: int = Field(description="Expected number of analysis frames")


class ApiResponse(BaseModel):
    """Standard API envelope — ALL endpoints use this."""
    success: bool = Field(description="Indicates if the request was successful")
    data: Optional[dict] = Field(default=None, description="Response payload")
    error: Optional[str] = Field(default=None, description="Error message if success is False")


class SSEEvent(BaseModel):
    """Server-Sent Event payload."""
    event: str = Field(description="Event type: progress|result|error|heartbeat")
    data: dict = Field(description="Event payload")
