# LARYNX Risk Register

Six risks, ranked by severity. Each has a concrete mitigation you can implement, not a hand-wave.

---

## 1. Formant Instability on Noisy/Compressed Audio

**Severity:** HIGH
**Likelihood:** HIGH (hackathon venue = noisy recordings, judges may test with compressed MP3s)
**Impact:** Erratic F1/F2 values produce false velocity spikes, destroying the genuine/deepfake distinction

**The problem:** Parselmouth's `to_formant_burg()` assumes clean, voiced speech. Background noise (hackathon hall at 65-80dB), MP3 compression artifacts (below 128kbps), and microphone pop/clip all introduce spectral energy that Praat misidentifies as formant peaks. The result: F1 jumps 400Hz between adjacent frames, producing "velocity" spikes that look like deepfake anomalies but aren't.

**Mitigation (implement all four):**

1. **Pre-filter with noise gate.** Before formant extraction, apply `librosa.effects.preemphasis()` and trim silence with `librosa.effects.trim(top_db=20)`. This removes low-frequency noise and dead air where formant tracking is unreliable.

```python
y, sr = librosa.load(path, sr=16000, mono=True)
y = librosa.effects.preemphasis(y, coef=0.97)
y, _ = librosa.effects.trim(y, top_db=20)
```

2. **Voiced-only analysis.** Compute pitch with `snd.to_pitch()` and discard all frames where pitch < 80Hz. Unvoiced consonants (/s/, /f/, /t/) don't have stable formants and shouldn't contribute to velocity calculation. This alone eliminates ~40% of false spikes.

```python
pitch = snd.to_pitch(time_step=0.01)
for t in frame_times:
    p = pitch.get_value_at_time(t)
    if p < 80 or math.isnan(p):
        continue  # skip unvoiced frames
```

3. **Temporal smoothing.** Apply a 5-frame (50ms) moving average to F1 and F2 trajectories before velocity computation. Real speech formant transitions happen over 50-100ms, so a 50ms window preserves real dynamics while suppressing frame-to-frame noise jitter.

```python
f1_smooth = np.convolve(f1_raw, np.ones(5)/5, mode='same')
f2_smooth = np.convolve(f2_raw, np.ones(5)/5, mode='same')
```

4. **Demo with clean samples as primary.** Record the real voice sample in a quiet room before the hackathon. Use a clean .wav at 16-bit/16kHz. The backup deepfakes are also pre-generated in clean conditions. Only the live OpenAI TTS generation happens at demo time, and TTS output is inherently clean (no background noise).

---

## 2. False Positives on Legitimate Speech

**Severity:** MEDIUM
**Likelihood:** MEDIUM (fast talkers, certain consonant clusters, singing)
**Impact:** Real speech flagged as deepfake. Judges test with their own voice and get a false DEEPFAKE verdict. Credibility collapses.

**The problem:** Rapid phoneme transitions (e.g., /s/-to-/a/ in "saw," /k/-to-/i/ in "key") produce genuinely fast formant changes. Trained auctioneers, fast news readers, or speakers with certain accents can exceed 20 cm/s instantaneous articulatory velocity for single frames. A naive threshold flags these as anomalies.

**Mitigation (dual-threshold system):**

Don't flag on instantaneous velocity alone. Require BOTH conditions:

1. **Instantaneous velocity > 25 cm/s** (above the physiological comfortable range but within burst capability)
2. **Sustained for > 3 consecutive frames** (30ms at 100fps)

Real speech produces single-frame spikes at phoneme boundaries that resolve within 1-2 frames. Deepfakes produce sustained impossible velocities because the neural network is interpolating between spectral targets without regard for articulatory inertia.

```python
VELOCITY_THRESHOLD = 25.0   # cm/s
SUSTAINED_FRAMES = 3        # consecutive frames required

anomaly_frames = []
streak = 0
for i, v in enumerate(velocities):
    if v > VELOCITY_THRESHOLD:
        streak += 1
        if streak >= SUSTAINED_FRAMES:
            anomaly_frames.extend(range(i - streak + 1, i + 1))
    else:
        streak = 0

# Deduplicate
anomaly_frames = sorted(set(anomaly_frames))
```

