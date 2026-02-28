"""LARYNX Backend — Modal application for deepfake voice detection via articulatory physics."""

from __future__ import annotations

import json
import time
import uuid
import asyncio
from typing import AsyncGenerator

import modal
from fastapi import File, UploadFile, Request
from fastapi.responses import StreamingResponse, JSONResponse

# Modal image with all dependencies pinned
larynx_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libsndfile1")  # Required by librosa/soundfile
    .pip_install(
        "librosa==0.10.2.post1",
        "praat-parselmouth==0.4.5",
        "numpy==2.1.3",
        "scipy==1.14.1",
        "scikit-learn==1.5.2",
        "fastapi==0.115.6",
        "uvicorn==0.32.1",
        "sse-starlette==2.1.3",
        "python-multipart==0.0.12",
        "pydantic==2.10.3",
    )
    .add_local_python_source("LARYNX.backend")  # Mount local package for relative imports
)

app = modal.App("hackillinois-2026")

ALLOWLIST = ["https://larynx.pages.dev", "https://voxlarynx.tech", "http://localhost:5173"]

cors_headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Request-ID",
    "Access-Control-Expose-Headers": "X-Request-ID, X-Processing-Time-Ms",
}


@app.function(
    image=larynx_image,
    cpu=2.0,
    memory=2048,
    timeout=300,
    scaledown_window=120,
    min_containers=1,
)
@modal.concurrent(max_inputs=10)
@modal.fastapi_endpoint(method="POST", label="larynx-analyze")
async def analyze(request: Request, file: UploadFile = File(...)):
    """
    POST /api/analyze

    Accepts multipart/form-data with 'file' field containing audio.
    Returns SSE stream with progress events, EMA frames, and verdict.
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())

    # Dynamic CORS based on Origin
    origin = request.headers.get("Origin")
    actual_cors = cors_headers.copy()
    if origin in ALLOWLIST:
        actual_cors["Access-Control-Allow-Origin"] = origin
    else:
        actual_cors["Access-Control-Allow-Origin"] = ALLOWLIST[0]

    actual_cors["X-Request-ID"] = request_id

    from LARYNX.backend.config import ALLOWED_FORMATS, MAX_FILE_SIZE_MB
    from LARYNX.backend.pipeline import analyze_audio
    from LARYNX.backend.models import AnalysisProgress, EMAFrame, Verdict

    if file is None:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": {"code": "INVALID_FORMAT", "message": "No file provided"}},
            headers=actual_cors,
        )

    # Validate file
    filename = file.filename or "unknown.wav"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_FORMATS:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": {"code": "INVALID_FORMAT", "message": f"Invalid format '{ext}'. Allowed: {', '.join(ALLOWED_FORMATS)}"},
            },
            headers=actual_cors,
        )

    # Read file bytes
    audio_bytes = await file.read()
    size_mb = len(audio_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": {"code": "UPLOAD_TOO_LARGE", "message": f"File too large ({size_mb:.1f}MB). Maximum: {MAX_FILE_SIZE_MB}MB"},
            },
            headers=actual_cors,
        )

    async def event_generator() -> AsyncGenerator[str, None]:
        """Stream analysis results as SSE events."""
        last_event_time = time.time()
        frame_count = 0
        try:
            for result in analyze_audio(audio_bytes, filename):
                # Heartbeat keepalive (15s)
                now = time.time()
                if now - last_event_time > 15:
                    yield "event: heartbeat\ndata: {}\n\n"
                    last_event_time = now

                if isinstance(result, AnalysisProgress):
                    data = json.dumps({
                        "step": result.step,
                        "progress": result.progress,
                        "message": result.message,
                    })
                    yield f"event: progress\ndata: {data}\n\n"
                    last_event_time = time.time()
                elif isinstance(result, EMAFrame):
                    frame_count += 1
                    # Send every 5th frame to frontend (reduces SSE overhead by 80%)
                    # Classifier still processes ALL frames server-side
                    if frame_count % 5 == 0 or result.is_anomalous:
                        data = json.dumps({
                            "sensors": {
                                name: {"x": s.x, "y": s.y, "velocity": s.velocity}
                                for name, s in result.sensors.items()
                            },
                            "tongueVelocity": result.tongue_velocity,
                            "timestamp": result.timestamp,
                            "isAnomalous": result.is_anomalous,
                        })
                        yield f"event: frame\ndata: {data}\n\n"
                        last_event_time = time.time()
                elif isinstance(result, Verdict):
                    processing_time = int((time.time() - start_time) * 1000)
                    verdict_data = {
                        "isGenuine": result.is_genuine,
                        "confidence": result.confidence,
                        "peakVelocity": result.peak_velocity,
                        "threshold": result.threshold,
                        "anomalousFrameCount": result.anomalous_frame_count,
                        "totalFrameCount": result.total_frame_count,
                        "anomalyRatio": result.anomaly_ratio,
                        "processingTimeMs": processing_time,
                    }
                    # Include classifier fields only if present
                    if result.classifier_score is not None:
                        verdict_data["classifierScore"] = result.classifier_score
                    if result.classifier_model is not None:
                        verdict_data["classifierModel"] = result.classifier_model
                    if result.ensemble_score is not None:
                        verdict_data["ensembleScore"] = result.ensemble_score
                    data = json.dumps(verdict_data)
                    yield f"event: verdict\ndata: {data}\n\n"
                    last_event_time = time.time()

                # Yield control without unnecessary delay
                await asyncio.sleep(0)

        except Exception as e:
            data = json.dumps({"message": str(e)})
            yield f"event: error\ndata: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=actual_cors,
    )


@app.function(
    image=larynx_image,
    cpu=2.0,
    memory=2048,
    timeout=600,
    scaledown_window=120,
    min_containers=1,
)
@modal.concurrent(max_inputs=10)
@modal.fastapi_endpoint(method="POST", label="larynx-compare")
async def compare(request: Request, file_a: UploadFile = File(...), file_b: UploadFile = File(...)):
    """
    POST /api/compare

    Accepts two audio files: file_a and file_b.
    Returns SSE stream with progress, frame, and verdict events prefixed by channel (0 or 1),
    and a final comparison event.
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())

    # Dynamic CORS based on Origin
    origin = request.headers.get("Origin")
    actual_cors = cors_headers.copy()
    if origin in ALLOWLIST:
        actual_cors["Access-Control-Allow-Origin"] = origin
    else:
        actual_cors["Access-Control-Allow-Origin"] = ALLOWLIST[0]

    actual_cors["X-Request-ID"] = request_id

    from LARYNX.backend.config import ALLOWED_FORMATS, MAX_FILE_SIZE_MB
    from LARYNX.backend.pipeline import analyze_audio
    from LARYNX.backend.models import AnalysisProgress, EMAFrame, Verdict

    if file_a is None or file_b is None:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": {"code": "INVALID_FORMAT", "message": "Two files (file_a, file_b) are required"}},
            headers=actual_cors,
        )

    async def validate_file(file: UploadFile, label: str):
        filename = file.filename or "unknown.wav"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_FORMATS:
            return None, None, {"code": "INVALID_FORMAT", "message": f"{label}: Invalid format '{ext}'. Allowed: {', '.join(ALLOWED_FORMATS)}"}
        
        audio_bytes = await file.read()
        size_mb = len(audio_bytes) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            return None, None, {"code": "UPLOAD_TOO_LARGE", "message": f"{label}: File too large ({size_mb:.1f}MB). Maximum: {MAX_FILE_SIZE_MB}MB"}
            
        return audio_bytes, filename, None

    audio_bytes_a, filename_a, error_a = await validate_file(file_a, "file_a")
    if error_a:
        return JSONResponse(status_code=400, content={"success": False, "error": error_a}, headers=actual_cors)
        
    audio_bytes_b, filename_b, error_b = await validate_file(file_b, "file_b")
    if error_b:
        return JSONResponse(status_code=400, content={"success": False, "error": error_b}, headers=actual_cors)

    async def event_generator() -> AsyncGenerator[str, None]:
        """Stream analysis results as SSE events."""
        last_event_time = time.time()
        verdicts = [None, None]
        
        try:
            for channel, audio_b, fname in [(0, audio_bytes_a, filename_a), (1, audio_bytes_b, filename_b)]:
                for result in analyze_audio(audio_b, fname):
                    now = time.time()
                    if now - last_event_time > 15:
                        yield "event: heartbeat\ndata: {}\n\n"
                        last_event_time = now

                    if isinstance(result, AnalysisProgress):
                        data = json.dumps({
                            "channel": channel,
                            "step": result.step,
                            "progress": result.progress,
                            "message": result.message,
                        })
                        yield f"event: progress\ndata: {data}\n\n"
                        last_event_time = time.time()
                    elif isinstance(result, EMAFrame):
                        data = json.dumps({
                            "channel": channel,
                            "sensors": {
                                name: {"x": s.x, "y": s.y, "velocity": s.velocity}
                                for name, s in result.sensors.items()
                            },
                            "tongueVelocity": result.tongue_velocity,
                            "timestamp": result.timestamp,
                            "isAnomalous": result.is_anomalous,
                        })
                        yield f"event: frame\ndata: {data}\n\n"
                        last_event_time = time.time()
                    elif isinstance(result, Verdict):
                        verdict_data = {
                            "channel": channel,
                            "isGenuine": result.is_genuine,
                            "confidence": result.confidence,
                            "peakVelocity": result.peak_velocity,
                            "threshold": result.threshold,
                            "anomalousFrameCount": result.anomalous_frame_count,
                            "totalFrameCount": result.total_frame_count,
                            "anomalyRatio": result.anomaly_ratio,
                        }
                        if result.classifier_score is not None:
                            verdict_data["classifierScore"] = result.classifier_score
                        if result.classifier_model is not None:
                            verdict_data["classifierModel"] = result.classifier_model
                        if result.ensemble_score is not None:
                            verdict_data["ensembleScore"] = result.ensemble_score
                            
                        data = json.dumps(verdict_data)
                        yield f"event: verdict\ndata: {data}\n\n"
                        verdicts[channel] = verdict_data
                        last_event_time = time.time()

                    # Small delay to prevent overwhelming the client
                    await asyncio.sleep(0.001)

            if verdicts[0] and verdicts[1]:
                summary = "File A is genuine, File B is deepfake"
                if verdicts[0]["isGenuine"] and verdicts[1]["isGenuine"]:
                    summary = "Both files are genuine"
                elif not verdicts[0]["isGenuine"] and not verdicts[1]["isGenuine"]:
                    summary = "Both files are deepfakes"
                elif not verdicts[0]["isGenuine"] and verdicts[1]["isGenuine"]:
                    summary = "File A is deepfake, File B is genuine"
                    
                data = json.dumps({
                    "verdicts": [verdicts[0], verdicts[1]],
                    "summary": summary
                })
                yield f"event: comparison\ndata: {data}\n\n"

        except Exception as e:
            data = json.dumps({"message": str(e)})
            yield f"event: error\ndata: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=actual_cors,
    )


@app.function(
    image=larynx_image,
    cpu=0.25,
    memory=256,
    timeout=30,
)
@modal.concurrent(max_inputs=100)
@modal.fastapi_endpoint(method="GET", label="larynx-health")
async def health():
    """GET /health — Health check endpoint."""
    return JSONResponse(
        content={
            "success": True,
            "data": {
                "service": "larynx",
                "status": "healthy",
                "timestamp": time.time(),
            },
        },
        headers=cors_headers,
    )


if __name__ == "__main__":
    print("Run via: modal run LARYNX/backend/app.py")
    print("  or:   modal serve LARYNX/backend/app.py")
