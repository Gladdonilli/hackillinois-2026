# SYNAPSE Data Sonification System

> Mapping neural network activations to audio parameters — Feb 28, 2026
> References: Walker 2002 (J Exp Psych Applied), Hermann 2011 (Sonification Handbook)

## Core Principle: One-to-Many Mapping

A single data dimension should drive MULTIPLE audio parameters simultaneously. This creates stronger gestalt perception than 1:1 mappings.

**Anti-pattern**: activation→pitch (fatiguing "seagull effect" — rapid pitch changes cause listener exhaustion within 30s)

**Correct**: activation→(filter cutoff + FM index + grain overlap) simultaneously

## Master Mapping Table

| Data Dimension | Audio Parameter | Tone.js API | Perceptual Effect |
|---|---|---|---|
| Feature activation (0-1) | Filter cutoff (200-8kHz) | `Tone.Filter.frequency` | Brightness = energy |
| Feature activation (0-1) | FM modulation index (1-30) | `Tone.FMSynth.modulationIndex` | Clean→chaotic (harmonic complexity) |
| Global active count (0-5000) | Granular overlap (0.01-0.5) | `Tone.GrainPlayer.overlap` | Sparse clicks→rushing swarm |
| Average activation magnitude | Grain playback rate (1.0-3.0) | `Tone.GrainPlayer.playbackRate` | Slow pulse→urgent rushing |
| Node 3D position (x,y,z) | 3D panning + reverb wet | `Tone.Panner3D` + `Tone.Reverb.wet` | Peripheral=wide, distant=reverberant |
| Ablation event (trigger) | Negative pitch envelope | `Tone.MembraneSynth.pitchDecay` | Sharp zap/snap/death |
| Slider value (0-1) | Distortion order (1-50) | `Tone.Chebyshev.order` | Clean control→tearing apart |
| Slider velocity (px/frame) | Noise volume + filter cutoff | `Tone.NoiseSynth.volume` | Slow=hum, fast=screech |

## Spectral Sonification (5K Features → 32-Bin Formant)

Mapping 5K features 1:1 to audio = cacophony crash. Solution: downsample to 32 spectral bins (Mel-spectrogram approach).

```typescript
const SPECTRAL_BINS = 32;

const spectralOsc = new Tone.Oscillator({
  type: 'custom',
  frequency: 65,  // C2 fundamental
  partials: new Float32Array(SPECTRAL_BINS).fill(0) as unknown as number[]
});

function updateSpectralSonification(features: {id: number, mag: number}[]) {
  const bins = new Float32Array(SPECTRAL_BINS).fill(0);
  
  // Hash each feature to a bin, accumulate magnitudes
  features.forEach(f => {
    const bin = f.id % SPECTRAL_BINS;
    bins[bin] += f.mag;
  });
  
  // Normalize to 0-1 range
  const maxVal = Math.max(...bins, 0.001);
  const partials = Array.from(bins).map(v => Math.min(v / maxVal, 1.0));
  
  spectralOsc.partials = partials;
}
```

**Perceptual effect**: As different feature clusters activate, the spectral shape shifts — creating vowel-like formant changes. The brain lights up and the sound literally "speaks" differently. Dense sycophancy features might sound nasal (F1 concentrated); diverse features sound open (energy spread across bins).

## Granular Sonification (Pathway Activity)

```typescript
const grainPlayer = new Tone.GrainPlayer({
  url: '/audio/drone_texture.wav',  // 2-3s organic texture, looped
  loop: true,
  grainSize: 0.1,
  overlap: 0.05,
  playbackRate: 1.0,
  detune: 0,
  reverse: false,
  volume: -12
});

function updateGranularLayer(activeCount: number, avgMag: number, chaos: number) {
  // Active count → density
  grainPlayer.overlap = 0.01 + (activeCount / 5000) * 0.49;
  
  // Average magnitude → pitch
  grainPlayer.playbackRate = 1.0 + avgMag * 2.0;
  
  // Chaos metric (std dev of activations) → grain size shrinkage
  // More chaotic = smaller grains = glitchier
  grainPlayer.grainSize = 0.2 - chaos * 0.18;  // 0.2s→0.02s
  
  // Chaos → detuning (1200 cents = 1 octave)
  grainPlayer.detune = chaos * 1200;
}
```

