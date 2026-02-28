# SYNAPSE Neuroscience & Surgical UI Sound Reference

> Sound vocabulary for "brain surgery on AI" — Feb 28, 2026
> Sources: medical device standards (IEC 60601-1-8), neuroscience sonification, game audio (Cyberpunk 2077, Deus Ex, System Shock)

## Sonic Identity: Clinical Precision + Digital Power

SYNAPSE's sound must communicate two things simultaneously:
1. **Surgical precision** — sterile, controlled, medical-grade
2. **God-complex power** — you are modifying a mind

These are in tension. The balance point: **dry, mathematical UI sounds** (precision) layered over **wet, massive-scale atmospheric sounds** (power).

## Clinical Medical UI Sound Design (IEC 60601-1-8)

Medical alarm standards provide the blueprint for "sounds that feel clinical":

### Rules for Sterile Sound
| Rule | Implementation | Why |
|------|---------------|-----|
| No pure sines | Use triangle waves with 4+ harmonics | Pure sines are too easily masked in noise |
| Consonant intervals | Major 3rd, perfect 5th for confirmations | Dissonance = alarm/danger, consonance = control |
| Ultra-tight envelopes | A:0.01 D:0.1 S:0 R:0.05 | Tight = precise. Loose = sloppy |
| NO reverb on UI sounds | Dry signal only | Reverb = space/distance. Dry = "inside your helmet" |
| Fundamental 150-1000Hz | With harmonics above | Medical standards require audibility in noise |

### Layer Separation: Dry UI vs Wet 3D
```
UI Layer (Dry):
  ├── Feature hover earcons — triangle, no reverb, no delay
  ├── Selection confirmations — FM bell, no reverb
  ├── Slider ticks — pulse wave, no reverb
  └── Feels: inside a surgical headset, localized, personal

3D Atmosphere Layer (Wet):
  ├── Neural ambient drone — Reverb decay 10s, wet 0.6
  ├── Pathway activation — PingPongDelay, Reverb
  ├── Ablation death — Reverb decay 4s (ONLY this sound = scale contrast)
  └── Feels: massive brain space, cathedral-scale, god-view
```

This perceptual separation makes the brain AUTOMATICALLY distinguish "controls I'm operating" from "the thing I'm operating on."

### Tone.js Implementation — Clinical Earcon
```typescript
const clinicalEarcon = new Tone.PolySynth(Tone.Synth, {
  maxPolyphony: 4,
  voice: {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.05 }
  }
});

// Confirmation: perfect 5th (C5 + G5)
function confirmSelection() {
  clinicalEarcon.triggerAttackRelease(['C5', 'G5'], '16n');
}

// Warning: minor 2nd (C5 + Db5) — inherently unsettling
function warnDanger() {
  clinicalEarcon.triggerAttackRelease(['C5', 'Db5'], '8n');
}

// NO effects chain. Direct to master bus. DRY.
clinicalEarcon.connect(masterBus);
```

## Neuroscience Sonification Conventions

### EEG Band Mapping (Reference for Neural Activity)
| Brain Band | Frequency | FM Carrier Range | Associated State |
|---|---|---|---|
| Delta | 0.5-4Hz | 200-400Hz | Deep processing |
| Theta | 4-8Hz | 400-600Hz | Memory/emotion |
| Alpha | 8-12Hz | 600-800Hz | Relaxed awareness |
| Beta | 13-30Hz | 800-1200Hz | Active cognition |
| Gamma | 30-100Hz | 1200-2000Hz | High-level binding |

**Application to SYNAPSE**: When feature clusters in different brain "regions" activate, their FM carrier frequency follows the band mapping above. Sycophancy features (emotional regulation) → Theta range (400-600Hz). Reasoning features → Beta range (800-1200Hz). Creates intuitive auditory geography.

### Feature Cluster → FM Chord
```typescript
function sonifyTopFeatures(top3: {id: number, mag: number, cluster: string}[]) {
  top3.forEach((feat, i) => {
    const baseFreq = clusterToFreq(feat.cluster); // 200-2000Hz per band
    synthPool[i].frequency.setTargetAtTime(baseFreq, Tone.now(), 0.05);
    
    // High activation → increase modulationIndex (smooth→chaotic bubbling)
    const modIdx = 1 + feat.mag * 15; // 1 (clean) → 16 (dense harmonics)
    synthPool[i].modulationIndex.setTargetAtTime(modIdx, Tone.now(), 0.05);
  });
}
```

