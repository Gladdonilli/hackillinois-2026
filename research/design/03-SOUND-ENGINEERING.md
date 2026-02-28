# Sound Engineering — Medical & Forensic Instrument Sonification

**Date:** 2026-02-28
**Purpose:** Engineering specs for sound design based on real medical/forensic instruments. Replace theatrical sci-fi audio with functional instrument sonification.

---

## IEC 60601-1-8 — International Medical Alarm Standard

The literal engineering specification for "how sound communicates danger in medical instruments."

### Core Parameters

| Parameter | Specification |
|-----------|--------------|
| Base frequency (f₀) | 150-1000 Hz |
| Harmonics | MUST contain ≥4 harmonics within 300-4000 Hz |
| Pure sine tones | **FORBIDDEN** — missing fundamental technique ensures audibility through room masking |
| Pulse duration | 75-200ms |
| Rise/fall time | 10-20% of pulse duration |
| Minimum SPL | 45 dBA at 1m (must be audible over ambient) |

### Priority Levels

#### Low Priority
- 1-2 pulses
- Interval: >15 seconds
- Pattern: `[P]` or `[P]---[P]`
- Use: Background monitoring confirmed

#### Medium Priority
- 3-pulse burst
- Interval: <15 seconds
- Pattern: `[P]-150ms-[P]-150ms-[P]`
- Use: Attention needed, not critical

#### High Priority (LARYNX violation)
- 10-pulse burst
- Interval: <10 seconds
- Pattern: `[P][P][P]--400ms--[P][P]-----2.0s-----[P][P][P]--400ms--[P][P]`
- **Uneven rhythm is INTENTIONAL** — prevents habituation (the brain stops noticing even rhythms)
- Use: Immediate action required

### Implementation for Tone.js

```typescript
// IEC-compliant alarm tone (high priority)
function createMedicalAlarm() {
  const f0 = 440; // Hz — base frequency
  // ≥4 harmonics (pure sine forbidden)
  const harmonics = [f0, f0 * 2, f0 * 3, f0 * 4, f0 * 5];
  const amplitudes = [1.0, 0.7, 0.5, 0.3, 0.2];

  // Pulse: 100ms duration, 15ms rise/fall
  // High priority rhythm: [PPP]--400ms--[PP]-----2s-----[PPP]--400ms--[PP]
}
```

---

## Geiger Counter Sonification

The most famous example of "data → sound that creates dread."

### Why It Works

1. **Discrete stochastic sonification:** Each event = broadband click <5ms
2. **Baseline:** Random sparse clicks at 1-2 Hz = "monitoring, everything normal"
3. **Escalation:** As radiation increases, click rate increases proportionally
4. **The magic threshold:** When click rate crosses **15-20 Hz**, individual clicks **merge into continuous crackle**
5. **Acoustic roughness** (the crackle) directly stimulates the **amygdala** — bypasses cognition
6. You feel dread BEFORE you consciously understand why

### Application to LARYNX Velocity

| Velocity | Click Rate | Perception |
|----------|-----------|------------|
| <20 cm/s (normal) | 1-3 Hz | Sparse, calm monitoring clicks |
| 20-50 cm/s (elevated) | 5-10 Hz | Noticeable acceleration |
| 50-100 cm/s (warning) | 10-15 Hz | Rapid, concerning |
| 100-150 cm/s (critical) | 15-25 Hz | Clicks merge → continuous crackle |
| >150 cm/s (violation) | 25+ Hz | Harsh, buzzing crackle — amygdala activation |

### Implementation

```typescript
// Velocity-mapped Geiger clicks
function mapVelocityToClickRate(velocity: number): number {
  if (velocity < 20) return 1 + (velocity / 20) * 2; // 1-3 Hz
  if (velocity < 50) return 3 + ((velocity - 20) / 30) * 7; // 3-10 Hz
  if (velocity < 100) return 10 + ((velocity - 50) / 50) * 5; // 10-15 Hz
  if (velocity < 150) return 15 + ((velocity - 100) / 50) * 10; // 15-25 Hz
  return 25 + ((velocity - 150) / 50) * 15; // 25-40 Hz
}

// Each click: broadband noise burst <5ms
function triggerGeigerClick() {
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.004, sustain: 0, release: 0.001 }
  });
  noise.triggerAttackRelease('4n');
}
```

---

## Pulse Oximeter — Pitch Drop = Anxiety

### How It Works

- 100% SpO₂ → C5 (~523 Hz)
- Each 1-2% drop → one **semitone** drop in pitch
- At 85% SpO₂ → pitch is around middle C (~262 Hz)
- Anxiety comes from the **delta** (pitch change), not the absolute pitch
- **Pre-attentive signaling** — surgeons detect drops before consciously checking the monitor

### Application to LARYNX Formant Deviation

Map formant deviation from expected values to pitch:
- Normal formants (within 10% of expected) → stable pitch ~440 Hz
- As formant deviation increases → pitch drops one semitone per 5% deviation
- At maximum deviation → pitch reaches ~200 Hz (deeply unsettling)

```typescript
// Map formant deviation to semitone offset
function deviationToPitch(deviationPercent: number): number {
  const basePitch = 440; // Hz (A4)
  const semitonesDown = Math.floor(deviationPercent / 5);
  return basePitch * Math.pow(2, -semitonesDown / 12);
}
```

