# LARYNX Demo Script

**Duration:** 3 minutes sharp
**Setup:** Browser open to deployed app. Mic/speaker confirmed working. Pre-recorded real voice sample loaded. OpenAI API key active. Three backup deepfake samples in `/backup/` folder.

---

## 0:00 - 0:20 | The Hook

*Screen: dark background, LARYNX logo (minimal, white text), subtle scanline effect.*

> "Every deepfake detector tells you IF a voice is fake. None of them tell you WHY."

*Pause. Let it land.*

> "We built a forensic physics engine that makes the impossible visible."

*Click the app. Interface loads. Dark theme, clinical aesthetic. Upload panel glows softly.*

---

## 0:20 - 0:50 | Real Voice: The Baseline

*Drag the pre-recorded real voice file (.wav) onto the upload panel.*

> "This is a real human voice. My voice, recorded ten minutes ago."

*Processing indicator: ticking clock sound (MetalSynth, 60 BPM, subtle). Mel spectrogram bar fills. Then...*

*The 3D skull materializes. Glass-like transparency, x-ray blue tint. Camera slowly orbits to reveal the sagittal cross-section. Inside the mouth, a pink tongue begins to move.*

> "What you're seeing is the vocal tract reconstructed from the audio. We extract formant frequencies, F1 and F2, one hundred times per second, and map them to articulatory positions. F1 tells us jaw openness. F2 tells us tongue position."

*Point to the velocity gauges on the right side of the screen. They glow green, wavering gently between 8-12 cm/s.*

> "The tongue moves at 8 to 12 centimeters per second. Smooth. Constrained by mass, muscle, and bone. This is how a human tongue moves."

*Ambient drone is low, clinical. SpeedGauge needle floats in the green zone.*

---

## 0:50 - 1:30 | Deepfake Reveal: The Physics Break

*Click "Generate Deepfake" button. Type the same sentence into the text field. Hit enter.*

> "Now let's generate a deepfake of my voice using OpenAI's text-to-speech API. Same words. Different physics."

*Brief loading spinner (2-3 seconds). The generated audio auto-plays briefly so judges hear it, then uploads for analysis.*

*If OpenAI call fails: click "Load Backup" and select `backup/deepfake-01.wav`. Say: "Here's one we generated earlier."*

*Processing starts. Same ticking clock, but the tempo starts accelerating (60 → 90 → 120 BPM).*

*Skull reappears. Tongue starts moving normally... then SOMETHING IS WRONG.*

*The tongue accelerates. The velocity gauge needle swings hard right. Yellow. Orange. Red. The number climbs: 40... 80... 120... 184 cm/s.*

*At 25 cm/s threshold: Bloom begins glowing around the skull. Tongue material shifts from pink to yellow.*

*At 50 cm/s: ChromaticAberration kicks in. Edges of the skull prismatically distort. Tongue turns orange-red.*

