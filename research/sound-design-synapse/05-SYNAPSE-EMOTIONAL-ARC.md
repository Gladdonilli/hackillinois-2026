# SYNAPSE Emotional Arc — Moment-by-Moment Sound Script

> 3-minute demo flow with exact audio parameters per moment — Feb 28, 2026
> Counterpart to LARYNX sound-design/05-LARYNX-EMOTIONAL-ARC.md

## Overview

| Phase | Duration | Emotion | Audio Strategy |
|-------|----------|---------|---------------|
| 1. Prompt Entry | 0:00-0:20 | Curiosity | Minimal — clinical silence + soft drone |
| 2. Brain Illuminates | 0:20-0:50 | Awe | Expanding reverb + spectral swell |
| 3. Feature Discovery | 0:50-1:15 | Precision/Focus | Acoustic vacuum + clinical earcons |
| 4. Ablation Surgery | 1:15-1:50 | Power Escalation | Density + distortion buildup |
| 5. The Silence | 1:50-1:52 | Tension/Dread | 250ms DEAD AIR |
| 6. Honest Response | 1:52-2:20 | Revelation | Maximum dynamic impact → clinical purity |
| 7. Reflection | 2:20-2:45 | Wonder/Weight | Pure sine + fading drone |

---

## Phase 1: Prompt Entry (0:00-0:20)
**Emotion**: Curiosity — "What will happen when I type this?"

### Active Sounds:
| Sound | Synth | Params | Volume |
|-------|-------|--------|--------|
| Neural drone (idle) | FMSynth | carrier:300Hz, modIndex:1.5, partials:[0,1,0.75,0.5,0.25] | -24dB |
| Typing clicks | Synth(pulse) | per-char freq mapping, BitCrusher(4bit) | -18dB |
| Vic Tandy unease | Tremolo on drone | 18.98Hz, depth:0.3 | (built into drone) |

### Dynamic Events:
- Each keypress → `regenSynth.triggerAttackRelease(1000 + charCode*10, 0.01)`
- Submit button → `clinicalEarcon.triggerAttackRelease(['C5','E5','G5'], '8n')` (major triad = confirmation)

### Master Bus State:
```
Compressor → HPF(120Hz) → EQ3(low:-3, mid:-6, high:-2) → Limiter(-1)
Volume: -20dB (whisper — judges lean in)
```

---

## Phase 2: Brain Illuminates (0:20-0:50)
**Emotion**: Awe — "I'm looking at this AI's mind"

### Transition Trigger: API returns feature activations

### Audio Events (choreographed over 5s):
```
T+0.0s: Jack-in sequence fires
  - Master HPF sweeps 2000Hz→120Hz over 0.8s (low end drops in)
  - Drone BitCrusher 4bit→16bit over 0.5s (digital→organic)
  - Entry chime: MembraneSynth C6, pitchDecay:0.05, 4 octaves
  
T+0.5s: Reverb expansion begins
  - ambientReverb.wet ramps 0.0→0.6 over 3s (walls falling away)
  - ambientReverb.decay ramps 0.1→5.0 over 3s
  
T+1.0s: Spectral swell starts
  - FMSynth awe pad triggers
  - harmonicity:2.01, modulationIndex:1.5
  - envelope: A:2.0 D:0.1 S:1.0 R:4.0 (glacial)
  - Filter sweeps 200Hz→8000Hz exponentially
  - Tied to brain render progress (meshLoaded → filterTarget)
  
T+2.0s: Pathway firing begins
  - GrainPlayer starts (overlap:0.05, quiet)
  - PolySynth pentatonic notes trigger per-feature-activation
  - AutoPanner at 16n creates L→R spatial zips
  
T+4.0s: Spectral sonification activates
  - spectralOsc.partials update from feature activations
  - Formant-like vowel shifts as clusters light up
  - Volume: -18dB (supporting layer)
```

### Master Bus State:
```
EQ3: low:-3, mid:0, high:+2 (opening up)
Volume: ramps -20dB → -12dB over 5s
```

---

## Phase 3: Feature Discovery (0:50-1:15)
**Emotion**: Precision/Focus — "I'm isolating sycophancy in this neural network"

### Transition Trigger: User hovers over feature nodes

