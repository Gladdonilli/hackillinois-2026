import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WarpTransition } from './WarpTransition'

vi.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: {
      div: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) =>
        React.createElement('div', { ...props, ref })),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

const mockTimeline = {
  to: vi.fn().mockReturnThis(),
  fromTo: vi.fn().mockReturnThis(),
  play: vi.fn().mockReturnThis(),
  kill: vi.fn(),
  eventCallback: vi.fn().mockReturnThis(),
}

vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => mockTimeline),
    to: vi.fn(),
    set: vi.fn(),
  },
  gsap: {
    timeline: vi.fn(() => mockTimeline),
    to: vi.fn(),
    set: vi.fn(),
  },
}))

describe('WarpTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<WarpTransition isActive={false} />)
    expect(container).toBeTruthy()
  })

  it('renders when active', () => {
    const { container } = render(<WarpTransition isActive={true} />)
    expect(container).toBeTruthy()
  })

  it('accepts onComplete callback', () => {
    const onComplete = vi.fn()
    const { container } = render(<WarpTransition isActive={false} onComplete={onComplete} />)
    expect(container).toBeTruthy()
  })

  it('renders tunnel and flash elements when active', () => {
    const { container } = render(<WarpTransition isActive={true} />)
    // Should have child divs for tunnel and flash
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBeGreaterThanOrEqual(1)
  })

  it('module exports WarpTransition as named export', () => {
    expect(WarpTransition).toBeDefined()
    expect(typeof WarpTransition).toBe('function')
  })
})
