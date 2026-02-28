import * as Tone from 'tone'
import { SoundEngine } from './SoundEngine'

// Module-scoped Tone.js singletons for UI earcon sounds
// Per project anti-patterns: NEVER instantiate Tone inside React components

let hoverSynth: Tone.Synth | null = null
let clickSynth: Tone.Synth | null = null
let swooshNoise: Tone.NoiseSynth | null = null
let swooshFilter: Tone.Filter | null = null
let errorSynth: Tone.Synth | null = null
let successSynth: Tone.Synth | null = null
let dropHoverSynth: Tone.Synth | null = null
let transitionNoise: Tone.NoiseSynth | null = null
let transitionChirp: Tone.Synth | null = null
let earconGain: Tone.Gain | null = null

function ensureInit() {
  if (earconGain) return
  
  // Route through master compressor if initialized, else destination
  const master = SoundEngine.masterCompressorNode?.()
  earconGain = new Tone.Gain(1)
  if (master) {
    earconGain.connect(master)
  } else {
    earconGain.toDestination()
  }

  hoverSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
    volume: -25,
  }).connect(earconGain)

  clickSynth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    volume: -15,
  }).connect(earconGain)

  swooshFilter = new Tone.Filter({ type: 'bandpass', frequency: 2000, Q: 2 }).connect(earconGain)
  swooshNoise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.05 },
    volume: -20,
  }).connect(swooshFilter)

  errorSynth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.01 },
    volume: -15,
  }).connect(earconGain)

  successSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.06, sustain: 0, release: 0.01 },
    volume: -18,
  }).connect(earconGain)

  dropHoverSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.01 },
    volume: -22,
  }).connect(earconGain)

  transitionNoise = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.05, decay: 0.15, sustain: 0, release: 0.05 },
    volume: -20,
  }).connect(earconGain)
  
  transitionChirp = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.15, sustain: 0, release: 0.05 },
    volume: -20,
  }).connect(earconGain)
}

export function playHover(): void {
  if (Tone.getContext().state !== 'running') return
  ensureInit()
  hoverSynth?.triggerAttackRelease('C6', 0.02)
}

export function playClick(): void {
  if (Tone.getContext().state !== 'running') return
  ensureInit()
  clickSynth?.triggerAttackRelease('G5', 0.05)
}

export function playSwoosh(): void {
  if (Tone.getContext().state !== 'running') return
  ensureInit()
  if (swooshFilter) {
    const now = Tone.now()
    swooshFilter.frequency.setValueAtTime(800, now)
    swooshFilter.frequency.linearRampToValueAtTime(4000, now + 0.15)
  }
  swooshNoise?.triggerAttackRelease(0.15)
}

export function playNavigationTransition(): void {
  if (Tone.getContext().state !== 'running') return
  ensureInit()
  const now = Tone.now()
  transitionNoise?.triggerAttackRelease(0.2, now)
  transitionChirp?.triggerAttackRelease(0.2, now)
  if (transitionChirp) {
    transitionChirp.oscillator.frequency.setValueAtTime(440, now) // A4
    transitionChirp.oscillator.frequency.linearRampToValueAtTime(880, now + 0.2) // A5
  }
}

export function playError(): void {
  if (Tone.getContext().state !== 'running') return
  ensureInit()
  const now = Tone.now()
  errorSynth?.triggerAttackRelease('C4', 0.1, now)
  errorSynth?.triggerAttackRelease('C#4', 0.1, now + 0.02) // Dissonant buzz
}

export function playSuccess(): void {
  if (Tone.getContext().state !== 'running') return
  ensureInit()
  const now = Tone.now()
  successSynth?.triggerAttackRelease('C5', 0.06, now)
  successSynth?.triggerAttackRelease('E5', 0.06, now + 0.06)
  successSynth?.triggerAttackRelease('G5', 0.06, now + 0.12)
}

export function playDropHover(): void {
  if (Tone.getContext().state !== 'running') return
  ensureInit()
  const now = Tone.now()
  dropHoverSynth?.triggerAttackRelease(0.08, now)
  if (dropHoverSynth) {
    dropHoverSynth.oscillator.frequency.setValueAtTime(523.25, now) // C5
    dropHoverSynth.oscillator.frequency.linearRampToValueAtTime(587.33, now + 0.08) // D5
  }
}
