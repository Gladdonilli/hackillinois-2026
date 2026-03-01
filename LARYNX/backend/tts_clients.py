import os
import io
import importlib
import numpy as np
import librosa
import soundfile as sf
from typing import Tuple

async def _resample_to_16k_mono(audio_bytes: bytes, orig_sr: int = 24000) -> Tuple[bytes, int]:
    """Resamples standard TTS output to 16kHz mono for LARYNX pipeline."""
    try:
        y, sr = sf.read(io.BytesIO(audio_bytes))
    except Exception:
        pcm = np.frombuffer(audio_bytes, dtype=np.int16)
        if pcm.size == 0:
            raise
        y = pcm.astype(np.float32) / 32768.0
        sr = orig_sr
    
    # Convert to mono if stereo
    if len(y.shape) > 1 and y.shape[1] > 1:
        y = librosa.to_mono(y.T)
        
    # Resample if needed
    if sr != 16000:
        y = librosa.resample(y, orig_sr=sr, target_sr=16000)
        
    # Write back to bytes
    out_io = io.BytesIO()
    sf.write(out_io, y, 16000, format='WAV', subtype='PCM_16')
    return out_io.getvalue(), 16000

async def generate_gemini_tts(text: str, voice: str) -> Tuple[bytes, int]:
    """Generates TTS using Gemini 2.5 Flash Preview TTS API and returns 16kHz mono WAV bytes."""
    genai_mod = importlib.import_module("google.genai")
    types = genai_mod.types

    client = genai_mod.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    response = client.models.generate_content(
        model='gemini-2.5-flash-preview-tts',
        contents=text,
        config=types.GenerateContentConfig(
            response_modalities=[types.Modality.AUDIO],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice
                    )
                )
            )
        )
    )
    audio_bytes = response.candidates[0].content.parts[0].inline_data.data
    return await _resample_to_16k_mono(audio_bytes, orig_sr=24000)

async def generate_openai_tts(text: str, voice: str) -> Tuple[bytes, int]:
    """Generates TTS using OpenAI tts-1-hd API and returns 16kHz mono WAV bytes."""
    openai_mod = importlib.import_module("openai")

    client = openai_mod.AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    response = await client.audio.speech.create(
        model='tts-1-hd',
        voice=voice,
        input=text,
        response_format='wav'
    )
    audio_bytes = response.content
    return await _resample_to_16k_mono(audio_bytes, orig_sr=24000)
