# SYNAPSE Synthesis Recipe Book

> Every sound in SYNAPSE with exact Tone.js parameters — Feb 28, 2026

## 1. Synaptic Firing / Neural Impulse (clinicalBeep → neuronClick)

**Context**: Short bright clicks when features activate. Geiger counter aesthetic — biological randomness with digital precision.

**Synthesis**:
```typescript
const neuronClick = new Tone.MembraneSynth({
  pitchDecay: 0.008,
  octaves: 4,
  oscillator: { type: 'sine' },
  envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 }
}).connect(clickBus);

const clickNoise = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 }
}).connect(clickBus);

// Click bus effects
const clickBus = new Tone.Channel();
clickBus.chain(
  new Tone.Filter(3000, 'highpass', -24),     // Glassy, cuts through crowd
  new Tone.BitCrusher(8),                      // Digital texture
  new Tone.PingPongDelay('32n', 0.1),          // Spatial scatter (wet: 0.2)
  masterBus
);
```

**Parameters**:
| Param | Value | Why |
|-------|-------|-----|
| Frequency | 4-8kHz | Cuts through 65-80dB hackathon ambient |
| Attack | 0.001s (1ms) | But laptop DSP stretches to ~15ms — acceptable |
| Decay | 0.03s (30ms) | Needle transient, no sustain |
| BitCrusher | 8-bit | Digital/neural texture without being harsh |
| Random LFO | 15Hz on filter cutoff | Biological uniqueness per trigger |

**Trigger**: On each feature activation crossing threshold (mag > 0.3). Pitch randomized ±50 cents per trigger to prevent machine-gun effect.

**Speaker survival**: 3-8kHz energy sits in laptop resonant sweet spot. No sub-bass content. Guaranteed audible.

---

## 2. Neural Ambient Drone (neuronHum)

**Context**: Ever-present low hum of "a brain thinking." BR2049 server room meets Ex Machina. Always on, modulates with global network activity.

**Synthesis**:
```typescript
const neuralDrone = new Tone.FMSynth({
  harmonicity: 2.01,           // Organic detuning (not perfect 2:1)
  modulationIndex: 1.5,        // Subtle FM warmth
  oscillator: {
    type: 'custom',
    partials: [0, 1, 0.75, 0.5, 0.25]  // Missing fundamental @ 150Hz
  },
  modulation: { type: 'triangle' },
  envelope: { attack: 4, decay: 2, sustain: 0.8, release: 5 },
  modulationEnvelope: { attack: 3, decay: 1, sustain: 0.6, release: 4 }
});

// Vic Tandy unease modulation
const uneaseVibrato = new Tone.Tremolo(18.98, 0.3).start();

// Breathing modulation
const breathLFO = new Tone.LFO(0.05, 0.5, 3.0);  // 20sec cycle
breathLFO.connect(neuralDrone.modulationIndex);
breathLFO.start();

neuralDrone.chain(
  uneaseVibrato,
  new Tone.Chorus(0.5, 2.5, 0.5),
  new Tone.Reverb({ decay: 10, preDelay: 0.1, wet: 0.6 }),
  masterBus
);
```

**Parameters**:
| Param | Value | Why |
|-------|-------|-----|
| Carrier freq | 300-450Hz (NOT 80-200Hz) | Moved up to survive crowd masking + laptop rolloff |
| Missing fundamental | Partials [0,1,0.75,0.5,0.25] | Brain perceives 150Hz bass without speaker reproducing it |
| Tremolo | 18.98Hz | Vic Tandy infrasound frequency → subliminal unease |
| Breathing LFO | 0.05Hz (20s cycle) | Slow FM index modulation = organic "thinking" rhythm |
| Volume | -20dB (15% master) | Background layer, ducks during events |

**Data-reactive mapping**:
- Global active feature count → FM modulationIndex (0 features=1.5, 5000 features=15.0)
- Average activation magnitude → filter cutoff (low mag=400Hz, high mag=8000Hz)
- Timbral MOTION (0.2Hz filter sweep across 3-6kHz) cuts through crowd better than static drone

---

## 3. Ablation / Node Death (deathSnap)

**Context**: A feature is surgically removed. Something dies — disconnects — collapses. Mass Effect Reaper blast meets electrocautery sizzle.

