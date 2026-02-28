# Psychoacoustics: Frequency, Waveform & Emotion Science

> Research compiled Feb 28, 2026 — LARYNX Sound Design

## Frequency → Emotion Map (Peer-Reviewed)

| Range | Frequency | Emotional Effect | Scientific Basis | LARYNX Application |
|-------|-----------|-----------------|------------------|-------------------|
| Infrasound | 18.98 Hz | Eyeball resonance, panic, "ghostly presence" | Vic Tandy (1998) — Coventry lab ghost caused by 18.98Hz standing wave from extraction fan | Can't reproduce on speakers. **Workaround**: 19Hz AM modulation (LFO tremolo) on 150Hz triangle carrier simulates the flutter/unease |
| Sub-bass | 20–60 Hz | Dread, physical pressure, visceral weight | NASA studies on infrasound-induced anxiety; film/theater subwoofers | Use **missing fundamental illusion** — play harmonics at 100/150/200Hz, brain perceives 50Hz that doesn't exist |
| Low | 60–250 Hz | Power, gravity, foreboding, authority | Correlates with large-animal vocalizations (evolutionary threat signal) | 110Hz (A2) sine for 3D head materialization — primal "large entity" signal |
| Low-mid | 250–500 Hz | Warmth OR muddiness | Speech fundamental range; context-dependent | Avoid for SFX — gets masked by crowd chatter in hackathon hall |
| Mid | 500 Hz–2 kHz | Aggression, urgency, nasality | Human scream range; alert vocalizations | Processing phase square wave ticking clock |
| Presence | 2–5 kHz | Alertness, clarity, "cuts through" | Ear canal resonance at 3–4kHz (Fletcher-Munson); **most sensitive human hearing range** | Scanner beeps at 2.5–3kHz pure sine — maximum perceived volume per watt |
| Brilliance | 5–12 kHz | Tension, metallic sharpness, excitement | Associated with breaking/tearing sounds; danger signals | High-pass filtered noise sweep for corruption/glitch reveal |
| Air | 12–20 kHz | Spaciousness, ethereal quality | Subtle; diminishes with age (presbycusis) | Post-reveal aftermath — airy pad signals "something has changed" |

## Waveform → Emotion

| Waveform | Harmonics | Emotional Quality | LARYNX Use |
|----------|-----------|-------------------|------------|
| **Sine** | Fundamental only | Pure, clinical, cold, scientific, sterile | GENUINE verdict — clean truth |
| **Triangle** | Odd harmonics, fast falloff | Soft, warm, organic, slightly hollow | Background drone, idle state |
| **Square** | Odd harmonics, equal amplitude | Mechanical, digital, hollow, retro | Processing/scanning ticking clock |
| **Sawtooth** | All harmonics, linear falloff | Aggressive, buzzy, scream-like, alarming | DEEPFAKE reveal — richest harmonic content = most alarming |
| **Pink noise** | Equal energy per octave | Entropy, dissolution, corruption, chaos | Tongue-through-skull violation |
| **White noise** | Equal energy per Hz | Static, hiss, digital corruption | Glitch burst, chromatic aberration moment |

**Why sawtooth for the reveal**: Sawtooth contains ALL harmonics (1st, 2nd, 3rd...) with linear amplitude falloff. This is the closest synthesized approximation to a human scream. Daniel Blumstein's research on non-linear acoustic phenomena (NLP) confirms: sounds with rich, chaotic harmonics trigger the amygdala's fight-or-flight response, bypassing conscious processing.

## Dissonance: The Devil's Interval and Roughness

- **Tritone** (augmented 4th / diminished 5th): Medieval name "diabolus in musica." Inherently unstable, wants to resolve. Use at moment of detection.
- **Minor 2nd** (semitone): Maximum dissonance in Western music. Two sawtooths at C3 (130.8Hz) + C#3 (138.6Hz) = 7.8Hz beating within the critical band = **maximally abrasive roughness**. The brain cannot separate them, perceives grinding.
- **Roughness formula**: Two tones within 15–25% of a critical band = peak roughness. At 440Hz, critical band ≈ 110Hz. So 440Hz + 465Hz (25Hz difference) = peak roughness.

**Applied**: Deepfake reveal = sawtooth minor 2nd (C3+C#3). The 7.8Hz beating creates involuntary discomfort that requires zero explanation to judges.

## Temporal Patterns: Rhythm as Anxiety

| Pattern | BPM/Timing | Effect | Mechanism | LARYNX Phase |
|---------|------------|--------|-----------|-------------|
| Resting heartbeat | 60–72 BPM | Calm, clinical baseline | Entrainment — listener's heart rate syncs | Upload/idle |
| Accelerating pulse | 60 → 140 BPM (log curve) | Rising anxiety, urgency | Breaks entrainment, sympathetic nervous system activation | Mel spectrogram processing |
| **250ms total silence** | — | Shock, dread, "something's coming" | Removes masking threshold — next sound is perceived 6–10dB louder | **Immediately before deepfake verdict** |
| Irregular rhythm | Random ±30% timing jitter | Unease, unpredictability | Brain cannot predict pattern — stays alert (orienting response) | Tongue velocity data stream |
| Metronomic precision | Fixed intervals, zero jitter | Relentless, mechanical, inhuman | Dunkirk ticking clock (Zimmer) — "you can't stop it" | Processing phase |

**The Jump Scare Principle**: 250ms of TOTAL silence before a dissonant blast removes the ear's masking threshold. The first sound after silence is perceived 6–10dB louder than it actually is. This is how every horror movie stinger works.

## The Autonomic Nervous System: Bypassing Conscious Processing

Blumstein et al. (2012, *Biology Letters*) demonstrated that non-linear acoustic phenomena — noise bursts, frequency jumps, subharmonics, and deterministic chaos — activate the amygdala directly, producing arousal responses (galvanic skin response + increased heart rate) even when subjects are told the sounds are synthetic.

### Applicable Techniques

1. **Frequency modulation (FM screams)**: Rapid pitch oscillation (400–800 cents vibrato) mimics alarm calls. `Tone.Vibrato` or `FMSynth` with high modulationIndex.
2. **Roughness (beating within critical band)**: Two close frequencies create grinding interference. Involuntary discomfort.
3. **Sudden onset (startle reflex)**: Attack time < 10ms + >15dB jump from ambient = acoustic startle reflex. Brainstem response, 30–50ms latency, cannot be suppressed.
4. **Non-integer harmonicity**: `FMSynth({harmonicity: 3.14})` — non-integer ratio produces inharmonic, metallic, "wrong" timbre. Bell-like but corrupted. The auditory equivalent of the uncanny valley.

## Spatial Audio

- **Binaural beats**: DO NOT WORK on speakers (crosstalk). Skip.
- **Amplitude panning**: WORKS on speakers. `Tone.AutoPanner` at 8Hz during glitch → disorients listener.
- **Shepard tone**: 3 oscillators spaced octaves apart, continuous downward sweep with crossfade → bottomless dread. Use during descent into throat/larynx visualization.

## Key Research Citations

- Vic Tandy & Tony R. Lawrence (1998). "The Ghost in the Machine" — *Journal of the Society for Psychical Research*
- Daniel T. Blumstein et al. (2012). "Do film soundtracks contain nonlinear analogues to influence emotion?" — *Biology Letters*
- Schouten (1940), Licklider (1954), Patterson (1973) — Missing fundamental illusion
- Fletcher & Munson (1933). "Loudness, its definition, measurement and calculation" — *JASA*
- ISO 226:2003 — Equal-loudness contours (supersedes Fletcher-Munson)
