import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { TIMING, SPRING, COLORS_RGBA } from '@/constants'
import { motion, AnimatePresence } from 'motion/react'
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
const CompareView = lazy(() => import('@/components/CompareView').then(m => ({ default: m.CompareView })))
const TechnicalDetailPanel = lazy(() => import('@/components/TechnicalDetailPanel').then(m => ({ default: m.TechnicalDetailPanel })))
const ClosingScreen = lazy(() => import('@/components/ClosingScreen').then(m => ({ default: m.ClosingScreen })))

export default function App() {
  const status = useLarynxStore((state) => state.status)
  const [showIntro, setShowIntro] = useState(true)
  const initRef = useRef(false)

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
        SoundEngine.init().then(() => {
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

  // Sound lifecycle tied to analysis status
  useEffect(() => {
    if (!SoundEngine.isInitialized() || showIntro) return

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
      case 'error':
      case 'idle':
        SoundEngine.stopTicking()
        SoundEngine.stopDrone()
        SoundEngine.stopIECAlarm()
        SoundEngine.stopRiser()
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
  useEffect(() => {
    if (!SoundEngine.isInitialized()) return
    if (portalState === 'entering') {
      SoundEngine.playPortalEntry()
    } else if (portalState === 'warping') {
      SoundEngine.playWarpTransition()
    }
  }, [portalState])

  // In portal transition state, we show landing state but portal handles its own view
  const isPortalTransition = ['entering', 'warping'].includes(useLarynxStore(state => state.portalState))

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white/90">
      <WarpTransition 
        isActive={useLarynxStore(state => state.portalState) === 'warping'} 
        onComplete={() => {
          // Safe update at end of animation
          setTimeout(() => {
            useLarynxStore.getState().setPortalState('done')
            useLarynxStore.getState().setStatus('uploading')
          }, 10)
        }}
      />

      {/* Background effects — always visible */}
      <div className="grid-bg" />
      <div className="vignette" />
      <AnimatePresence mode="wait">
        {appState === 'intro' && (
          <IntroSequence key="intro" onComplete={() => setShowIntro(false)} />
        )}
        
        {(appState === 'idle' || isPortalTransition) && (
          <motion.div 
            key="landing" 
            className="relative z-10 flex items-center justify-center h-screen"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ duration: TIMING.VIEW_TRANSITION }}
          >
            <LandingScene />
            {/* LARYNX title overlay */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
              <h1 className="text-5xl font-mono tracking-[0.5em] text-white/90 text-glow-cyan glitch-text">LARYNX.</h1>
              <p className="text-xs font-mono tracking-[0.3em] text-dim mt-2">DEEPFAKE VOICE DETECTION</p>
            </div>
            {/* Hide upload panel during portal transition to focus on mouth opening */}
            {!isPortalTransition && <UploadPanel />}
          </motion.div>
        )}
        
        {(appState === 'analyzing' || (appState === 'uploading' && !isPortalTransition)) && (
          <motion.div
            key="analysis" 
            className="absolute inset-0 z-10"
            initial={{ opacity: 0, scale: 1.05 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ duration: TIMING.COMPLETE_FADE_IN, ease: "easeOut" }}
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
          </motion.div>
        )}
        
        {appState === 'complete' && (
          <motion.div 
            key="verdict" 
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: TIMING.COMPLETE_FADE_IN }}
          >
            <div className="canvas-container w-full h-full opacity-30">
              <AnalysisView />
            </div>
            
            {/* Verdict gets major emphasis — HUD panels hidden to avoid overlap */}
            <motion.div 
              className="hud-overlay absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-20"
              initial={{ scale: 0.9, y: "-40%" }}
              animate={{ scale: 1, y: "-50%" }}
              transition={{ delay: 0.2, type: "spring", stiffness: SPRING.VERDICT_STIFFNESS, damping: SPRING.VERDICT_DAMPING }}
            >
              <div className="shadow-[0_0_100px_rgba(56,189,248,0.15)] rounded-sm">
                <VerdictPanel />
              </div>
            </motion.div>

            {/* Navigation to demo flow */}
            <motion.button
              className="absolute bottom-8 right-8 z-30 px-6 py-3 border border-cyan/40 bg-black/60 backdrop-blur-sm text-cyan font-mono text-sm tracking-wider hover:bg-cyan/10 hover:border-cyan/60 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: TIMING.VERDICT_NAV_DELAY }}
              onClick={() => useLarynxStore.getState().setStatus('comparing')}
              data-interactive
            >
              COMPARE ANALYSIS →
            </motion.button>
          </motion.div>
        )}

        {appState === 'comparing' && (
          <motion.div
            key="compare"
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TIMING.VIEW_TRANSITION }}
          >
            <Suspense fallback={<div className="hud-panel p-8 text-cyan font-mono animate-pulse">Loading...</div>}>
              <CompareView />
            </Suspense>
            <motion.button
              className="absolute bottom-8 right-8 z-30 px-6 py-3 border border-cyan/40 bg-black/60 backdrop-blur-sm text-cyan font-mono text-sm tracking-wider hover:bg-cyan/10 hover:border-cyan/60 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: TIMING.NAV_BUTTON_DELAY }}
              onClick={() => useLarynxStore.getState().setStatus('technical')}
              data-interactive
            >
              TECHNICAL DETAILS →
            </motion.button>
          </motion.div>
        )}

        {appState === 'technical' && (
          <motion.div
            key="technical"
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TIMING.VIEW_TRANSITION }}
          >
            <Suspense fallback={<div className="hud-panel p-8 text-cyan font-mono animate-pulse">Loading...</div>}>
              <TechnicalDetailPanel />
            </Suspense>
            <motion.button
              className="absolute bottom-8 right-8 z-30 px-6 py-3 border border-cyan/40 bg-black/60 backdrop-blur-sm text-cyan font-mono text-sm tracking-wider hover:bg-cyan/10 hover:border-cyan/60 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: TIMING.NAV_BUTTON_DELAY }}
              onClick={() => useLarynxStore.getState().setStatus('closing')}
              data-interactive
            >
              CLOSING →
            </motion.button>
          </motion.div>
        )}

        {appState === 'error' && (
          <motion.div
            key="error"
            className="absolute inset-0 z-10 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TIMING.VIEW_TRANSITION }}
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
          </motion.div>
        )}

        {appState === 'closing' && (
          <motion.div
            key="closing"
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TIMING.COMPLETE_FADE_IN }}
          >
            <Suspense fallback={<div className="hud-panel p-8 text-cyan font-mono animate-pulse">Loading...</div>}>
              <ClosingScreen onReset={() => useLarynxStore.getState().reset()} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Scanline overlay — always on top */}
      <div className="scanline-overlay pointer-events-none z-50" />

      {/* Custom Cursor — must be the very last element to be on top of everything including scanlines */}
      <CustomCursor />
    </div>
  )
}