**Synthesis**:
```typescript
const ablationSnap = new Tone.MembraneSynth({
  pitchDecay: 0.5,
  octaves: 6,               // 3kHz → 20Hz exponential pitch drop
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 1.0 }
});

const ablationNoise = new Tone.NoiseSynth({
  noise: { type: 'pink' },
  envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 }
});

const deathFilter = new Tone.Filter(10000, 'lowpass', -24);

const ablationBus = new Tone.Channel();
ablationBus.chain(
  new Tone.Distortion(0.8),                    // Aggressive saturation
  new Tone.PitchShift(-12),                     // Additional octave drop
  deathFilter,
  new Tone.Reverb({ decay: 4, wet: 0.7 }),     // Long tail = scale/weight
  masterBus
);

function triggerAblation(featureId: number) {
  ablationSnap.triggerAttackRelease('C5', '2n');  // Start high, pitch drops
  ablationNoise.triggerAttackRelease('4n');
  
  // Rapid filter sweep: 10kHz → 100Hz over 0.2s = "zap" death
  deathFilter.frequency.setValueAtTime(10000, Tone.now());
  deathFilter.frequency.exponentialRampToValueAtTime(100, Tone.now() + 0.2);
  
  // Reset filter after tail
  deathFilter.frequency.setValueAtTime(10000, Tone.now() + 0.5);
}
```

**Parameters**:
| Param | Value | Why |
|-------|-------|-----|
| Start freq | 3kHz (C7 area) | High pitch = attention grab |
| End freq | ~20Hz (6 octaves down) | Exponential drop = "falling into void" |
| Distortion | 0.8 (4x oversample) | Maximum harmonic density for aggression |
| Pitch shift | -12 semitones | Additional octave weight |
| Reverb decay | 4.0s | ONLY sound with long reverb → scale contrast |
| Filter sweep | 10kHz→100Hz in 0.2s | "Zap" transient = electrocautery reference |

**Speaker survival**: Missing fundamental trick on the sub-bass tail. Distortion generates harmonics above 200Hz. The transient attack (3kHz) is perfectly reproduced.

---

## 4. Pathway Activation / Golden Trail (pathwayFire)

**Context**: Signal propagating through neural network — golden lines lighting up sequentially. Tron light cycles meets fiber optic data pulse.

**Synthesis**:
```typescript
const pathwayPoly = new Tone.PolySynth(Tone.FMSynth, {
  maxPolyphony: 8,
  voice: {
    harmonicity: 2.01,
    modulationIndex: 3,
    oscillator: { type: 'sine' },
    modulation: { type: 'square' },
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 1.5 },
    modulationEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.2, release: 0.8 }
  }
});

// Pentatonic scale lock — always consonant, never dissonant
const PATHWAY_NOTES = ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5'];

const pathwayBus = new Tone.Channel();
pathwayBus.chain(
  new Tone.AutoPanner({ frequency: '16n', depth: 1 }).start(),  // Spatial zip L→R
  new Tone.Phaser({ frequency: 2, baseFrequency: 1000, octaves: 3 }),
  new Tone.PingPongDelay('8n', 0.4),            // Cascading echo
  new Tone.Reverb({ decay: 2, wet: 0.4 }),
  masterBus
);

// Granular texture layer (continuous shimmer)
const pathwayGrain = new Tone.GrainPlayer({
  url: '/audio/drone_texture.wav',  // Short organic texture, looped
  loop: true,
  grainSize: 0.1,
  overlap: 0.05,
  playbackRate: 1.0,
  reverse: false
}).connect(pathwayBus);
```

**Data-reactive mapping**:
```typescript
function updatePathwayAudio(activeCount: number, avgMagnitude: number) {
  // More active features = denser granular cascade
  pathwayGrain.overlap = 0.01 + (activeCount / 5000) * 0.49;  // 0.01→0.5
  pathwayGrain.playbackRate = 1.0 + avgMagnitude * 2.0;        // pitch rises with energy
  
  // Trigger pentatonic notes for top-N newly activated features
  // (called from event, not every frame)
  const noteIdx = Math.floor(Math.random() * PATHWAY_NOTES.length);
  pathwayPoly.triggerAttackRelease(PATHWAY_NOTES[noteIdx], '8n');
}
```

---

## 5. Feature Cluster Zoom (zoomSwell)

**Context**: Camera flies into a constellation of nodes. Hyperspace jump meets microscope zoom.

**Synthesis**:
```typescript
const zoomNoise = new Tone.NoiseSynth({
  noise: { type: 'pink' },
  envelope: { attack: 1.5, decay: 0, sustain: 1.0, release: 0.5 }
});

const zoomOsc = new Tone.Oscillator({
  type: 'sawtooth',
  frequency: 200,
  volume: -10
});

const zoomFilter = new Tone.Filter(5000, 'highpass', -12);

const zoomBus = new Tone.Channel();
zoomBus.chain(
  zoomFilter,
  new Tone.StereoWidener(0),  // 0→1 during zoom (engulfing)
  new Tone.Reverb({ decay: 3, wet: 0.5 }),
  masterBus
);

function triggerZoom(durationMs: number) {
  const dur = durationMs / 1000;
  
  zoomNoise.triggerAttack();
  zoomOsc.start();
  
  // HPF sweeps DOWN — lets bass weight in at destination
  zoomFilter.frequency.setValueAtTime(5000, Tone.now());
  zoomFilter.frequency.exponentialRampToValueAtTime(100, Tone.now() + dur);
  
  // Stereo field opens up
  zoomBus.get('StereoWidener').width.rampTo(1, dur);
  
  // Doppler: +50 cents during zoom, -100 cents on stop
  zoomOsc.detune.setValueAtTime(50, Tone.now());
  zoomOsc.detune.linearRampToValueAtTime(-100, Tone.now() + dur);
  
  // Release on arrival
  setTimeout(() => {
    zoomNoise.triggerRelease();
    zoomOsc.stop();
  }, durationMs);
}
```

