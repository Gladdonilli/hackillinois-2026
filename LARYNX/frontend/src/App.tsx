import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useLarynxStore } from '@/store/useLarynxStore'
import { FloatingIdleControls } from '@/components/FloatingIdleControls'
import { useAnalysisStream } from '@/hooks/useAnalysisStream'
import { useGenerateCompareStream } from '@/hooks/useGenerateCompareStream'
import { AnalysisView } from '@/components/AnalysisView'
import { VelocityHUD } from '@/components/VelocityHUD'
import { VerdictPanel } from '@/components/VerdictPanel'
import { WaveformDisplay } from '@/components/WaveformDisplay'
import { AnalysisOverlay } from '@/components/AnalysisOverlay'
import { IntroSequence } from '@/components/IntroSequence'
import { SoundEngine } from '@/audio/SoundEngine'
import { LandingScene } from '@/components/LandingScene'
import { CustomCursor } from '@/components/CustomCursor'
import { WarpTransition } from '@/components/WarpTransition'
import { HistoryPanel } from '@/components/HistoryPanel'
import { DEMO_MODE_ENABLED, THRESHOLDS } from '@/constants'
import { Button } from '@/components/ui/button'
const CompareView = lazy(() => import('@/components/CompareView').then(m => ({ default: m.CompareView })))
const TechnicalDetailPanel = lazy(() => import('@/components/TechnicalDetailPanel').then(m => ({ default: m.TechnicalDetailPanel })))
const ClosingScreen = lazy(() => import('@/components/ClosingScreen').then(m => ({ default: m.ClosingScreen })))

declare global {
  interface Window {
    __larynxSoundEngine?: typeof SoundEngine
  }
}

