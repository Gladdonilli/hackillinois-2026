import * as Tone from 'tone'

type VerdictResult = 'genuine' | 'deepfake'

let initialized = false

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

// Horror
let horrorSynth: Tone.FMSynth | null = null
let horrorLfo: Tone.LFO | null = null
let horrorTremolo: Tone.Tremolo | null = null

// Scanner / ticking
let scannerBeepSynth: Tone.Synth | null = null
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

// Velocity reactive
let velocityOsc: Tone.Oscillator | null = null
let velocityFilter: Tone.Filter | null = null
let velocityDistortion: Tone.Distortion | null = null
let velocityCrusher: Tone.BitCrusher | null = null
let velocityGain: Tone.Gain | null = null

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
let scanSweepSynth: Tone.Synth | null = null

// Data point ping
let dataPointSynth: Tone.Synth | null = null

// Verdict sub rumble
let verdictSub: Tone.Oscillator | null = null
let verdictSubGain: Tone.Gain | null = null

const MIN_MASTER_GAIN = 0.0001
const DEFAULT_TICK_BPM = 60

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
  ambientOsc.start()
  ambientLfo.start()

  ambientOsc2 = new Tone.Oscillator({
    type: 'sine',
    frequency: 150,
    volume: -25,
  })
  ambientOsc2.connect(ambientGain)
  ambientOsc2.start()

  // --- Background ambient layer (3 detuned sines) ---
  bgLayerGain = new Tone.Gain(0)
  bgLayerGain.connect(masterCompressor)
  bgLayerLfo = new Tone.LFO({ frequency: 0.05, min: 0.3, max: 0.7 })
  bgLayerLfo.connect(bgLayerGain.gain)
  bgLayerLfo.start()

  bgLayer1 = new Tone.Oscillator({ type: 'sine', frequency: 148, volume: -35 })
  bgLayer2 = new Tone.Oscillator({ type: 'sine', frequency: 150, volume: -35 })
  bgLayer3 = new Tone.Oscillator({ type: 'sine', frequency: 152, volume: -35 })
  bgLayer1.connect(bgLayerGain)
  bgLayer2.connect(bgLayerGain)
  bgLayer3.connect(bgLayerGain)
  bgLayer1.start()
  bgLayer2.start()
  bgLayer3.start()

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
    oscillator: { type: 'sine' },
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

  // --- Horror FMSynth ---
  horrorSynth = new Tone.FMSynth({
    harmonicity: 3.14,
    modulationIndex: 10,
    oscillator: { type: 'sine' },
    modulation: { type: 'square' },
    envelope: { attack: 2, decay: 1, sustain: 1, release: 2 },
    volume: -8,
  })
  horrorLfo = new Tone.LFO({ frequency: 0.1, min: 2.5, max: 4.5 })
  horrorTremolo = new Tone.Tremolo(19, 1).start()
  horrorLfo.connect(horrorSynth.harmonicity)
  horrorSynth.chain(horrorTremolo, masterCompressor)

  // --- Scanner beep ---
  scannerBeepSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
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
  tensionPad.start()

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

  // --- Velocity reactive ---
  velocityOsc = new Tone.Oscillator({
    type: 'sawtooth',
    frequency: 200,
    volume: -20,
  })
  velocityFilter = new Tone.Filter({ type: 'lowpass', frequency: 400 })
  velocityDistortion = new Tone.Distortion(0)
  velocityCrusher = new Tone.BitCrusher(8)
  velocityGain = new Tone.Gain(0)

  velocityOsc.connect(velocityFilter)
  velocityFilter.connect(velocityDistortion)
  velocityDistortion.connect(velocityCrusher)
  velocityCrusher.connect(velocityGain)
  velocityGain.connect(masterCompressor)

  velocityCrusher.wet.value = 0
  velocityOsc.start()

  // --- Portal entry SFX ---
  portalMembrane = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 4,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 1.5 },
    volume: -10,
  }).connect(masterCompressor)

  portalSub = new Tone.Oscillator({ type: 'sine', frequency: 40, volume: -18 })
  portalSubGain = new Tone.Gain(0)
  portalFilter = new Tone.Filter({ type: 'lowpass', frequency: 200 })
  portalSub.connect(portalFilter)
  portalFilter.connect(portalSubGain)
  portalSubGain.connect(masterCompressor)
  portalSub.start()

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
  scanSweepSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.25, sustain: 0, release: 0.05 },
    volume: -18,
  }).connect(masterCompressor)

  // --- Data point ping ---
  dataPointSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    volume: -22,
  }).connect(masterCompressor)

  // --- Verdict sub rumble ---
  verdictSub = new Tone.Oscillator({ type: 'sine', frequency: 30, volume: -40 })
  verdictSubGain = new Tone.Gain(0)
  verdictSub.connect(verdictSubGain)
  verdictSubGain.connect(masterCompressor)
  verdictSub.start()

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
      velocityOsc, velocityFilter, velocityDistortion, velocityCrusher, velocityGain,
      uploadSine, uploadAM, uploadMembrane,
      riserNoise, riserFilter, riserVolume,
      subImpact, noiseBurst, noiseBurstFilter,
      horrorSynth, horrorLfo, horrorTremolo,
      tensionPad, tensionFilter, tensionGain,
      portalMembrane, portalSub, portalSubGain, portalFilter,
      warpNoise, warpFilter, warpChirp,
      scanSweepSynth, dataPointSynth,
      verdictSub, verdictSubGain,
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
    velocityOsc = velocityFilter = velocityDistortion = null
    velocityCrusher = null; velocityGain = null
    uploadSine = null; uploadAM = null; uploadMembrane = null
    riserNoise = null; riserFilter = null; riserVolume = null
    subImpact = null; noiseBurst = null; noiseBurstFilter = null
    horrorSynth = null; horrorLfo = null; horrorTremolo = null
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
    // Start tension pad underneath
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
  },

  stopTicking: (): void => {
    if (!initialized || !processingTickLoop) return
    processingTickLoop.stop(0)
    tickingActive = false
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop()
    }
    // Fade out tension pad
    if (tensionGain) {
      const now = Tone.now()
      tensionGain.gain.setTargetAtTime(0, now, 0.3)
    }
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
      ambientGain.gain.setTargetAtTime(0.02, now, 0.01)
      ambientGain.gain.setTargetAtTime(0.15, now + 4, 1)
    }
  },

  playNoiseBurst: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    noiseBurst?.triggerAttackRelease('8n', now)
    if (ambientGain) {
      ambientGain.gain.setTargetAtTime(0.02, now, 0.01)
      ambientGain.gain.setTargetAtTime(0.15, now + 4, 1)
    }
  },

  // ==================== HORROR ====================

  startHorror: (): void => {
    if (!requireAudioReady()) return
    horrorLfo?.start()
    horrorSynth?.triggerAttack('C2')
  },

  stopHorror: (): void => {
    if (!initialized) return
    horrorSynth?.triggerRelease()
    horrorLfo?.stop()
  },

  // ==================== VERDICT ====================

  /** Dramatic verdict build: fade to silence, hold sub rumble, then slam back */
  triggerVerdictBuild: (onReady: () => void): void => {
    if (!masterBus) {
      onReady()
      return
    }
    const now = Tone.now()
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
    SoundEngine.startRiser()
    setTimeout(() => {
      SoundEngine.triggerSilence()
      setTimeout(() => {
        SoundEngine.playSubImpact()
        SoundEngine.playNoiseBurst()
        SoundEngine.playVerdict('deepfake')
        SoundEngine.startHorror()
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

  // ==================== VELOCITY REACTIVE ====================

  updateVelocity: (velocity: number): void => {
    if (!requireAudioReady()) return
    if (!velocityFilter || !velocityDistortion || !velocityCrusher || !velocityGain) return

    const now = Tone.now()
    const safeVelocity = Math.max(0, velocity)

    const cutoff = clamp(400 + safeVelocity * 50, 400, 12000)
    velocityFilter.frequency.setTargetAtTime(cutoff, now, 0.05)

    const distortionAmount = clamp(safeVelocity / 100, 0, 1)
    velocityDistortion.distortion = distortionAmount

    const crusherWet = safeVelocity > 80 ? 1 : 0
    velocityCrusher.wet.setTargetAtTime(crusherWet, now, 0.03)

    // Scale velocity gain: -20dB baseline → -8dB at max
    const velGainDb = -20 + clamp(safeVelocity / 100, 0, 1) * 12
    if (velocityOsc) velocityOsc.volume.setTargetAtTime(velGainDb, now, 0.05)

    const activeGain = safeVelocity > 0.1 ? 1 : 0
    velocityGain.gain.setTargetAtTime(activeGain, now, 0.06)
  },

  isInitialized: (): boolean => initialized,
}
