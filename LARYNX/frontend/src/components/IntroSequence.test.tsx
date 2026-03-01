import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { IntroSequence } from './IntroSequence'

vi.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: {
      div: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) =>
        React.createElement('div', { ...props, ref })),
      span: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLSpanElement>) =>
        React.createElement('span', { ...props, ref })),
      p: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLParagraphElement>) =>
        React.createElement('p', { ...props, ref })),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

vi.mock('@/audio/SoundEngine', () => ({
  SoundEngine: {
    init: vi.fn().mockResolvedValue(undefined),
    playBeep: vi.fn(),
  },
}))

describe('IntroSequence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders without crashing', () => {
    const onComplete = vi.fn()
    const { container } = render(<IntroSequence onComplete={onComplete} />)
    expect(container).toBeTruthy()
  })

  it('renders LARYNX title characters', () => {
    const onComplete = vi.fn()
    render(<IntroSequence onComplete={onComplete} />)
    // Each char of LARYNX is rendered individually — some may appear multiple times
    // in subtitle text, so use getAllByText
    const allL = screen.getAllByText('L')
    expect(allL.length).toBeGreaterThanOrEqual(1)
    const allX = screen.getAllByText('X')
    expect(allX.length).toBeGreaterThanOrEqual(1)
  })

  it('renders subtitle text', () => {
    const onComplete = vi.fn()
    const { container } = render(<IntroSequence onComplete={onComplete} />)
    // Advance timers so typewriter effect renders subtitle characters
    act(() => { vi.advanceTimersByTime(3000) })
    expect(container.textContent).toMatch(/deepfake/i)
  })

  it('calls onComplete after timeout', () => {
    const onComplete = vi.fn()
    render(<IntroSequence onComplete={onComplete} />)
    // IntroSequence: 5500ms main timeout + 1200ms INTRO_FADE_DELAY_MS
    vi.advanceTimersByTime(8000)
    expect(onComplete).toHaveBeenCalled()
  })

  it('skips intro on click', () => {
    const onComplete = vi.fn()
    render(<IntroSequence onComplete={onComplete} />)
    fireEvent.click(document)
    // Skip sets complete=true then setTimeout(onComplete, 1200ms)
    vi.advanceTimersByTime(2000)
    expect(onComplete).toHaveBeenCalled()
  })

  it('skips intro on keydown', () => {
    const onComplete = vi.fn()
    render(<IntroSequence onComplete={onComplete} />)
    fireEvent.keyDown(document, { key: 'Enter' })
    // Same 1200ms delay after skip
    vi.advanceTimersByTime(2000)
    expect(onComplete).toHaveBeenCalled()
  })
})