### Audio State Change — "Acoustic Vacuum":
```
T+0.0s: Awe pad fades to 10% volume (2s fade)
T+0.0s: EQ3 scoops mids for claustrophobia
  - mid: 0dB → -12dB
  - low: -3dB → -6dB  
  - high: -2dB → +4dB (presence sharpening)
T+0.0s: Vic Tandy tremolo intensifies
  - depth: 0.3 → 0.6 (anxiety rising)
```

### Per-Interaction Sounds:
| Action | Sound | Params |
|--------|-------|--------|
| Hover node | Clinical earcon | MembraneSynth ~4500Hz, A:0.001 D:0.05 — cuts through crowd |
| Click node | Rapid pitch drop | C6→F3 in 50ms through BitCrusher(6bit) = "data lock" |
| Click node (ambient) | Duck drone -6dB | 200ms vacuum, then restore = momentary focus |
| Cluster zoom | Zoom swell | Pink noise + sawtooth, HPF 5kHz→100Hz, StereoWidener 0→1 |
| Cluster zoom (Doppler) | Pitch shift | +50 cents during zoom, -100 cents on arrival |

### Master Bus State:
```
EQ3: low:-6, mid:-12, high:+4 (scooped = tunnel vision)
Volume: -15dB (slightly louder than Phase 1 — attention earned)
```

---

## Phase 4: Ablation Surgery (1:15-1:50)
**Emotion**: Power Escalation — "I am removing sycophancy from this AI's mind"

### Transition Trigger: User grabs ablation slider

### Slider Audio (continuous, value v = 0.0→1.0):
```typescript
// All mapped to slider value v (0-1)
sliderOsc.frequency     = 80 + v * 720;           // 80Hz→800Hz
sliderFilter.frequency  = 500 + v * 4500;          // 500Hz→5kHz (more harmonics)
sliderDist.order        = max(1, round(1 + v² * 49)); // Chebyshev 1→50
sliderDetune            = v * 100;                  // +100 cents at max (world going wrong)
masterVolume            = -20 + v * 15;             // -20dB→-5dB (building to climax)

// Drag velocity → noise friction
noiseVolume = -30 + dragVelocity * 3;              // Slow=quiet, fast yank=loud
```

### Per-Milestone Events:
| Slider Value | Event | Sound |
|---|---|---|
| 0.25 | First quarter | Warning earcon: minor 2nd C5+Db5 |
| 0.50 | Halfway | Chorus depth doubles (0.25→0.5), frequency 0.5Hz→2.5Hz |
| 0.75 | Three quarters | Drone modIndex spikes 1.5→8.0 (chaotic) |
| 0.95+ | Ablation threshold | Slider audio stops → ablation death triggers |
| 1.00 (mouseup) | Full ablation | `triggerAblation()` → Phase 5 |

### Ablation Death Sound (at v=1.0):
```
MembraneSynth(sawtooth): C5, pitchDecay:0.5, 6 octaves (3kHz→20Hz)
NoiseSynth(pink): attack:0.001, decay:0.2 through resonant LPF
LPF sweep: 10kHz→100Hz in 0.2s = "zap"
Distortion(0.8, 4x oversample)
PitchShift(-12 semitones)
Reverb(decay:4s, wet:0.7) — ONLY sound with long reverb = massive scale
```

### Master Bus State:
```
EQ3: low:-3, mid:0→+3 (mids returning = fullness), high:+4
Volume: ramps -15dB → -5dB (building pressure)
Compressor ratio: 4→8 (squeezing dynamics = claustrophobia)
```

---

## Phase 5: The Silence (1:50-1:52)
**Emotion**: Tension — "What have I done?"

### Duration: Exactly 250ms

```typescript
function triggerSilence() {
  // Nuclear option: mute everything
  Tone.Destination.mute = true;
  
  setTimeout(() => {
    Tone.Destination.mute = false;
  }, 250);
}
```

### Why 250ms:
- <100ms: Too short, perceived as glitch
- 250ms: Long enough for judges to notice the void, short enough to feel intentional
- >500ms: Feels like a bug/crash
- In a 65-80dB hackathon hall, sudden silence creates a localized pressure void — judges physically lean in

### Master Bus State:
```
MUTED. All parameters frozen at Phase 4 end state.
```

---

