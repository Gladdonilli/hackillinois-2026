"""LARYNX Backend — API endpoints for deepfake voice detection.

Thin endpoint layer: CPU functions that call GpuInference().analyze_single.remote()
from gpu_inference.py. All GPU logic lives in that module.
"""

from __future__ import annotations

import json
import time
import uuid
import asyncio
import os
from typing import AsyncGenerator

import modal

from gpu_inference import GpuInference, app, gpu_image  # noqa: F401 — app must be importable

# ---------------------------------------------------------------------------
# CPU Image — health endpoint only
# ---------------------------------------------------------------------------

cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "fastapi==0.115.6",
        "uvicorn==0.32.1",
        "python-multipart==0.0.12",
        "pydantic==2.10.3",
        "google-genai",
        "openai",
        "soundfile",
        "librosa",
    )
    .add_local_python_source("gpu_inference")
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ALLOWLIST = [
    "https://larynx.pages.dev",
    "https://voxlarynx.tech",
    "https://www.voxlarynx.tech",
    "http://localhost:5173",
]

ALLOWED_FORMATS = {"wav", "mp3", "flac", "ogg"}
MAX_FILE_SIZE_MB = 10

# ---------------------------------------------------------------------------
# CORS helpers
# ---------------------------------------------------------------------------

cors_headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Request-ID",
    "Access-Control-Expose-Headers": "X-Request-ID, X-Processing-Time-Ms",
}


def _cors_from_request(request) -> dict[str, str]:
    """Build CORS headers from request origin."""
    headers = cors_headers.copy()
    origin = request.headers.get("Origin")
    if origin in ALLOWLIST:
        headers["Access-Control-Allow-Origin"] = origin
    else:
        headers["Access-Control-Allow-Origin"] = ALLOWLIST[0]
    return headers


# ---------------------------------------------------------------------------
# SSE helpers
# ---------------------------------------------------------------------------

