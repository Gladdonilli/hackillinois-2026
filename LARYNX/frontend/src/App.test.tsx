import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from './App'
import { useLarynxStore } from '@/store/useLarynxStore'
import { mockStoreState, createMockState } from '@/test-utils/mockStore'

vi.mock('@/store/useLarynxStore')

// Mock all child components as simple divs
vi.mock('@/components/UploadPanel', () => ({ default: () => <div data-testid="upload-panel" /> }))
vi.mock('@/components/AnalysisView', () => ({ AnalysisView: () => <div data-testid="analysis-view" /> }))
vi.mock('@/components/VelocityHUD', () => ({ VelocityHUD: () => <div data-testid="velocity-hud" /> }))
vi.mock('@/components/VerdictPanel', () => ({ VerdictPanel: () => <div data-testid="verdict-panel" /> }))
vi.mock('@/components/WaveformDisplay', () => ({ WaveformDisplay: () => <div data-testid="waveform-display" /> }))
vi.mock('@/components/AnalysisOverlay', () => ({ AnalysisOverlay: () => <div data-testid="analysis-overlay" /> }))
vi.mock('@/components/IntroSequence', () => ({ IntroSequence: ({ onComplete }: { onComplete: () => void }) => <div data-testid="intro-sequence" onClick={onComplete} /> }))
vi.mock('@/components/LandingScene', () => ({ LandingScene: () => <div data-testid="landing-scene" /> }))
vi.mock('@/components/CustomCursor', () => ({ CustomCursor: () => <div data-testid="custom-cursor" /> }))
vi.mock('@/components/WarpTransition', () => ({ WarpTransition: () => <div data-testid="warp-transition" /> }))
vi.mock('@/components/HistoryPanel', () => ({ HistoryPanel: () => <div data-testid="history-panel" /> }))
vi.mock('@/components/CompareView', () => ({ CompareView: () => <div data-testid="compare-view" /> }))
vi.mock('@/components/TechnicalDetailPanel', () => ({ TechnicalDetailPanel: () => <div data-testid="technical-detail" /> }))
vi.mock('@/components/ClosingScreen', () => ({ ClosingScreen: () => <div data-testid="closing-screen" /> }))

vi.mock('@/audio/SoundEngine', () => ({
  SoundEngine: {
    init: vi.fn().mockResolvedValue(undefined),
    startTicking: vi.fn(),
    stopTicking: vi.fn(),
    stopIECAlarm: vi.fn(),
    startIECAlarm: vi.fn(),
    stopRiser: vi.fn(),
    restoreFromVacuum: vi.fn(),
    stopSoundtrack: vi.fn(),
    cancelAllTransitions: vi.fn(),
    playBeep: vi.fn(),
    triggerVerdictBuild: vi.fn(),
    triggerDeepfakeReveal: vi.fn(),
    playResolution: vi.fn(),
    playPortalWoosh: vi.fn(),
    playWarpSwoosh: vi.fn(),
    playUploadThunk: vi.fn(),
    playVerdict: vi.fn(),
    updateVelocity: vi.fn(),
    startDrone: vi.fn(),
    stopDrone: vi.fn(),
    startBackgroundLayer: vi.fn(),
    stopBackgroundLayer: vi.fn(),
    getDebugState: vi.fn(() => ({})),
    isInitialized: vi.fn(() => true),
    masterVolume: 1,
  },
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ status: 'idle' }))
  })

  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })

  it('shows IntroSequence initially', () => {
    render(<App />)
    expect(screen.getByTestId('intro-sequence')).toBeInTheDocument()
  })

  it('shows LandingScene when idle after intro', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ status: 'idle' }))
    render(<App />)
    act(() => { screen.getByTestId('intro-sequence').click() })
    expect(screen.getByTestId('landing-scene')).toBeInTheDocument()
  })

  it('shows UploadPanel when idle after intro', () => {
    render(<App />)
    act(() => { screen.getByTestId('intro-sequence').click() })
    expect(screen.getByTestId('upload-panel')).toBeInTheDocument()
  })

  it('shows AnalysisView when analyzing', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ status: 'analyzing' }))
    render(<App />)
    act(() => { screen.getByTestId('intro-sequence').click() })
    expect(screen.getByTestId('analysis-view')).toBeInTheDocument()
  })

  it('shows VerdictPanel when complete', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ status: 'complete' }))
    render(<App />)
    act(() => { screen.getByTestId('intro-sequence').click() })
    expect(screen.getByTestId('verdict-panel')).toBeInTheDocument()
  })

  it('shows error panel on error status', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ status: 'error' }))
    render(<App />)
    act(() => { screen.getByTestId('intro-sequence').click() })
    expect(screen.getByText(/pipeline encountered an error/i)).toBeInTheDocument()
  })

  it('always renders CustomCursor', () => {
    render(<App />)
    expect(screen.getByTestId('custom-cursor')).toBeInTheDocument()
  })

  it('always renders WarpTransition', () => {
    render(<App />)
    expect(screen.getByTestId('warp-transition')).toBeInTheDocument()
  })

  it('always renders HistoryPanel', () => {
    render(<App />)
    expect(screen.getByTestId('history-panel')).toBeInTheDocument()
  })

  it('shows VelocityHUD when analyzing', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ status: 'analyzing' }))
    render(<App />)
    act(() => { screen.getByTestId('intro-sequence').click() })
    expect(screen.getByTestId('velocity-hud')).toBeInTheDocument()
  })
})