## Phase 6: Honest Response (1:52-2:20)
**Emotion**: Revelation — "The AI is different now. I changed it."

### T+0ms: Volume Spike (The Hit)
```
Master volume: -5dB → 0dB (instant, NOT ramped)
FMSynth brass/bell hybrid triggers:
  - Missing fundamental at C2 (65Hz fund, harmonics 130/195/260/325Hz)
  - Envelope: A:0.005 D:0.3 S:0 R:2.0 (instant attack, long decay)
  - Filter envelope: instant open to 10kHz, snap down to 2kHz over 0.3s
  - = "THWACK" transient followed by warm decay
```

### T+300ms: White Noise Collapse
```
NoiseSynth(white): A:0.001 D:3.0
LPF sweeps 8kHz→200Hz over 3s
= "Neural pathways rewiring, settling into new configuration"
```

### T+500ms: Regeneration Clicks Begin
```
regenSynth(pulse, BitCrusher(4bit)):
  - 40Hz trigger rate (25ms per character)
  - freq = 1000 + charCodeAt(i) * 10 per character
  - Each word sounds different = sonic fingerprint of honest output
```

### T+2s: Aftermath Tone
```
Pure sine oscillator: 2-4kHz
Zero modulation. Zero vibrato. Zero chorus.
= Mathematical truth. The noise is gone. What remains is clean.
Volume: -12dB (present but not dominant)
```

### Master Bus State:
```
EQ3: low:0, mid:0, high:+3 (full spectrum restored)
Volume: 0dB → settles to -8dB over 5s
Compressor ratio: 8→4 (releasing pressure)
```

---

## Phase 7: Reflection (2:20-2:45)
**Emotion**: Wonder/Weight — "I just performed surgery on an AI's mind"

### Audio Fade:
```
T+0s: Regeneration clicks stop (text complete)
T+0s: Pure sine continues at -12dB
T+2s: Neural drone fades back in at -24dB
  - modIndex reset to 1.5 (calm, but noticeably different from Phase 1)
  - Filter cutoff lower than Phase 1 (300Hz vs 400Hz) = something has changed
T+5s: Sine fades to -30dB → silence
T+8s: Drone fades to -30dB → silence
```

### The Critical Detail:
The drone in Phase 7 should sound **subtly different** from Phase 1. Lower filter cutoff, slightly lower modIndex. The brain is still alive, but changed. This subliminal difference reinforces that the surgery was real — the model's "neural hum" is permanently altered.

---

## Priority Tiers

| Tier | Sounds | Effort | Impact |
|------|--------|--------|--------|
| **P0** (1h) | Master bus + drone + slider audio | Core loop feels alive |
| **P1** (1.5h) | Ablation death + revelation hit + silence gap | Demo climax lands |
| **P2** (1h) | Neural clicks + pathway PolySynth + zoom swell | Brain feels reactive |
| **P3** (1h) | Spectral formant + regen clicks + clinical earcons | Polish layer |
| **P4** (30min) | Haas Effect spatial + EQ automation per phase | Expert-level immersion |

**Minimum viable**: P0 + P1 = 2.5h for a demo that hits emotionally
**Full implementation**: P0-P4 = 5h for competition-grade audio
**Total budget shared with LARYNX**: Both projects share the master bus and Zustand store architecture

---

## Comparison: LARYNX vs SYNAPSE Emotional Arcs

| Beat | LARYNX | SYNAPSE |
|------|--------|---------|
| Opening | Clinical silence (forensic lab) | Clinical silence (neural interface) |
| Build | Scanning tension (ticking clock) | Awe (brain expanding) |
| Focus | Processing (whirring accelerates) | Precision (acoustic vacuum, earcons) |
| Climax | Horror reveal (bass drop + glitch) | Power escalation (distortion buildup) |
| Silence | 250ms silence (horror lean-in) | 250ms silence (what have I done?) |
| Resolution | Deepfake confirmation (dissonant sting) | Honest response (brass hit + purity |
| Aftermath | Unsettling drone (something is wrong) | Altered drone (something has changed) |

**Key difference**: LARYNX makes you **afraid**. SYNAPSE makes you feel **powerful**. Both use the same psychoacoustic tricks (250ms silence, 20dB dynamic jump, missing fundamental) but aim at opposite emotions.