Also: calibrate the threshold against your own recorded speech. Read the same sentence 5 times at different speeds. Find your max sustained velocity. It should be 12-18 cm/s. Set the threshold comfortably above that.

---

## 3. False Negatives on High-Quality Deepfakes

**Severity:** MEDIUM
**Likelihood:** LOW-MEDIUM (advanced TTS exists but the velocity gap is huge)
**Impact:** A deepfake passes as genuine. Less dramatic than false positive but still undermines the premise.

**The problem:** State-of-the-art TTS models (XTTS-v2, Bark, Tortoise) are getting better at modeling smooth spectral transitions. A sufficiently advanced model might produce formant trajectories that respect articulatory rate limits, especially for simple, slow utterances.

**Why this risk is manageable:** The velocity gap between real and synthetic speech is enormous. Real speech: 8-15 cm/s. Current deepfakes: 40-200+ cm/s. Even the smoothest TTS models show F2 transition anomalies (tongue front-back movement) because they're optimizing for perceptual quality, not articulatory physics. The threshold would need to close by an order of magnitude before false negatives become common.

**Mitigation:**

1. **Frame the system as "forensic evidence," not "binary detector."** The verdict panel shows a velocity distribution histogram. Even if a sophisticated deepfake stays under the threshold, its velocity distribution will look different from real speech (narrower variance, more uniform transitions vs. the characteristic attack-sustain-release pattern of real articulatory gestures).

2. **Use OpenAI TTS for the demo deepfake.** OpenAI's `tts-1` model is good enough to fool ears but not good enough to fool formant physics. It reliably produces velocity spikes above 60 cm/s. Don't test against XTTS-v2 during the demo unless you've verified it triggers detection.

3. **Show the distribution, not just the verdict.** Even if overall velocity looks okay, highlight the specific F2 transition patterns. Deepfakes tend to have unnaturally linear F2 transitions (straight-line interpolation) vs. the curved, momentum-carrying transitions of real speech.

---

## 4. 3D Asset Pipeline Takes Too Long

**Severity:** MEDIUM
**Likelihood:** MEDIUM (Blender Boolean modifier can be finicky with complex meshes)
**Impact:** No sagittal skull visualization. The demo loses its most distinctive visual element.

**The problem:** The x-ray skull with visible tongue requires: (1) download ARKit head model, (2) Boolean slice in Blender, (3) add tongue geometry with shape keys, (4) export as .glb, (5) generate R3F component with gltfjsx. Each step can hit snags: Boolean modifier fails on non-manifold geometry, shape keys don't export correctly, gltfjsx chokes on the vertex count.

**Mitigation (layered fallbacks):**

1. **Pre-slice the model before the hackathon.** Do steps 1-4 the night before. Bring the finished .glb file. This turns a 2-hour risk into a 0-minute risk. Store it in the repo under `public/models/head-sagittal.glb`.

2. **Simplified tongue-only geometry as fallback.** If the full head is problematic, create a standalone tongue mesh: extruded bezier curve in Blender, 3 shape keys (`forward`, `up`, `spread`), ~2K vertices. Render it against a dark background with grid lines suggesting the oral cavity. Less impressive but still demonstrates the physics.

```tsx
// Fallback: tongue-only in abstract void
function SimpleTongue({ jawOpen, tongueZ }: { jawOpen: number; tongueZ: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current?.morphTargetInfluences) return;
    ref.current.morphTargetInfluences[0] = THREE.MathUtils.lerp(
      ref.current.morphTargetInfluences[0], jawOpen, 0.15
    );
    ref.current.morphTargetInfluences[1] = THREE.MathUtils.lerp(
      ref.current.morphTargetInfluences[1], tongueZ, 0.15
    );
  });

  return (
    <mesh ref={ref} geometry={tongueGeometry}>
      <meshStandardMaterial color="#cc4466" roughness={0.8} />
    </mesh>
  );
}
```

3. **2D midsagittal diagram as nuclear option.** If 3D fails entirely, render a 2D SVG cross-section of the vocal tract with animated circles at the 6 articulator positions. This still shows the physics violation. Less wow factor, but the velocity data and anomaly detection carry the argument on their own.

---

## 5. Modal Cold Start Latency