### The Power of Pitch Memory

Operating room staff develop unconscious pitch memory — they know exactly what "100% SpO₂" sounds like, so any pitch drop triggers immediate attention without looking at the monitor. For a 3-minute demo, this won't develop, but the *direction* of pitch change (dropping = bad) is universally understood.

---

## Sonar / Radar Ping

### Technical Spec

- Frequency: 1-3 kHz sine or triangle wave
- Attack: sharp, <10ms
- Decay: exponential, 500-1500ms
- Interval: exactly one ping every 2000ms
- Authority comes from **mathematical precision** — exactly periodic, unnervingly regular

### Application to LARYNX

The analysis "scanning" phase could use a sonar-like periodic ping:
- One clean ping every 2000ms during formant extraction
- Sine at 1200 Hz, 8ms attack, 800ms exponential decay
- Volume: -18dB (present but not intrusive)
- As analysis finds anomalies → ping interval shortens (2000ms → 1500ms → 1000ms)

---

## TCAS — Traffic Collision Avoidance System

### Escalation Layers

| Level | Audio | Meaning |
|-------|-------|---------|
| TA (Traffic Advisory) | "Traffic, Traffic" — calm, neutral tone | Awareness only |
| RA (Resolution Advisory) | "Climb, Climb" / "Descend, Descend" — higher urgency, faster repetition | Take action |
| Increased RA | "INCREASE CLIMB" — maximum urgency | Immediate response |

### Design Principle

**Direct semantic instruction, not abstract tones.** Zero cognitive translation needed. The pilot doesn't have to interpret a beep pattern — the system tells them exactly what to do.

### Application to LARYNX

For the verdict moment, consider a synthesized voice:
- "KINEMATIC VIOLATION DETECTED" — flat, clinical, synthesized (not human)
- Single statement, not repeated
- Arrives simultaneously with the visual snap

---

## ICAD Best Practices (International Community for Auditory Display)

| Principle | Rule | LARYNX Application |
|-----------|------|---------------------|
| Polarity | velocity↑ = pitch↑, click rate↑, brighter filter | Velocity maps to Geiger click rate + filter brightness |
| Earcons over icons | Use structured synthetic tones, NOT literal sounds | Kill portal sweeps, warp transitions, glass breaking |
| Silence = safe | **Continuous ambient drones mask data signals** + cause listening fatigue | Kill the drone. Silence during normal analysis. |
| SOC fatigue | Routine = quiet (-35dB). Only violations break to alerting (-10dB) | Background monitoring at -35dB, violation at -5dB |
| Heartbeat disruption | Steady rhythm = biologically "safe." Jitter >50ms = sympathetic nervous system response | Analysis ticking: steady 60 BPM. Fake detected: jitter/arrhythmia |

---

## SoundEngine.ts — Kill/Keep/Add List

### Kill (Theatrical, Not Functional)

| Method | Reason |
|--------|--------|
| `startDrone()` / `startBackgroundLayer()` | ICAD: continuous drones mask data signals + cause fatigue |
| `playPortalEntry()` | Auditory icon (literal portal sound), not functional earcon |
| `playWarpTransition()` | Theatrical, zero data mapping |
| `startHorror()` | FMSynth horror chord — entertainment, not instrument |
| `playNoiseBurst()` | Decorative, no data mapping |

### Keep (Functional, Data-Mapped)

| Method | Why |
|--------|-----|
| `playDataPoint(velocity)` | Already maps velocity to pitch — refine to semitone scale |
| `triggerVerdictBuild(callback)` | Silence → slam structure is correct. Reduce the sub-rumble. |
| `playVerdict()` | Needs redesign but the concept (verdict = sound) is right |
| `startTicking()` / `stopTicking()` | Concept right, but make it sonar ping instead of MetalSynth |
| `updateVelocity()` | Core data → sound mapping, refine don't remove |

### Add (Engineering-Grade Sonification)

| Feature | Implementation |
|---------|---------------|
| **Geiger velocity clicks** | Map velocity to click rate (1-40 Hz). Broadband noise <5ms per click. |
| **IEC alarm burst** | 440Hz f₀ + 4 harmonics, 10-pulse uneven rhythm at violation |
| **Oximeter pitch** | Map formant deviation to semitone drops (440Hz base, 1 semitone per 5% deviation) |
| **Sonar scan ping** | 1200Hz sine, 8ms attack, 800ms decay, 2000ms interval during analysis |
| **Metronomic → arrhythmic** | Steady 60 BPM during analysis → jitter/arrhythmia when fake patterns detected |
| **Silence baseline** | Nothing playing when data is normal. Silence IS the sound of safety. |

---

## Volume Architecture

| Layer | Level | When |
|-------|-------|------|
| Silence | — | Default. Always. |
| Geiger monitoring clicks | -30dB | During analysis, velocity > 0 |
| Sonar scan ping | -18dB | During analysis, every 2000ms |
| Oximeter pitch | -22dB | Continuous during analysis, maps formant deviation |
| Ticking (metronomic) | -15dB | Analysis phase |
| **IEC alarm burst** | **-5dB** | Violation detected — the ONLY loud sound |
| **Verdict slam** | **-3dB** | Final verdict moment |
