import { useEffect, useRef } from 'react'
import { useLarynxStore } from '@/store/useLarynxStore'
import UploadPanel from '@/components/UploadPanel'
import { AnalysisView } from '@/components/AnalysisView'
import { VelocityHUD } from '@/components/VelocityHUD'
import { VerdictPanel } from '@/components/VerdictPanel'
import { WaveformDisplay } from '@/components/WaveformDisplay'
import { AnalysisOverlay } from '@/components/AnalysisOverlay'
import { SoundEngine } from '@/audio/SoundEngine'

export default function App() {
  const status = useLarynxStore((state) => state.status)
  const initRef = useRef(false)

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
    if (!SoundEngine.isInitialized()) return

    switch (status) {
      case 'uploading':
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
          SoundEngine.playVerdict(verdict.isGenuine ? 'genuine' : 'deepfake')
        }
        break
      }
      case 'error':
        SoundEngine.stopTicking()
        SoundEngine.stopDrone()
        break
      case 'idle':
        SoundEngine.stopTicking()
        SoundEngine.stopDrone()
        break
    }
  }, [status])

  // Update velocity-reactive sound during analysis
  useEffect(() => {
    if (status !== 'analyzing' || !SoundEngine.isInitialized()) return

    let prevVelocity = useLarynxStore.getState().tongueVelocity
    const unsub = useLarynxStore.subscribe((state) => {
      if (state.tongueVelocity !== prevVelocity) {
        prevVelocity = state.tongueVelocity
        SoundEngine.updateVelocity(state.tongueVelocity)
      }
    })
    return unsub
  }, [status])

  if (status === 'idle') {
    return (
      <main className="w-full h-screen bg-black flex items-center justify-center">
        <UploadPanel />
      </main>
    )
  }

  return (
    <main className="w-full h-screen bg-black relative overflow-hidden">
      {/* 3D Scene Layer */}
      <AnalysisView />

      {/* Analysis Progress Overlay */}
      <AnalysisOverlay />

      {/* HUD Layers */}
      <div className="hud-overlay absolute top-0 left-0 z-10 p-4">
        <WaveformDisplay />
      </div>

      <div className="hud-overlay absolute top-0 right-0 z-10 p-4">
        <VelocityHUD />
      </div>

      <div className="hud-overlay absolute bottom-0 left-1/2 -translate-x-1/2 z-10 p-6 w-full max-w-xl">
        <VerdictPanel />
      </div>
    </main>
  )
}
