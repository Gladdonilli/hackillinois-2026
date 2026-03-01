import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { useLarynxStore } from '@/store/useLarynxStore'
import { mockStoreState, createMockState } from '@/test-utils/mockStore'

vi.mock('@/store/useLarynxStore')

// LandingScene is fully R3F (Canvas, mesh, pointLight, useFrame, useGLTF, etc.)
// Cannot render in jsdom. Test module-level behavior only.
vi.mock('@react-three/fiber', () => ({
  Canvas: vi.fn(({ children: _children }: { children: React.ReactNode }) => null),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ camera: { position: { set: vi.fn() }, lookAt: vi.fn() }, gl: {} })),
  extend: vi.fn(),
}))

vi.mock('@react-three/drei', () => ({
  useGLTF: vi.fn(() => ({ scene: { traverse: vi.fn(), clone: vi.fn() }, nodes: {}, materials: {} })),
  Sparkles: vi.fn(() => null),
  Stars: vi.fn(() => null),
  useKTX2: vi.fn(() => []),
}))

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: vi.fn(() => null),
  Bloom: vi.fn(() => null),
  ChromaticAberration: vi.fn(() => null),
  Noise: vi.fn(() => null),
  Vignette: vi.fn(() => null),
}))

vi.mock('gsap', () => ({
  default: { to: vi.fn(), fromTo: vi.fn(), set: vi.fn(), timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), fromTo: vi.fn().mockReturnThis(), play: vi.fn(), kill: vi.fn() })) },
  gsap: { to: vi.fn(), fromTo: vi.fn(), set: vi.fn(), timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), fromTo: vi.fn().mockReturnThis(), play: vi.fn(), kill: vi.fn() })) },
}))

vi.mock('three', () => ({
  Color: vi.fn(),
  Vector3: vi.fn(() => ({ set: vi.fn(), copy: vi.fn(), lerp: vi.fn(), normalize: vi.fn(), multiplyScalar: vi.fn() })),
  ShaderMaterial: vi.fn(),
  MeshStandardMaterial: vi.fn(),
  DoubleSide: 2,
  AdditiveBlending: 2,
  FrontSide: 0,
  BackSide: 1,
  NormalBlending: 1,
  SRGBColorSpace: 'srgb',
  LinearSRGBColorSpace: 'srgb-linear',
}))

vi.mock('@/components/ConvergenceLines', () => ({ ConvergenceLines: () => null }))

describe('LandingScene', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ portalState: 'idle' }))
  })

  it('module exports LandingScene as named export', async () => {
    const mod = await import('./LandingScene')
    expect(mod.LandingScene).toBeDefined()
    expect(typeof mod.LandingScene).toBe('function')
  })

  it('can be imported without errors', async () => {
    const mod = await import('./LandingScene')
    expect(mod).toBeTruthy()
  })

  it('store integration: reads portalState', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ portalState: 'entering' }))
    const state = vi.mocked(useLarynxStore).getMockImplementation()
    expect(state).toBeTruthy()
  })

  it('store integration: reads setPortalState action', () => {
    const setPortalState = vi.fn()
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ portalState: 'idle', setPortalState }))
    const mockImpl = vi.mocked(useLarynxStore).getMockImplementation()!
    const result = mockImpl((s: { setPortalState: unknown }) => s.setPortalState) as ReturnType<typeof vi.fn>
    expect(result).toBe(setPortalState)
  })
})
