import * as Tone from 'tone'

// AudioContext is created lazily by Tone.start() inside SoundEngine.init(),
// which is called only after a user gesture (click/keydown). No eager context needed.
type VerdictResult = 'genuine' | 'deepfake'

// ══════════════════════════════════════════════════════════════════════════════
// State flags
// ══════════════════════════════════════════════════════════════════════════════
let initialized = false
let ambientOscsStarted = false
let bgLayersStarted = false
let tensionPadStarted = false
let oximeterStarted = false
let portalSubStarted = false
let verdictSubStarted = false

// ══════════════════════════════════════════════════════════════════════════════
// Master bus chain: Compressor → Reverb → EQ3 → HPF → Limiter → Volume → Dest
// ══════════════════════════════════════════════════════════════════════════════
let masterCompressor: Tone.Compressor | null = null
let masterReverb: Tone.Reverb | null = null
let masterEq: Tone.EQ3 | null = null
let masterHighpass: Tone.Filter | null = null
let masterLimiter: Tone.Limiter | null = null
let masterBus: Tone.Volume | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Ambient drone (triangle + sine, LFO-modulated)
// ══════════════════════════════════════════════════════════════════════════════
let ambientOsc: Tone.Oscillator | null = null
let ambientGain: Tone.Gain | null = null
let ambientLfo: Tone.LFO | null = null
let ambientOsc2: Tone.Oscillator | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Background ambient layer (3 detuned sines)
// ══════════════════════════════════════════════════════════════════════════════
let bgLayer1: Tone.Oscillator | null = null
let bgLayer2: Tone.Oscillator | null = null
let bgLayer3: Tone.Oscillator | null = null
let bgLayerGain: Tone.Gain | null = null
let bgLayerLfo: Tone.LFO | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Upload sounds
// ══════════════════════════════════════════════════════════════════════════════
let uploadSine: Tone.Synth | null = null
let uploadAM: Tone.AMSynth | null = null
let uploadMembrane: Tone.MembraneSynth | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Riser
// ══════════════════════════════════════════════════════════════════════════════
let riserNoise: Tone.Noise | null = null
let riserFilter: Tone.Filter | null = null
let riserVolume: Tone.Volume | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Impact
// ══════════════════════════════════════════════════════════════════════════════
let subImpact: Tone.MembraneSynth | null = null
let noiseBurst: Tone.NoiseSynth | null = null
let noiseBurstFilter: Tone.Filter | null = null

// ══════════════════════════════════════════════════════════════════════════════
// IEC 60601-1-8 compliant alarm
// ══════════════════════════════════════════════════════════════════════════════
let iecAlarmSynth: Tone.Synth | null = null
let iecAlarmGain: Tone.Gain | null = null
let iecAlarmLoop: Tone.Loop | null = null
let iecAlarmActive = false

// ══════════════════════════════════════════════════════════════════════════════
// Scanner / ticking (analysis heartbeat)
// ══════════════════════════════════════════════════════════════════════════════
let scannerBeepSynth: Tone.FMSynth | null = null
let processingTickSynth: Tone.MetalSynth | null = null
let processingTickLoop: Tone.Loop | null = null
let tickingActive = false

// ══════════════════════════════════════════════════════════════════════════════
// Analysis tension pad (filtered sawtooth, slowly opens)
// ══════════════════════════════════════════════════════════════════════════════
let tensionPad: Tone.Oscillator | null = null
let tensionFilter: Tone.Filter | null = null
let tensionGain: Tone.Gain | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Verdict stings
// ══════════════════════════════════════════════════════════════════════════════
let genuineStingSynth: Tone.PolySynth | null = null
let deepfakeStingSynth: Tone.PolySynth | null = null
let deepfakeDistortion: Tone.Distortion | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Genuine resolution pad (warm Cmaj7 triangle)
// ══════════════════════════════════════════════════════════════════════════════
let genuinePad: Tone.PolySynth | null = null
let genuinePadFilter: Tone.Filter | null = null
let genuinePadGain: Tone.Gain | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Geiger counter velocity sonification
// Uses Tone.Loop on Transport for drift-free timing (was setTimeout — BUG FIX)
// ══════════════════════════════════════════════════════════════════════════════
let geigerSynth: Tone.NoiseSynth | null = null
let geigerFilter: Tone.Filter | null = null
let geigerGain: Tone.Gain | null = null
let geigerLoop: Tone.Loop | null = null
let geigerActive = false

// ══════════════════════════════════════════════════════════════════════════════
// Oximeter pitch mapping (formant deviation → semitone drops)
// ══════════════════════════════════════════════════════════════════════════════
let oximeterOsc: Tone.Oscillator | null = null
let oximeterGain: Tone.Gain | null = null
let oximeterBasePitch = 523  // C5

// ══════════════════════════════════════════════════════════════════════════════
// Portal entry SFX
// ══════════════════════════════════════════════════════════════════════════════
let portalMembrane: Tone.MembraneSynth | null = null
let portalSub: Tone.Oscillator | null = null
let portalSubGain: Tone.Gain | null = null
let portalFilter: Tone.Filter | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Warp transition SFX
// ══════════════════════════════════════════════════════════════════════════════
let warpNoise: Tone.NoiseSynth | null = null
let warpFilter: Tone.Filter | null = null
let warpChirp: Tone.Synth | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Scan sweep SFX
// ══════════════════════════════════════════════════════════════════════════════
let scanSweepSynth: Tone.FMSynth | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Verdict sub rumble
// ══════════════════════════════════════════════════════════════════════════════
let verdictSub: Tone.Oscillator | null = null
let verdictSubGain: Tone.Gain | null = null

// ══════════════════════════════════════════════════════════════════════════════
// Generative soundtrack — state-aware music system
// Modes: 'idle' (dark minor arpeggios), 'analyzing' (tense rising),
//        'comparing'/'technical'/'closing' (ambient resolution)
// ══════════════════════════════════════════════════════════════════════════════
let soundtrackSynth: Tone.PolySynth | null = null
let soundtrackBassSynth: Tone.Synth | null = null
let soundtrackFilter: Tone.Filter | null = null
let soundtrackGain: Tone.Gain | null = null
let soundtrackLoop: Tone.Loop | null = null
let soundtrackChordIndex = 0
let soundtrackActive = false
type SoundtrackMode = 'idle' | 'analyzing' | 'demoflow' | 'verdict-genuine' | 'verdict-deepfake'
let soundtrackMode: SoundtrackMode = 'idle'

