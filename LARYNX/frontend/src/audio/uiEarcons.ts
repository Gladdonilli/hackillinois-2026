import * as Tone from 'tone'

// Module-scoped Tone.js singletons for UI earcon sounds
// Per project anti-patterns: NEVER instantiate Tone inside React components

let hoverSynth: Tone.Synth | null = null
let clickSynth: Tone.Synth | null = null
let swooshNoise: Tone.NoiseSynth | null = null
let swooshFilter: Tone.Filter | null = null
let earconGain: Tone.Gain | null = null

function ensureInit() {
  if (earconGain) return
  earconGain = new Tone.Gain(0.5).toDestination()

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
    swooshFilter.frequency.setValueAtTime(800, Tone.now())
    swooshFilter.frequency.linearRampToValueAtTime(4000, Tone.now() + 0.15)
  }
  swooshNoise?.triggerAttackRelease(0.15)
}
