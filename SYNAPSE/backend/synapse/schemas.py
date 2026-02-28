"""Pydantic schemas for SYNAPSE API."""
from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard API response envelope."""
    success: bool
    data: T | None = None
    error: str | None = None


# --- Generate ---

class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7
    max_new_tokens: int = 256


class GenerateData(BaseModel):
    job_id: str
    response: str
    token_count: int
    layers_cached: int
    generation_time_ms: float


# --- Features ---

class Feature(BaseModel):
    feature_id: str
    label: str
    activation_strength: float
    layer: int
    position: int
    top_tokens: list[str]
    umap_xyz: tuple[float, float, float]


class FeaturesRequest(BaseModel):
    layers: list[int] | None = None
    top_k: int = 50
    min_activation: float = 0.1


class FeaturesData(BaseModel):
    features: list[Feature]
    co_activation_edges: list[tuple[str, str, float]]
    total_features: int


# --- Ablation ---

class AblationEntry(BaseModel):
    feature_id: str
    strength: float = Field(ge=0.0, le=1.0)


class AblateRequest(BaseModel):
    job_id: str
    ablations: list[AblationEntry]
    regenerate: bool = True


class AblateData(BaseModel):
    original_response: str
    steered_response: str
    semantic_distance: float


# --- Steering ---

class SteerRequest(BaseModel):
    prompt: str
    steering_prompt_pos: str
    steering_prompt_neg: str
    layer: int = 15
    alpha: float = 1.0
    max_new_tokens: int = 256


class SteerData(BaseModel):
    original_response: str
    steered_response: str
    semantic_distance: float


# --- Clamping (Golden Gate Method) ---


class ClampEntry(BaseModel):
    feature_id: str
    clamp_value: float = Field(description="Target activation value. Use 10x normal max for dramatic effect.")




class ClampRequest(BaseModel):
    job_id: str
    clamps: list[ClampEntry]
    regenerate: bool = True




class ClampData(BaseModel):
    original_response: str
    clamped_response: str
    semantic_distance: float
    clamped_features: int