def _sse_event(event_type: str, data: dict) -> str:
    """Format a single SSE event."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


async def _stream_gpu_result(result: dict, start_time: float, channel: int | None = None, engine: str | None = None) -> AsyncGenerator[str, None]:
    """Convert GPU inference result dict to SSE event stream.

    Handles frame thinning (every 5th + anomalous) to reduce SSE overhead by ~80%.
    """
    frames = result["frames"]
    verdict = result["verdict"]

    # Progress: GPU processing complete
    progress_base = {"step": "analyzing", "progress": 0.0, "message": "Processing audio on GPU..."}
    if channel is not None:
        progress_base["channel"] = channel
    yield _sse_event("progress", progress_base)
    await asyncio.sleep(0)

    # Stream frames with thinning
    total_frames = len(frames)
    for i, frame in enumerate(frames):
        # Frame thinning: every 5th frame + always send anomalous
        if (i + 1) % 5 != 0 and not frame["isAnomalous"]:
            continue

        frame_event = dict(frame)
        if channel is not None:
            frame_event["channel"] = channel
        yield _sse_event("frame", frame_event)

        # Progress updates every 50 frames
        if i % 50 == 0:
            progress = min(0.95, i / max(total_frames, 1))
            p = {"step": "analyzing", "progress": progress, "message": f"Frame {i}/{total_frames}"}
            if channel is not None:
                p["channel"] = channel
            yield _sse_event("progress", p)

        await asyncio.sleep(0)

    # Final progress
    p_done = {"step": "complete", "progress": 1.0, "message": "Analysis complete"}
    if channel is not None:
        p_done["channel"] = channel
    yield _sse_event("progress", p_done)

    # Verdict
    verdict_event = dict(verdict)
    verdict_event["processingTimeMs"] = int((time.time() - start_time) * 1000)
    if channel is not None:
        verdict_event["channel"] = channel
    if engine is not None:
        verdict_event["engine"] = engine
    yield _sse_event("verdict", verdict_event)
    await asyncio.sleep(0)


# ---------------------------------------------------------------------------
# Endpoints — lightweight CPU functions calling GPU class remotely
# ---------------------------------------------------------------------------

from fastapi import File, UploadFile, Request, Form
from fastapi.responses import StreamingResponse, JSONResponse


@app.function(image=cpu_image, cpu=0.5, memory=512, timeout=300, scaledown_window=120, min_containers=1)
@modal.concurrent(max_inputs=20)
@modal.fastapi_endpoint(method="POST", label="larynx-analyze")
async def analyze(request: Request, file: UploadFile = File(...)):
    """POST /api/analyze — Single audio file analysis via GPU inference."""
    start_time = time.time()
    request_id = str(uuid.uuid4())
    actual_cors = _cors_from_request(request)
    actual_cors["X-Request-ID"] = request_id

    # Validate file
    if file is None:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": {"code": "INVALID_FORMAT", "message": "No file provided"}},
            headers=actual_cors,
        )

    filename = file.filename or "unknown.wav"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_FORMATS:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": {"code": "INVALID_FORMAT", "message": f"Invalid format '{ext}'. Allowed: {', '.join(ALLOWED_FORMATS)}"}},
            headers=actual_cors,
        )

    audio_bytes = await file.read()
    size_mb = len(audio_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": {"code": "UPLOAD_TOO_LARGE", "message": f"File too large ({size_mb:.1f}MB). Maximum: {MAX_FILE_SIZE_MB}MB"}},
            headers=actual_cors,
        )

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            yield _sse_event("progress", {"step": "uploading", "progress": 0.1, "message": "Sending to GPU..."})
            await asyncio.sleep(0)

            gpu = GpuInference()
            result = gpu.analyze_single.remote(audio_bytes, filename)

            # Stream the result as SSE events
            async for event in _stream_gpu_result(result, start_time):
                yield event

        except asyncio.CancelledError:
            raise
        except Exception as e:
            yield _sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=actual_cors,
    )


@app.function(image=cpu_image, cpu=0.5, memory=512, timeout=600, scaledown_window=120, min_containers=1)
@modal.concurrent(max_inputs=10)
@modal.fastapi_endpoint(method="POST", label="larynx-compare")
async def compare(request: Request, file_a: UploadFile = File(...), file_b: UploadFile = File(...)):
    """POST /api/compare — Compare two audio files via GPU inference."""
    start_time = time.time()
    request_id = str(uuid.uuid4())
    actual_cors = _cors_from_request(request)
    actual_cors["X-Request-ID"] = request_id

    if file_a is None or file_b is None:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": {"code": "INVALID_FORMAT", "message": "Two files (file_a, file_b) are required"}},
            headers=actual_cors,
        )

    async def validate_file(file: UploadFile, label: str):
        fname = file.filename or "unknown.wav"
        ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
        if ext not in ALLOWED_FORMATS:
            return None, None, {"code": "INVALID_FORMAT", "message": f"{label}: Invalid format '{ext}'. Allowed: {', '.join(ALLOWED_FORMATS)}"}
        audio = await file.read()
        sz = len(audio) / (1024 * 1024)
        if sz > MAX_FILE_SIZE_MB:
            return None, None, {"code": "UPLOAD_TOO_LARGE", "message": f"{label}: File too large ({sz:.1f}MB). Maximum: {MAX_FILE_SIZE_MB}MB"}
        return audio, fname, None

    audio_a, fname_a, err_a = await validate_file(file_a, "file_a")
    if err_a:
        return JSONResponse(status_code=400, content={"success": False, "error": err_a}, headers=actual_cors)

    audio_b, fname_b, err_b = await validate_file(file_b, "file_b")
    if err_b:
        return JSONResponse(status_code=400, content={"success": False, "error": err_b}, headers=actual_cors)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            gpu = GpuInference()
            verdicts: list[dict | None] = [None, None]

            for channel, audio, fname in [(0, audio_a, fname_a), (1, audio_b, fname_b)]:
                yield _sse_event("progress", {"channel": channel, "step": "uploading", "progress": 0.1, "message": f"Sending file {channel + 1} to GPU..."})
                await asyncio.sleep(0)

                result = gpu.analyze_single.remote(audio, fname)

                async for event in _stream_gpu_result(result, start_time, channel=channel):
                    yield event

                verdicts[channel] = result["verdict"]

            # Comparison summary
            if verdicts[0] and verdicts[1]:
                a_genuine = verdicts[0]["isGenuine"]
                b_genuine = verdicts[1]["isGenuine"]
                if a_genuine and b_genuine:
                    summary = "Both files are genuine"
                elif not a_genuine and not b_genuine:
                    summary = "Both files are deepfakes"
                elif a_genuine and not b_genuine:
                    summary = "File A is genuine, File B is deepfake"
                else:
                    summary = "File A is deepfake, File B is genuine"

                yield _sse_event("comparison", {
                    "verdicts": [verdicts[0], verdicts[1]],
                    "summary": summary,
                })

        except asyncio.CancelledError:
            raise
        except Exception as e:
            yield _sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=actual_cors,
    )


# ---------------------------------------------------------------------------
# Health — lightweight CPU endpoint
# ---------------------------------------------------------------------------
@app.function(
    image=cpu_image, 
    cpu=0.5, 
    memory=512, 
    timeout=600, 
    scaledown_window=120, 
    min_containers=1,
    secrets=[modal.Secret.from_name("gemini-api-key"), modal.Secret.from_name("openai-api-key")]
)
@modal.concurrent(max_inputs=10)
@modal.fastapi_endpoint(method="POST", label="larynx-generate-compare")
async def generate_and_compare(
    request: Request, 
    real_file: UploadFile = File(...),
    text: str = Form(...),
    engine: str = Form(...),
    voice: str | None = Form(None),
    gemini_voice: str = Form("Puck"),
    openai_voice: str = Form("alloy")
):
    """POST /api/generate-and-compare — Compare real vs generated TTS."""
    start_time = time.time()
    request_id = str(uuid.uuid4())
    actual_cors = _cors_from_request(request)
    actual_cors["X-Request-ID"] = request_id

    if engine not in ["gemini", "openai", "both"]:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "INVALID_ENGINE", "message": "Engine must be 'gemini', 'openai', or 'both'"}}, headers=actual_cors)

    real_bytes = await real_file.read()
    real_filename = real_file.filename or "real_upload.wav"

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            from tts_clients import generate_gemini_tts, generate_openai_tts
            
            gpu = GpuInference()
            tasks = []
            tasks.append((0, real_bytes, real_filename, "real"))
            
            yield _sse_event("progress", {"step": "generating", "progress": 0.05, "message": f"Generating TTS via {engine}..."})
            await asyncio.sleep(0)
            
            if engine in ["gemini", "both"]:
                v = voice if voice else gemini_voice
                gemini_bytes, _ = await generate_gemini_tts(text, v)
                tasks.append((1, gemini_bytes, "gemini_generated.wav", "gemini"))
                
            if engine in ["openai", "both"]:
                v = voice if voice else openai_voice
                ch = 2 if engine == "both" else 1
                openai_bytes, _ = await generate_openai_tts(text, v)
                tasks.append((ch, openai_bytes, "openai_generated.wav", "openai"))

            verdicts = [None] * len(tasks)
            
            for channel, audio_bytes, fname, eng_label in tasks:
                yield _sse_event("progress", {"channel": channel, "step": "uploading", "progress": 0.1, "message": f"Sending {eng_label} audio to GPU..."})
                await asyncio.sleep(0)
                
                result = gpu.analyze_single.remote(audio_bytes, fname)
                
                stream_engine = eng_label if eng_label != "real" else None
                async for event in _stream_gpu_result(result, start_time, channel=channel, engine=stream_engine):
                    yield event
                    
                v_copy = dict(result["verdict"])
                if eng_label != "real":
                    v_copy["engine"] = eng_label
                verdicts[channel] = v_copy
                
            summary = f"Comparison complete for real vs {engine} generated audio."
            yield _sse_event("comparison", {
                "verdicts": verdicts,
                "summary": summary
            })

        except asyncio.CancelledError:
            raise
        except Exception as e:
            yield _sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=actual_cors,
    )


@app.function(
    image=cpu_image, 
    cpu=0.25, 
    memory=256, 
    timeout=120, 
    scaledown_window=120, 
    min_containers=1,
    secrets=[modal.Secret.from_name("openai-api-key")]
)
@modal.concurrent(max_inputs=20)
@modal.fastapi_endpoint(method="POST", label="larynx-transcribe")
async def transcribe(request: Request, file: UploadFile = File(...)):
    """POST /api/transcribe — Transcribe audio via Whisper API."""
    actual_cors = _cors_from_request(request)
    actual_cors["X-Request-ID"] = str(uuid.uuid4())
    
    if file is None:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "INVALID_FORMAT", "message": "No file provided"}}, headers=actual_cors)
        
    audio_bytes = await file.read()
    
    try:
        from openai import AsyncOpenAI
        import io
        client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = file.filename or "audio.wav"
        
        response = await client.audio.transcriptions.create(
            model='whisper-1', 
            file=file_obj,
            response_format="verbose_json"
        )
        
        return JSONResponse(
            content={
                "success": True, 
                "data": {
                    "text": response.text,
                    "language": getattr(response, 'language', None),
                    "duration": getattr(response, 'duration', None)
                }
            },
            headers=actual_cors
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": {"code": "TRANSCRIBE_ERROR", "message": str(e)}}, headers=actual_cors)

@app.function(image=cpu_image, cpu=0.25, memory=256, timeout=30, min_containers=1)
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
                "version": "2.0-gpu",
                "timestamp": time.time(),
            },
        },
        headers=cors_headers,
    )


if __name__ == "__main__":
    print("Run via: modal run LARYNX/backend/app.py")
    print("  or:   modal serve LARYNX/backend/app.py")
    print("  or:   modal deploy LARYNX/backend/app.py")
