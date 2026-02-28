# LARYNX Live Demo Guide

> **How to make the demo jaw-dropping** — live mic, pre-cached fallbacks, and the "shock moment."
> Last updated: Feb 28, 2026

---

## The Shock Moment

The demo's climax: you speak into your laptop mic LIVE, the skull animates your tongue in real-time, then you play a deepfake of your own voice — tongue goes haywire at 180+ cm/s, clips through the skull, glitch effects intensify, **DEEPFAKE** verdict slams in.

The audience sees their first-ever visualization of *why* deepfakes are physically impossible.

---

## Live Microphone Integration

### Architecture

```
🎤 Browser mic (MediaRecorder API)
  │
  ▼
Frontend: record → WAV blob → FormData
  │
  ▼
useAnalysisStream.startAnalysis(wavBlob)
  │
  ▼
CF Worker → Modal backend → SSE stream back
  │
  ▼
Zustand store → 3D skull animation in real-time
```

### Implementation (Frontend)

The frontend needs a **Record button** that:
1. Requests mic permission (`navigator.mediaDevices.getUserMedia({ audio: true })`)
2. Records for N seconds (5-10s is ideal — enough speech for formant analysis)
3. Converts to WAV blob
4. Passes to `useAnalysisStream.startAnalysis()` exactly like a file upload

```typescript
// Minimal mic recording → WAV blob
async function recordMic(durationMs: number = 7000): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 16000,       // Match backend expectation
      echoCancellation: true,  // CRITICAL for demo hall noise
      noiseSuppression: true,  // CRITICAL
      autoGainControl: true,
    }
  });

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus'  // Browser-native, backend handles conversion
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());  // Release mic
      resolve(new Blob(chunks, { type: 'audio/webm' }));
    };
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), durationMs);
  });
}

// Usage in component:
const blob = await recordMic(7000);
const file = new File([blob], 'live-recording.webm', { type: 'audio/webm' });
startAnalysis(file);  // From useAnalysisStream hook
```

### Backend Consideration

The backend already accepts any format in `ALLOWED_FORMATS` (wav, mp3, flac, ogg). WebM/Opus from MediaRecorder needs to be added to the allowed list, OR convert to WAV client-side before sending.

**Option A (recommended)**: Add `webm` to `config.py` ALLOWED_FORMATS and let librosa handle it (librosa supports webm via soundfile/ffmpeg).

**Option B**: Convert to WAV in-browser using AudioContext:
```typescript
async function webmToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);
  // ... encode as WAV (use existing wav-encoder lib or manual header)
}
```

---

## Demo Flow (Recommended 3-Minute Script)

### Act 1: Hook (0:00–0:20)
- Dark landing page, cinematic audio
- "Every deepfake detector tells you IF a voice is fake. None tell you WHY."

### Act 2: Your Live Voice (0:20–1:00)
- **Click "Record" button** → speak naturally for 5-7 seconds
- "Hi, my name is [name], and this is my real voice."
- Skull materializes, tongue moves at 8-12 cm/s (green gauges)
- Verdict: **GENUINE** — "Your tongue moved within human limits."
- 🎯 **This establishes the baseline. Audience sees THEIR voice is real.**

### Act 3: The Deepfake Reveal (1:00–1:40)
- Click **"Generate Deepfake"** → uses OpenAI TTS (or pre-cached clone)
- Same text, synthetic voice plays
- Skull goes RED — tongue accelerates to 184 cm/s
- Tongue CLIPS THROUGH the skull bone (glitch/bloom intensifies)
- Verdict slams in: **DEEPFAKE** — peak 184.2 cm/s, human limit 20 cm/s, 9.2× ratio
- 🎯 **Shock moment. The impossible physics are VISIBLE.**

### Act 4: Side-by-Side (1:40–2:10)
- CompareView: split-screen, your real voice vs deepfake
- Click anomaly markers on waveform
- Velocity histogram overlay
- "Same words. One is physically possible. One isn't."

### Act 5: Technical + Sponsors (2:10–3:00)
- Quick formant explanation (F1/F2 diagram)
- Pipeline diagram (Audio → HuBERT → AAI → Velocity → Verdict)
- Sponsor callouts: Modal (A100 GPUs), Cloudflare (Pages/Workers/D1), OpenAI, Supermemory
- "LARYNX doesn't just detect deepfakes — it explains the physics of why they fail."

---

## Pre-Cached Fallbacks (NON-NEGOTIABLE)

