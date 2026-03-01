import { vi } from 'vitest'

/**
 * Creates a properly mocked useLarynxStore that handles both:
 * - Selector pattern: useLarynxStore((state) => state.field)
 * - Full state pattern: useLarynxStore()
 * - Static methods: useLarynxStore.getState(), useLarynxStore.setState()
 *
 * Usage in test files:
 *   vi.mock('@/store/useLarynxStore')
 *   import { useLarynxStore } from '@/store/useLarynxStore'
 *   import { mockStoreState, createMockState } from '@/test-utils/mockStore'
 *
 *   beforeEach(() => {
 *     mockStoreState(useLarynxStore, createMockState({ status: 'analyzing' }))
 *   })
 */

export interface MockLarynxState {
  status: string
  audioFile: File | null
  audioUrl: string | null
  progress: { message: string; percent: number }
  frames: Array<{
    sensors: Record<string, { x: number; y: number; velocity?: number }>
    tongueVelocity: number
    timestamp: number
    isAnomalous?: boolean
  }>
  currentFrame: {
    sensors: Record<string, { x: number; y: number; velocity?: number }>
    tongueVelocity: number
    timestamp: number
    isAnomalous?: boolean
  } | null
  verdict: {
    isGenuine: boolean
    confidence: number
    peakVelocity: number
    threshold: number
    anomalousFrameCount: number
    totalFrameCount: number
    anomalyRatio: number
    reportId: string
    processingTimeMs: number
  } | null
  tongueVelocity: number
  tongueT1: { x: number; y: number } | null
  portalState: string
  postProcessingEnabled: boolean
  showHistory: boolean
  historyItems: Array<Record<string, unknown>>
  historyLoading: boolean
  comparison: {
    channelFrames: [Array<Record<string, unknown>>, Array<Record<string, unknown>>]
    channelVerdicts: [Record<string, unknown> | null, Record<string, unknown> | null]
    comparisonSummary: string | null
  }
  // Actions
  setStatus: ReturnType<typeof vi.fn>
  setAudioFile: ReturnType<typeof vi.fn>
  setProgress: ReturnType<typeof vi.fn>
  addFrame: ReturnType<typeof vi.fn>
  setVerdict: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
  setPostProcessingEnabled: ReturnType<typeof vi.fn>
  setPortalState: ReturnType<typeof vi.fn>
  toggleHistory: ReturnType<typeof vi.fn>
  fetchHistory: ReturnType<typeof vi.fn>
  resetComparison: ReturnType<typeof vi.fn>
  addComparisonFrame: ReturnType<typeof vi.fn>
  setComparisonVerdict: ReturnType<typeof vi.fn>
  setComparisonSummary: ReturnType<typeof vi.fn>
  _setStreamAbort: ReturnType<typeof vi.fn>
}

export function createMockState(overrides: Partial<MockLarynxState> = {}): MockLarynxState {
  return {
    status: 'idle',
    audioFile: null,
    audioUrl: null,
    progress: { message: '', percent: 0 },
    frames: [],
    currentFrame: null,
    verdict: null,
    tongueVelocity: 0,
    tongueT1: null,
    portalState: 'idle',
    postProcessingEnabled: true,
    showHistory: false,
    historyItems: [],
    historyLoading: false,
    comparison: {
      channelFrames: [[], []],
      channelVerdicts: [null, null],
      comparisonSummary: null,
    },
    setStatus: vi.fn(),
    setAudioFile: vi.fn(),
    setProgress: vi.fn(),
    addFrame: vi.fn(),
    setVerdict: vi.fn(),
    reset: vi.fn(),
    setPostProcessingEnabled: vi.fn(),
    setPortalState: vi.fn(),
    toggleHistory: vi.fn(),
    fetchHistory: vi.fn(),
    resetComparison: vi.fn(),
    addComparisonFrame: vi.fn(),
    setComparisonVerdict: vi.fn(),
    setComparisonSummary: vi.fn(),
    _setStreamAbort: vi.fn(),
    ...overrides,
  }
}

/**
 * Properly mocks a Zustand store to handle both selector and full-state patterns.
 * Call this in beforeEach with your desired state.
 */
export function mockStoreState(
  store: ReturnType<typeof vi.fn>,
  state: MockLarynxState
): void {
  // Handle both patterns:
  // useLarynxStore((s) => s.field)  — selector function
  // useLarynxStore()                — no selector, returns full state
  const mockFn = store as unknown as ReturnType<typeof vi.fn>
  mockFn.mockImplementation((selector?: (s: MockLarynxState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(state)
    }
    return state
  })

  // Also expose static Zustand methods
  ;(mockFn as any).getState = vi.fn(() => state)
  ;(mockFn as any).setState = vi.fn()
  ;(mockFn as any).subscribe = vi.fn(() => vi.fn()) // returns unsubscribe
  ;(mockFn as any).getInitialState = vi.fn(() => state)
}