*At 80+ cm/s: THE TONGUE PUNCHES THROUGH THE ROOF OF THE MOUTH. It clips through the nasal cavity geometry. The skull flashes red. Scanlines intensify. Bass drop hits (sawtooth C3+C#3, 250ms). Velocity-reactive distortion crunches the audio. Screen border flashes crimson.*

**VERDICT PANEL SLAMS IN:**

```
╔══════════════════════════════════════╗
║         🔴  DEEPFAKE                 ║
║                                      ║
║  PHYSICALLY IMPOSSIBLE               ║
║  Peak velocity: 184.2 cm/s           ║
║  Human limit:    20.0 cm/s           ║
║  Ratio: 9.2x physical maximum        ║
║  Anomalous frames: 47 / 312          ║
╚══════════════════════════════════════╝
```

> "Your tongue would need to move at 184 centimeters per second to produce this sound. That's faster than a rattlesnake strike. The physics are impossible."

*Let the visual sit for two beats. The skull keeps glitching. The distortion hums.*

---

## 1:30 - 2:10 | Side-by-Side: The Evidence

*Click "Compare" to enter split-screen mode. Real voice on left, deepfake on right.*

*Left side: blue-tinted skull, smooth tongue movement, green velocity ribbon trailing behind.*
*Right side: red-tinted skull, erratic tongue, red velocity ribbon with sharp spikes and impossible direction changes.*

> "On the left, real speech. The velocity ribbons are smooth curves. The tongue follows natural trajectories."

*Point to the right side.*

> "On the right, the deepfake. Look at frame 147."

*Click the anomaly marker on the waveform. Both skulls snap to that timestamp.*

> "At this exact moment, the deepfake requires the tongue to reverse direction in 10 milliseconds. Physically, that needs infinite acceleration. A human tongue has mass; you can't stop it and reverse it instantaneously."

*Point to the velocity histogram at the bottom.*

> "Traditional detectors give you a confidence score. We give you a physics violation you can see, hear, and measure. Every spike in this histogram is a frame where the laws of anatomy were broken."

---

## 2:10 - 2:40 | Technical Depth

*Camera centers on the analysis view. Velocity HUD prominent.*

> "Under the hood, we extract F1 and F2 formant trajectories at 100 frames per second using Praat, the gold standard in phonetics research. F1 maps inversely to jaw openness: 300 hertz means closed, 900 hertz means wide open. F2 maps to tongue position: 800 hertz is tongue back, 2400 hertz is tongue front."

> "We compute articulatory velocity from these trajectories and check against biomechanical limits established in speech science literature. Human articulators max out around 15 to 20 centimeters per second. Deepfakes regularly hit 80 to 200."

> "No black box. No neural network classifier making opaque decisions. Pure physics. If the tongue has to move faster than humanly possible, the voice is fake. Period."

---

## 2:40 - 3:00 | Sponsors + Close

*Click to the history view. Show the Supermemory-backed analysis log with past analyses.*

> "We built this on Modal's A100 GPUs for real-time formant analysis. Cloudflare Pages and Workers for edge deployment globally. D1 and R2 for analysis history and audio storage. OpenAI's TTS API to generate deepfake samples live during this demo."

*Point to the Supermemory history graph.*

> "And Supermemory powers the forensic evidence timeline, so analysts can compare samples and build a case over time."

*Beat.*

> "Deepfake detectors tell you something is fake. LARYNX shows you exactly where the physics breaks. Thank you."

---

## Backup Plan

Things that might go wrong and what to do:

| Failure | Recovery |
|---------|----------|
| OpenAI TTS API times out or errors | Click "Load Backup" button. Three pre-generated deepfake .wav files in `/backup/` folder. Say: "Here's one we generated earlier with the same API." This costs you 5 seconds, not the demo. |
| Modal cold start takes > 5 seconds | Preflight ping fires on page load (keep_warm=1 should prevent this). If it happens during demo, fill the silence: "The analysis pipeline is warming up the A100." Have the real voice pre-analyzed with cached results as absolute fallback. |
| WebGL crashes on judge's laptop | Have a screen recording of the full demo as .mp4 backup. Play it full-screen. Say: "Let me show you the full experience." |
| Microphone doesn't work for live recording | Use the pre-recorded real voice sample. It's already loaded. Skip the "my voice, recorded ten minutes ago" line. |
| Audio doesn't play through venue speakers | Demo works visually without audio. The 3D visualization and velocity data carry the argument. Skip sound design callouts. |

## Pre-Demo Checklist

- [ ] Browser: Chrome/Edge, hardware acceleration ON
- [ ] Tab: app loaded, no other tabs (GPU memory)
- [ ] Real voice sample: loaded and tested
- [ ] Backup deepfakes: 3 files in `/backup/`, tested
- [ ] OpenAI API key: active, tested TTS call within last hour
- [ ] Modal: container warm (visit app, upload a throwaway file 5 min before)
- [ ] Audio: venue speakers tested, volume at comfortable level
- [ ] Screen recording: QuickTime/OBS ready as nuclear fallback
- [ ] Network: confirmed venue WiFi works, phone hotspot as backup