// ══════════════════════════════════════════════════════════════════════════════
// Acoustic vacuum state
// ══════════════════════════════════════════════════════════════════════════════
let vacuumActive = false
let preVacuumAmbientGain = 0
let preVacuumBgGain = 0
let preVacuumTensionGain = 0
let preVacuumSoundtrackGain = 0

// ══════════════════════════════════════════════════════════════════════════════
// Constants & timers
// ══════════════════════════════════════════════════════════════════════════════
const MIN_MASTER_GAIN = 0.0001
const DEFAULT_TICK_BPM = 60
const IEC_BASE_FREQ = 440  // A4 — IEC 60601-1-8 alarm base
let tickJitterActive = false
let tickJitterTimer: ReturnType<typeof setTimeout> | null = null
const pendingTimers = new Set<ReturnType<typeof setTimeout>>()
let revealSequenceActive = false

// ══════════════════════════════════════════════════════════════════════════════
// Soundtrack chord progressions by mode
// ══════════════════════════════════════════════════════════════════════════════
const SOUNDTRACK_CHORDS: Record<SoundtrackMode, { chords: string[][]; bass: string[]; tempo: string; filterRange: [number, number] }> = {
  idle: {
    chords: [
      ['A2', 'C3', 'E3'],      // Am
      ['D2', 'F3', 'A3'],      // Dm
      ['E2', 'G#3', 'B3'],     // E (dominant)
      ['A2', 'C3', 'E3'],      // Am (return)
    ],
    bass: ['A1', 'D1', 'E1', 'A1'],
    tempo: '2m',
    filterRange: [400, 900],
  },
  analyzing: {
    chords: [
      ['A2', 'C3', 'E3'],      // Am — tension
      ['F2', 'Ab3', 'C3'],     // Fm — unease
      ['E2', 'G#3', 'B3'],     // E — pull
      ['D2', 'F3', 'Ab3'],     // Ddim — dread
    ],
    bass: ['A1', 'F1', 'E1', 'D1'],
    tempo: '1m',               // faster cycle — urgency
    filterRange: [300, 1200],
  },
  demoflow: {
    chords: [
      ['C3', 'E3', 'G3'],      // C — clarity
      ['A2', 'C3', 'E3'],      // Am — reflection
      ['F2', 'A3', 'C3'],      // F — warmth
      ['G2', 'B3', 'D3'],      // G — resolve
    ],
    bass: ['C1', 'A1', 'F1', 'G1'],
    tempo: '2m',
    filterRange: [500, 1500],
  },
  'verdict-genuine': {
    chords: [
      ['C3', 'E3', 'G3', 'B3'],  // Cmaj7 — relief
      ['F3', 'A3', 'C4'],        // F — warm resolve
      ['G3', 'B3', 'D4'],        // G — bright
      ['C3', 'E3', 'G3'],        // C — home
    ],
    bass: ['C1', 'F1', 'G1', 'C1'],
    tempo: '2m',
    filterRange: [600, 2000],
  },
  'verdict-deepfake': {
    chords: [
      ['C3', 'Eb3', 'Gb3'],      // Cdim — alarm
      ['Bb2', 'Db3', 'E3'],      // Bbdim — tension
      ['Ab2', 'C3', 'Eb3'],      // Abm — dread
      ['G2', 'B3', 'D3'],        // G — unresolved
    ],
    bass: ['C1', 'Bb1', 'Ab1', 'G1'],
    tempo: '1m',
    filterRange: [200, 800],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// Utility functions
// ══════════════════════════════════════════════════════════════════════════════
type SchedulableParam = {
  cancelAndHoldAtTime?: (time: number) => void
  setTargetAtTime: (value: number, startTime: number, timeConstant: number) => void
}

const scheduleTimer = (callback: () => void, delayMs: number): ReturnType<typeof setTimeout> => {
  const id = setTimeout(() => {
    pendingTimers.delete(id)
    callback()
  }, delayMs)
  pendingTimers.add(id)
  return id
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const clearAllTimers = (): void => {
  for (const id of pendingTimers) {
    clearTimeout(id)
  }
  pendingTimers.clear()
  if (tickJitterTimer) {
    clearTimeout(tickJitterTimer)
    tickJitterTimer = null
  }
}

type StoppableSource = {
  state: 'started' | 'stopped'
  stop: (time?: number) => void
}

const stopIfStarted = (source: StoppableSource | null | undefined): void => {
  if (!source) return
  if (source.state === 'started') {
    source.stop()
  }
}

const holdAndSetTarget = (
  param: SchedulableParam | null | undefined,
  value: number,
  now: number,
  timeConstant: number
): void => {
  if (!param) return
  param.cancelAndHoldAtTime?.(now)
  param.setTargetAtTime(value, now, timeConstant)
}

const contextIsRunning = (): boolean => Tone.getContext().state === 'running'

const requireAudioReady = (): boolean => {
  if (!initialized) return false
  return contextIsRunning()
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

// ══════════════════════════════════════════════════════════════════════════════
// Audio graph initialization
//
// Volume normalization: all synths target -20dB baseline, ±5dB for relative
// balance. Previous range was -5dB to -40dB (35dB spread) — now normalized.
//
// Volume tiers:
//   -15dB  = prominent (stings, impacts, alarms)
//   -18dB  = standard (beeps, scans, uploads)
//   -20dB  = background (pads, noises, geiger)
//   -22dB  = subtle (ambient layers, oximeter)
//   -25dB  = barely audible (background textures)
// ══════════════════════════════════════════════════════════════════════════════
const ensureInitializedGraph = (): void => {
  if (initialized) return

  // ── Master bus ──
  masterCompressor = new Tone.Compressor({ threshold: -12, ratio: 4 })
  masterReverb = new Tone.Reverb({ decay: 2.5, wet: 0.15 })
  masterEq = new Tone.EQ3({ low: -2, mid: 0, high: -1 })
  masterHighpass = new Tone.Filter({ type: 'highpass', frequency: 120 })
  masterLimiter = new Tone.Limiter({ threshold: -1 })
  masterBus = new Tone.Volume(0)

  masterCompressor.connect(masterReverb)
  masterReverb.connect(masterEq)
  masterEq.connect(masterHighpass)
  masterHighpass.connect(masterLimiter)
  masterLimiter.connect(masterBus)
  masterBus.connect(Tone.getDestination())

  // ── Ambient drone ──
  ambientOsc = new Tone.Oscillator({
    type: 'triangle',
    frequency: 150,
    volume: -22,
  })
  ambientGain = new Tone.Gain(0)
  ambientLfo = new Tone.LFO({ frequency: 0.05, min: 145, max: 155 })

  ambientOsc.connect(ambientGain)
  ambientGain.connect(masterCompressor)
  ambientLfo.connect(ambientOsc.frequency)

  ambientOsc2 = new Tone.Oscillator({
    type: 'sine',
    frequency: 150,
    volume: -25,
  })
  ambientOsc2.connect(ambientGain)

  // ── Background ambient layer (3 detuned sines) ──
  bgLayerGain = new Tone.Gain(0)
  bgLayerGain.connect(masterCompressor)
  bgLayerLfo = new Tone.LFO({ frequency: 0.05, min: 0.3, max: 0.7 })
  bgLayerLfo.connect(bgLayerGain.gain)

  bgLayer1 = new Tone.Oscillator({ type: 'sine', frequency: 148, volume: -25 })
  bgLayer2 = new Tone.Oscillator({ type: 'sine', frequency: 150, volume: -25 })
  bgLayer3 = new Tone.Oscillator({ type: 'sine', frequency: 152, volume: -25 })
  bgLayer1.connect(bgLayerGain)
  bgLayer2.connect(bgLayerGain)
  bgLayer3.connect(bgLayerGain)

  // ── Upload sounds ──
  uploadSine = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    volume: -18,
  }).connect(masterCompressor)

  uploadAM = new Tone.AMSynth({
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
    volume: -18,
  }).connect(masterCompressor)

  uploadMembrane = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    volume: -18,
  }).connect(masterCompressor)

  // ── Riser ──
  riserNoise = new Tone.Noise('white')
  riserFilter = new Tone.Filter(50, 'lowpass')
  riserVolume = new Tone.Volume(-Infinity)
  riserNoise.chain(riserFilter, riserVolume, masterCompressor)

  // ── Sub impact ──
  subImpact = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: { type: 'custom', partials: [0, 1, 0.75, 0.5, 0.25] } as unknown as Tone.RecursivePartial<Tone.OmniOscillatorOptions>,
    envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 1.4 },
    volume: -15,
  }).connect(masterCompressor)

  // ── Noise burst ──
  noiseBurst = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.3 },
  })
  noiseBurstFilter = new Tone.Filter(8000, 'highpass')
  noiseBurst.chain(noiseBurstFilter, masterCompressor)

  // ── IEC 60601-1-8 compliant alarm ──
  // 440Hz base + 4 harmonics within 300-4000Hz, pure sines FORBIDDEN per spec
  iecAlarmSynth = new Tone.Synth({
    oscillator: { type: 'custom', partials: [1, 0.8, 0.6, 0.4, 0.2] } as unknown as Tone.RecursivePartial<Tone.OmniOscillatorOptions>,
    envelope: { attack: 0.01, decay: 0.075, sustain: 0, release: 0.015 },
    volume: -15,
  })
  iecAlarmGain = new Tone.Gain(0)
  iecAlarmSynth.connect(iecAlarmGain)
  iecAlarmGain.connect(masterCompressor)

  // IEC high-priority 10-pulse uneven rhythm
  iecAlarmLoop = new Tone.Loop((time: number) => {
    if (!iecAlarmSynth || !iecAlarmActive) return
    const pattern = [0, 0.15, 0.30, 0.70, 0.85, 2.85, 3.00, 3.15, 3.55, 3.70]
    for (const pulseTime of pattern) {
      iecAlarmSynth.triggerAttackRelease(IEC_BASE_FREQ, '32n', time + pulseTime)
    }
  }, '4m')

  // ── Scanner beep ──
  scannerBeepSynth = new Tone.FMSynth({
    harmonicity: 2,
    modulationIndex: 8,
    oscillator: { type: 'square' },
    modulation: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    volume: -18,
  }).connect(masterCompressor)

  // ── Processing tick ──
  processingTickSynth = new Tone.MetalSynth({
    volume: -18,
    envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
    harmonicity: 3.1,
    modulationIndex: 16,
    resonance: 1200,
    octaves: 1.5,
  }).connect(masterCompressor)

  processingTickLoop = new Tone.Loop((time: number) => {
    if (!processingTickSynth) return
    processingTickSynth.triggerAttackRelease('16n', time)
  }, '4n')

  // ── Analysis tension pad ──
  tensionPad = new Tone.Oscillator({ type: 'sawtooth', frequency: 80, volume: -22 })
  tensionFilter = new Tone.Filter({ type: 'lowpass', frequency: 200 })
  tensionGain = new Tone.Gain(0)
  tensionPad.connect(tensionFilter)
  tensionFilter.connect(tensionGain)
  tensionGain.connect(masterCompressor)

  // ── Verdict stings ──
  genuineStingSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.8 },
    volume: -15,
  }).connect(masterCompressor)

  deepfakeStingSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.5, decay: 0.2, sustain: 0.9, release: 1.0 },
    volume: -15,
  })
  deepfakeDistortion = new Tone.Distortion(0.5)
  deepfakeStingSynth.connect(deepfakeDistortion)
  deepfakeDistortion.connect(masterCompressor)

  // ── Genuine resolution pad (Cmaj7 warm triangle) ──
  genuinePad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 3, decay: 2, sustain: 0.6, release: 3 },
    volume: -18,
  })
  genuinePadFilter = new Tone.Filter({ type: 'lowpass', frequency: 800 })
  genuinePadGain = new Tone.Gain(0)
  genuinePad.connect(genuinePadFilter)
  genuinePadFilter.connect(genuinePadGain)
  genuinePadGain.connect(masterCompressor)

  // ── Geiger counter (drift-free via Tone.Loop) ──
  geigerSynth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0, decay: 0.003, sustain: 0, release: 0.002 },
    volume: -20,
  })
  geigerFilter = new Tone.Filter({ type: 'bandpass', frequency: 4000, Q: 2 })
  geigerGain = new Tone.Gain(0)
  geigerSynth.connect(geigerFilter)
  geigerFilter.connect(geigerGain)
  geigerGain.connect(masterCompressor)

  // Geiger loop: interval dynamically adjusted via geigerClickIntervalMs
  geigerLoop = new Tone.Loop((time: number) => {
    if (!geigerActive || !geigerSynth) return
    geigerSynth.triggerAttackRelease('32n', time)
  }, '8n')  // Base rate, actual rhythm set by interval changes

  // ── Oximeter pitch mapping ──
  oximeterOsc = new Tone.Oscillator({ type: 'triangle', frequency: oximeterBasePitch, volume: -22 })
  oximeterGain = new Tone.Gain(0)
  oximeterOsc.connect(oximeterGain)
  oximeterGain.connect(masterCompressor)

  // ── Portal entry SFX ──
  portalMembrane = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 4,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 1.5 },
    volume: -15,
  }).connect(masterCompressor)

  portalSub = new Tone.Oscillator({ type: 'custom', partials: [0, 1, 0.75, 0.5, 0.25], frequency: 40, volume: -20 } as unknown as Tone.RecursivePartial<Tone.OmniOscillatorOptions>)
  portalSubGain = new Tone.Gain(0)
  portalFilter = new Tone.Filter({ type: 'lowpass', frequency: 200 })
  portalSub.connect(portalFilter)
  portalFilter.connect(portalSubGain)
  portalSubGain.connect(masterCompressor)

  // ── Warp transition SFX ──
  warpFilter = new Tone.Filter({ type: 'lowpass', frequency: 200 })
  warpNoise = new Tone.NoiseSynth({
    noise: { type: 'brown' },
    envelope: { attack: 0.05, decay: 0.6, sustain: 0, release: 0.4 },
    volume: -18,
  })
  warpNoise.connect(warpFilter)
  warpFilter.connect(masterCompressor)

  warpChirp = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.6, sustain: 0, release: 0.4 },
    volume: -20,
  }).connect(masterCompressor)

  // ── Scan sweep ──
  scanSweepSynth = new Tone.FMSynth({
    harmonicity: 3,
    modulationIndex: 12,
    oscillator: { type: 'square' },
    modulation: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.25, sustain: 0, release: 0.05 },
    modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.05 },
    volume: -18,
  }).connect(masterCompressor)

  // ── Verdict sub rumble ──
  verdictSub = new Tone.Oscillator({ type: 'custom', partials: [0, 1, 0.75, 0.5, 0.25], frequency: 30, volume: -22 } as unknown as Tone.RecursivePartial<Tone.OmniOscillatorOptions>)
  verdictSubGain = new Tone.Gain(0)
  verdictSub.connect(verdictSubGain)
  verdictSubGain.connect(masterCompressor)

  // ── Generative soundtrack ──
  soundtrackSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.3, decay: 0.6, sustain: 0.2, release: 1.5 },
    volume: -20,
  })
  soundtrackBassSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.1, decay: 0.8, sustain: 0.3, release: 1.0 },
    volume: -22,
  })
  soundtrackFilter = new Tone.Filter({ type: 'lowpass', frequency: 600 })
  soundtrackGain = new Tone.Gain(0)
  soundtrackSynth.connect(soundtrackFilter)
  soundtrackBassSynth.connect(soundtrackFilter)
  soundtrackFilter.connect(soundtrackGain)
  soundtrackGain.connect(masterCompressor)

  soundtrackLoop = new Tone.Loop((time: number) => {
    if (!soundtrackSynth || !soundtrackActive) return
    const config = SOUNDTRACK_CHORDS[soundtrackMode]
    const chord = config.chords[soundtrackChordIndex % config.chords.length]
    const bassNote = config.bass[soundtrackChordIndex % config.bass.length]

    // Arpeggiate: play each note 200ms apart
    chord.forEach((note, i) => {
      soundtrackSynth!.triggerAttackRelease(note, '2n', time + i * 0.2)
    })
    // Bass note on downbeat
    soundtrackBassSynth?.triggerAttackRelease(bassNote, '1m', time)

    soundtrackChordIndex++
    // Evolve filter within mode-specific range
    if (soundtrackFilter) {
      const [minFreq, maxFreq] = config.filterRange
      const freq = minFreq + (soundtrackChordIndex % 16) * ((maxFreq - minFreq) / 16)
      soundtrackFilter.frequency.linearRampTo(freq, 2, time)
    }
  }, '2m')  // Default tempo, overridden per mode in startSoundtrack

  Tone.Transport.bpm.value = DEFAULT_TICK_BPM
  initialized = true
}