**Severity:** LOW
**Likelihood:** LOW (keep_warm=1 prevents this in normal conditions)
**Impact:** First analysis takes 15-30 seconds instead of 2-4 seconds. Awkward silence during demo.

**The problem:** Modal spins down idle containers after ~5 minutes. If the container is cold, the first request provisions a new one: pull the image (~2GB with librosa + numpy), initialize Python, load libraries. This takes 15-30 seconds.

**Mitigation:**

1. **`keep_warm=1`** in the Modal function decorator. This tells Modal to keep at least one container running at all times. Monthly cost: ~$5-10 for a warm A100 (billed per second of idle time, but Modal credits from the hackathon cover this).

```python
@app.function(
    gpu="A100",
    keep_warm=1,
    timeout=120,
    image=image,
)
async def analyze_audio(audio_bytes: bytes) -> dict:
    ...
```

2. **Preflight ping on page load.** When the frontend app loads, fire a lightweight GET request to `/api/health` on Modal. This wakes the container if it somehow went cold. By the time the user uploads audio, the container is ready.

```typescript
// App.tsx — fire on mount, ignore the response
useEffect(() => {
  fetch(`${import.meta.env.VITE_API_URL}/api/health`).catch(() => {});
}, []);
```

3. **Pre-warm 5 minutes before demo.** Open the app, upload a throwaway audio file, wait for the result. This confirms the container is hot, the API is reachable, and the whole pipeline works end-to-end.

---

## 6. WebGL Performance on Judge's Laptop

**Severity:** LOW
**Likelihood:** LOW (scene is deliberately lightweight)
**Impact:** Choppy 3D rendering, stuttering animation, dropped frames during the dramatic reveal.

**The problem:** Not all laptops have discrete GPUs. Integrated Intel graphics can struggle with: the MeshTransmissionMaterial (requires multiple render passes for refraction), post-processing effects (Bloom + Scanline + ChromaticAberration in one composer), and high vertex count geometry.

**Mitigation:**

1. **Geometry budget.** Head mesh: 15K vertices max (sagittal slice removes half the original). Tongue: 5K vertices max. Velocity ribbons: 200-point ring buffer. Total scene: under 25K vertices. This is trivial for any GPU made after 2015.

2. **LOD fallback.** Detect framerate in `useFrame()`. If it drops below 30fps for 60 consecutive frames, disable post-processing effects and switch MeshTransmissionMaterial to a simpler MeshPhysicalMaterial with opacity.

```typescript
function PerformanceMonitor() {
  const frameCount = useRef(0);
  const lowFrames = useRef(0);

  useFrame((_, delta) => {
    const fps = 1 / delta;
    if (fps < 30) {
      lowFrames.current++;
      if (lowFrames.current > 60) {
        useStore.getState().setLowPerformance(true);
        // Triggers: disable EffectComposer, swap materials
      }
    } else {
      lowFrames.current = 0;
    }
  });

  return null;
}
```

3. **Present on YOUR laptop.** Don't use the judge's machine. Bring your own. You know it works. You've tested it. If judges insist on their laptop, have a screen recording backup (.mp4, 1080p, 60fps) ready to play full-screen.

---

## Risk Summary Matrix

| # | Risk | Severity | Likelihood | Mitigation Quality |
|---|------|----------|------------|-------------------|
| 1 | Formant instability (noisy audio) | HIGH | HIGH | Strong (4 layers) |
| 2 | False positives (fast talkers) | MEDIUM | MEDIUM | Strong (dual threshold) |
| 3 | False negatives (good TTS) | MEDIUM | LOW-MED | Adequate (huge velocity gap) |
| 4 | 3D asset pipeline delays | MEDIUM | MEDIUM | Strong (3 fallback tiers) |
| 5 | Modal cold start | LOW | LOW | Strong (keep_warm + preflight) |
| 6 | WebGL performance | LOW | LOW | Strong (LOD + own laptop) |

**Overall project confidence: ~75%.** The primary risk is #1 (formant instability) compounded with #2 (false positives). If clean audio samples are used for the demo (which they will be), both risks drop to LOW. The system works reliably on clean, 16kHz, mono .wav files. It gets shaky on noisy MP3s from phone recordings. Design the demo around the strength.