**Speaker note**: StereoWidener may collapse on laptop speakers (10-20cm separation). Use Haas Effect fallback: duplicate to L channel, delay R by 15-25ms for perceived width without phase cancellation.

---

## 6. Response Regeneration (regenChime → regenClicks)

**Context**: AI re-generating text after surgery. MUTHUR terminal meets WOPR computation. Faster-than-human typing.

**Synthesis**:
```typescript
const regenSynth = new Tone.Synth({
  oscillator: { type: 'pulse', width: 0.3 },  // Square-ish, digital
  envelope: { attack: 0, decay: 0.01, sustain: 0, release: 0.01 }
});

const regenBus = new Tone.Channel();
regenBus.chain(
  new Tone.BitCrusher(4),          // Aggressive lo-fi = distinctly "AI"
  new Tone.Chorus(4, 2.5, 0.5),   // Wide server rack effect
  masterBus
);

// Grid-perfect triggering at 30-50Hz (way faster than human typing)
function triggerRegenChar(char: string) {
  const freq = 1000 + char.charCodeAt(0) * 10;  // A=1650Hz, z=2220Hz
  regenSynth.triggerAttackRelease(freq, 0.01);   // 10ms click per character
}

// Called from text streaming callback, not useFrame
let regenInterval: number;
function startRegeneration(text: string) {
  let i = 0;
  const rate = 25; // ms per character = 40Hz
  regenInterval = setInterval(() => {
    if (i >= text.length) { clearInterval(regenInterval); return; }
    triggerRegenChar(text[i]);
    i++;
  }, rate);
}
```

**Key difference from human typing**: 30-50Hz trigger rate (vs 5-8Hz human). Characters map to frequencies, so different words sound different — a sonic fingerprint of the AI's actual output.

---

## 7. Power Slider / Ablation Control (severLine → ablationSlider)

**Context**: Continuous control — user drags slider from 0% to 100% to ablate feature. Must feel weighty, consequential. Gravity Gun manipulation.

**Synthesis**:
```typescript
const sliderOsc = new Tone.Oscillator({
  type: 'sawtooth',
  frequency: 80,
  volume: -15
});

const sliderFilter = new Tone.Filter(500, 'lowpass', -12);
sliderFilter.Q.value = 4;  // Resonant = alive, not flat

const sliderDist = new Tone.Chebyshev(1);  // Order ramps with slider

const sliderNoise = new Tone.NoiseSynth({
  noise: { type: 'brown' },
  envelope: { attack: 0, decay: 0, sustain: 1, release: 0.2 }
});

const sliderBus = new Tone.Channel();
sliderBus.chain(sliderFilter, sliderDist, masterBus);
sliderNoise.connect(sliderBus);

function onSliderStart() {
  sliderOsc.start();
  sliderNoise.triggerAttack();
}

function onSliderMove(value: number, velocity: number) {
  // value: 0-1, velocity: pixels/frame of drag speed
  
  // Pitch rises with ablation progress
  sliderOsc.frequency.setTargetAtTime(80 + value * 720, Tone.now(), 0.05);
  
  // Filter opens with progress (more harmonics = more danger)
  sliderFilter.frequency.setTargetAtTime(500 + value * 4500, Tone.now(), 0.05);
  
  // Distortion intensifies exponentially
  sliderDist.order = Math.max(1, Math.round(1 + Math.pow(value, 2) * 49));
  
  // SECRET SAUCE: drag velocity → noise volume + filter cutoff
  // Slow drag = controlled hum. Fast yank = 5kHz friction screech
  const noiseVol = -30 + velocity * 3;  // -30dB quiet → -12dB loud
  sliderNoise.volume.setTargetAtTime(noiseVol, Tone.now(), 0.02);
  
  // Master detuning at high values (world going wrong)
  sliderOsc.detune.setTargetAtTime(value * 100, Tone.now(), 0.1);  // +100 cents
}

function onSliderEnd(finalValue: number) {
  sliderOsc.stop();
  sliderNoise.triggerRelease();
  
  if (finalValue >= 0.95) {
    triggerAblation();  // Full ablation event
  }
}
```

**Electrocautery reference**: Real electrocautery = 100-300Hz buzz + harsh high harmonics. The sawtooth + Chebyshev distortion replicates this. PulseOscillator (narrow square) + brown noise filtered would be more realistic but less musically satisfying.
