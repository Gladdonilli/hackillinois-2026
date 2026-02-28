"""LARYNX Backend — Modal application for deepfake voice detection via articulatory physics."""

from __future__ import annotations

import json
import time
import uuid
import asyncio
from typing import AsyncGenerator

import modal
from fastapi import File, UploadFile
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
        "fastapi==0.115.6",
        "uvicorn==0.32.1",
        "sse-starlette==2.1.3",
        "python-multipart==0.0.12",
        "pydantic==2.10.3",
    )
)

app = modal.App("hackillinois-2026")

cors_headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

@app.function(
    image=larynx_image,
    cpu=2.0,
    memory=2048,
    timeout=300,
    container_idle_timeout=120,
    keep_warm=1,
    allow_concurrent_inputs=10,
)
@modal.web_endpoint(method="POST", label="larynx-analyze")
async def analyze(file: UploadFile = File(...)):
    """
    POST /api/analyze
    
    Accepts multipart/form-data with 'file' field containing audio.
    Returns SSE stream with progress events, EMA frames, and verdict.
    """
    from .config import ALLOWED_FORMATS, MAX_FILE_SIZE_MB
    from .pipeline import analyze_audio, AnalysisProgress, EMAFrame, Verdict
    
    if file is None:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No file provided"},
            headers=cors_headers,
        )
    
    # Validate file
    filename = file.filename or "unknown.wav"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_FORMATS:
        return JSONResponse(
            status_code=400,
            content={
                "success": False, 
                "error": f"Invalid format '{ext}'. Allowed: {', '.join(ALLOWED_FORMATS)}"
            },
            headers=cors_headers,
        )
    
    # Read file bytes
    audio_bytes = await file.read()
    size_mb = len(audio_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": f"File too large ({size_mb:.1f}MB). Maximum: {MAX_FILE_SIZE_MB}MB"
            },
            headers=cors_headers,
        )
    
    async def event_generator() -> AsyncGenerator[str, None]:
        """Stream analysis results as SSE events."""
        try:
            for result in analyze_audio(audio_bytes, filename):
                if isinstance(result, AnalysisProgress):
                    data = json.dumps({
                        "step": result.step,
                        "progress": result.progress,
                        "message": result.message,
                    })
                    yield f"event: progress\ndata: {data}\n\n"
                elif isinstance(result, EMAFrame):
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
                elif isinstance(result, Verdict):
                    data = json.dumps({
                        "isGenuine": result.is_genuine,
                        "confidence": result.confidence,
                        "peakVelocity": result.peak_velocity,
                        "threshold": result.threshold,
                        "anomalousFrameCount": result.anomalous_frame_count,
                        "totalFrameCount": result.total_frame_count,
                        "anomalyRatio": result.anomaly_ratio,
                    })
                    yield f"event: verdict\ndata: {data}\n\n"
                
                # Small delay to prevent overwhelming the client
                await asyncio.sleep(0.001)
                
        except Exception as e:
            data = json.dumps({"message": str(e)})
            yield f"event: error\ndata: {data}\n\n"
    
    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers=cors_headers,
    )

@app.function(
    image=larynx_image,
    cpu=0.25,
    memory=256,
    timeout=30,
    allow_concurrent_inputs=100,
)
@modal.web_endpoint(method="GET", label="larynx-health")
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
    # Required entrypoint for `modal serve` or `modal run` execution if invoked directly.
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        app.serve()
    else:
        print("Run via: modal serve app.py")
