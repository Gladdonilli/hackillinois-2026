# Game & UX Sound Design Psychology

> Research compiled Feb 28, 2026 — Applied to interactive web demo

## 1. "Juice" / Game Feel

From "Juice it or Lose it" (GDC 2012, Martin Jonasson & Petri Purho):

Sound makes interactions "meaty" and satisfying via:
- **Multi-layering**: A juicy click = (1) sharp high-freq transient (precision) + (2) low-mid thud (weight) + (3) subtle reverb tail (space)
- **Zero-latency feedback**: Sound must trigger within 1 frame of input. Any delay > 100ms breaks the cause-effect illusion.
- **Pitch randomization**: ±50–100 cents per play prevents "machine-gun effect" — keeps the brain engaged by introducing micro-novelty. After 3-4 identical repetitions, humans habituate and the sound becomes invisible (or annoying).

### LARYNX Application
The file drop / upload interaction must have a heavy, satisfying, randomized "thunk-click." This is the first sound judges hear — it sets the quality bar for the entire demo.

```js
const [play] = useSound('/sounds/sprites.mp3', {
  sprite: { upload: [0, 400] },
  playbackRate: 0.95 + Math.random() * 0.1, // ±5% randomization
  volume: 0.7,
});
```

## 2. Earcons vs Auditory Icons

| Type | Definition | Example | Emotional Quality |
|------|-----------|---------|-------------------|
| **Earcons** | Abstract synthetic sounds | Sine beep = success | Clinical, medical, scientific, authoritative |
| **Auditory Icons** | Real-world sound metaphors | Paper crumple = delete | Familiar, warm, relatable, organic |

### LARYNX Strategy: Earcons → Violated Earcons

For a forensic/scientific tool, use **Earcons** (abstract synthetic: sine/triangle, short attack, rapid exponential decay) for UI interactions. This establishes a sterile, medical-device aesthetic.

Then **BREAK this rule at the deepfake reveal** — transition to visceral/glitchy Auditory Icons (noise bursts, distorted audio, chaotic textures) to signal violation of physics.

**The rule-breaking IS the emotional payload.** The contrast between sterile clinical sounds and sudden chaotic audio tells the story: "the system has found something wrong."

## 3. The Kuleshov Effect in Audio

The Kuleshov Effect (originally film theory): the SAME visual paired with DIFFERENT context completely changes perceived emotion.

### Applied to LARYNX

The same 3D head visualization can feel:
- **Clinical + impressive** with: telemetry hum, soft data readouts, clinical beeps → "wow, cool data viz"
- **Body horror + visceral** with: jagged tearing sawtooth mapped to velocity, distortion, chromatic aberration → "holy shit, that tongue is clipping through the skull"

**Let the audio DEFINE the emotion of the visual.** Procedural Tone.js linked to kinematic velocity does this automatically — the data determines whether the sound is peaceful or horrifying.

## 4. Horror Game Engineering (Dead Space Pattern)

A 4-step acoustic architecture for the deepfake reveal:

### Step 1: The Vacuum (Tension Ramp)
During processing/analysis phase:
- Don't make it louder — instead, add heartbeat LFO
- **SLOWLY FADE OUT the ambient drone**
- Create an acoustic vacuum
- Brain leans in to compensate (orienting response)

### Step 2: The Sting
At "DEEPFAKE DETECTED":
- Broadband frequency hit (bass drop + digital screech)
- Zero-latency (< 10ms onset)
- Maximum dynamic contrast against the vacuum

### Step 3: The Aftermath
Drop volume, but:
- CHANGE the ambient drone to a dissonant, unresolved chord
- System feels "infected" — tonality has shifted
- Nothing returns to the clinical baseline

### Step 4: Resolution (Genuine Comparison)
When showing the genuine voice:
- Reverse sting — major key shift
- Perfect fifth chime (C + G)
- Warm sustained pad = safety signal
- Parasympathetic nervous system activation (relaxation)

## 5. Sound Fatigue & Habituation

### The Science
- **Habituation**: Repeated identical stimuli become neurologically invisible after 3-7 repetitions
- **Orienting response**: Novel stimuli trigger attention. Micro-variation (pitch, timing, timbre) keeps sounds "novel"
- **The doorbell effect**: A sound repeated every 2-3 seconds is maximally annoying within 20 seconds

### Thresholds
| Repetitions | Effect |
|-------------|--------|
| 1-2 | Novel, engaging |
| 3-4 | Expected, neutral |
| 5-7 | Background, ignored |
| 8+ | Annoying, potential mute trigger |

### Prevention Techniques
1. **Pitch randomization**: ±50-100 cents per play
2. **Timbre variation**: Alternate between 2-3 sprite variations of the "same" sound
3. **Cooldown periods**: Minimum 500ms between identical sounds
4. **Volume ducking**: Reduce repeated sounds by 2-3dB each iteration

### 2-5 kHz Fatigue Warning
Avoid the 2–5 kHz range for repetitive UI sounds. This is the "baby cry / alarm" range — human ears are maximally sensitive here but also fatigue fastest. Keep UI confirmations at softer mid-ranges (500-1kHz) or airy high frequencies (8kHz+). Reserve 2-5kHz for single-shot alerts (scanner beep, verdict announcement).

## 6. UX Sound Design Principles

### Material Sound Design (Google)
| Category | Characteristics | LARYNX Mapping |
|----------|----------------|----------------|
| **Confirmation** | Bright, ascending, major interval | Genuine voice verdict |
| **Error/Alert** | Descending, minor/dissonant, attention-grabbing | Deepfake detected |
| **Transition** | Smooth sweep, spatial movement | Page transitions, 3D camera moves |
| **Loading/Progress** | Rhythmic, anticipatory, building | Mel spectrogram processing |
| **Ambient** | Low-energy, continuous, non-intrusive | Background drone |

### Apple HIG Sound Guidelines
- Sounds should be **brief** (< 2 seconds for UI feedback)
- Sounds should be **pleasant in isolation** (individual sounds shouldn't be harsh)
- System context determines when sounds are **combined** to create tension
- Always provide a **mute option** visible to the user

## 7. Demo-Specific Sound Strategy

### For a 2.5-Minute Hackathon Demo

| Time | Sound Budget | Notes |
|------|-------------|-------|
| 0:00-0:30 | 2-3 unique sounds | Establish clinical baseline. Less is more. |
| 0:30-1:00 | Ambient evolution only | Build tension through SUBTRACTION not addition |
| 1:00 | ALL layers fire | The moment. Use everything. |
| 1:00-2:00 | Data-reactive continuous | Let the data drive the sound — hands-off |
| 2:00-2:30 | Resolution + narration | Return to calm. ElevenLabs voice. |

### Max Simultaneous Sounds: 3
- Layer 1: Ambient drone (always on, 15% vol)
- Layer 2: UI SFX (on interaction only)
- Layer 3: Spatial/procedural (during visualization only)

More than 3 simultaneous sources = noise. The brain can't parse it, judges get overwhelmed, someone reaches for mute.
