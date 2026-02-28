import * as Tone from 'tone'

type VerdictResult = 'genuine' | 'deepfake'

let initialized = false

let masterCompressor: Tone.Compressor | null = null
let masterHighpass: Tone.Filter | null = null
let masterLimiter: Tone.Limiter | null = null
let masterBus: Tone.Volume | null = null

let ambientOsc: Tone.Oscillator | null = null
let ambientGain: Tone.Gain | null = null
let ambientLfo: Tone.LFO | null = null

let uploadSine: Tone.Synth | null = null
let uploadAM: Tone.AMSynth | null = null
let uploadMembrane: Tone.MembraneSynth | null = null

let riserNoise: Tone.Noise | null = null
let riserFilter: Tone.Filter | null = null
let riserVolume: Tone.Volume | null = null

let subImpact: Tone.MembraneSynth | null = null
let noiseBurst: Tone.NoiseSynth | null = null
let noiseBurstFilter: Tone.Filter | null = null

let horrorSynth: Tone.FMSynth | null = null
let horrorLfo: Tone.LFO | null = null
let horrorTremolo: Tone.Tremolo | null = null

let ambientOsc2: Tone.Oscillator | null = null

let scannerBeepSynth: Tone.Synth | null = null

let processingTickSynth: Tone.MetalSynth | null = null
let processingTickLoop: Tone.Loop | null = null
let tickingActive = false

let genuineStingSynth: Tone.PolySynth | null = null
let deepfakeStingSynth: Tone.PolySynth | null = null
let deepfakeDistortion: Tone.Distortion | null = null

