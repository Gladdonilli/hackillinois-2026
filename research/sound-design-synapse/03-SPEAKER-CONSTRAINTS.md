# SYNAPSE Speaker Constraints & Hackathon Audio Survival

> SYNAPSE-specific audio delivery optimization — Feb 28, 2026
> Builds on LARYNX sound-design/02-SPEAKER-CONSTRAINTS.md shared research

## Environment Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| Ambient noise floor | 65-80dB SPL | Typical hackathon expo hall |
| Dominant masking band | 200-2000Hz (speech) | Crowd conversation |
| Laptop speaker response | 200Hz+ (Windows), 80Hz+ (MacBook) | Typical consumer hardware |
| Speaker separation | 10-20cm | Laptop stereo |
| Demo listening distance | 2-4ft | Judge standing at table |
| Demo SPL target | 70-80dB (laptop max) | Competing with 65-80dB floor |

## SYNAPSE-Specific Challenges

### 1. Transient Reproduction (Neural Clicks)

**Problem**: SYNAPSE uses rapid neural click sounds (synaptic firing). Laptop DSP has lookahead limiters that swallow true 2-5ms transients — they get smeared into mush.

**Solution**:
```
Original: MembraneSynth attack=0.001s, decay=0.03s
Laptop-safe: attack=0.015s, decay=0.03s + layered 3kHz sine "ping" (20ms decay)
```

The sine ping acts as a spectral anchor — even if the noise transient is smeared by DSP, the pure tone "ping" at 3kHz survives intact. 3kHz sits in the laptop speaker's resonant sweet spot.

**Implementation**:
```typescript
// Layer a sine ping on every neuron click
const clickPing = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 }
});
// Trigger simultaneously with MembraneSynth click
```

### 2. Drone Survival in Crowd Noise

**Problem**: Neural ambient drone (originally 80-200Hz) is doubly doomed — laptop speakers can't reproduce it AND crowd noise masks it.

**Solution**:
| Original Design | Hackathon-Safe Design |
|---|---|
| Carrier at 150Hz | Carrier at 300-450Hz |
| Pure drone | Missing fundamental partials + timbral motion |
| Static tone | 0.2Hz filter sweep across 3-6kHz |

**Why timbral motion**: Human ear detects CHANGE in noise better than static tones. A slowly sweeping filter (0.2Hz = 5sec cycle) creates a shimmering quality that cuts through speech-band masking.

```typescript
const droneFilter = new Tone.Filter(3000, 'bandpass', -12);
const filterSweep = new Tone.LFO(0.2, 3000, 6000);
filterSweep.connect(droneFilter.frequency);
filterSweep.start();
```

### 3. Stereo Imaging Collapse

**Problem**: Laptop speakers 10-20cm apart → stereo image collapses to mono at 2-3ft.

**Impact on SYNAPSE**: Panner3D spatial audio (mapping 3D node positions to L/R panning) is nearly imperceptible. Subtle 30% pans don't translate at all.

**Solutions**:
| Technique | How | Effectiveness |
|---|---|---|
| Hard pan only | 100% L or 100% R (no intermediate) | Barely perceptible but detectable |
| Haas Effect | Duplicate + delay R by 15-25ms | Perceived width from time difference |
| Volume + filter | Peripheral nodes = lower volume + LPF | "Distance" without panning |
| Abandon spatial | Route everything to stereo master | Simplest, most reliable |

**Recommendation**: Use Haas Effect for the ONE most prominent sound (pathway activation) and abandon spatial for everything else. Don't waste CPU on Panner3D for inaudible spatial effects.

### 4. Dynamic Range in 65dB Ambient

**The SYNAPSE dynamic range problem is DIFFERENT from LARYNX**:
- LARYNX: Horror lean-in → silence → loud reveal (amplitude-based contrast)
- SYNAPSE: Clinical precision → power escalation → revelation (needs quiet moments for "precision" feel)

**But amplitude-quiet disappears under 65dB noise floor.**

**Solution: Bandwidth = Volume** (keep RMS constant, use spectral width for dynamics)

| "Quiet" (Precision) | "Loud" (Power/Revelation) |
|---|---|
| Heavy LPF cutting above 800Hz | Snap filter open to 10kHz instantly |
| Audio sounds muffled/distant | Full presence range activation |
| Same RMS level (-15dB) | Same RMS level (-15dB) |
| Perceived as controlled/focused | Perceived as HUGE dynamic jump |

```typescript
// "Quiet" precision mode
masterEQ.high.value = -18;  // Kill presence range
masterEQ.mid.value = -6;    // Scoop mids

// "Loud" revelation mode
masterEQ.high.value = +3;   // Presence boost (instant)
masterEQ.mid.value = 0;     // Restore mids
```

**Why this works**: 2-8kHz presence range activation triggers alertness/arousal (Fletcher-Munson). At 60-75dB demo SPL, perceived loudness change from spectral shift > perceived loudness change from 6dB amplitude boost.

### 5. Bluetooth Speaker Latency

**Problem**: SBC/AAC codecs add 150-250ms unavoidable transmission + DSP latency. This destroys the psychomotor illusion of data-reactive audio (slider drag → sound feels broken, not responsive).

**Verdict**: **Mandate wired 3.5mm aux for any external speakers.**

| Connection | Latency | SYNAPSE Viable? |
|---|---|---|
| Laptop speakers (direct) | <5ms | ✅ Yes |
| 3.5mm wired aux | <5ms | ✅ Yes |
| USB-C audio adapter | <10ms | ✅ Yes |
| Bluetooth SBC | 150-250ms | ❌ No |
| Bluetooth aptX | 80-120ms | ❌ Borderline |
| Bluetooth aptX LL | 30-40ms | ⚠️ Acceptable if available |

**Demo day rule**: If judges bring Bluetooth speakers, politely decline and use laptop speakers. 200ms lag on the ablation slider will make the demo feel broken.

## Frequency Budget Summary

| Sound | Design Freq | Speaker-Safe Freq | Technique |
|---|---|---|---|
| Neural clicks | 4-8kHz | 3-5kHz + sine ping | Spectral anchor |
| Ambient drone | 150Hz | 300-450Hz carrier | Missing fundamental + timbral sweep |
| Ablation snap | 3kHz→20Hz | 3kHz→200Hz | Skip sub-bass tail on laptop |
| Pathway fire | 500Hz-2.5kHz | 500Hz-2.5kHz | Naturally safe |
| Cluster zoom | Pink noise wideband | HPF at 200Hz on noise | Prevent IMD |
| Regen clicks | 1-3kHz | 1-3kHz | Naturally safe |
| Ablation slider | 80-800Hz | 200-800Hz | HPF on master bus |
| Spectral formant | 65Hz C2 + 32 partials | 200Hz+ partials only | Zero fundamental energy |

## Master Bus (Hackathon-Safe)

```typescript
const masterBus = new Tone.Channel();
masterBus.chain(
  new Tone.Compressor({ threshold: -12, ratio: 4, attack: 0.01, release: 0.1 }),
  new Tone.Filter(120, 'highpass', -24),     // Kill everything below 120Hz
  new Tone.EQ3({ low: -3, mid: 0, high: +2 }),  // Slight presence boost
  new Tone.Limiter(-1),                       // Brick wall at -1dB
  Tone.Destination
);
```

**Non-negotiable**: HPF at 120Hz + Limiter. Without these, laptop speakers produce IMD distortion (cone farting) on any sub-bass content, which sounds amateur and breaks immersion.
