# SYNAPSE Audio Stack & Architecture

> Technical reference for sound implementation — Feb 28, 2026
> Counterpart to LARYNX sound-design/00-AUDIO-STACK-OVERVIEW.md

## Stack Overview (Shared with LARYNX)

| Layer | Library | Size | Purpose |
|-------|---------|------|---------|
| UI sounds | `use-sound` | ~3kb | Clicks, transitions, notifications |
| Engine | Howler.js | ~9kb | Loaded by use-sound automatically |
| 3D spatial | Drei `<PositionalAudio>` | 0kb (bundled w/ R3F) | Scene-tied sounds |
| Procedural | Tone.js | ~16kb | Synthesized neural/electrical sounds |
| **Total** | | **~28kb** | Under 60kb animation budget |

## Architecture (SYNAPSE-Specific)

```
SoundProvider (Zustand store — module-scoped, NOT inside React)
├── isMuted: boolean
├── masterVolume: number (0-1)
├── audioUnlocked: boolean (first-click gate)
├── synthPool: FMSynth[16]          ← fixed voice pool
├── noiseSynth: NoiseSynth          ← ablation zap
├── droneSynth: FMSynth             ← neural ambient
├── sliderOsc: Oscillator           ← ablation control
├── regenSynth: Synth               ← text regeneration clicks
├── spectralOsc: Oscillator         ← formant sonification (custom partials[32])
├── grainPlayer: GrainPlayer        ← pathway activation texture
├── initAudio(): void               ← called from onClick, calls Tone.start()
├── updateFeatures(features[]): void ← called from useFrame at 30fps
├── triggerAblation(featureId): void ← event-driven
└── triggerRegeneration(): void      ← event-driven

Master Bus Chain (module-scoped):
  Compressor({threshold:-12, ratio:4})
  → Filter(120, 'highpass')         ← HPF prevents IMD on laptop speakers
  → EQ3({low:-3, mid:0, high:+2})   ← presence boost for hackathon
  → Limiter(-1)                      ← prevents clipping
  → Destination
```

## Critical Implementation Rules

### 1. Never Instantiate Tone.js Inside React Components
```typescript
// ❌ WRONG — duplicates on HMR, memory leaks
function NeuronGraph() {
  const synth = new Tone.FMSynth(); // Creates new on every render
}

// ✅ CORRECT — module-scoped singletons
const masterBus = new Tone.Channel().toDestination();
const synthPool = Array.from({length: 16}, () => 
  new Tone.FMSynth().connect(masterBus)
);

// Zustand store wraps these singletons
export const useAudioStore = create((set, get) => ({
  synthPool,
  masterBus,
  initAudio: async () => { await Tone.start(); set({audioUnlocked: true}); },
}));
```

### 2. useFrame Integration (30fps Audio Updates)
```typescript
// ❌ WRONG — rampTo() inside useFrame overflows Web Audio scheduler
useFrame(() => {
  synth.frequency.rampTo(newFreq, 0.1); // 60 calls/sec = scheduler explosion
});

// ✅ CORRECT — setTargetAtTime for exponential smoothing
useFrame(() => {
  const { activeFeatures } = useAudioStore.getState(); // NOT hook selector
  synth.frequency.setTargetAtTime(newFreq, Tone.now(), 0.05);
});
```

### 3. Voice Pooling (16 voices for 5K features)
```typescript
function updateSonification(features: {id: number, mag: number}[]) {
  // Sort by activation magnitude, take top 16
  const top16 = features
    .sort((a, b) => b.mag - a.mag)
    .slice(0, 16);
  
  top16.forEach((feat, i) => {
    const synth = synthPool[i];
    const freq = 200 + feat.mag * 2000;        // 200Hz-2.2kHz
    const modIdx = 1 + feat.mag * 30;           // clean → chaotic
    synth.frequency.setTargetAtTime(freq, Tone.now(), 0.05);
    synth.modulationIndex.setTargetAtTime(modIdx, Tone.now(), 0.05);
  });
  
  // Mute unused voices
  for (let i = top16.length; i < 16; i++) {
    synthPool[i].volume.setTargetAtTime(-Infinity, Tone.now(), 0.02);
  }
}
```

### 4. Zustand Subscriber (Outside React Lifecycle)
```typescript
// Subscribe to feature changes at 30fps throttle
let lastUpdate = 0;
useAudioStore.subscribe(
  state => state.activeFeatures,
  (features) => {
    const now = performance.now();
    if (now - lastUpdate < 33) return; // 30fps throttle
    lastUpdate = now;
    updateSonification(features);
  }
);
```

### 5. Spatial Audio Budget
- Maximum 10-15 active `Tone.Panner3D` nodes (CPU-heavy)
- Use `equalpower` panningModel (NOT `HRTF` — causes phase cancellation on laptop speakers)
- Sync `Tone.Listener` to Three.js camera position in useFrame
- Hard pan 100% L or R only (subtle 30% pans collapse on 10-20cm speaker separation)

## File Structure

```
src/
├── audio/
│   ├── synapse-audio-store.ts     ← Zustand store + module-scoped synths
│   ├── synth-recipes.ts           ← All Tone.js synth configurations
│   ├── sonification-engine.ts     ← Feature→audio parameter mapping
│   ├── spatial-manager.ts         ← Panner3D pool (max 15)
│   └── master-bus.ts              ← Compressor→HPF→EQ→Limiter chain
├── hooks/
│   ├── useSynapseAudio.ts         ← React hook wrapping store
│   └── useAudioFrame.ts           ← useFrame bridge for audio updates
```

## Differences from LARYNX Audio Stack

| Dimension | LARYNX | SYNAPSE |
|-----------|--------|---------|
| Primary mode | Event-driven (upload→scan→reveal) | Continuous data-reactive (5K features→audio) |
| Voice count | 3-5 simultaneous | 16-voice pool + ambient layers |
| Spatial audio | PositionalAudio on 3D head mesh | Panner3D mapped to graph node positions |
| Data sonification | Velocity→distortion (1 parameter) | Activation magnitude→FM index, filter, grain density |
| Dynamic range strategy | -20dB base, 0dB reveal (horror lean-in) | Same strategy, but "silence" = bandwidth narrowing |
| Key synthesis | Sawtooth pitch drop (deepfake reveal) | FM modulation index explosion (ablation chaos) |