let velocityOsc: Tone.Oscillator | null = null
let velocityFilter: Tone.Filter | null = null
let velocityDistortion: Tone.Distortion | null = null
let velocityCrusher: Tone.BitCrusher | null = null
let velocityGain: Tone.Gain | null = null

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

  masterCompressor = new Tone.Compressor({ threshold: -12, ratio: 4 })
  masterHighpass = new Tone.Filter({ type: 'highpass', frequency: 120 })
  masterLimiter = new Tone.Limiter({ threshold: -1 })
  masterBus = new Tone.Volume(0)

  masterCompressor.connect(masterHighpass)
  masterHighpass.connect(masterLimiter)
  masterLimiter.connect(masterBus)
  masterBus.connect(Tone.getDestination())

  ambientOsc = new Tone.Oscillator({
    type: 'triangle',
    frequency: 150,
    volume: -25,
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

  uploadSine = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
  }).connect(masterCompressor)

  uploadAM = new Tone.AMSynth({
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 }
  }).connect(masterCompressor)

  uploadMembrane = new Tone.MembraneSynth({
    pitchDecay: 0.05
  }).connect(masterCompressor)

  riserNoise = new Tone.Noise('white')
  riserFilter = new Tone.Filter(50, 'lowpass')
  riserVolume = new Tone.Volume(-Infinity)
  riserNoise.chain(riserFilter, riserVolume, masterCompressor)

  subImpact = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 1.4 }
  }).connect(masterCompressor)

  noiseBurst = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.3 }
  })
  noiseBurstFilter = new Tone.Filter(8000, 'highpass')
  noiseBurst.chain(noiseBurstFilter, masterCompressor)

  horrorSynth = new Tone.FMSynth({
    harmonicity: 3.14,
    modulationIndex: 10,
    oscillator: { type: 'sine' },
    modulation: { type: 'square' },
    envelope: { attack: 2, decay: 1, sustain: 1, release: 2 }
  })
  horrorLfo = new Tone.LFO({ frequency: 0.1, min: 2.5, max: 4.5 })
  horrorTremolo = new Tone.Tremolo(19, 1).start()
  horrorLfo.connect(horrorSynth.harmonicity)
  horrorSynth.chain(horrorTremolo, masterCompressor)

  scannerBeepSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.1,
    },
    volume: -15,
  }).connect(masterCompressor)

  processingTickSynth = new Tone.MetalSynth({
    volume: -10,
    envelope: {
      attack: 0.001,
      decay: 0.1,
      release: 0.05,
    },
    harmonicity: 3.1,
    modulationIndex: 16,
    resonance: 1200,
    octaves: 1.5,
  }).connect(masterCompressor)

  processingTickLoop = new Tone.Loop((time: number) => {
    if (!processingTickSynth) return
    processingTickSynth.triggerAttackRelease('16n', time)
  }, '4n')

  genuineStingSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.02,
      decay: 0.2,
      sustain: 0.8,
      release: 0.8,
    },
    volume: -5,
  }).connect(masterCompressor)

  deepfakeStingSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: {
      attack: 0.5,
      decay: 0.2,
      sustain: 0.9,
      release: 1.0,
    },
    volume: -5,
  })
  deepfakeDistortion = new Tone.Distortion(0.5)
  deepfakeStingSynth.connect(deepfakeDistortion)
  deepfakeDistortion.connect(masterCompressor)

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

  dispose: (): void => {
    processingTickLoop?.stop(0)
    processingTickLoop?.dispose()
    processingTickLoop = null

    Tone.Transport.stop()
    Tone.Transport.cancel(0)
    tickingActive = false

    ambientLfo?.dispose()
    ambientLfo = null
    ambientOsc?.dispose()
    ambientOsc = null
    ambientGain?.dispose()
    ambientGain = null

    scannerBeepSynth?.dispose()
    scannerBeepSynth = null

    processingTickSynth?.dispose()
    processingTickSynth = null

    genuineStingSynth?.dispose()
    genuineStingSynth = null

    deepfakeStingSynth?.dispose()
    deepfakeStingSynth = null
    deepfakeDistortion?.dispose()
    deepfakeDistortion = null

    velocityOsc?.dispose()
    velocityOsc = null
    velocityFilter?.dispose()
    velocityFilter = null
    velocityDistortion?.dispose()
    velocityDistortion = null
    velocityCrusher?.dispose()
    velocityCrusher = null
    velocityGain?.dispose()
    velocityGain = null

    masterCompressor?.dispose()
    masterCompressor = null
    masterHighpass?.dispose()
    masterHighpass = null
    masterLimiter?.dispose()
    masterLimiter = null
    masterBus?.dispose()
    masterBus = null

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

  playBeep: (): void => {
    if (!requireAudioReady() || !scannerBeepSynth) return
    scannerBeepSynth.triggerAttackRelease(1200, '16n')
  },

  startTicking: (): void => {
    if (!requireAudioReady() || !processingTickLoop) return
    if (!tickingActive) {
      processingTickLoop.start(0)
      tickingActive = true
    }
    if (Tone.Transport.state !== 'started') {
    Tone.Transport.bpm.value = DEFAULT_TICK_BPM
    Tone.Transport.bpm.rampTo(120, 8)
    }
  },

  stopTicking: (): void => {
    if (!initialized || !processingTickLoop) return
    processingTickLoop.stop(0)
    tickingActive = false
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop()
    }
  },

  setTickBPM: (bpm: number): void => {
    if (!initialized) return
    const now = Tone.now()
    const clampedBpm = clamp(bpm, 60, 120)
    Tone.Transport.bpm.setTargetAtTime(clampedBpm, now, 0.08)
  },

  playUploadThunk: (): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    uploadSine?.triggerAttackRelease(800 + (Math.random() * 80 - 40), '64n', now)
    uploadAM?.triggerAttackRelease(400, '16n', now)
    uploadMembrane?.triggerAttackRelease('C2', '8n', now)
  },

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

  playResolution: (type: 'genuine' | 'deepfake'): void => {
    if (!requireAudioReady()) return
    const now = Tone.now()
    if (type === 'genuine') {
      // Use linearRampTo to avoid Tone.js v15 exponentialRamp RangeError
      // when current value equals target (degenerate [0,0] range)
      ambientOsc?.frequency.linearRampTo(150, 2, now)
      ambientOsc2?.frequency.linearRampTo(225, 2, now)
      if (ambientOsc2) ambientOsc2.type = 'sine'
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

    const activeGain = safeVelocity > 0.1 ? 1 : 0
    velocityGain.gain.setTargetAtTime(activeGain, now, 0.06)
  },

  isInitialized: (): boolean => initialized,
}
