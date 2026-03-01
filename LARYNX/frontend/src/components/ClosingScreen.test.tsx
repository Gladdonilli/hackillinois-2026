import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ClosingScreen } from './ClosingScreen'

vi.mock('@/audio/SoundEngine', () => ({
  SoundEngine: {
    playBeep: vi.fn(),
  }
}))

vi.mock('motion/react', () => {
  return {
    motion: {
      div: ({ children, className, ...props }: any) => <div className={className} data-testid="motion-div" {...props}>{children}</div>,
      h1: ({ children, className, ...props }: any) => <h1 className={className} data-testid="motion-h1" {...props}>{children}</h1>,
      span: ({ children, className, onAnimationStart, ...props }: any) => {
        // Automatically trigger animation start for testing purposes
        if (onAnimationStart) {
          setTimeout(() => onAnimationStart(), 0);
        }
        return <span className={className} data-testid="motion-span" {...props}>{children}</span>
      },
      p: ({ children, className, ...props }: any) => <p className={className} data-testid="motion-p" {...props}>{children}</p>,
      button: ({ children, className, onClick, ...props }: any) => <button className={className} data-testid="motion-button" onClick={onClick} {...props}>{children}</button>,
    }
  }
})

describe('ClosingScreen', () => {
  const defaultProps = {
    onReset: vi.fn(),
    onShowHistory: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without error', () => {
    render(<ClosingScreen {...defaultProps} />)
    expect(screen.getByText('Deepfake Voice Detection via Articulatory Physics')).toBeInTheDocument()
  })

  it('shows project name / branding', () => {
    render(<ClosingScreen {...defaultProps} />)
    const chars = ['L', 'A', 'R', 'Y', 'N', 'X']
    chars.forEach(char => {
      expect(screen.getAllByText(char).length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Deepfake Voice Detection via Articulatory Physics')).toBeInTheDocument()
  })

  it('shows team info', () => {
    render(<ClosingScreen {...defaultProps} />)
    expect(screen.getByText(/Built by Gladdon/i)).toBeInTheDocument()
    expect(screen.getByText(/HackIllinois 2026/i)).toBeInTheDocument()
  })

  it('shows sponsor attribution', () => {
    render(<ClosingScreen {...defaultProps} />)
    expect(screen.getByText('Modal')).toBeInTheDocument()
    expect(screen.getByText('Best AI Inference')).toBeInTheDocument()
    
    expect(screen.getByText('Cloudflare')).toBeInTheDocument()
    expect(screen.getByText('Pages + Workers')).toBeInTheDocument()
    
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('TTS Generation')).toBeInTheDocument()
    
    expect(screen.getByText('Supermemory')).toBeInTheDocument()
    expect(screen.getByText('Analysis History')).toBeInTheDocument()
  })

  it('renders with animation wrappers', () => {
    render(<ClosingScreen {...defaultProps} />)
    expect(screen.getAllByTestId('motion-div').length).toBeGreaterThan(0)
    expect(screen.getByTestId('motion-h1')).toBeInTheDocument()
    expect(screen.getAllByTestId('motion-span').length).toBeGreaterThan(0)
    expect(screen.getByTestId('motion-p')).toBeInTheDocument()
    expect(screen.getAllByTestId('motion-button').length).toBeGreaterThan(0)
  })

  it('calls onReset when reset button is clicked', () => {
    render(<ClosingScreen {...defaultProps} />)
    const resetBtn = screen.getByText(/Try it yourself/i)
    fireEvent.click(resetBtn)
    expect(defaultProps.onReset).toHaveBeenCalledTimes(1)
  })

  it('calls onShowHistory when history button is clicked', () => {
    render(<ClosingScreen {...defaultProps} />)
    const historyBtn = screen.getByText(/VIEW HISTORY ALBUM/i)
    fireEvent.click(historyBtn)
    expect(defaultProps.onShowHistory).toHaveBeenCalledTimes(1)
  })

  it('does not render history button if onShowHistory is not provided', () => {
    render(<ClosingScreen onReset={defaultProps.onReset} />)
    expect(screen.queryByText(/VIEW HISTORY ALBUM/i)).not.toBeInTheDocument()
  })
})
