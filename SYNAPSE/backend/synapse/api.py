"""FastAPI routes for SYNAPSE backend."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .ablation import ablate_features, clamp_features
from .model import ModelManager
from .sae import SAEExtractor
from .schemas import (
    AblateData,
    AblateRequest,
    ApiResponse,
    ClampData,
    ClampRequest,
    FeaturesData,
    FeaturesRequest,
    GenerateData,
    SteerData,
    SteerRequest,
)
from .steering import compute_steering_vector, generate_steered

logger = logging.getLogger(__name__)


def create_app(model_manager: ModelManager, sae_extractor: SAEExtractor) -> FastAPI:
    """Create FastAPI app with all SYNAPSE routes."""
    app = FastAPI(title="SYNAPSE API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/api/generate", response_model=ApiResponse[GenerateData])
    async def generate_endpoint(req: dict[str, Any]) -> ApiResponse[GenerateData]:
        """Generate text and cache residual stream."""
        try:
            result = model_manager.generate(
                prompt=req.get("prompt", ""),
                temperature=req.get("temperature", 0.7),
                max_new_tokens=req.get("max_new_tokens", 256),
            )
            return ApiResponse(success=True, data=GenerateData(**result))
        except Exception as e:
            logger.exception("Generate failed")
            return ApiResponse(success=False, error=str(e))

    @app.post("/api/features/{job_id}", response_model=ApiResponse[FeaturesData])
    async def features_endpoint(
        job_id: str, req: FeaturesRequest | None = None
    ) -> ApiResponse[FeaturesData]:
        """Extract SAE features from cached residual stream."""
        try:
            cached = model_manager.get_residual_stream(job_id)
            params = req or FeaturesRequest()
            result = sae_extractor.extract_features(
                cache=cached,
                layers=params.layers,
                top_k=params.top_k,
                min_activation=params.min_activation,
            )
            return ApiResponse(success=True, data=FeaturesData(**result))
        except KeyError:
            return ApiResponse(success=False, error=f"Job {job_id} not found")
        except Exception as e:
            logger.exception("Feature extraction failed")
            return ApiResponse(success=False, error=str(e))

    @app.post("/api/ablate", response_model=ApiResponse[AblateData])
    async def ablate_endpoint(req: AblateRequest) -> ApiResponse[AblateData]:
        """Ablate features and regenerate response."""
        try:
            result = ablate_features(
                model_manager=model_manager,
                sae_extractor=sae_extractor,
                job_id=req.job_id,
                ablations=req.ablations,
                regenerate=req.regenerate,
            )
            return ApiResponse(success=True, data=result)
        except KeyError:
            return ApiResponse(success=False, error=f"Job {req.job_id} not found")
        except Exception as e:
            logger.exception("Ablation failed")
            return ApiResponse(success=False, error=str(e))

    @app.post("/api/clamp", response_model=ApiResponse[ClampData])
    async def clamp_endpoint(req: ClampRequest) -> ApiResponse[ClampData]:
        """Clamp features to target values (Golden Gate method)."""
        try:
            result = clamp_features(
                model_manager=model_manager,
                sae_extractor=sae_extractor,
                job_id=req.job_id,
                clamps=req.clamps,
                regenerate=req.regenerate,
            )
            return ApiResponse(success=True, data=result)
        except KeyError:
            return ApiResponse(success=False, error=f"Job {req.job_id} not found")
        except Exception as e:
            logger.exception("Clamping failed")
            return ApiResponse(success=False, error=str(e))

    @app.post("/api/steer", response_model=ApiResponse[SteerData])
    async def steer_endpoint(req: SteerRequest) -> ApiResponse[SteerData]:
        """Apply ActAdd steering and generate response."""
        try:
            assert model_manager.model is not None, "Model not loaded"

            # Generate original response
            original = model_manager.model.generate(
                req.prompt,
                max_new_tokens=req.max_new_tokens,
                temperature=0.7,
                do_sample=True,
            )
            original_text = model_manager.model.to_string(original)[0]
            if original_text.startswith(req.prompt):
                original_text = original_text[len(req.prompt):]

            # Compute steering vector and generate steered response
            steering_vec = compute_steering_vector(
                model_manager.model,
                req.steering_prompt_pos,
                req.steering_prompt_neg,
                layer=req.layer,
            )
            steered_text = generate_steered(
                model_manager.model,
                req.prompt,
                steering_vec,
                layer=req.layer,
                alpha=req.alpha,
                max_new_tokens=req.max_new_tokens,
            )

            from .ablation import _compute_semantic_distance
            distance = _compute_semantic_distance(original_text.strip(), steered_text)

            return ApiResponse(
                success=True,
                data=SteerData(
                    original_response=original_text.strip(),
                    steered_response=steered_text,
                    semantic_distance=distance,
                ),
            )
        except Exception as e:
            logger.exception("Steering failed")
            return ApiResponse(success=False, error=str(e))

    return app
