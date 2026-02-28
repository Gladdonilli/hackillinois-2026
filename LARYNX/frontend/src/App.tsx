import { useState, useEffect, useRef, lazy, Suspense } from 'react'
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
        SoundEngine.init()
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
          if (verdict.isGenuine) {
            SoundEngine.playVerdict('genuine')
            SoundEngine.playResolution('genuine')
          } else {
            SoundEngine.triggerDeepfakeReveal()
          }
        }
        break
      }
      case 'error':
      case 'idle':
        SoundEngine.stopTicking()
        SoundEngine.stopDrone()
        SoundEngine.stopHorror()
        SoundEngine.stopRiser()
        break
    }
  }, [status, showIntro])

  // Update velocity-reactive sound during analysis
  useEffect(() => {
    if (status !== 'analyzing' || !SoundEngine.isInitialized() || showIntro) return

    let prevVelocity = useLarynxStore.getState().tongueVelocity
    let horrorActive = false
    const unsub = useLarynxStore.subscribe((state) => {
      if (state.tongueVelocity !== prevVelocity) {
        prevVelocity = state.tongueVelocity
        SoundEngine.updateVelocity(state.tongueVelocity)

        // Start horror texture at skull-clip threshold
        if (state.tongueVelocity > 80 && !horrorActive) {
          SoundEngine.startHorror()
          horrorActive = true
        } else if (state.tongueVelocity <= 80 && horrorActive) {
          SoundEngine.stopHorror()
          horrorActive = false
        }
      }
    })
    return () => {
      unsub()
      if (horrorActive) SoundEngine.stopHorror()
    }
  }, [status, showIntro])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white/90">
      {/* Background effects — always visible */}
      <div className="grid-bg" />
      <div className="vignette" />
      
      <AnimatePresence mode="wait">
        {appState === 'intro' && (
          <IntroSequence key="intro" onComplete={() => setShowIntro(false)} />
        )}
        
        {appState === 'idle' && (
          <motion.div 
            key="landing" 
            className="relative z-10 flex items-center justify-center h-screen"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ duration: 0.6 }}
          >
            <LandingScene />
            <UploadPanel />
          </motion.div>
        )}
        
        {(appState === 'analyzing' || appState === 'uploading') && (
          <motion.div 
            key="analysis" 
            className="absolute inset-0 z-10"
            initial={{ opacity: 0, scale: 1.05 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
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
            transition={{ duration: 0.8 }}
          >
            <div className="canvas-container w-full h-full opacity-30">
              <AnalysisView />
            </div>
            
            <div className="hud-overlay absolute top-4 left-4 z-10 opacity-50">
              <WaveformDisplay />
            </div>
            
            <div className="hud-overlay absolute top-4 right-4 z-10 opacity-50">
              <VelocityHUD />
            </div>
            
            {/* Verdict gets major emphasis */}
            <motion.div 
              className="hud-overlay absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-20"
              initial={{ scale: 0.9, y: "-40%" }}
              animate={{ scale: 1, y: "-50%" }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
            >
              <div className="shadow-[0_0_100px_rgba(0,255,255,0.15)] rounded-lg">
                <VerdictPanel />
              </div>
            </motion.div>

            {/* Navigation to demo flow */}
            <motion.button
              className="absolute bottom-8 right-8 z-30 px-6 py-3 border border-cyan-500/40 bg-black/60 backdrop-blur-sm text-cyan-400 font-mono text-sm tracking-wider hover:bg-cyan-500/10 hover:border-cyan-400/60 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
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
            transition={{ duration: 0.6 }}
          >
            <Suspense fallback={<div className="hud-panel p-8 text-cyan-400 font-mono animate-pulse">Loading...</div>}>
              <CompareView />
            </Suspense>
            <motion.button
              className="absolute bottom-8 right-8 z-30 px-6 py-3 border border-cyan-500/40 bg-black/60 backdrop-blur-sm text-cyan-400 font-mono text-sm tracking-wider hover:bg-cyan-500/10 hover:border-cyan-400/60 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
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
            transition={{ duration: 0.6 }}
          >
            <Suspense fallback={<div className="hud-panel p-8 text-cyan-400 font-mono animate-pulse">Loading...</div>}>
              <TechnicalDetailPanel />
            </Suspense>
            <motion.button
              className="absolute bottom-8 right-8 z-30 px-6 py-3 border border-cyan-500/40 bg-black/60 backdrop-blur-sm text-cyan-400 font-mono text-sm tracking-wider hover:bg-cyan-500/10 hover:border-cyan-400/60 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={() => useLarynxStore.getState().setStatus('closing')}
              data-interactive
            >
              CLOSING →
            </motion.button>
          </motion.div>
        )}

        {appState === 'closing' && (
          <motion.div
            key="closing"
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Suspense fallback={<div className="hud-panel p-8 text-cyan-400 font-mono animate-pulse">Loading...</div>}>
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
