# Film & Trailer Sound Design Techniques

> Research compiled Feb 28, 2026 — Applicable to LARYNX demo reveal moments

## 1. The "Braam" / Inception Horn

How the Hans Zimmer BRAAAM is constructed:
- Detuned brass/synths + sub-bass sine + distortion + long reverb tail
- Multiple voices slightly detuned (±10-30 cents) = "thick" sound

### Tone.js Implementation
```js
// Braam synthesizer
const braam = new Tone.FatOscillator({
  type: 'sawtooth',
  frequency: 'D1',    // ~36.7 Hz (use missing fundamental trick)
  count: 3,           // 3 detuned voices
  spread: 30          // ±30 cents detuning
});

const braamEnv = new Tone.AmplitudeEnvelope({
  attack: 0.4,        // slow swell
  decay: 2,
  sustain: 0.3,
  release: 4          // long tail
});

const braamFilter = new Tone.Filter({
  frequency: 400,     // starts dark
  type: 'lowpass'
});
// Ramp filter to 2kHz on attack for "opening up" effect

const braamDist = new Tone.Distortion(0.8);
const braamReverb = new Tone.Reverb({ decay: 6, wet: 0.6 });

braam.chain(braamEnv, braamFilter, braamDist, braamReverb, Tone.Destination);
```

## 2. Risers and Sweeps

Trailers build tension with continuously ascending sounds.

### Noise Riser (3 seconds before skull clip)
```js
const noise = new Tone.Noise('white');
const riserFilter = new Tone.Filter({
  frequency: 50,
  type: 'lowpass'
});
const riserGain = new Tone.Volume(-Infinity);

noise.chain(riserFilter, riserGain, Tone.Destination);
noise.start();

// Sweep over 3 seconds
riserFilter.frequency.rampTo(10000, 3);  // 50 → 10kHz
riserGain.volume.rampTo(0, 3);           // -Inf → 0dB
```

### Shepard Tone (Infinitely Rising/Falling Pitch)
3 oscillators spaced octaves apart, continuous sweep with crossfade:
```js
// Create 3 oscillators an octave apart
const osc1 = new Tone.Oscillator({ frequency: 100, type: 'sine' });
const osc2 = new Tone.Oscillator({ frequency: 200, type: 'sine' });
const osc3 = new Tone.Oscillator({ frequency: 400, type: 'sine' });

// Continuously sweep all down, crossfade volumes so highest
// fades in as lowest fades out → perpetual descent illusion
// Implementation: schedule frequency ramps + volume crossfades
// in a repeating Transport callback
```
Use during descent into throat/larynx visualization → bottomless dread.

### Reverse Reverb
Reversed cymbal/crash creating a "sucking" sound before impact:
- Pre-render a reversed reverb tail as a WAV file
- Play it 2s before the impact hit
- Creates subconscious anticipation

## 3. The Hit / Impact (3 Layers Simultaneous)

The moment of deepfake reveal. Three layers fired at once:

### Layer 1: Sub Impact (Missing Fundamental)
```js
const subHit = new Tone.MembraneSynth({
  pitchDecay: 0.05,
  octaves: 6,
  oscillator: { type: 'sine' },
  envelope: {
    attack: 0.001,
    decay: 0.4,
    sustain: 0,
    release: 1.4
  }
});
subHit.triggerAttackRelease('C1', '8n');
// Partials at 65/130/195/260Hz — perceived as massive C1 impact
```

### Layer 2: Dissonant Scream
```js
const scream1 = new Tone.FatOscillator({
  type: 'sawtooth', frequency: 'C3', count: 3, spread: 30
});
const scream2 = new Tone.FatOscillator({
  type: 'sawtooth', frequency: 'C#3', count: 3, spread: 30
});
const screamEnv = new Tone.AmplitudeEnvelope({
  attack: 0.001,
  decay: 0.8,
  sustain: 0,
  release: 1.5
});
// Minor 2nd = maximum roughness. 7.8Hz beating.
```

### Layer 3: Noise Burst
```js
const noiseBurst = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: {
    attack: 0.001,
    decay: 0.15,
    sustain: 0,
    release: 0.3
  }
});
const noiseHPF = new Tone.Filter({ frequency: 8000, type: 'highpass' });
noiseBurst.connect(noiseHPF);
// Cuts through ANY ambient noise. 8kHz+ = least masked frequency band.
```

### Fake Sidechain (Ambient Ducks Instantly)
```js
// On impact, duck everything else
ambientGain.gain.rampTo(0.01, 0.01);  // instant duck
ambientGain.gain.rampTo(0.15, 4);     // 4s recovery
```

## 4. Horror Texture (Processing Phase)

Shifting, breathing metallic drone:

```js
const horror = new Tone.FMSynth({
  harmonicity: 3.14,        // Non-integer = metallic, inharmonic
  modulationIndex: 10,
  oscillator: { type: 'sine' },
  modulation: { type: 'square' }
});

// LFO slowly modulates harmonicity for "breathing" effect
const lfo = new Tone.LFO({
  frequency: 0.1,           // Very slow: 10 second cycle
  min: 2.5,
  max: 4.5
});
lfo.connect(horror.harmonicity);
lfo.start();
```

## 5. Ticking Clock (Dunkirk Technique)

Relentless, accelerating mechanical pulse during analysis:

```js
const tick = new Tone.MetalSynth({
  frequency: 200,
  envelope: { decay: 0.05 },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000
});

// Schedule with accelerating tempo
Tone.Transport.scheduleRepeat((time) => {
  tick.triggerAttackRelease('C4', '32n', time);
}, '4n'); // quarter notes

// Ramp BPM: 60 → 140 over 8 seconds
Tone.Transport.bpm.value = 60;
Tone.Transport.bpm.rampTo(140, 8);
Tone.Transport.start();
```

## 6. Dynamic Range Strategy

The key insight: **the hardest-hitting sound is not the loudest — it's the one that comes after silence.**

| Phase | Master Volume | Purpose |
|-------|--------------|---------|
| Setup (Upload/Process) | -20 dB | Judges lean in. Low floor establishes baseline. |
| Pre-reveal silence | -∞ (250ms) | Removes masking threshold |
| Reveal (Tongue clip) | 0 dB | 20dB jump FEELS physically loud because of established low floor |
| Aftermath | -15 dB | New baseline, higher than setup = "something has changed" |

**Tone.Limiter on master** prevents digital clipping but lets distortion run hot:
```js
const masterLimiter = new Tone.Limiter(-1);
masterLimiter.toDestination();
// Route everything through masterLimiter
```

## 7. Data-Reactive Hook (The Engineering Flex)

Sound parameters driven by actual kinematic velocity data in real-time:

```js
// In R3F useFrame():
const tongueSpeed = calculateVelocity(); // 0-200 cm/s
const normalized = Math.min(tongueSpeed / 100, 1.0);

braamDist.distortion = normalized * 0.8;           // 0 → 0.8
braamFilter.frequency.value = 400 + (tongueSpeed * 50);  // 400 → 10400 Hz
oscillator.frequency.value = 80 + (normalized * 400);    // 80 → 480 Hz

// At 15 cm/s (real): clean, 80Hz, warm
// At 80 cm/s (fake): crushed distortion, 4400Hz filter, aggressive
// At 200 cm/s (extreme fake): maximum distortion, fully open filter
```

Physical mapping: velocity → sound corruption is INTUITIVE. Judges understand it instantly without explanation. The data IS the sound design.
