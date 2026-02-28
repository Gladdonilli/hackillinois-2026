# Day 0 Bootstrap — One-Command Smoke Path

## Prerequisites

```bash
# Node 20+, Python 3.11+, Modal CLI
node --version    # ≥20.0.0
python3 --version # ≥3.11.0
modal --version   # ≥1.3.4
```

## 1. Clone & Install (2 min)

```bash
git clone git@github.com:Gladdonilli/hackillinois-2026.git
cd hackillinois-2026

# Frontend
npm install

# Python (LARYNX)
cd LARYNX/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ../..

# Python (LARYNX)
cd backend/larynx
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

## 2. Secrets Setup (1 min)

```bash
# Modal (required for LARYNX)
modal token new

# Modal secrets (LARYNX needs HuggingFace for AAI weights)
modal secret create larynx-secrets HF_TOKEN=hf_...

# Cloudflare (for Worker deployment)
npx wrangler login
npx wrangler secret put OPENAI_API_KEY  # enter key when prompted
```

## 3. Smoke Tests

### LARYNX Smoke (no GPU needed)

### LARYNX Smoke (no GPU needed)

```bash
# Verify formant extraction pipeline works
python3 -c "
import librosa
import parselmouth
import numpy as np

# Generate 1s test tone (440Hz)
sr = 16000
t = np.linspace(0, 1, sr)
audio = 0.5 * np.sin(2 * np.pi * 440 * t).astype(np.float32)

# Extract formants
snd = parselmouth.Sound(audio, sr)
formant = snd.to_formant_burg(time_step=0.01)
f1 = formant.get_value_at_time(1, 0.5)
f2 = formant.get_value_at_time(2, 0.5)
print(f'F1={f1:.0f}Hz F2={f2:.0f}Hz')
print('✓ LARYNX deps OK')
"
```

### Frontend Smoke

```bash
# Verify Vite + R3F build
npm run dev &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
echo "✓ Frontend OK"
```

## 4. Known-Good Sample Assets

For demo testing, use these pre-recorded samples:

| Asset | Path | Purpose | Source |
|-------|------|---------|--------|
| Real voice | `assets/test-real.wav` | 5s human speech for genuine baseline | Record yourself saying "The quick brown fox" |
| TTS voice | `assets/test-tts.wav` | 5s OpenAI TTS for deepfake detection | `curl https://api.openai.com/v1/audio/speech -H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" -d '{"model":"tts-1","voice":"alloy","input":"The quick brown fox jumps over the lazy dog","response_format":"wav"}' --output assets/test-tts.wav` |

**Create assets directory and test files FIRST** — both smoke tests and the demo script depend on them.

```bash
mkdir -p assets
# Record test-real.wav on your phone/laptop mic (5s, "The quick brown fox...")
# Generate test-tts.wav using the curl command above

## 5. Full Vertical Slice Smoke (after implementation)

```bash
# LARYNX end-to-end: upload audio → formants → velocity → verdict
curl -X POST http://localhost:8000/api/analyze \
  -F "file=@assets/test-real.wav" | jq .
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ModuleNotFoundError: parselmouth` | Wrong venv | `source LARYNX/backend/.venv/bin/activate` |
| `modal.exception.AuthError` | No token | `modal token new` |
| Modal cold start >30s | No warm container | Add `min_containers=1` to `@app.function()` |
| `CORS error` in browser | Worker missing headers | Deploy worker: `npx wrangler deploy` |
| Formant extraction returns NaN | Audio too short/quiet | Use ≥3s audio at normal speaking volume |
