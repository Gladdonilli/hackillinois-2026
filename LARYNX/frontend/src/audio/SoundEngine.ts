import * as Tone from 'tone'

type VerdictResult = 'genuine' | 'deepfake'

let initialized = false
let ambientOscsStarted = false
let bgLayersStarted = false
let tensionPadStarted = false
let oximeterStarted = false
let portalSubStarted = false
let verdictSubStarted = false

// Master bus chain: Compressor → Reverb → EQ3 → HPF → Limiter → Volume → Destination
let masterCompressor: Tone.Compressor | null = null
let masterReverb: Tone.Reverb | null = null
let masterEq: Tone.EQ3 | null = null
let masterHighpass: Tone.Filter | null = null
let masterLimiter: Tone.Limiter | null = null
let masterBus: Tone.Volume | null = null

// Ambient drone
let ambientOsc: Tone.Oscillator | null = null
let ambientGain: Tone.Gain | null = null
let ambientLfo: Tone.LFO | null = null
let ambientOsc2: Tone.Oscillator | null = null

// Background ambient layer (3 detuned sines)
let bgLayer1: Tone.Oscillator | null = null
let bgLayer2: Tone.Oscillator | null = null
let bgLayer3: Tone.Oscillator | null = null
let bgLayerGain: Tone.Gain | null = null
let bgLayerLfo: Tone.LFO | null = null

// Upload
let uploadSine: Tone.Synth | null = null
let uploadAM: Tone.AMSynth | null = null
let uploadMembrane: Tone.MembraneSynth | null = null

// Riser
let riserNoise: Tone.Noise | null = null
let riserFilter: Tone.Filter | null = null
let riserVolume: Tone.Volume | null = null

// Impact
let subImpact: Tone.MembraneSynth | null = null
let noiseBurst: Tone.NoiseSynth | null = null
let noiseBurstFilter: Tone.Filter | null = null

// IEC 60601-1-8 compliant alarm (replaces horror FMSynth)
let iecAlarmSynth: Tone.Synth | null = null
let iecAlarmGain: Tone.Gain | null = null
let iecAlarmLoop: Tone.Loop | null = null
let iecAlarmActive = false

// Scanner / ticking
let scannerBeepSynth: Tone.FMSynth | null = null
let processingTickSynth: Tone.MetalSynth | null = null
let processingTickLoop: Tone.Loop | null = null
let tickingActive = false

// Analysis tension pad (filtered sawtooth, slowly opens)
let tensionPad: Tone.Oscillator | null = null
let tensionFilter: Tone.Filter | null = null
let tensionGain: Tone.Gain | null = null

// Verdict stings
let genuineStingSynth: Tone.PolySynth | null = null
let deepfakeStingSynth: Tone.PolySynth | null = null
let deepfakeDistortion: Tone.Distortion | null = null

// Genuine resolution pad
let genuinePad: Tone.PolySynth | null = null
let genuinePadFilter: Tone.Filter | null = null
let genuinePadGain: Tone.Gain | null = null

// Geiger counter velocity sonification
let geigerSynth: Tone.NoiseSynth | null = null
let geigerFilter: Tone.Filter | null = null
let geigerGain: Tone.Gain | null = null
let geigerInterval: ReturnType<typeof setTimeout> | null = null
let geigerActive = false

// Oximeter pitch mapping (formant deviation → semitone drops)
let oximeterOsc: Tone.Oscillator | null = null
let oximeterGain: Tone.Gain | null = null
let oximeterBasePitch = 523  // C5

// Portal entry SFX
let portalMembrane: Tone.MembraneSynth | null = null
let portalSub: Tone.Oscillator | null = null
let portalSubGain: Tone.Gain | null = null
let portalFilter: Tone.Filter | null = null

// Warp transition SFX
let warpNoise: Tone.NoiseSynth | null = null
let warpFilter: Tone.Filter | null = null
let warpChirp: Tone.Synth | null = null

// Scan sweep SFX
let scanSweepSynth: Tone.FMSynth | null = null

// Data point ping
let dataPointSynth: Tone.Synth | null = null

// Verdict sub rumble
let verdictSub: Tone.Oscillator | null = null
let verdictSubGain: Tone.Gain | null = null

