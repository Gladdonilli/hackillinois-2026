// Force NODE_ENV before any imports — VM has NODE_ENV=production in ~/.bashrc
// which causes React to load production bundle where act() throws
process.env.NODE_ENV = 'test'

import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// ─── Tone.js mock ───────────────────────────────────────────────────
// SoundEngine.ts uses ~20 Tone.js classes. We mock them all as lightweight
// stubs that track calls without requiring WebAudio.

function createMockParam(defaultValue = 0) {
  return {
    value: defaultValue,
    setValueAtTime: vi.fn(function (this: { value: number }, v: number) { this.value = v; return this }),
    linearRampToValueAtTime: vi.fn(function (this: { value: number }, v: number) { this.value = v; return this }),
    linearRampTo: vi.fn(function (this: { value: number }, v: number) { this.value = v; return this }),
    exponentialRampToValueAtTime: vi.fn(),
    cancelAndHoldAtTime: vi.fn(),
    setTargetAtTime: vi.fn(function (this: { value: number }, v: number) { this.value = v; return this }),
    cancelScheduledValues: vi.fn(),
    rampTo: vi.fn(),
  }
}

class MockToneNode {
  connect() { return this }
  disconnect() { return this }
  chain(..._args: unknown[]) { return this }
  dispose() {}
  toDestination() { return this }
}

class MockSource extends MockToneNode {
  state: 'started' | 'stopped' = 'stopped'
  volume = createMockParam(-12)
  start() { this.state = 'started'; return this }
  stop(_time?: number) { this.state = 'stopped'; return this }
}

class MockSynth extends MockSource {
  frequency = createMockParam(440)
  triggerAttackRelease = vi.fn()
  triggerAttack = vi.fn()
  triggerRelease = vi.fn()
}

class MockOscillator extends MockSource {
  frequency = createMockParam(440)
  type = 'sine'
  constructor(opts?: Record<string, unknown>) {
    super()
    if (opts?.frequency) this.frequency.value = opts.frequency as number
    if (opts?.type) this.type = opts.type as string
    if (opts?.volume !== undefined) this.volume.value = opts.volume as number
  }
}

class MockNoise extends MockSource {
  constructor(_opts?: Record<string, unknown>) { super() }
}

class MockGain extends MockToneNode {
  gain = createMockParam(0)
  constructor(val?: number) {
    super()
    if (val !== undefined) this.gain.value = val
  }
}

class MockVolume extends MockToneNode {
  volume = createMockParam(0)
  mute = false
  constructor(val?: number) {
    super()
    if (val !== undefined) this.volume.value = val
  }
}

class MockFilter extends MockToneNode {
  frequency = createMockParam(1000)
  Q = createMockParam(1)
  constructor(opts?: Record<string, unknown> | number) {
    super()
    if (typeof opts === 'number') this.frequency.value = opts
    else if (opts?.frequency) this.frequency.value = opts.frequency as number
  }
}

class MockCompressor extends MockToneNode {
  constructor(_opts?: Record<string, unknown>) { super() }
}

class MockReverb extends MockToneNode {
  constructor(_opts?: Record<string, unknown>) { super() }
}

class MockEQ3 extends MockToneNode {
  constructor(_opts?: Record<string, unknown>) { super() }
}

class MockLimiter extends MockToneNode {
  constructor(_opts?: Record<string, unknown>) { super() }
}

class MockDistortion extends MockToneNode {
  constructor(_val?: number) { super() }
}

class MockLFO extends MockSource {
  frequency = createMockParam(1)
  min = 0
  max = 1
  constructor(opts?: Record<string, unknown>) {
    super()
    if (opts?.frequency) this.frequency.value = opts.frequency as number
  }
}

class MockLoop extends MockToneNode {
  callback: ((time: number) => void) | null = null
  state: 'started' | 'stopped' = 'stopped'
  constructor(cb?: (time: number) => void, _interval?: string) {
    super()
    this.callback = cb ?? null
  }
  start(_time?: number) { this.state = 'started'; return this }
  stop(_time?: number) { this.state = 'stopped'; return this }
}

class MockPolySynth extends MockSource {
  constructor(_SynthType?: unknown, _opts?: Record<string, unknown>) { super() }
  triggerAttackRelease = vi.fn()
  triggerAttack = vi.fn()
  triggerRelease = vi.fn()
}

class MockAMSynth extends MockSynth {
  constructor(_opts?: Record<string, unknown>) { super() }
}

class MockMembraneSynth extends MockSynth {
  constructor(_opts?: Record<string, unknown>) { super() }
}

class MockMetalSynth extends MockSource {
  constructor(_opts?: Record<string, unknown>) { super() }
  triggerAttackRelease = vi.fn()
}

class MockNoiseSynth extends MockSource {
  noise = { type: 'white' }
  constructor(_opts?: Record<string, unknown>) { super() }
  triggerAttackRelease = vi.fn()
}

class MockFMSynth extends MockSynth {
  constructor(_opts?: Record<string, unknown>) { super() }
}

const mockTransport = {
  bpm: createMockParam(60),
  state: 'stopped' as 'started' | 'stopped',
  start: vi.fn(function (this: typeof mockTransport) { this.state = 'started' }),
  stop: vi.fn(function (this: typeof mockTransport) { this.state = 'stopped' }),
  cancel: vi.fn(),
}

const mockContext = {
  state: 'running' as AudioContextState,
  resume: vi.fn(),
}

vi.mock('tone', () => ({
  default: {},
  Oscillator: MockOscillator,
  Noise: MockNoise,
  Synth: MockSynth,
  PolySynth: MockPolySynth,
  AMSynth: MockAMSynth,
  MembraneSynth: MockMembraneSynth,
  MetalSynth: MockMetalSynth,
  NoiseSynth: MockNoiseSynth,
  FMSynth: MockFMSynth,
  Volume: MockVolume,
  Gain: MockGain,
  Compressor: MockCompressor,
  Filter: MockFilter,
  Reverb: MockReverb,
  EQ3: MockEQ3,
  Limiter: MockLimiter,
  Distortion: MockDistortion,
  LFO: MockLFO,
  Loop: MockLoop,
  Transport: mockTransport,
  start: vi.fn().mockResolvedValue(undefined),
  now: vi.fn(() => 0),
  getContext: vi.fn(() => mockContext),
  getDestination: vi.fn(() => new MockToneNode()),
  gainToDb: vi.fn((g: number) => 20 * Math.log10(Math.max(g, 0.0001))),
}))
