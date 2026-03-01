# LARYNX Demo Script

**Duration:** 3 minutes sharp
**Setup:** Browser open to deployed app (`voxlarynx.tech`). Pre-recorded real voice sample ready to drag. Three backup deepfake samples in `backend/demo_files/` folder. Modal container pre-warmed.

---

## 0:00 - 0:20 | The Hook

*Screen: dark background, LARYNX title with glitch effect, subtle grid pattern. Three floating text labels drift gently — Upload, Synthesize, View Database. A 3D translucent skull floats center-screen with a faint blue aura pulsing at the mouth.*

> "Every deepfake detector tells you IF a voice is fake. None of them tell you WHY."

*Pause. Let it land.*

> "We built a forensic physics engine that makes the impossible visible."

*Move cursor toward the skull. The mouth aura brightens and expands in response to cursor proximity.*

---

## 0:20 - 0:50 | Real Voice: The Baseline

*Drag the pre-recorded real voice file (.wav) anywhere onto the screen. The full-screen drop zone activates — a file card appears showing the loaded file.*

> "This is a real human voice. My voice, recorded ten minutes ago."

*Click the glowing mouth aura to begin analysis. The aura pulses when a file is loaded, signaling it's ready.*

*Processing indicator: ticking clock sound (MetalSynth, 60 BPM, subtle). Progress bar fills. Then...*

*The skull transitions to analysis view. Camera orbits to sagittal cross-section. Inside the mouth, the tongue begins to move — reconstructed from the audio via neural articulatory inversion.*

> "What you're seeing is the vocal tract reconstructed from the audio. We run it through a neural articulatory inversion model that maps speech to tongue, jaw, and lip kinematics — one hundred frames per second."

*Point to the SpeedGauge and velocity readouts on the right side. They glow green, wavering gently between 3-5 cm/s.*

> "The tongue moves at 3 to 5 centimeters per second. Smooth. Constrained by mass, muscle, and bone. This is how a human tongue moves."

*Ambient drone is low, clinical. SpeedGauge needle floats in the green zone.*

---

## 0:50 - 1:30 | Deepfake Reveal: The Physics Break

*From the verdict panel, click "COMPARE ANALYSIS" to enter comparison mode. Or return to idle and click the floating "Synthesize" label. Type the same sentence. Hit enter.*

> "Now let's generate a deepfake of my voice using OpenAI's text-to-speech API. Same words. Different physics."

*Brief loading spinner (2-3 seconds). The generated audio auto-plays briefly so judges hear it, then uploads for analysis.*

*If OpenAI call fails: drop a backup file from `backend/demo_files/`. Say: "Here's one we generated earlier."*

*Processing starts. Same ticking clock, but the tempo starts accelerating (60 → 90 → 120 BPM).*

*Skull reappears. Tongue starts moving normally... then SOMETHING IS WRONG.*

*The tongue accelerates. The SpeedGauge needle swings hard right. Yellow. Orange. Red. The velocity climbs: 10... 15... 20+ cm/s.*

*At 20 cm/s threshold: IEC alarm fires. Bloom begins glowing around the skull. Tongue material shifts color.*

*At higher velocities: ChromaticAberration kicks in. Edges of the skull prismatically distort.*

*THE TONGUE PUNCHES THROUGH THE ROOF OF THE MOUTH. It clips through the nasal cavity geometry. The skull flashes red. Scanlines intensify. Bass drop hits. Screen border flashes crimson.*

**VERDICT PANEL SLAMS IN:**

```
╔══════════════════════════════════════╗
║         🔴  DEEPFAKE                 ║
║                                      ║
║  PHYSICALLY IMPOSSIBLE               ║
║  Peak velocity: [measured] cm/s      ║
║  Human limit:    20.0 cm/s           ║
║  Anomalous frames: XX / XXX          ║
╚══════════════════════════════════════╝
```

> "Your tongue would need to exceed 20 centimeters per second to produce this sound. The physics are impossible. No human articulator moves that fast."