// Generative soundtrack
let soundtrackSynth: Tone.PolySynth | null = null
let soundtrackFilter: Tone.Filter | null = null
let soundtrackGain: Tone.Gain | null = null
let soundtrackLoop: Tone.Loop | null = null
let soundtrackChordIndex = 0
let soundtrackActive = false

// Acoustic vacuum state
let vacuumActive = false
let preVacuumAmbientGain = 0
let preVacuumBgGain = 0
let preVacuumTensionGain = 0
let preVacuumSoundtrackGain = 0

const MIN_MASTER_GAIN = 0.0001
const DEFAULT_TICK_BPM = 60
const IEC_BASE_FREQ = 440  // A4 — IEC 60601-1-8 alarm base
let tickJitterActive = false

const contextIsRunning = (): boolean => Tone.getContext().state === 'running'

const requireAudioReady = (): boolean => {
  if (!initialized) return false
  return contextIsRunning()
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const ensureInitializedGraph = (): void => {
  if (initialized) return

  // Master bus: Compressor → Reverb → EQ3 → HPF → Limiter → Volume → Destination
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

  // --- Ambient drone ---
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
  // Oscillators NOT started here — deferred to startDrone() to avoid burning Web Audio thread on silence

  ambientOsc2 = new Tone.Oscillator({
    type: 'sine',
    frequency: 150,
    volume: -25,
  })
  ambientOsc2.connect(ambientGain)
  // ambientOsc2 NOT started here — deferred to startDrone()

  // --- Background ambient layer (3 detuned sines) ---
  bgLayerGain = new Tone.Gain(0)
  bgLayerGain.connect(masterCompressor)
  bgLayerLfo = new Tone.LFO({ frequency: 0.05, min: 0.3, max: 0.7 })
  bgLayerLfo.connect(bgLayerGain.gain)
  // bgLayerLfo NOT started here — deferred to startBackgroundLayer()

  bgLayer1 = new Tone.Oscillator({ type: 'sine', frequency: 148, volume: -35 })
  bgLayer2 = new Tone.Oscillator({ type: 'sine', frequency: 150, volume: -35 })
  bgLayer3 = new Tone.Oscillator({ type: 'sine', frequency: 152, volume: -35 })
  bgLayer1.connect(bgLayerGain)
  bgLayer2.connect(bgLayerGain)
  bgLayer3.connect(bgLayerGain)
  // bgLayers NOT started here — deferred to startBackgroundLayer() to avoid burning Web Audio thread on silence

  // --- Upload sounds ---
  uploadSine = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    volume: -15,
  }).connect(masterCompressor)

  uploadAM = new Tone.AMSynth({
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
    volume: -15,
  }).connect(masterCompressor)

  uploadMembrane = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    volume: -15,
  }).connect(masterCompressor)

  // --- Riser ---
  riserNoise = new Tone.Noise('white')
  riserFilter = new Tone.Filter(50, 'lowpass')
  riserVolume = new Tone.Volume(-Infinity)
  riserNoise.chain(riserFilter, riserVolume, masterCompressor)

  // --- Sub impact ---
  subImpact = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: { type: 'custom', partials: [0, 1, 0.75, 0.5, 0.25] } as unknown as Tone.RecursivePartial<Tone.OmniOscillatorOptions>,
    envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 1.4 },
    volume: -5,
  }).connect(masterCompressor)

  // --- Noise burst ---
  noiseBurst = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.3 },
  })
  noiseBurstFilter = new Tone.Filter(8000, 'highpass')
  noiseBurst.chain(noiseBurstFilter, masterCompressor)

  // --- IEC 60601-1-8 compliant alarm (replaces horror FMSynth) ---
  // 440Hz base + 4 harmonics within 300-4000Hz, pure sines FORBIDDEN per spec
  iecAlarmSynth = new Tone.Synth({
    oscillator: { type: 'custom', partials: [1, 0.8, 0.6, 0.4, 0.2] } as unknown as Tone.RecursivePartial<Tone.OmniOscillatorOptions>,
    envelope: { attack: 0.01, decay: 0.075, sustain: 0, release: 0.015 },
    volume: -10,
  })
  iecAlarmGain = new Tone.Gain(0)
  iecAlarmSynth.connect(iecAlarmGain)
  iecAlarmGain.connect(masterCompressor)

  // IEC high-priority 10-pulse uneven rhythm: [P][P][P]--400ms--[P][P]---2.0s---[P][P][P]--400ms--[P][P]
  iecAlarmLoop = new Tone.Loop((time: number) => {
    if (!iecAlarmSynth || !iecAlarmActive) return
    const pattern = [0, 0.15, 0.30, 0.70, 0.85, 2.85, 3.00, 3.15, 3.55, 3.70]  // seconds within 4s cycle
    for (const pulseTime of pattern) {
      iecAlarmSynth.triggerAttackRelease(IEC_BASE_FREQ, '32n', time + pulseTime)
    }
  }, '4m')  // full 10-pulse cycle every 4 measures (4s at 60 BPM)

  // --- Scanner beep ---
  scannerBeepSynth = new Tone.FMSynth({
    harmonicity: 2,
    modulationIndex: 8,
    oscillator: { type: 'square' },
    modulation: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    volume: -18,
  }).connect(masterCompressor)

  // --- Processing tick ---
  processingTickSynth = new Tone.MetalSynth({
    volume: -12,
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

  // --- Analysis tension pad ---
  tensionPad = new Tone.Oscillator({ type: 'sawtooth', frequency: 80, volume: -28 })
  tensionFilter = new Tone.Filter({ type: 'lowpass', frequency: 200 })
  tensionGain = new Tone.Gain(0)
  tensionPad.connect(tensionFilter)
  tensionFilter.connect(tensionGain)
  tensionGain.connect(masterCompressor)

  // --- Verdict stings ---
  genuineStingSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.8 },
    volume: -5,
  }).connect(masterCompressor)

  deepfakeStingSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.5, decay: 0.2, sustain: 0.9, release: 1.0 },
    volume: -5,
  })
  deepfakeDistortion = new Tone.Distortion(0.5)
  deepfakeStingSynth.connect(deepfakeDistortion)
  deepfakeDistortion.connect(masterCompressor)

  // --- Genuine resolution pad (Cmaj7 warm triangle) ---
  genuinePad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 3, decay: 2, sustain: 0.6, release: 3 },
    volume: -12,
  })
  genuinePadFilter = new Tone.Filter({ type: 'lowpass', frequency: 800 })
  genuinePadGain = new Tone.Gain(0)
  genuinePad.connect(genuinePadFilter)
  genuinePadFilter.connect(genuinePadGain)
  genuinePadGain.connect(masterCompressor)

  // --- Geiger counter velocity sonification ---
  // Sparse clicks 1-3Hz normal → continuous crackle at 15-20Hz merge threshold
  geigerSynth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0, decay: 0.003, sustain: 0, release: 0.002 },
    volume: -15,
  })
  geigerFilter = new Tone.Filter({ type: 'bandpass', frequency: 4000, Q: 2 })
  geigerGain = new Tone.Gain(0)
  geigerSynth.connect(geigerFilter)
  geigerFilter.connect(geigerGain)
  geigerGain.connect(masterCompressor)

  // --- Oximeter pitch mapping (formant deviation → semitone drops) ---
  oximeterOsc = new Tone.Oscillator({ type: 'triangle', frequency: oximeterBasePitch, volume: -25 })
  oximeterGain = new Tone.Gain(0)
  oximeterOsc.connect(oximeterGain)
  oximeterGain.connect(masterCompressor)

  // --- Portal entry SFX ---
  portalMembrane = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 4,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 1.5 },
    volume: -10,
  }).connect(masterCompressor)

  portalSub = new Tone.Oscillator({ type: 'custom', partials: [0, 1, 0.75, 0.5, 0.25], frequency: 40, volume: -18 } as unknown as Tone.RecursivePartial<Tone.OmniOscillatorOptions>)
  portalSubGain = new Tone.Gain(0)
  portalFilter = new Tone.Filter({ type: 'lowpass', frequency: 200 })
  portalSub.connect(portalFilter)
  portalFilter.connect(portalSubGain)
  portalSubGain.connect(masterCompressor)

  // --- Warp transition SFX ---
  warpFilter = new Tone.Filter({ type: 'lowpass', frequency: 200 })
  warpNoise = new Tone.NoiseSynth({
    noise: { type: 'brown' },
    envelope: { attack: 0.05, decay: 0.6, sustain: 0, release: 0.4 },
    volume: -10,
  })
  warpNoise.connect(warpFilter)
  warpFilter.connect(masterCompressor)

  warpChirp = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.6, sustain: 0, release: 0.4 },
    volume: -12,
  }).connect(masterCompressor)

  // --- Scan sweep ---
  scanSweepSynth = new Tone.FMSynth({
    harmonicity: 3,
    modulationIndex: 12,
    oscillator: { type: 'square' },
    modulation: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.25, sustain: 0, release: 0.05 },
    modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.05 },
    volume: -18,
  }).connect(masterCompressor)

  // --- Data point ping ---
  dataPointSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    volume: -22,
  }).connect(masterCompressor)

  // --- Verdict sub rumble ---
  verdictSub = new Tone.Oscillator({ type: 'custom', partials: [0, 1, 0.75, 0.5, 0.25], frequency: 30, volume: -40 } as unknown as Tone.RecursivePartial<Tone.OmniOscillatorOptions>)
  verdictSubGain = new Tone.Gain(0)
  verdictSub.connect(verdictSubGain)
  verdictSubGain.connect(masterCompressor)

  // --- Generative soundtrack (dark minor arpeggios) ---
  soundtrackSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.3, decay: 0.6, sustain: 0.2, release: 1.5 },
    volume: -24,
  })
  soundtrackFilter = new Tone.Filter({ type: 'lowpass', frequency: 600 })
  soundtrackGain = new Tone.Gain(0)
  soundtrackSynth.connect(soundtrackFilter)
  soundtrackFilter.connect(soundtrackGain)
  soundtrackGain.connect(masterCompressor)

  const chords: string[][] = [
    ['A2', 'C3', 'E3'],      // Am
    ['D2', 'F3', 'A3'],      // Dm
    ['E2', 'G#3', 'B3'],     // E (dominant)
    ['A2', 'C3', 'E3'],      // Am (return)
  ]

  soundtrackLoop = new Tone.Loop((time: number) => {
    if (!soundtrackSynth || !soundtrackActive) return
    const chord = chords[soundtrackChordIndex % chords.length]
    // Arpeggiate: play each note 200ms apart
    chord.forEach((note, i) => {
      soundtrackSynth!.triggerAttackRelease(note, '2n', time + i * 0.2)
    })
    soundtrackChordIndex++
    // Slowly open filter over time for evolving harmonic content
    if (soundtrackFilter) {
      const freq = 600 + (soundtrackChordIndex % 16) * 50
      soundtrackFilter.frequency.linearRampTo(freq, 2, time)
    }
  }, '2m')

  Tone.Transport.bpm.value = DEFAULT_TICK_BPM
  initialized = true
}

