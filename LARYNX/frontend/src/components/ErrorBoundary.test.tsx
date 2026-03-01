import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

const ProblemChild = ({ shouldThrow, errorMessage }: { shouldThrow?: boolean, errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage || 'Test error')
  }
  return <div>Everything is fine</div>
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    )
    expect(screen.getByText('Everything is fine')).toBeInTheDocument()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('catches thrown errors and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('SYSTEM ERROR')).toBeInTheDocument()
    expect(screen.queryByText('Everything is fine')).not.toBeInTheDocument()
  })

  it('shows error message in fallback', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow errorMessage="Custom failure message" />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom failure message')).toBeInTheDocument()
  })

  it('shows default error message if error has no message', () => {
    const ThrowString = () => {
      // simulate throwing a non-error object
      throw 'String error'
    }
    render(
      <ErrorBoundary>
        <ThrowString />
      </ErrorBoundary>
    )
    expect(screen.getByText('An unexpected error occurred in the rendering pipeline.')).toBeInTheDocument()
  })

  it('provides retry/reset mechanism', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    )
    
    // Check fallback is visible
    expect(screen.getByText('SYSTEM ERROR')).toBeInTheDocument()
    
    // RESTART button should exist and be clickable
    const restartButton = screen.getByRole('button', { name: /RESTART/i })
    expect(restartButton).toBeInTheDocument()
    fireEvent.click(restartButton)
  })

  it('logs errors (console.error)', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    )
    expect(consoleErrorSpy).toHaveBeenCalled()
    const larynxCall = consoleErrorSpy.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && /\[LARYNX\]/.test(call[0])
    )
    expect(larynxCall).toBeTruthy()
  })

  it('renders custom fallback if provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Fallback</div>}>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.queryByText('SYSTEM ERROR')).not.toBeInTheDocument()
  })
})