## Cyberpunk "Jack-In" — Entering the Brain Space

When the user first sees the 3D brain render, this is the "jack-in" moment. Reference: Cyberpunk 2077 braindance entry.

### Sonic Signature:
1. **Kill room reverb instantly** — sudden shift from natural to close-mic proximity
2. **Heavy low-end drop** — `Filter(highpass, 2000Hz)` for 200ms, then sweep down to normal
3. **BitCrusher(4-6bit)** on the drone for 500ms — organic→digital interface transition
4. **Rapid pitch drop** on entry chime: 2kHz→100Hz in 50ms through BitCrusher

```typescript
function jackInSequence() {
  // 1. Kill ambient reverb
  ambientReverb.wet.setValueAtTime(0, Tone.now());
  
  // 2. Bandpass filter: briefly kill lows
  masterFilter.frequency.setValueAtTime(2000, Tone.now());
  masterFilter.frequency.exponentialRampToValueAtTime(120, Tone.now() + 0.8);
  
  // 3. BitCrush drone briefly
  droneCrusher.bits.setValueAtTime(4, Tone.now());
  droneCrusher.bits.linearRampToValueAtTime(16, Tone.now() + 0.5);
  
  // 4. Entry chime with pitch drop
  const entrySynth = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4 });
  entrySynth.triggerAttackRelease('C6', '16n');
  
  // 5. Restore reverb (walls expanding)
  ambientReverb.wet.linearRampToValueAtTime(0.6, Tone.now() + 2.0);
}
```

### Node Click / Feature Selection
```typescript
function selectFeature(featureId: number) {
  // Rapid pitch drop through BitCrusher = "data lock"
  const clickSynth = synthPool[0]; // Borrow from pool
  clickSynth.triggerAttackRelease('C6', '32n');
  
  // Duck ambient drone -6dB for 200ms = momentary vacuum of focus
  droneSynth.volume.setTargetAtTime(
    droneSynth.volume.value - 6, Tone.now(), 0.01
  );
  setTimeout(() => {
    droneSynth.volume.setTargetAtTime(
      droneSynth.volume.value + 6, Tone.now(), 0.1
    );
  }, 200);
}
```

## God Mode Power Fantasy — Scale Sounds

The ablation moment should make the user feel POWERFUL. Not scared (that's LARYNX). POWERFUL.

### Scale Contrast Principle
Only the ablation death sound gets long reverb (4s decay). Every other sound is dry or short-reverb. This creates:
- UI sounds → intimate, personal, controlled
- Ablation → MASSIVE, cathedral-scale, consequential

The perceived "size" of the ablation event comes from the reverb contrast, not raw volume.

### Sub-Bass Impact (Revelation Moment)
```typescript
function triggerRevelation() {
  // MembraneSynth for sub-bass thud
  const impactSynth = new Tone.MembraneSynth({
    pitchDecay: 0.3,
    octaves: 4,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 1.5, sustain: 0, release: 2.0 }
  });
  
  // Missing fundamental: 65Hz fundamental with harmonics at 130/195/260/325Hz
  // Laptop plays harmonics, brain perceives the 65Hz bass
  
  // White noise burst: LPF sweeps 8kHz→200Hz over 3s = "collapse and rewiring"
  const collapseNoise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 3.0, sustain: 0, release: 0.5 }
  });
  const collapseFilter = new Tone.Filter(8000, 'lowpass');
  collapseFilter.frequency.exponentialRampToValueAtTime(200, Tone.now() + 3.0);
  
  impactSynth.connect(new Tone.Reverb({ decay: 4, wet: 0.7 })).connect(masterBus);
  collapseNoise.chain(collapseFilter, masterBus);
  
  impactSynth.triggerAttackRelease('C2', '1n');
  collapseNoise.triggerAttackRelease('2n');
}
```

### Aftermath: Clinical Purity
After the revelation (honest AI response), the sound should become PURE:
- Single sine oscillator, 2-4kHz
- Zero modulation, zero vibrato, zero chorus
- Mathematical truth contrasting ablation chaos
- "The noise is gone. What remains is clean."
