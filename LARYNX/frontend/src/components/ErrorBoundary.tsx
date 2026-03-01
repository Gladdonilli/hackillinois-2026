import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LARYNX] Uncaught error:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
          <div className="hud-panel p-12 max-w-lg text-center flex flex-col items-center gap-6">
            <div className="text-warn text-6xl font-mono">⚠</div>
            <h2 className="text-2xl font-mono tracking-[0.2em] text-white/90">
              SYSTEM ERROR
            </h2>
            <p className="text-sm font-mono text-dim leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred in the rendering pipeline.'}
            </p>
            <Button
              variant="default"
              size="lg"
              className="font-mono text-sm tracking-wider"
              onClick={this.handleReset}
              data-interactive
            >
              RESTART
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