// ══════════════════════════════════════════════════════════════════════════════
// Public API
// ══════════════════════════════════════════════════════════════════════════════
export const SoundEngine = {
  init: async (): Promise<void> => {
    if (!contextIsRunning()) {
      await Tone.start()
    }
    ensureInitializedGraph()
  },

  /** Expose master compressor node for uiEarcons routing */
  masterCompressorNode: (): Tone.Compressor | null => masterCompressor,

  dispose: (): void => {
    clearAllTimers()
    revealSequenceActive = false
    processingTickLoop?.stop(0)
    processingTickLoop?.dispose()
    processingTickLoop = null
    geigerLoop?.stop(0)
    geigerLoop?.dispose()
    geigerLoop = null

    Tone.Transport.stop()
    Tone.Transport.cancel(0)
    tickingActive = false

    // Dispose all nodes
    const disposables: (Tone.ToneAudioNode | null)[] = [
      ambientLfo, ambientOsc, ambientOsc2, ambientGain,
      bgLayerLfo, bgLayer1, bgLayer2, bgLayer3, bgLayerGain,
      scannerBeepSynth, processingTickSynth,
      genuineStingSynth, deepfakeStingSynth, deepfakeDistortion,
      genuinePad, genuinePadFilter, genuinePadGain,
      uploadSine, uploadAM, uploadMembrane,
      riserNoise, riserFilter, riserVolume,
      subImpact, noiseBurst, noiseBurstFilter,
      iecAlarmSynth, iecAlarmGain,
      geigerSynth, geigerFilter, geigerGain,
      oximeterOsc, oximeterGain,
      tensionPad, tensionFilter, tensionGain,
      portalMembrane, portalSub, portalSubGain, portalFilter,
      warpNoise, warpFilter, warpChirp,
      scanSweepSynth,
      verdictSub, verdictSubGain,
      soundtrackSynth, soundtrackBassSynth, soundtrackFilter, soundtrackGain,
      masterCompressor, masterReverb, masterEq, masterHighpass, masterLimiter, masterBus,
    ]
    for (const node of disposables) {
      try { node?.dispose() } catch { /* already disposed */ }
    }

    ambientLfo = ambientOsc = ambientOsc2 = ambientGain = null
    bgLayerLfo = bgLayer1 = bgLayer2 = bgLayer3 = bgLayerGain = null
    scannerBeepSynth = null
    processingTickSynth = null
    genuineStingSynth = deepfakeStingSynth = null
    deepfakeDistortion = null
    genuinePad = null; genuinePadFilter = null; genuinePadGain = null
    subImpact = null; noiseBurst = null; noiseBurstFilter = null
    iecAlarmSynth = null; iecAlarmGain = null
    iecAlarmLoop?.stop(0); iecAlarmLoop?.dispose(); iecAlarmLoop = null
    geigerSynth = null; geigerFilter = null; geigerGain = null
    oximeterOsc = null; oximeterGain = null
    tensionPad = null; tensionFilter = null; tensionGain = null
    portalMembrane = null; portalSub = null; portalSubGain = null; portalFilter = null
    warpNoise = null; warpFilter = null; warpChirp = null
    scanSweepSynth = null
    verdictSub = null; verdictSubGain = null
    soundtrackSynth = null; soundtrackBassSynth = null
    soundtrackFilter = null; soundtrackGain = null
    soundtrackLoop?.stop(0); soundtrackLoop?.dispose(); soundtrackLoop = null
    masterCompressor = masterReverb = masterEq = null
    masterHighpass = null; masterLimiter = null; masterBus = null

    initialized = false
  },

  cancelAllTransitions: (): void => {
    clearAllTimers()
    revealSequenceActive = false
    tickJitterActive = false
    geigerActive = false
    const now = Tone.now()
    holdAndSetTarget(ambientGain?.gain, 0.05, now, 0.05)
    holdAndSetTarget(bgLayerGain?.gain, 0.05, now, 0.05)
    holdAndSetTarget(tensionGain?.gain, 0.05, now, 0.05)
    holdAndSetTarget(soundtrackGain?.gain, 0.05, now, 0.05)
    holdAndSetTarget(iecAlarmGain?.gain, 0.0001, now, 0.03)
    holdAndSetTarget(geigerGain?.gain, 0.0001, now, 0.03)
    holdAndSetTarget(oximeterGain?.gain, 0.0001, now, 0.03)
    holdAndSetTarget(portalSubGain?.gain, 0.0001, now, 0.03)
    holdAndSetTarget(verdictSubGain?.gain, 0.0001, now, 0.03)
    holdAndSetTarget(riserVolume?.volume, -100, now, 0.03)
    scheduleTimer(() => {
      processingTickLoop?.stop(0)
      iecAlarmLoop?.stop(0)
      soundtrackLoop?.stop(0)
      geigerLoop?.stop(0)
      stopIfStarted(riserNoise)
    }, 90)
  },

  setMasterVolume: (vol: number): void => {
    if (!initialized || !masterBus) return
    const normalized = clamp(vol, 0, 1)
    const gain = normalized <= 0 ? MIN_MASTER_GAIN : normalized
    const db = Tone.gainToDb(gain)
    masterBus.volume.value = db
  },

  setMuted: (muted: boolean): void => {
    if (!initialized || !masterBus) return
    masterBus.mute = muted
  },

  // ==================== AMBIENT / BACKGROUND ====================

  startDrone: (): void => {
    if (!requireAudioReady() || !ambientGain) return
    if (!ambientOscsStarted) {
      ambientOsc?.start()
      ambientLfo?.start()
      ambientOsc2?.start()
      ambientOscsStarted = true
    }
    const now = Tone.now()
    ambientGain.gain.setTargetAtTime(1, now, 0.3)
  },

  stopDrone: (): void => {
    if (!initialized || !ambientGain) return
    const now = Tone.now()
    ambientGain.gain.setTargetAtTime(0, now, 0.25)
  },

  startBackgroundLayer: (): void => {
    if (!requireAudioReady() || !bgLayerGain) return
    if (!bgLayersStarted) {
      bgLayer1?.start()
      bgLayer2?.start()
      bgLayer3?.start()
      bgLayerLfo?.start()
      bgLayersStarted = true
    }
    const now = Tone.now()
    bgLayerGain.gain.setTargetAtTime(0.5, now, 0.5)
  },

  stopBackgroundLayer: (): void => {
    if (!initialized || !bgLayerGain) return
    const now = Tone.now()
    bgLayerGain.gain.setTargetAtTime(0, now, 0.3)
  },

  // ==================== UPLOAD / PORTAL ====================

  playBeep: (): void => {
    if (!requireAudioReady() || !scannerBeepSynth) return
    scannerBeepSynth.triggerAttackRelease(1200, '16n')
  },

  playUploadThunk: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    uploadSine?.triggerAttackRelease(800 + (Math.random() * 80 - 40), '64n', now)
    uploadAM?.triggerAttackRelease(400, '16n', now)
    uploadMembrane?.triggerAttackRelease('C2', '8n', now)
  },

  playPortalEntry: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    if (!portalSubStarted) {
      portalSub?.start()
      portalSubStarted = true
    }
    portalMembrane?.triggerAttackRelease('E1', '2n', now)
    if (portalSubGain) {
      portalSubGain.gain.setTargetAtTime(0.6, now, 0.1)
      portalSubGain.gain.setTargetAtTime(0, now + 1.8, 0.2)
    }
    if (portalFilter) {
      portalFilter.frequency.setValueAtTime(200, now)
      portalFilter.frequency.linearRampToValueAtTime(3000, now + 2)
    }
  },

  playWarpTransition: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    if (warpFilter) {
      warpFilter.frequency.setValueAtTime(200, now)
      warpFilter.frequency.linearRampToValueAtTime(8000, now + 0.8)
    }
    warpNoise?.triggerAttackRelease(1, now)
    if (warpChirp) {
      warpChirp.frequency.setValueAtTime(200, now)
      warpChirp.frequency.linearRampToValueAtTime(2000, now + 0.8)
      warpChirp.triggerAttackRelease(1, now)
    }
  },

  // ==================== ANALYSIS ====================

  startTicking: (): void => {
    if (!requireAudioReady() || !processingTickLoop) return
    if (!tickingActive) {
      processingTickLoop.start(Tone.now())
      tickingActive = true
    }
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.bpm.value = DEFAULT_TICK_BPM
      const now = Tone.now()
      Tone.Transport.bpm.setTargetAtTime(120, now, 2)
      Tone.Transport.start()
    }
    if (!tensionPadStarted) {
      tensionPad?.start()
      tensionPadStarted = true
    }
    if (tensionGain) {
      const now = Tone.now()
      tensionGain.gain.setTargetAtTime(1, now, 0.5)
    }
    // Slowly open tension filter over 30s
    if (tensionFilter) {
      const now = Tone.now()
      tensionFilter.frequency.setValueAtTime(200, now)
      tensionFilter.frequency.linearRampToValueAtTime(2000, now + 30)
    }
    // Start Geiger clicks at low baseline rate (now using Tone.Loop — drift-free)
    geigerActive = true
    if (geigerGain) geigerGain.gain.setTargetAtTime(0.3, Tone.now(), 0.3)
    if (geigerLoop && geigerLoop.state !== 'started') {
      geigerLoop.start(Tone.now())
    }
    // Start oximeter monitoring tone
    if (oximeterGain) oximeterGain.gain.setTargetAtTime(0.5, Tone.now(), 0.5)
  },

  stopTicking: (): void => {
    if (!initialized || !processingTickLoop) return
    const now = Tone.now()
    if (processingTickSynth) {
      processingTickSynth.volume.cancelAndHoldAtTime?.(now)
      processingTickSynth.volume.linearRampToValueAtTime(-60, now + 0.08)
      scheduleTimer(() => {
        processingTickLoop?.stop(0)
      }, 100)
    } else {
      processingTickLoop.stop(0)
    }
    tickingActive = false
    tickJitterActive = false
    if (tickJitterTimer) {
      clearTimeout(tickJitterTimer)
      tickJitterTimer = null
    }
    if (tensionGain) {
      holdAndSetTarget(tensionGain.gain, 0.0001, now, 0.08)
      tensionGain.gain.setTargetAtTime(0, now, 0.3)
    }
    // Stop Geiger (Tone.Loop — no more setTimeout drift)
    geigerActive = false
    geigerLoop?.stop(0)
    if (geigerGain) holdAndSetTarget(geigerGain.gain, 0.0001, now, 0.08)
    if (oximeterGain) holdAndSetTarget(oximeterGain.gain, 0.0001, now, 0.08)
  },

  setTickBPM: (bpm: number): void => {
    if (!initialized) return
    const now = Tone.now()
    const clampedBpm = clamp(bpm, 60, 120)
    Tone.Transport.bpm.setTargetAtTime(clampedBpm, now, 0.08)
  },

  playScanSweep: (): void => {
    if (!requireAudioReady() || !scanSweepSynth) return
    const now = Tone.now()
    scanSweepSynth.frequency.setValueAtTime(1200, now)
    scanSweepSynth.frequency.linearRampToValueAtTime(400, now + 0.3)
    scanSweepSynth.triggerAttackRelease(0.3, now)
  },

  // ==================== RISER / SILENCE / IMPACT ====================

  startRiser: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    riserNoise?.start(now)
    riserFilter?.frequency.setValueAtTime(50, now)
    riserFilter?.frequency.linearRampToValueAtTime(8000, now + 5)
    riserVolume?.volume.setValueAtTime(-Infinity, now)
    riserVolume?.volume.linearRampToValueAtTime(-15, now + 5)
  },

  stopRiser: (): void => {
    if (!initialized) return
    const now = Tone.now()
    if (riserVolume) {
      holdAndSetTarget(riserVolume.volume, -100, now, 0.03)
    }
    scheduleTimer(() => {
      stopIfStarted(riserNoise)
    }, 90)
  },

  triggerSilence: (): void => {
    if (!masterBus) return
    const now = Tone.now()
    masterBus.volume.setValueAtTime(-Infinity, now)
    masterBus.volume.setValueAtTime(0, now + 0.25)
  },

  playSubImpact: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    subImpact?.triggerAttackRelease('C1', '2n', now)
    if (ambientGain) {
      if (!ambientOscsStarted) {
        ambientOsc?.start()
        ambientLfo?.start()
        ambientOsc2?.start()
        ambientOscsStarted = true
      }
      holdAndSetTarget(ambientGain.gain, 0.04, now, 0.08)
      ambientGain.gain.setTargetAtTime(0.15, now + 4, 1)
    }
  },

  playNoiseBurst: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    noiseBurst?.triggerAttackRelease('8n', now)
    if (ambientGain) {
      if (!ambientOscsStarted) {
        ambientOsc?.start()
        ambientLfo?.start()
        ambientOsc2?.start()
        ambientOscsStarted = true
      }
      holdAndSetTarget(ambientGain.gain, 0.04, now, 0.08)
      ambientGain.gain.setTargetAtTime(0.15, now + 4, 1)
    }
  },

  // ==================== IEC 60601-1-8 ALARM ====================

  startIECAlarm: (): void => {
    if (!requireAudioReady() || iecAlarmActive) return
    iecAlarmActive = true
    if (iecAlarmGain) {
      iecAlarmGain.gain.setTargetAtTime(1, Tone.now(), 0.05)
    }
    try { iecAlarmLoop?.start(Tone.now()) } catch { /* already started */ }
    if (Tone.Transport.state !== 'started') Tone.Transport.start(Tone.now())
  },

  stopIECAlarm: (): void => {
    if (!iecAlarmActive) return
    iecAlarmActive = false
    const now = Tone.now()
    if (iecAlarmGain) {
      holdAndSetTarget(iecAlarmGain.gain, 0.0001, now, 0.04)
    }
    scheduleTimer(() => {
      iecAlarmLoop?.stop(0)
    }, 120)
  },

  // ==================== VERDICT ====================

  /** Dramatic verdict build: fade to silence, hold sub rumble, then slam back */
  triggerVerdictBuild: (onReady: () => void): void => {
    if (!masterBus) {
      onReady()
      return
    }
    const now = Tone.now()
    clearAllTimers()
    if (!verdictSubStarted) {
      verdictSub?.start()
      verdictSubStarted = true
    }
    masterBus.volume.cancelAndHoldAtTime?.(now)
    masterBus.volume.setTargetAtTime(-60, now, 0.08)
    if (verdictSubGain) {
      verdictSubGain.gain.cancelAndHoldAtTime?.(now)
      verdictSubGain.gain.setTargetAtTime(0.3, now + 0.3, 0.08)
    }
    scheduleTimer(() => {
      if (verdictSubGain) {
        holdAndSetTarget(verdictSubGain.gain, 0.0001, Tone.now(), 0.04)
      }
      if (masterBus) {
        const backNow = Tone.now()
        masterBus.volume.cancelAndHoldAtTime?.(backNow)
        masterBus.volume.linearRampToValueAtTime(0, backNow + 0.07)
      }
      onReady()
    }, 1500)
  },

  playResolution: (type: 'genuine' | 'deepfake'): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    if (type === 'genuine') {
      // Use linearRampTo to avoid Tone.js v15 exponentialRamp RangeError
      ambientOsc?.frequency.linearRampTo(150, 2, now)
      ambientOsc2?.frequency.linearRampTo(225, 2, now)
      if (ambientOsc2) ambientOsc2.type = 'sine'
      // Warm Cmaj7 pad fading in over 3s
      if (genuinePadGain) {
        genuinePadGain.gain.setTargetAtTime(1, now, 0.5)
      }
      if (genuinePadFilter) {
        genuinePadFilter.frequency.setValueAtTime(200, now)
        genuinePadFilter.frequency.linearRampToValueAtTime(2000, now + 3)
      }
      genuinePad?.triggerAttack(['C3', 'E3', 'G3', 'B3'], now)
      scheduleTimer(() => {
        genuinePad?.triggerRelease(['C3', 'E3', 'G3', 'B3'])
        if (genuinePadGain) {
          holdAndSetTarget(genuinePadGain.gain, 0.0001, Tone.now(), 0.4)
        }
      }, 6000)
      // Crossfade soundtrack to genuine resolution mode
      SoundEngine.setSoundtrackMode('verdict-genuine')
    } else {
      ambientOsc?.frequency.linearRampTo(150, 2, now)
      ambientOsc2?.frequency.linearRampTo(160, 2, now)
      if (ambientOsc2) ambientOsc2.type = 'sawtooth'
      // Crossfade soundtrack to deepfake alarm mode
      SoundEngine.setSoundtrackMode('verdict-deepfake')
    }
  },

  triggerDeepfakeReveal: (): void => {
    clearAllTimers()
    revealSequenceActive = true
    SoundEngine.stopTicking()
    SoundEngine.triggerAcousticVacuum()
    scheduleTimer(() => {
      if (!revealSequenceActive) return
      SoundEngine.startRiser()
    }, 1500)
    scheduleTimer(() => {
      if (!revealSequenceActive) return
      SoundEngine.restoreFromVacuum()
      SoundEngine.triggerSilence()
      scheduleTimer(() => {
        if (!revealSequenceActive) return
        SoundEngine.playSubImpact()
        SoundEngine.playNoiseBurst()
        SoundEngine.playVerdict('deepfake')
        SoundEngine.startIECAlarm()
      }, 250)
    }, 5000)
  },

  playVerdict: (result: VerdictResult): void => {
    if (!requireAudioReady()) return

    const now = Tone.now()
    if (result === 'genuine') {
      if (!genuineStingSynth) return
      genuineStingSynth.triggerAttackRelease(['C4', 'E4', 'G4'], 1, now)
      return
    }

    if (!deepfakeStingSynth) return
    deepfakeStingSynth.triggerAttack(['C3', 'C#3'], now)
    deepfakeStingSynth.triggerRelease(['C3', 'C#3'], now + 2)
  },

  /** Geiger counter: velocity maps to click rate (drift-free Tone.Loop) */
  updateVelocity: (velocity: number): void => {
    if (!requireAudioReady()) return
    const safeVelocity = Math.max(0, velocity)
    if (!oximeterStarted) {
      oximeterOsc?.start()
      oximeterStarted = true
    }

    // --- Geiger click rate (now via Tone.Loop interval — no drift) ---
    // Normal speech ~8-15cm/s = 1-3 Hz clicks
    // Deepfake >50cm/s = 15-20 Hz (continuous crackle)
    const clickRate = clamp(safeVelocity * 0.3, 0.5, 25)
    const clickIntervalMs = 1000 / clickRate

    if (geigerGain && safeVelocity > 0.1) {
      holdAndSetTarget(geigerGain.gain, 1, Tone.now(), 0.05)
      if (!geigerActive) {
        geigerActive = true
        // Update loop interval based on velocity
        if (geigerLoop) {
          geigerLoop.interval = Math.max(0.04, clickIntervalMs / 1000)
          if (geigerLoop.state !== 'started') {
            geigerLoop.start(Tone.now())
          }
        }
      } else if (geigerLoop) {
        // Dynamically adjust interval as velocity changes
        geigerLoop.interval = Math.max(0.04, clickIntervalMs / 1000)
      }
    } else {
      geigerActive = false
      geigerLoop?.stop(0)
      if (geigerGain) {
        holdAndSetTarget(geigerGain.gain, 0.0001, Tone.now(), 0.08)
      }
    }

    // --- Oximeter pitch: deviation maps to semitone drops ---
    if (oximeterOsc && oximeterGain) {
      const semitonesDrop = Math.floor(safeVelocity / 10)
      const freq = oximeterBasePitch * Math.pow(2, -semitonesDrop / 12)
      oximeterOsc.frequency.setTargetAtTime(Math.max(freq, 100), Tone.now(), 0.1)
      const oxGain = safeVelocity > 5 ? 1 : 0
      oximeterGain.gain.setTargetAtTime(oxGain, Tone.now(), 0.2)
    }
  },

  // ==================== GENERATIVE SOUNDTRACK ====================

  startSoundtrack: (mode?: SoundtrackMode): void => {
    if (!requireAudioReady()) return
    if (!soundtrackGain || !soundtrackLoop) return

    const targetMode = mode ?? 'idle'
    soundtrackMode = targetMode
    soundtrackChordIndex = 0

    // Set loop tempo based on mode
    const config = SOUNDTRACK_CHORDS[targetMode]
    soundtrackLoop.interval = config.tempo

    if (!soundtrackActive) {
      soundtrackActive = true
      const now = Tone.now()
      soundtrackGain.gain.setTargetAtTime(0.7, now, 1.5)
      soundtrackLoop.start(now)
      if (Tone.Transport.state !== 'started') Tone.Transport.start(now)
    }
  },

  stopSoundtrack: (): void => {
    if (!soundtrackActive) return
    soundtrackActive = false
    if (soundtrackGain) {
      soundtrackGain.gain.setTargetAtTime(0, Tone.now(), 0.5)
    }
    scheduleTimer(() => {
      soundtrackLoop?.stop(0)
    }, 2000)
  },

  /** Crossfade soundtrack to a new mode without stopping playback */
  setSoundtrackMode: (mode: SoundtrackMode): void => {
    if (!soundtrackActive) {
      // If not playing, just start with the new mode
      SoundEngine.startSoundtrack(mode)
      return
    }
    // Crossfade: briefly dip gain, switch mode, bring back
    soundtrackMode = mode
    const config = SOUNDTRACK_CHORDS[mode]
    if (soundtrackLoop) {
      soundtrackLoop.interval = config.tempo
    }
    if (soundtrackGain) {
      const now = Tone.now()
      soundtrackGain.gain.setTargetAtTime(0.2, now, 0.3)
      soundtrackGain.gain.setTargetAtTime(0.7, now + 1, 0.5)
    }
    if (soundtrackFilter) {
      const [minFreq] = config.filterRange
      soundtrackFilter.frequency.linearRampTo(minFreq, 1, Tone.now())
    }
  },

  // ==================== ACOUSTIC VACUUM ====================

  triggerAcousticVacuum: (): void => {
    if (!requireAudioReady() || vacuumActive) return
    vacuumActive = true
    const now = Tone.now()
    preVacuumAmbientGain = ambientGain?.gain.value ?? 0
    preVacuumBgGain = bgLayerGain?.gain.value ?? 0
    preVacuumTensionGain = tensionGain?.gain.value ?? 0
    preVacuumSoundtrackGain = soundtrackGain?.gain.value ?? 0
    ambientGain?.gain.setTargetAtTime(0.02, now, 0.4)
    bgLayerGain?.gain.setTargetAtTime(0.01, now, 0.3)
    tensionGain?.gain.setTargetAtTime(0.01, now, 0.3)
    soundtrackGain?.gain.setTargetAtTime(0.02, now, 0.4)
  },

  restoreFromVacuum: (): void => {
    if (!vacuumActive) return
    vacuumActive = false
    const now = Tone.now()
    ambientGain?.gain.setTargetAtTime(preVacuumAmbientGain, now, 0.3)
    bgLayerGain?.gain.setTargetAtTime(preVacuumBgGain, now, 0.3)
    tensionGain?.gain.setTargetAtTime(preVacuumTensionGain, now, 0.3)
    soundtrackGain?.gain.setTargetAtTime(preVacuumSoundtrackGain, now, 0.3)
  },

  // ==================== TICK JITTER (HEARTBEAT DISRUPTION) ====================

  enableTickJitter: (): void => {
    if (!requireAudioReady() || !processingTickLoop) return
    tickJitterActive = true
    processingTickLoop.stop(0)
    const jitterTick = () => {
      if (!tickJitterActive || !processingTickSynth) return
      processingTickSynth.triggerAttackRelease('32n', Tone.now())
      const baseInterval = (60 / (Tone.Transport.bpm.value || 120)) * 1000
      const jitter = baseInterval * (0.7 + Math.random() * 0.6)
      tickJitterTimer = scheduleTimer(jitterTick, jitter)
    }
    jitterTick()
  },

  disableTickJitter: (): void => {
    tickJitterActive = false
    if (tickJitterTimer) {
      clearTimeout(tickJitterTimer)
      tickJitterTimer = null
    }
    if (tickingActive && processingTickLoop) {
      try { processingTickLoop.start(Tone.now()) } catch { /* already started */ }
    }
  },

  // ==================== GEIGER COUNTER CONTROL ====================

  startGeigerClicks: (): void => {
    if (!requireAudioReady()) return
    geigerActive = true
    if (geigerGain) geigerGain.gain.setTargetAtTime(1, Tone.now(), 0.1)
    if (geigerLoop && geigerLoop.state !== 'started') {
      geigerLoop.start(Tone.now())
    }
  },

  stopGeigerClicks: (): void => {
    geigerActive = false
    geigerLoop?.stop(0)
    if (geigerGain) geigerGain.gain.setTargetAtTime(0, Tone.now(), 0.2)
  },

  // ==================== OXIMETER CONTROL ====================

  startOximeter: (): void => {
    if (!requireAudioReady()) return
    if (oximeterGain) oximeterGain.gain.setTargetAtTime(1, Tone.now(), 0.3)
  },

  stopOximeter: (): void => {
    if (oximeterGain) oximeterGain.gain.setTargetAtTime(0, Tone.now(), 0.2)
  },

  getDebugState: () => ({
    initialized,
    contextState: Tone.getContext().state,
    tickingActive,
    geigerActive,
    iecAlarmActive,
    soundtrackActive,
    soundtrackMode,
    revealSequenceActive,
    pendingTimers: pendingTimers.size,
    hasGeigerLoop: geigerLoop !== null,
    hasTickJitterTimer: tickJitterTimer !== null,
  }),

  runDiagnostics: async (): Promise<{ ok: boolean; checks: Record<string, boolean>; details: string[] }> => {
    const checks: Record<string, boolean> = {}
    const details: string[] = []

    try {
      await SoundEngine.init()
      checks.initOk = true
    } catch (error) {
      checks.initOk = false
      details.push(`init failed: ${error instanceof Error ? error.message : String(error)}`)
      return { ok: false, checks, details }
    }

    SoundEngine.cancelAllTransitions()
    await sleep(120)

    SoundEngine.startTicking()
    SoundEngine.updateVelocity(90)
    await sleep(160)
    checks.geigerLoopStarted = geigerLoop?.state === 'started'
    checks.tickingStarted = tickingActive

    SoundEngine.triggerDeepfakeReveal()
    await sleep(250)
    checks.revealScheduled = revealSequenceActive
    checks.pendingTimersScheduled = pendingTimers.size > 0

    SoundEngine.cancelAllTransitions()
    await sleep(180)

    checks.pendingTimersCleared = pendingTimers.size === 0
    checks.geigerLoopStopped = geigerLoop?.state !== 'started'
    checks.tickJitterTimerCleared = tickJitterTimer === null
    checks.revealCancelled = !revealSequenceActive
    checks.geigerInactive = !geigerActive
    checks.tickJitterInactive = !tickJitterActive

    const ok = Object.values(checks).every(Boolean)
    if (!ok) {
      details.push(`failed checks: ${Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name).join(', ')}`)
    }
    return { ok, checks, details }
  },

  isInitialized: (): boolean => initialized,
}
