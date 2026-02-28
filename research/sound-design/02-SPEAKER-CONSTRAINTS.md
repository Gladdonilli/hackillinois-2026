# Speaker Constraints & Psychoacoustic Workarounds

> Research compiled Feb 28, 2026 — Hackathon demo environment

## Laptop Speaker Frequency Response

| Playback Device | Usable Low-End | Flat Response | Notes |
|----------------|----------------|---------------|-------|
| MacBook Pro 14"/16" (2020–2024) | ~80 Hz | 100 Hz – 16 kHz | Best-in-class laptop. Steep 12–24 dB/oct rolloff below 80Hz |
| Standard Windows laptop | ~200 Hz | 250 Hz – 12 kHz | Many have resonance peaks that color sound |
| Bluetooth speaker (JBL Flip/Charge) | ~65 Hz | 80 Hz – 18 kHz | Decent, but bass boost DSP can muddy low-mids |
| Conference room ceiling speakers | ~100 Hz | 150 Hz – 14 kHz | Usually speech-optimized, limited bass |

**Hard rule**: NOTHING below 100Hz will be heard on any likely demo hardware. Designing a bass drop at 40Hz is wasted effort — it'll either be inaudible or distort into ugly farting.

## Fletcher-Munson at Demo Volume (60–75 dB SPL)

At typical demo volumes in a hackathon hall:
- **100 Hz needs 15–20 dB MORE power** than 3 kHz to sound equally loud
- **3–4 kHz** is perceived loudest per unit of energy (ear canal resonance)
- **Below 200 Hz** is catastrophically quiet on small speakers at moderate volumes

**Implication**: Design the "heavy" sounds in the **150–300 Hz range** (perceived as "weight") paired with **3–6 kHz transients** (perceived as "bite/aggression"). This combo creates perceived impact without requiring impossible bass.

## Masking in Hackathon Halls

Ambient noise in hackathon halls: **65–80 dB**, primarily 300 Hz – 3 kHz (human speech, crowd chatter = pink noise spectrum).

| Frequency Band | Masked By Crowd? | Actionable |
|---------------|-------------------|------------|
| < 200 Hz | Partially (low energy in crowd noise) | Usable but inaudible on laptop speakers anyway |
| 200–500 Hz | **Heavily masked** | Avoid for important sounds |
| 500 Hz – 3 kHz | **Most masked** (speech band overlap) | Sustained pads/drones VANISH. Don't rely on. |
| 3–6 kHz | Moderately masked | Sharp transients cut through — use attack-heavy sounds |
| 6–12 kHz | **Least masked** | Metallic, crystalline, bitcrushed sounds are AUDIBLE |
| 12+ kHz | Unmasked but low sensitivity | Subtle spatial cues only |

**Solution**: The sounds that WILL be heard in a noisy hall are:
1. **Sharp transients** with fast attack (< 10ms) in the 3–10 kHz range
2. **Square wave / FM synth** timbres (rich harmonics above speech band)
3. **Sounds with temporal contrast** (silence → sudden onset) rather than steady-state drones

## The Missing Fundamental Illusion (Key Technique)

You can make judges PERCEIVE bass that their laptop physically cannot produce:

```
Target: perceived 50 Hz bass thump
Actual signal: harmonics at 100, 150, 200, 250, 300 Hz
Fundamental (50 Hz): amplitude = 0
```

```js
// Tone.js implementation:
new Tone.Oscillator({
  frequency: 50,
  type: "custom",
  partials: [0, 1, 0.75, 0.5, 0.25, 0.1]
  //          ^fundamental=0, rest are harmonics 2-6
})
```

The brain's pitch perception system (via autocorrelation in the auditory cortex) infers the missing 50 Hz fundamental from the harmonic series. This is the exact technique phone speakers and laptop engineers use to fake bass.

**Research**: Schouten (1940), Licklider (1954), Patterson (1973).

## Small Speaker Distortion

What happens when you push sub-bass through laptop speakers:
- **Intermodulation Distortion (IMD)**: Cone excursion limits → muddy flutter/"farting"
- **Fix**: Steep HPF (highpass filter, 24dB/oct at 120Hz) on master bus. Stops IMD, gives 3–6dB extra headroom.

## Master Bus Protection (MANDATORY)

```js
// MANDATORY on master output:
const hpf = new Tone.Filter({
  frequency: 120,
  type: "highpass",
  rolloff: -24
});
const limiter = new Tone.Limiter(-1); // prevents digital clipping

// Chain: all audio → HPF → Limiter → Destination

// Why 120Hz HPF:
// 1. Kills sub-bass that causes intermodulation distortion on small speakers
// 2. Recovers 3-6dB headroom (sub-bass wastes amplifier power)
// 3. Eliminates "farting" from cone excursion limits
```

## Psychoacoustic Tricks for Small Speakers

### 1. Pitch-Envelope Transients
10ms drop from 2000→200Hz = perceived physical "punch" on tiny speakers.
```js
Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 8 })
```

### 2. Saturation/Waveshaping
Run low-mids through distortion → pushes bass energy into 400Hz+ where laptop is efficient.
```js
new Tone.Distortion(0.4) // or Tone.Chebyshev(50)
```

### 3. Aggressive Compression
Squash dynamic range so quiet parts stay above 65dB room ambient.
```js
new Tone.Limiter(-6) // on master bus
```

### 4. Transient Emphasis
Sharp attacks cut through noise better than sustained tones. Design every SFX with attack < 10ms.

### 5. Frequency Stacking
Layer sounds across multiple frequency bands for fullness rather than relying on any single band.

## Practical Frequency Targets (Summary)

| Category | Range | Notes |
|----------|-------|-------|
| **Safe range all speakers** | 200 Hz – 12 kHz | Everything in this range will be heard |
| **Impact range** | 150–300 Hz + 3–6 kHz | Weight + bite combo |
| **Hard cut below** | 100 Hz | HPF on master bus at 120Hz |
| **Maximum sensitivity** | 2–5 kHz | Use for alerts, scanner beeps, verdict announcements |
| **Least masked by crowd** | 6–12 kHz | Use for metallic/crystalline detail sounds |

## What Survives vs What Doesn't

| ✅ WILL WORK | ❌ WON'T WORK |
|-------------|--------------|
| 2.5kHz scanner beeps (presence range, max sensitivity) | Sub-bass drone below 100Hz (inaudible on laptops) |
| Sharp transient attacks < 10ms (cut through crowd noise) | Sustained warm pads 300Hz-2kHz (masked by speech) |
| Sawtooth/square timbres (harmonics above speech band) | Binaural beats (require headphones, crosstalk kills them) |
| Missing fundamental bass (harmonics fake perceived low-end) | Pure sine < 200Hz (too quiet at demo SPL per Fletcher-Munson) |
| 250ms silence → sudden onset (startle reflex, 6-10dB boost) | Gentle ambient that relies on quiet room |
| Pitch randomization ±50-100 cents (prevents fatigue) | Repetitive identical SFX (judges mute tab after 4th repeat) |
| HPF 120Hz on master (prevents speaker distortion) | Unfiltered sub-bass (intermodulation distortion = ugly fart) |
| Dynamic range: -20dB setup → 0dB reveal (contrast = impact) | Everything at 0dB (loudness war = nothing feels loud) |