export default function App() {
  const status = useLarynxStore((state) => state.status)
  const portalState = useLarynxStore((state) => state.portalState)
  const setPortalState = useLarynxStore((state) => state.setPortalState)
  const [showIntro, setShowIntro] = useState(true)
  const initRef = useRef(false)
  const prevStatusRef = useRef(status)

  // Analyze trigger for mouth aura
  const audioFile = useLarynxStore((state) => state.audioFile)
  const { startStream } = useAnalysisStream()
  const { startGenerateCompare } = useGenerateCompareStream()
  const generateCompareResult = useLarynxStore((state) => state.generateCompareResult)
  const canAnalyze = Boolean(audioFile) && status === 'idle' && portalState === 'idle'

  const handleCompareAnalysis = useCallback(async () => {
    const store = useLarynxStore.getState()
    const file = store.audioFile
    if (!file) return

    // Step 1: Transcribe the real audio
    const API_BASE = (import.meta.env.VITE_API_URL || 'https://larynx-api.tianyi35.workers.dev').replace(/\/$/, '')
    store.setIsTranscribing(true)
    store.setStatus('analyzing')
    store.setProgress({ message: 'Transcribing audio...', percent: 5 })

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: formData })
      const payload = await res.json().catch(() => null)

      if (!res.ok || !payload?.success || !payload?.data?.text) {
        throw new Error(payload?.error?.message || `Transcription failed (${res.status})`)
      }

      const text = payload.data.text as string
      store.setTranscribedText(text)
      store.setGeneratePromptText(text)
      store.setIsTranscribing(false)

      await startGenerateCompare(file, { initialStatus: 'analyzing' })
    } catch (err) {
      store.setIsTranscribing(false)
      store.setStatus('error')
      store.setProgress({
        message: err instanceof Error ? err.message : 'Transcription failed',
        percent: 0,
      })
    }
  }, [startGenerateCompare])

  const handleAnalyze = useCallback(() => {
    if (canAnalyze) {
      if (DEMO_MODE_ENABLED) {
        void startStream()
      } else {
        void handleCompareAnalysis()
      }
    }
  }, [canAnalyze, handleCompareAnalysis, startStream])

  // Preload demo panels when analysis starts
  useEffect(() => {
    if (status === 'analyzing') {
      import('@/components/CompareView')
      import('@/components/TechnicalDetailPanel')
      import('@/components/ClosingScreen')
    }
  }, [status])

  const appState = showIntro ? 'intro' : status
  const isDemoFlowStage = appState === 'comparing' || appState === 'technical' || appState === 'closing'

  useEffect(() => {
    if (showIntro) return

    // Reset portal state when returning to idle
    if ((status === 'idle' || status === 'error') && portalState !== 'idle') {
      setPortalState('idle')
    }
  }, [portalState, setPortalState, showIntro, status])

  // Initialize SoundEngine on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!initRef.current) {
        SoundEngine.init().catch(() => { /* AudioContext init may fail silently */ }).then(() => {
          SoundEngine.startBackgroundLayer()
          SoundEngine.startSoundtrack('idle')
        })
        initRef.current = true
      }
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__larynxSoundEngine = SoundEngine
      return () => {
        delete window.__larynxSoundEngine
      }
    }
  }, [])

  // Sound lifecycle tied to analysis status
  useEffect(() => {
    if (!SoundEngine.isInitialized() || showIntro) return

    if (prevStatusRef.current !== status) {
      SoundEngine.cancelAllTransitions()
      prevStatusRef.current = status
    }

    switch (status) {
      case 'uploading':
        SoundEngine.playUploadThunk()
        SoundEngine.playBeep()
        SoundEngine.setSoundtrackMode('idle')
        break
      case 'analyzing':
        SoundEngine.startDrone()
        SoundEngine.startTicking()
        SoundEngine.setSoundtrackMode('analyzing')
        break
      case 'complete': {
        SoundEngine.stopTicking()
        SoundEngine.stopDrone()
        const verdict = useLarynxStore.getState().verdict
        if (verdict) {
          SoundEngine.triggerVerdictBuild(() => {
            if (verdict.isGenuine) {
              SoundEngine.playVerdict('genuine')
              SoundEngine.playResolution('genuine')
            } else {
              SoundEngine.triggerDeepfakeReveal()
            }
          })
        }
        break
      }
      case 'comparing':
      case 'technical':
      case 'closing':
        SoundEngine.stopTicking()
        SoundEngine.stopDrone()
        SoundEngine.setSoundtrackMode('demoflow')
        break
      case 'error':
      case 'idle':
        SoundEngine.stopTicking()
        SoundEngine.stopDrone()
        SoundEngine.stopBackgroundLayer()
        SoundEngine.stopSoundtrack()
        break
    }
  }, [status, showIntro])

  // Update velocity-reactive sound during analysis
  useEffect(() => {
    if (status !== 'analyzing' || !SoundEngine.isInitialized() || showIntro) return

    let prevVelocity = useLarynxStore.getState().tongueVelocity
    let alarmActive = false
    const unsub = useLarynxStore.subscribe((state) => {
      if (state.tongueVelocity !== prevVelocity) {
        prevVelocity = state.tongueVelocity
        SoundEngine.updateVelocity(state.tongueVelocity)

        // Start IEC alarm at breach threshold
        if (state.tongueVelocity > THRESHOLDS.IEC_ALARM && !alarmActive) {
          SoundEngine.startIECAlarm()
          alarmActive = true
        } else if (state.tongueVelocity <= THRESHOLDS.IEC_ALARM && alarmActive) {
          SoundEngine.stopIECAlarm()
          alarmActive = false
        }
      }
    })
    return () => {
      unsub()
      if (alarmActive) SoundEngine.stopIECAlarm()
    }
  }, [status, showIntro])

  const isPortalTransition = portalState === 'entering' || portalState === 'warping'


  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white/90">
      <WarpTransition 
        isActive={portalState === 'warping'} 
        onComplete={() => {
          const state = useLarynxStore.getState()
          if (state.portalState === 'warping') {
            state.setPortalState('done')
          }
        }}
      />

      {/* Background effects — always visible */}
      <div className="vignette" />
      {/* Scene views — no AnimatePresence (incompatible with R3F Canvas teardown) */}
      {appState === 'intro' && (
        <IntroSequence key="intro" onComplete={() => setShowIntro(false)} />
      )}
      
      {appState === 'idle' && (
        <div
          className="relative z-10 flex items-center justify-center h-screen transition-opacity duration-500 grid-bg"
        >
          <LandingScene canAnalyze={canAnalyze} onAnalyze={handleAnalyze} />
        </div>
      )}

      {/* Title overlay — position:fixed to sit above the Canvas which is also position:fixed */}
      {appState === 'idle' && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 text-center pointer-events-none" style={{ zIndex: 100 }}>
          <h1 className="text-6xl md:text-7xl font-mono font-semibold glitch-text" style={{ letterSpacing: '0.38em', textIndent: '0.38em', color: '#38BDF8', textShadow: '0 0 20px rgba(56,189,248,0.85), 0 0 48px rgba(56,189,248,0.45)' }} data-text="LARYNX">LARYNX</h1>
          <p className="text-sm font-mono mt-2" style={{ letterSpacing: '0.22em', textIndent: '0.22em', color: '#7DD3FC', opacity: 0.9, textShadow: '0 0 12px rgba(56,189,248,0.55)' }}>DEEPFAKE VOICE DETECTOR</p>
        </div>
      )}

      {/* Floating controls rendered OUTSIDE idle div so they sit above the position:fixed Canvas */}
      {appState === 'idle' && <FloatingIdleControls />}
      
      {(appState === 'uploading' || appState === 'analyzing' || appState === 'complete') && (
        <div
          className={appState === 'complete'
            ? 'absolute inset-0 z-10 animate-[fadeIn_0.8s_ease-out]'
            : 'absolute inset-0 z-20 animate-[fadeIn_0.6s_ease-out]'}
        >
          <div className={appState === 'complete'
            ? 'canvas-container w-full h-full opacity-30 transition-opacity duration-700'
            : 'canvas-container w-full h-full opacity-100 transition-opacity duration-700'}>
            <AnalysisView />
          </div>

          {(appState === 'uploading' || appState === 'analyzing') && (
            <>
              <AnalysisOverlay />

              <div className="hud-overlay absolute top-4 left-4 z-10">
                <WaveformDisplay />
              </div>

              <div className="hud-overlay absolute top-4 right-4 z-10">
                <VelocityHUD />
              </div>

              <div className="hud-overlay absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl z-10">
                <VerdictPanel />
              </div>
            </>
          )}

          {appState === 'complete' && (
            <>
              <div
                className="hud-overlay absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-20 animate-[fadeIn_0.5s_ease-out_0.2s_both]"
              >
                <div className="shadow-[0_0_100px_rgba(56,189,248,0.15)] rounded-sm">
                  <VerdictPanel />
                </div>
              </div>

              {!generateCompareResult && (
                <Button
                  variant="outline"
                  className="absolute bottom-8 right-8 z-30 font-mono text-sm tracking-wider animate-[fadeIn_0.5s_ease-out_1.5s_both]"
                  onClick={handleCompareAnalysis}
                  data-interactive
                >
                  COMPARE ANALYSIS →
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {appState === 'complete' && isPortalTransition && (
        <div className="absolute inset-0 z-10" />
      )}

      {isDemoFlowStage && (
        <div className="absolute inset-0 z-10">
          <div className={appState === 'comparing'
            ? 'absolute inset-0 opacity-100 transition-opacity duration-500'
            : 'absolute inset-0 opacity-0 pointer-events-none transition-opacity duration-500'}>
            <Suspense fallback={<div className="hud-panel p-8 text-cyan font-mono animate-pulse">Loading...</div>}>
              <CompareView />
            </Suspense>
            <Button
              variant="outline"
              className="absolute bottom-8 right-8 z-30 font-mono text-sm tracking-wider"
              onClick={() => useLarynxStore.getState().setStatus('technical')}
              data-interactive
            >
              TECHNICAL DETAILS →
            </Button>
          </div>

          <div className={appState === 'technical'
            ? 'absolute inset-0 opacity-100 transition-opacity duration-500'
            : 'absolute inset-0 opacity-0 pointer-events-none transition-opacity duration-500'}>
            <Suspense fallback={<div className="hud-panel p-8 text-cyan font-mono animate-pulse">Loading...</div>}>
              <TechnicalDetailPanel />
            </Suspense>
            <Button
              variant="outline"
              className="absolute bottom-8 right-8 z-30 font-mono text-sm tracking-wider"
              onClick={() => useLarynxStore.getState().setStatus('closing')}
              data-interactive
            >
              CLOSING →
            </Button>
          </div>

          <div className={appState === 'closing'
            ? 'absolute inset-0 opacity-100 transition-opacity duration-500'
            : 'absolute inset-0 opacity-0 pointer-events-none transition-opacity duration-500'}>
            <Suspense fallback={<div className="hud-panel p-8 text-cyan font-mono animate-pulse">Loading...</div>}>
              <ClosingScreen
                onReset={() => useLarynxStore.getState().reset()}
                onShowHistory={() => useLarynxStore.getState().toggleHistory()}
              />
            </Suspense>
          </div>
        </div>
      )}

      {appState === 'error' && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center animate-[fadeIn_0.6s_ease-out]"
        >
          <div className="hud-panel p-12 max-w-md text-center flex flex-col items-center gap-6">
            <div className="text-warn text-6xl font-mono">⚠</div>
            <h2 className="text-2xl font-mono text-white/90" style={{ letterSpacing: '0.2em', textIndent: '0.2em' }}>ANALYSIS FAILED</h2>
            <p className="text-sm font-mono text-dim leading-relaxed">
              Pipeline encountered an error during processing. This may be due to audio format incompatibility or a backend timeout.
            </p>
            <Button
              variant="destructive"
              className="font-mono text-sm tracking-wider"
              onClick={() => useLarynxStore.getState().reset()}
              data-interactive
            >
              TRY AGAIN
            </Button>
          </div>
        </div>
      )}

      <HistoryPanel />
      {/* Scanline overlay — always on top */}
      <div className="scanline-overlay pointer-events-none z-50" />

      {/* Custom Cursor — must be the very last element to be on top of everything including scanlines */}
      <CustomCursor />
    </div>
  )
}