*Let the visual sit for two beats. The skull keeps glitching. The distortion hums.*

---

## 1:30 - 2:10 | Side-by-Side: The Evidence

*Click "COMPARE ANALYSIS" button on the verdict panel. Split-screen mode: real voice on left, deepfake on right.*

*Left side: blue-tinted skull, smooth tongue movement, green velocity ribbon trailing behind.*
*Right side: red-tinted skull, erratic tongue, red velocity ribbon with sharp spikes and impossible direction changes.*

> "On the left, real speech. The velocity ribbons are smooth curves. The tongue follows natural trajectories."

*Point to the right side.*

> "On the right, the deepfake. Look at the velocity histogram at the bottom — every bar in the red zone is a frame where articulatory physics were violated."

> "Traditional detectors give you a confidence score. We give you a physics violation you can see, hear, and measure."

*Use "← BACK TO VERDICT" or "NEW ANALYSIS" buttons to navigate.*

---

## 2:10 - 2:40 | Technical Depth

*Camera centers on the analysis view. Velocity HUD and SpeedGauge prominent.*

> "Under the hood, we use a HuBERT-based neural articulatory inversion model running on Modal's B200 GPUs. It maps raw audio to electromagnetic articulography trajectories — tongue tip, tongue body, lips, jaw — at 100 frames per second."

> "We compute articulatory velocity from these neural EMA trajectories and check against biomechanical limits established in speech science literature. Human articulators max out around 15 to 20 centimeters per second. Deepfakes produce trajectories that violate these constraints."

> "We extract 108 kinematic features — velocity, acceleration, jerk, cross-correlations between articulators — and feed them into a HistGradientBoosting classifier trained on over 5,800 samples across 73 TTS architectures. 89.2% accuracy. No black box. Pure physics."

---

## 2:40 - 3:00 | Sponsors + Close

*Click "View Database" floating label or navigate to history view.*

> "We built this on Modal's B200 GPUs for real-time articulatory analysis. Cloudflare Pages and Workers for edge deployment globally. D1 and R2 for analysis history and audio storage. Vectorize for voice signature similarity search. OpenAI's TTS API to generate deepfake samples live during this demo."

*Beat.*

> "Deepfake detectors tell you something is fake. LARYNX shows you exactly where the physics breaks. Thank you."

---

## Backup Plan

Things that might go wrong and what to do:

| Failure | Recovery |
|---------|----------|
| OpenAI TTS API times out or errors | Drop a backup WAV file onto the screen. Three pre-generated deepfake .wav files in `backend/demo_files/` folder. Say: "Here's one we generated earlier with the same API." This costs you 5 seconds, not the demo. |
| Modal cold start takes > 5 seconds | Preflight: upload a throwaway file 5 min before demo. If it happens live, fill the silence: "The analysis pipeline is warming up the B200." |
| WebGL crashes on judge's laptop | Have a screen recording of the full demo as .mp4 backup. Play it full-screen. Say: "Let me show you the full experience." |
| Audio doesn't play through venue speakers | Demo works visually without audio. The 3D visualization and velocity data carry the argument. Skip sound design callouts. |
| Aura click doesn't register | Drag file, then click directly on the mouth glow area. If still unresponsive, use the Upload floating label which also triggers analysis flow. |

## Pre-Demo Checklist

- [ ] Browser: Chrome/Edge, hardware acceleration ON
- [ ] Tab: `voxlarynx.tech` loaded, no other tabs (GPU memory)
- [ ] Real voice sample: ready to drag onto screen
- [ ] Backup deepfakes: 3 files in `backend/demo_files/`, tested
- [ ] Modal: container warm (upload a throwaway file 5 min before)
- [ ] Audio: venue speakers tested, volume at comfortable level
- [ ] Screen recording: OBS ready as nuclear fallback
- [ ] Network: confirmed venue WiFi works, phone hotspot as backup
