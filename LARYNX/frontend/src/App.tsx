import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useLarynxStore } from '@/store/useLarynxStore'
import UploadPanel from '@/components/UploadPanel'
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
  const [showIntro, setShowIntro] = useState(true)
  const initRef = useRef(false)
  const prevStatusRef = useRef(status)

  // Preload demo panels when analysis starts
  useEffect(() => {
    if (status === 'analyzing') {
      import('@/components/CompareView')
      import('@/components/TechnicalDetailPanel')
      import('@/components/ClosingScreen')
    }
  }, [status])

  const appState = showIntro ? 'intro' : status

  // Initialize SoundEngine on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!initRef.current) {
        SoundEngine.init().catch(() => { /* AudioContext init may fail silently */ }).then(() => {
          SoundEngine.startBackgroundLayer()
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
        break
      case 'analyzing':
        SoundEngine.startDrone()
        SoundEngine.startTicking()
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
        break
      case 'error':
      case 'idle':
        SoundEngine.stopTicking()
        SoundEngine.stopDrone()
        SoundEngine.stopBackgroundLayer()
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

        // Start IEC alarm at skull-clip threshold
        if (state.tongueVelocity > 80 && !alarmActive) {
          SoundEngine.startIECAlarm()
          alarmActive = true
        } else if (state.tongueVelocity <= 80 && alarmActive) {
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

  // Portal state sound effects
  const portalState = useLarynxStore((state) => state.portalState)
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
      
      {(appState === 'idle' || isPortalTransition) && (
        <div
          className="relative z-10 flex items-center justify-center h-screen transition-opacity duration-500"
        >
          <LandingScene />
          {/* LARYNX title overlay */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
            <h1 className="text-5xl font-mono tracking-[0.5em] text-white/90 text-glow-cyan glitch-text">LARYNX</h1>
            <p className="text-xs font-mono tracking-[0.3em] text-dim mt-2">DEEPFAKE VOICE DETECTION</p>
          </div>
          {/* Hide upload panel during portal transition to focus on mouth opening */}
          {!isPortalTransition && <UploadPanel />}
          {/* History Button Overlay in Idle */}
          {!isPortalTransition && (
            <button
              className="absolute bottom-8 z-30 px-6 py-2 border border-cyan/30 rounded-sm bg-black/60 backdrop-blur-sm text-cyan/80 font-mono tracking-widest text-xs hover:bg-cyan/10 hover:border-cyan/50 hover:text-cyan transition-all"
              onClick={() => useLarynxStore.getState().toggleHistory()}
              data-interactive
            >
              VIEW DATABASE
            </button>
          )}
        </div>
      )}
      
      {(appState === 'analyzing' || (appState === 'uploading' && !isPortalTransition)) && (
        <div
          className="absolute inset-0 z-20 animate-[fadeIn_0.6s_ease-out]"
        >
          <div className="canvas-container w-full h-full">
            <AnalysisView />
          </div>
          
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
        </div>
      )}
      
      {appState === 'complete' && (
        <div
          className="absolute inset-0 z-10 animate-[fadeIn_0.8s_ease-out]"
        >
          <div className="canvas-container w-full h-full opacity-30">
            <AnalysisView />
          </div>
          
          {/* Verdict gets major emphasis — HUD panels hidden to avoid overlap */}
          <div
            className="hud-overlay absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-20 animate-[fadeIn_0.5s_ease-out_0.2s_both]"
          >
            <div className="shadow-[0_0_100px_rgba(56,189,248,0.15)] rounded-sm">
              <VerdictPanel />
            </div>
          </div>

          {/* Navigation to demo flow */}
          <button
            className="absolute bottom-8 right-8 z-30 px-6 py-3 border border-cyan/40 bg-black/60 backdrop-blur-sm text-cyan font-mono text-sm tracking-wider hover:bg-cyan/10 hover:border-cyan/60 transition-all animate-[fadeIn_0.5s_ease-out_1.5s_both]"
            onClick={() => useLarynxStore.getState().setStatus('comparing')}
            data-interactive
          >
            COMPARE ANALYSIS →
          </button>
        </div>
      )}

      {appState === 'comparing' && (
        <div
          className="absolute inset-0 z-10 animate-[fadeIn_0.6s_ease-out]"
        >
          <Suspense fallback={<div className="hud-panel p-8 text-cyan font-mono animate-pulse">Loading...</div>}>
            <CompareView />
          </Suspense>
          <button
            className="absolute bottom-8 right-8 z-30 px-6 py-3 border border-cyan/40 bg-black/60 backdrop-blur-sm text-cyan font-mono text-sm tracking-wider hover:bg-cyan/10 hover:border-cyan/60 transition-all animate-[fadeIn_0.5s_ease-out_0.8s_both]"
            onClick={() => useLarynxStore.getState().setStatus('technical')}
            data-interactive
          >
            TECHNICAL DETAILS →
          </button>
        </div>
      )}

      {appState === 'technical' && (
        <div
          className="absolute inset-0 z-10 animate-[fadeIn_0.6s_ease-out]"
        >
          <Suspense fallback={<div className="hud-panel p-8 text-cyan font-mono animate-pulse">Loading...</div>}>
            <TechnicalDetailPanel />
          </Suspense>
          <button
            className="absolute bottom-8 right-8 z-30 px-6 py-3 border border-cyan/40 bg-black/60 backdrop-blur-sm text-cyan font-mono text-sm tracking-wider hover:bg-cyan/10 hover:border-cyan/60 transition-all animate-[fadeIn_0.5s_ease-out_0.8s_both]"
            onClick={() => useLarynxStore.getState().setStatus('closing')}
            data-interactive
          >
            CLOSING →
          </button>
        </div>
      )}

      {appState === 'error' && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center animate-[fadeIn_0.6s_ease-out]"
        >
          <div className="hud-panel p-12 max-w-md text-center flex flex-col items-center gap-6">
            <div className="text-warn text-6xl font-mono">⚠</div>
            <h2 className="text-2xl font-mono tracking-[0.2em] text-white/90">ANALYSIS FAILED</h2>
            <p className="text-sm font-mono text-dim leading-relaxed">
              Pipeline encountered an error during processing. This may be due to audio format incompatibility or a backend timeout.
            </p>
            <button
              className="px-6 py-3 border border-warn/40 bg-black/60 backdrop-blur-sm text-warn font-mono text-sm tracking-wider hover:bg-warn/10 hover:border-warn/60 transition-all rounded-sm"
              onClick={() => useLarynxStore.getState().reset()}
              data-interactive
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      )}

      {appState === 'closing' && (
        <div
          className="absolute inset-0 z-10 animate-[fadeIn_0.8s_ease-out]"
        >
          <Suspense fallback={<div className="hud-panel p-8 text-cyan font-mono animate-pulse">Loading...</div>}>
            <ClosingScreen 
              onReset={() => useLarynxStore.getState().reset()} 
              onShowHistory={() => useLarynxStore.getState().toggleHistory()}
            />
          </Suspense>
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
