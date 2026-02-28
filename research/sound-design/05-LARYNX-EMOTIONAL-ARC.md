# LARYNX Sound Design — Complete Emotional Arc

> The full moment-by-moment sound script for the LARYNX demo

## The Narrative: Clinical Silence → Tension → Visceral Reveal → Resolution

```
TIME    EMOTION         AUDIO TECHNIQUE                    SCIENCE
─────────────────────────────────────────────────────────────────────

0:00    Authority        "Click to Enter" → AudioContext     First-impression framing
        Clinical trust   unlocks. 2.5kHz sine ping.          Earcon = medical device
                         120Hz triangle drone at -20dB.       authority. Low = gravity.

0:10    Engagement       File drop → pitch-randomized        Juice principle:
        Satisfaction     "thunk" (±80 cents per play).        randomization prevents
                         3-layer: transient + mid + low.      habituation.

0:20    Anticipation     Square wave ticking clock at         Dunkirk technique.
        Building tension 60 BPM. Processing Mel spectrogram.  Entrainment → heartbeat
                         Ambient drone FADES OUT (not up).    sync. Acoustic vacuum =
                                                              judges lean in.

0:40    Escalation       Ticking BPM ramps 60→120 (log).     Accelerating pulse =
        Anxiety          White noise riser, filter sweep      sympathetic nervous
                         50→8kHz over 5 seconds.              system activation.

0:55    Dread            Ticking stops. Noise riser cuts.     250ms silence removes
        Anticipation     250ms TOTAL SILENCE.                 masking threshold.
                         ─── nothing ───                      Next sound perceived
                                                              6-10dB louder.

0:56    SHOCK            ══ DEEPFAKE DETECTED ══             Startle reflex (<10ms
        Visceral alarm   Sawtooth minor 2nd (C3+C#3).        onset, >15dB jump).
                         MembraneSynth sub-impact.            Amygdala activation via
                         Pink noise burst. Screen shake.      non-linear acoustics
                         All at 0dB (20dB jump from -20).     (Blumstein 2012).

1:00    Body horror      3D head appears. Velocity ribbons.   Kuleshov Effect:
        Fascination      Tone.js distortion = f(velocity).    same visual + horror
                         Normal: clean sine (15 cm/s).        audio = body horror.
                         Fake: crushed sawtooth (80+ cm/s).   Data-reactive =
                         Filter: 400 + velocity*50 Hz.        engineering flex.

1:30    Uncanny valley   Tongue clips through skull.          Non-integer harmonicity
        Wrongness        FMSynth(harmonicity: 3.14).          = metallic "wrongness"
                         19Hz AM modulation on 150Hz          (auditory uncanny valley).
                         triangle = infrasonic flutter.       Vic Tandy infrasound
                         AutoPanner 8Hz = spatial disorientation.  proxy.

2:00    Resolution       Genuine voice comparison.            Major key shift = safety
        Relief/awe       Major 3rd chime (C4+E4 sine).       signal. Perfect fifth =
                         Drone shifts to perfect 5th (C+G).   harmonic resolution.
                         Volume settles to -15dB.             Parasympathetic
                         Smooth green ribbons = gentle hum.    activation (relaxation).

2:20    Authority        ElevenLabs narration:                "A voice telling you
        (closing)        "A real tongue moves at 12 cm/s.     about voice forensics"
                         This voice required 187."             = meta-level resonance.
                         Clinical sine returns.                Bookend framing.
```

## Sound Moment Inventory

| # | Moment | Type | Sound | Emotion Target | Frequency Range | Tone.js Synth |
|---|--------|------|-------|---------------|-----------------|---------------|
| 1 | Click to Enter | UI Earcon | 2.5kHz sine ping, short decay | Authority, clinical | 2.5 kHz | Synth (sine) |
| 2 | Ambient start | Background | 120Hz triangle drone | Gravity, presence | 120 Hz | Oscillator (triangle) |
| 3 | File upload | UI Earcon | 3-layer thunk (transient + mid + low) | Satisfaction, "juice" | 200 Hz + 1 kHz + 5 kHz | Sprite sheet |
| 4 | Processing starts | Rhythmic | Square wave tick at 60 BPM | Clinical anticipation | 200 Hz + 4 kHz harmonics | MetalSynth |
| 5 | Ambient duck | Background | Drone fades from -20dB to -40dB | Acoustic vacuum | 120 Hz (fading) | Volume ramp |
| 6 | BPM acceleration | Rhythmic | Ticking 60→140 BPM | Anxiety, urgency | Same as #4 | Transport.bpm.rampTo |
| 7 | Noise riser | Transition | White noise, filter 50→8kHz | Escalation | Broadband | Noise + Filter |
| 8 | Silence | — | 250ms total silence | Dread, anticipation | — | All stop |
| 9 | THE STING | Impact | 3 layers: sub + dissonant sawtooth + noise burst | SHOCK | 65-260 Hz + 130-139 Hz + 8 kHz+ | MembraneSynth + FatOsc + NoiseSynth |
| 10 | Fake sidechain | Effect | Ambient instant duck + 4s recovery | Aftermath isolation | — | gain.rampTo |
| 11 | Velocity normal | Spatial/Reactive | Clean sine, low distortion | Clinical, safe | 80-200 Hz | FMSynth (clean) |
| 12 | Velocity extreme | Spatial/Reactive | Crushed sawtooth, high distortion | Body horror | 400-10 kHz (open filter) | FMSynth (distorted) |
| 13 | Tongue clip | Spatial/Reactive | FMSynth(3.14) + 19Hz AM mod + AutoPanner | Uncanny valley | 150 Hz + metallic harmonics | FMSynth + LFO |
| 14 | Genuine chime | Resolution | Major 3rd (C4+E4 sine), 1s release | Relief, truth | 262 + 330 Hz | Synth (sine) |
| 15 | Genuine drone | Background | Perfect 5th (C3+G3) | Safety, resolution | 130 + 196 Hz | Oscillator pair |
| 16 | Narration | Voice | ElevenLabs TTS, "forensic analyst" | Authority, closure | Speech band | ElevenLabs API |

## Priority Implementation

| Priority | Items | Total Time | Minimum Viable? |
|----------|-------|-----------|-----------------|
| **P0** | SoundProvider + AudioContext unlock + mute toggle + sprite sheet (#1-3) | 1h | ✅ |
| **P1** | Ambient drone + ticking clock + noise riser + silence + THE STING (#2,4-10) | 1.5h | ✅ (the "wow") |
| **P2** | Velocity-reactive distortion + FMSynth spatial (#11-13) | 1.5h | Engineering flex |
| **P3** | ElevenLabs narration + genuine resolution sounds (#14-16) | 50min | Polish |

**Minimum Viable Wow = P0 + P1 = ~2.5 hours**
**Full Audio Experience = P0–P3 = ~4.5 hours**