export const SoundEngine = {
  init: async (): Promise<void> => {
    ensureInitializedGraph()
    if (!contextIsRunning()) {
      await Tone.start()
    }
  },

  /** Expose master compressor node for uiEarcons routing */
  masterCompressorNode: (): Tone.Compressor | null => masterCompressor,

  dispose: (): void => {
    processingTickLoop?.stop(0)
    processingTickLoop?.dispose()
    processingTickLoop = null

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
      // velocity chain removed in Phase 3 (replaced by Geiger+Oximeter)
      uploadSine, uploadAM, uploadMembrane,
      riserNoise, riserFilter, riserVolume,
      subImpact, noiseBurst, noiseBurstFilter,
      iecAlarmSynth, iecAlarmGain,
      geigerSynth, geigerFilter, geigerGain,
      oximeterOsc, oximeterGain,
      tensionPad, tensionFilter, tensionGain,
      portalMembrane, portalSub, portalSubGain, portalFilter,
      warpNoise, warpFilter, warpChirp,
      scanSweepSynth, dataPointSynth,
      verdictSub, verdictSubGain,
      soundtrackSynth, soundtrackFilter, soundtrackGain,
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
    // velocity and horror chains removed in Phase 3 (replaced by Geiger+Oximeter and IEC alarm)
    iecAlarmSynth = null; iecAlarmGain = null
    iecAlarmLoop?.stop(0); iecAlarmLoop?.dispose(); iecAlarmLoop = null
    geigerSynth = null; geigerFilter = null; geigerGain = null
    if (geigerInterval) { clearTimeout(geigerInterval); geigerInterval = null }
    oximeterOsc = null; oximeterGain = null
    tensionPad = null; tensionFilter = null; tensionGain = null
    portalMembrane = null; portalSub = null; portalSubGain = null; portalFilter = null
    warpNoise = null; warpFilter = null; warpChirp = null
    scanSweepSynth = null; dataPointSynth = null
    verdictSub = null; verdictSubGain = null
    masterCompressor = masterReverb = masterEq = null
    masterHighpass = null; masterLimiter = null; masterBus = null

    initialized = false
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
    // Start oscillators on first use (they can only be started once in Tone.js)
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
    // Start oscillators + LFO on first use
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
    // Deep resonant hit
    portalMembrane?.triggerAttackRelease('E1', '2n', now)
    // Sub-bass swell over 2s matching camera animation
    if (portalSubGain) {
      portalSubGain.gain.setTargetAtTime(0.6, now, 0.1)
      portalSubGain.gain.setTargetAtTime(0, now + 1.8, 0.2)
    }
    // Filter sweep (reverb-like opening)
    if (portalFilter) {
      portalFilter.frequency.setValueAtTime(200, now)
      portalFilter.frequency.linearRampToValueAtTime(3000, now + 2)
    }
  },

  playWarpTransition: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    // Filtered noise whoosh (200→8000Hz sweep)
    if (warpFilter) {
      warpFilter.frequency.setValueAtTime(200, now)
      warpFilter.frequency.linearRampToValueAtTime(8000, now + 0.8)
    }
    warpNoise?.triggerAttackRelease(1, now)
    // Sine chirp (200→2000Hz)
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
      processingTickLoop.start(0)
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
    // Start Geiger clicks at low baseline rate
    geigerActive = true
    if (geigerGain) geigerGain.gain.setTargetAtTime(0.3, Tone.now(), 0.3)
    // Start oximeter monitoring tone
    if (oximeterGain) oximeterGain.gain.setTargetAtTime(0.5, Tone.now(), 0.5)
  },

  stopTicking: (): void => {
    if (!initialized || !processingTickLoop) return
    processingTickLoop.stop(0)
    tickingActive = false
    tickJitterActive = false
    // Fade out tension pad
    if (tensionGain) {
      const now = Tone.now()
      tensionGain.gain.setTargetAtTime(0, now, 0.3)
    }
    // Stop Geiger clicks
    geigerActive = false
    if (geigerInterval) { clearTimeout(geigerInterval); geigerInterval = null }
    if (geigerGain) geigerGain.gain.setTargetAtTime(0, Tone.now(), 0.2)
    // Stop oximeter
    if (oximeterGain) oximeterGain.gain.setTargetAtTime(0, Tone.now(), 0.2)
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

  playDataPoint: (velocity: number): void => {
    if (!requireAudioReady() || !dataPointSynth) return
    // Low velocity = high pitch (C6=1047), high velocity = low pitch (C3=131)
    const maxVel = 100
    const t = clamp(velocity / maxVel, 0, 1)
    const freq = 1047 - t * (1047 - 131)
    dataPointSynth.triggerAttackRelease(freq, 0.05)
  },

  // ==================== RISER / SILENCE / IMPACT ====================

  startRiser: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    riserNoise?.start(now)
    riserFilter?.frequency.setValueAtTime(50, now)
    riserFilter?.frequency.linearRampToValueAtTime(8000, now + 5)
    riserVolume?.volume.setValueAtTime(-Infinity, now)
    riserVolume?.volume.linearRampToValueAtTime(-5, now + 5)
  },

  stopRiser: (): void => {
    if (!initialized) return
    riserNoise?.stop()
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
      // Ensure oscillators are running before ramping gain
      if (!ambientOscsStarted) {
        ambientOsc?.start()
        ambientLfo?.start()
        ambientOsc2?.start()
        ambientOscsStarted = true
      }
      ambientGain.gain.setTargetAtTime(0.02, now, 0.01)
      ambientGain.gain.setTargetAtTime(0.15, now + 4, 1)
    }
  },

  playNoiseBurst: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    noiseBurst?.triggerAttackRelease('8n', now)
    if (ambientGain) {
      // Ensure oscillators are running before ramping gain
      if (!ambientOscsStarted) {
        ambientOsc?.start()
        ambientLfo?.start()
        ambientOsc2?.start()
        ambientOscsStarted = true
      }
      ambientGain.gain.setTargetAtTime(0.02, now, 0.01)
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
    iecAlarmLoop?.start(Tone.now())
    Tone.Transport.start(Tone.now())
  },

  stopIECAlarm: (): void => {
    if (!iecAlarmActive) return
    iecAlarmActive = false
    if (iecAlarmGain) {
      iecAlarmGain.gain.setTargetAtTime(0, Tone.now(), 0.1)
    }
    setTimeout(() => {
      iecAlarmLoop?.stop(0)
    }, 500)
  },

  // ==================== VERDICT ====================

  /** Dramatic verdict build: fade to silence, hold sub rumble, then slam back */
  triggerVerdictBuild: (onReady: () => void): void => {
    if (!masterBus) {
      onReady()
      return
    }
    const now = Tone.now()
    if (!verdictSubStarted) {
      verdictSub?.start()
      verdictSubStarted = true
    }
    // Fade everything to silence over 0.5s
    masterBus.volume.setValueAtTime(0, now)
    masterBus.volume.linearRampToValueAtTime(-60, now + 0.5)
    // Start barely audible sub rumble
    if (verdictSubGain) {
      verdictSubGain.gain.setTargetAtTime(0.3, now + 0.3, 0.1)
    }
    // After 1.5s total silence, slam back
    setTimeout(() => {
      if (verdictSubGain) {
        verdictSubGain.gain.setTargetAtTime(0, Tone.now(), 0.05)
      }
      if (masterBus) {
        masterBus.volume.setValueAtTime(-60, Tone.now())
        masterBus.volume.linearRampToValueAtTime(0, Tone.now() + 0.05)
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
      // Release after 6s
      setTimeout(() => {
        genuinePad?.triggerRelease(['C3', 'E3', 'G3', 'B3'])
        if (genuinePadGain) {
          genuinePadGain.gain.setTargetAtTime(0, Tone.now(), 1)
        }
      }, 6000)
    } else {
      ambientOsc?.frequency.linearRampTo(150, 2, now)
      ambientOsc2?.frequency.linearRampTo(160, 2, now)
      if (ambientOsc2) ambientOsc2.type = 'sawtooth'
    }
  },

  triggerDeepfakeReveal: (): void => {
    SoundEngine.stopTicking()
    // Acoustic vacuum: fade everything to near-silence for horror lean-in
    SoundEngine.triggerAcousticVacuum()
    setTimeout(() => {
      SoundEngine.startRiser()
    }, 1500)
    setTimeout(() => {
      SoundEngine.restoreFromVacuum()
      SoundEngine.triggerSilence()
      setTimeout(() => {
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

  /** Geiger counter: velocity maps to click rate (1-3Hz normal → 15-20Hz crackle) */
  updateVelocity: (velocity: number): void => {
    if (!requireAudioReady()) return
    const safeVelocity = Math.max(0, velocity)
    if (!oximeterStarted) {
      oximeterOsc?.start()
      oximeterStarted = true
    }

    // --- Geiger click rate ---
    // Normal speech ~8-15cm/s = 1-3 Hz clicks
    // Deepfake >50cm/s = 15-20 Hz (continuous crackle)
    const clickRate = clamp(safeVelocity * 0.3, 0.5, 25)
    const clickIntervalMs = 1000 / clickRate

    // Clear previous interval and set new one
    if (geigerInterval) clearTimeout(geigerInterval)
    if (geigerGain && safeVelocity > 0.1) {
      geigerGain.gain.setTargetAtTime(1, Tone.now(), 0.05)
      const scheduleClick = () => {
        if (!geigerActive || !geigerSynth) return
        geigerSynth.triggerAttackRelease('32n')
        // Add ±20% jitter to prevent regularity
        const jitter = clickIntervalMs * (0.8 + Math.random() * 0.4)
        geigerInterval = setTimeout(scheduleClick, jitter)
      }
      geigerActive = true
      scheduleClick()
    } else {
      geigerActive = false
      if (geigerGain) geigerGain.gain.setTargetAtTime(0, Tone.now(), 0.1)
    }

    // --- Oximeter pitch: deviation maps to semitone drops ---
    // Normal ~0-15cm/s = C5 (523Hz), each 10cm/s deviation = 1 semitone drop
    if (oximeterOsc && oximeterGain) {
      const semitonesDrop = Math.floor(safeVelocity / 10)
      const freq = oximeterBasePitch * Math.pow(2, -semitonesDrop / 12)
      oximeterOsc.frequency.setTargetAtTime(Math.max(freq, 100), Tone.now(), 0.1)
      // Fade in oximeter when velocity > 5
      const oxGain = safeVelocity > 5 ? 1 : 0
      oximeterGain.gain.setTargetAtTime(oxGain, Tone.now(), 0.2)
    }
  },

  // ==================== GENERATIVE SOUNDTRACK ====================

  startSoundtrack: (): void => {
    if (!requireAudioReady() || soundtrackActive) return
    if (!soundtrackGain || !soundtrackLoop) return
    soundtrackActive = true
    soundtrackChordIndex = 0
    const now = Tone.now()
    soundtrackGain.gain.setTargetAtTime(0.7, now, 1.5)
    soundtrackLoop.start(now)
    Tone.Transport.start(now)
  },

  stopSoundtrack: (): void => {
    if (!soundtrackActive) return
    soundtrackActive = false
    if (soundtrackGain) {
      soundtrackGain.gain.setTargetAtTime(0, Tone.now(), 0.5)
    }
    setTimeout(() => {
      soundtrackLoop?.stop(0)
    }, 2000)
  },

  // ==================== ACOUSTIC VACUUM ====================

  triggerAcousticVacuum: (): void => {
    if (!requireAudioReady() || vacuumActive) return
    vacuumActive = true
    const now = Tone.now()
    // Save current gain levels
    preVacuumAmbientGain = ambientGain?.gain.value ?? 0
    preVacuumBgGain = bgLayerGain?.gain.value ?? 0
    preVacuumTensionGain = tensionGain?.gain.value ?? 0
    preVacuumSoundtrackGain = soundtrackGain?.gain.value ?? 0
    // Fade to near-silence over 1.5s
    ambientGain?.gain.setTargetAtTime(0.02, now, 0.4)
    bgLayerGain?.gain.setTargetAtTime(0.01, now, 0.3)
    tensionGain?.gain.setTargetAtTime(0.01, now, 0.3)
    soundtrackGain?.gain.setTargetAtTime(0.02, now, 0.4)
  },

  restoreFromVacuum: (): void => {
    if (!vacuumActive) return
    vacuumActive = false
    const now = Tone.now()
    // Restore saved gain levels
    ambientGain?.gain.setTargetAtTime(preVacuumAmbientGain, now, 0.3)
    bgLayerGain?.gain.setTargetAtTime(preVacuumBgGain, now, 0.3)
    tensionGain?.gain.setTargetAtTime(preVacuumTensionGain, now, 0.3)
    soundtrackGain?.gain.setTargetAtTime(preVacuumSoundtrackGain, now, 0.3)
  },


  // ==================== TICK JITTER (HEARTBEAT DISRUPTION) ====================

  /** Enable arrhythmic tick jitter — interval varies ±50ms to trigger sympathetic nervous response */
  enableTickJitter: (): void => {
    if (!requireAudioReady() || !processingTickLoop) return
    tickJitterActive = true
    // Replace steady loop with jittered scheduling
    processingTickLoop.stop(0)
    const jitterTick = () => {
      if (!tickJitterActive || !processingTickSynth) return
      processingTickSynth.triggerAttackRelease('32n', Tone.now())
      // IEC spec: interval jitter >50ms = sympathetic nervous system response
      const baseInterval = (60 / (Tone.Transport.bpm.value || 120)) * 1000
      const jitter = baseInterval * (0.7 + Math.random() * 0.6)  // ±30% variation
      setTimeout(jitterTick, jitter)
    }
    jitterTick()
  },

  disableTickJitter: (): void => {
    tickJitterActive = false
    // Resume steady loop if still ticking
    if (tickingActive && processingTickLoop) {
      processingTickLoop.start(0)
    }
  },

  // ==================== GEIGER COUNTER CONTROL ====================

  startGeigerClicks: (): void => {
    if (!requireAudioReady()) return
    geigerActive = true
    if (geigerGain) geigerGain.gain.setTargetAtTime(1, Tone.now(), 0.1)
  },

  stopGeigerClicks: (): void => {
    geigerActive = false
    if (geigerInterval) { clearTimeout(geigerInterval); geigerInterval = null }
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

  isInitialized: (): boolean => initialized,
}