## Ablation Event Sonification

Not continuous — event-triggered when a feature is fully ablated.

```typescript
const ablationZap = new Tone.NoiseSynth({
  noise: { type: 'pink' },
  envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
});

const zapFilter = new Tone.Filter(10000, 'lowpass', -24);
zapFilter.Q.value = 5;  // Resonant peak for sizzle

function triggerAblationZap() {
  ablationZap.triggerAttackRelease(0.3);
  
  // Rapid filter sweep: 10kHz → 100Hz = "zap" death
  zapFilter.frequency.cancelScheduledValues(Tone.now());
  zapFilter.frequency.setValueAtTime(10000, Tone.now());
  zapFilter.frequency.exponentialRampToValueAtTime(100, Tone.now() + 0.2);
  
  // Reset for next use
  zapFilter.frequency.setValueAtTime(10000, Tone.now() + 0.5);
}
```

## Performance Architecture

### Audio Update Rate: 30fps (NOT 60fps)

```typescript
// R3F runs at 60-120fps. Audio updates at 30fps.
// Human ear cannot distinguish audio parameter changes faster than ~30Hz
// (below 20Hz modulation = vibrato. Above = FM synthesis artifacts)

let audioFrame = 0;
useFrame(() => {
  audioFrame++;
  if (audioFrame % 2 !== 0) return; // Skip every other frame = 30fps
  
  const state = useAudioStore.getState();
  updateSonification(state.activeFeatures);
  updateGranularLayer(state.activeCount, state.avgMagnitude, state.chaos);
  updateSpectralSonification(state.activeFeatures);
});
```

### Decouple Audio from React Render

```typescript
// ✅ Zustand transient subscription — runs OUTSIDE React reconciliation
useAudioStore.subscribe(
  state => state.activeFeatures,
  (features) => {
    const now = performance.now();
    if (now - lastUpdate < 33) return;
    lastUpdate = now;
    updateSonification(features);
  },
  { fireImmediately: false }
);
```

## Spatial Sonification (3D Graph → 3D Audio)

### Budget: Max 15 Panner3D Nodes

```typescript
// Only spatialize the top 15 most active features
// Rest are rendered through stereo master bus (no spatial)

const pannerPool = Array.from({length: 15}, () => 
  new Tone.Panner3D({
    panningModel: 'equalpower',  // NOT 'HRTF' — causes phase issues on laptops
    rolloffFactor: 2,
    refDistance: 1,
    maxDistance: 100
  }).connect(masterBus)
);

function updateSpatialAudio(camera: THREE.Camera, topFeatures: Feature[]) {
  // Sync listener to camera
  const pos = camera.position;
  const fwd = camera.getWorldDirection(new THREE.Vector3());
  Tone.Listener.positionX.setTargetAtTime(pos.x, Tone.now(), 0.05);
  Tone.Listener.positionY.setTargetAtTime(pos.y, Tone.now(), 0.05);
  Tone.Listener.positionZ.setTargetAtTime(pos.z, Tone.now(), 0.05);
  Tone.Listener.forwardX.value = fwd.x;
  Tone.Listener.forwardY.value = fwd.y;
  Tone.Listener.forwardZ.value = fwd.z;
  
  // Assign top features to panner pool
  topFeatures.slice(0, 15).forEach((feat, i) => {
    pannerPool[i].positionX.setTargetAtTime(feat.x, Tone.now(), 0.05);
    pannerPool[i].positionY.setTargetAtTime(feat.y, Tone.now(), 0.05);
    pannerPool[i].positionZ.setTargetAtTime(feat.z, Tone.now(), 0.05);
  });
}
```

### Laptop Stereo Collapse Workaround

10-20cm speaker separation = stereo image collapses at 2-3ft listening distance.

**Haas Effect trick**: Duplicate signal to both channels, delay RIGHT by 15-25ms. Brain perceives width from time difference, not amplitude difference. Bypasses phase cancellation.

```typescript
const haasDelay = new Tone.FeedbackDelay({
  delayTime: 0.02,  // 20ms
  feedback: 0,
  wet: 0.5
});
// Route: mono source → haasDelay → right channel panner
// Original → left channel panner
```