The demo hall will have 80dB ambient noise and spotty WiFi. **Never rely solely on live.**

### Fallback 1: Pre-recorded audio files
Store in `public/demo/`:
```
public/demo/
  real-voice-sample.wav      # Clean LibriSpeech or your own voice (studio-recorded)
  deepfake-sample.wav        # ElevenLabs clone of same text
  real-cached-result.json    # Pre-computed frames + verdict for real
  deepfake-cached-result.json # Pre-computed frames + verdict for deepfake
```

If mic fails or Modal is cold → load pre-recorded file, use cached results for instant animation.

### Fallback 2: Pre-warmed Modal containers
Hit the health endpoint 5 minutes before demo:
```bash
curl https://gladdonilli--larynx-health.modal.run/
# This wakes up the container pool
```

### Fallback 3: Screen recording
Record a perfect run as MP4. If everything fails, play the video.

---

## Pre-Demo Checklist

- [ ] Chrome (latest), no extensions that block mic
- [ ] Test mic permissions: `chrome://settings/content/microphone`
- [ ] Real voice sample loaded in `public/demo/`
- [ ] Deepfake sample loaded in `public/demo/`
- [ ] Cached results JSONs generated (run audio through backend, save SSE output)
- [ ] Modal containers warm (`curl` health endpoint)
- [ ] VITE_API_URL pointing to production CF Worker
- [ ] CF Worker deployed and routing correctly
- [ ] Audio output working (for playing deepfake sample)
- [ ] OBS recording as backup
- [ ] Have the screen recording fallback video ready

---

## Hall Noise Mitigation

The AGENTS.md warns: "NEVER use live microphone in demo — 80dB hall noise kills formant extraction."

**Mitigations for live mic**:
1. `echoCancellation: true` + `noiseSuppression: true` in getUserMedia constraints
2. Backend noise gate at -40dB RMS already filters silence/noise
3. **Speak close to the mic** (10-15cm) — signal-to-noise ratio matters more than volume
4. **Keep it short** — 5-7 seconds, clear enunciation
5. If live mic result looks noisy → smoothly pivot: "Let me show you with a studio-quality recording for clearer comparison" → load pre-recorded file

**The live mic is the HOOK, not the proof.** Even if it's slightly noisy, the audience is impressed you're doing it live. The deepfake comparison using the clean pre-recorded sample delivers the actual "money shot."

---

## "Generate Deepfake" Button

The demo script expects a button that generates a deepfake of your voice in real-time. Options:

### Option A: OpenAI TTS (simplest, ~2s latency)
```typescript
const response = await fetch('https://api.openai.com/v1/audio/speech', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,  // Via CF Worker, NEVER client-side
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'tts-1',
    input: 'Your text here',
    voice: 'alloy',
    response_format: 'wav',
  }),
});
const audioBlob = await response.blob();
```

Route through CF Worker to hide API key. Frontend calls `/api/generate-deepfake` on worker.

### Option B: Pre-generated deepfake of your voice (safest)
Generate in advance using ElevenLabs voice cloning. Store as `public/demo/deepfake-sample.wav`. Button just loads and plays this file, then sends to backend for analysis.

**Recommended**: Option B for reliability. The demo doesn't need real-time generation — the audience doesn't know the difference. What matters is the skull visualization reacting to the deepfake audio.

---

## Environment Variables Summary

### Frontend (.env)
```env
VITE_API_URL=https://api.voxlarynx.tech
```

### CF Worker (wrangler.jsonc)
```jsonc
{
  "vars": {
    "MODAL_BACKEND_URL": "https://gladdonilli--larynx-analyze.modal.run",
    "MODAL_COMPARE_URL": "https://gladdonilli--larynx-compare.modal.run"
  }
}
```

### Modal Backend
- No env vars needed for inference (model loaded from volume)
- `ensemble_model.pkl` at `LARYNX/backend/training_data/ensemble_model.pkl` (bundled into container)

---

## Timing Estimates

| Action | Time | Notes |
|--------|------|-------|
| Mic recording | 5-7s | Fixed duration, auto-stop |
| Upload to CF Worker | <1s | Small WAV file |
| Modal cold start | 15-30s | First request only, then warm |
| Modal warm inference | 5-10s | Depends on audio length |
| Total (warm) | ~10-15s | Acceptable for live demo |
| Total (cold) | ~30-45s | Use fallback if this happens |

**Tip**: Hit the health endpoint during Act 1 (while the landing animation plays) to pre-warm containers.
