import { useLarynxStore } from '@/store/useLarynxStore'
import UploadPanel from '@/components/UploadPanel'
import { AnalysisView } from '@/components/AnalysisView'
import { VelocityHUD } from '@/components/VelocityHUD'
import { VerdictPanel } from '@/components/VerdictPanel'
import { WaveformDisplay } from '@/components/WaveformDisplay'

export default function App() {
  const status = useLarynxStore((state) => state.status)

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
