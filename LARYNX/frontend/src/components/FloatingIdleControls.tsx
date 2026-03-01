import { useState } from 'react'
import { useAudioIntake } from '@/hooks/useAudioIntake'
import { useLarynxStore } from '@/store/useLarynxStore'
import { useUIEarcons } from '@/hooks/useUIEarcons'

/** Floating text controls scattered along convergence wave paths */
export function FloatingIdleControls() {
  const { fileInputRef, isDragging, error, audioFile, openFilePicker, handleFileChange, clearFile } = useAudioIntake()
  const [showSynth, setShowSynth] = useState(false)
  const { playHover, playClick } = useUIEarcons()

  return (
    <div className="fixed z-[9999] pointer-events-none" style={{ top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {/* Hidden file input */}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.ogg,.flac"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="text-cyan font-mono text-lg tracking-widest animate-pulse">
            DROP AUDIO FILE
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-warn/10 border border-warn/30 text-warn font-mono text-xs tracking-wider rounded">
          {error}
        </div>
      )}

      {/* File indicator — shows after upload, prompts aura click */}
      {audioFile && (
        <div className="absolute z-30 pointer-events-auto" style={{ left: '14%', top: '60%' }}>
          <div className="floating-wave-label floating-wave-label--file-indicator">
            <span className="floating-label-file-name">{audioFile.name.length > 24 ? audioFile.name.slice(0, 21) + '...' : audioFile.name}</span>
            <span className="floating-label-sub">click the aura to analyze</span>
            <button
              className="floating-label-clear"
              onClick={(e) => { e.stopPropagation(); playClick(); clearFile() }}
              onMouseEnter={() => playHover()}
              data-interactive
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Floating scattered controls — left to right along wave paths */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Upload — left side, along upper-left wave path */}
        <button
          className="floating-wave-label floating-wave-label--upload pointer-events-auto"
          onClick={() => { playClick(); openFilePicker() }}
          onMouseEnter={() => playHover()}
          data-interactive
        >
          <span className="floating-label-text">UPLOAD</span>
          <span className="floating-label-sub">drop or click</span>
        </button>

        {/* Synthesize — center-left, along mid wave path */}
        <button
          className="floating-wave-label floating-wave-label--synthesize pointer-events-auto"
          onClick={() => { playClick(); setShowSynth(prev => !prev) }}
          onMouseEnter={() => playHover()}
          data-interactive
        >
          <span className="floating-label-text">SYNTHESIZE</span>
          <span className="floating-label-sub">generate & compare</span>
        </button>

        {/* View Database — right side, along lower-right wave path */}
        <button
          className="floating-wave-label floating-wave-label--database pointer-events-auto"
          onClick={() => { playClick(); useLarynxStore.getState().toggleHistory() }}
          onMouseEnter={() => playHover()}
          data-interactive
        >
          <span className="floating-label-text">VIEW DATABASE</span>
          <span className="floating-label-sub">past analyses</span>
        </button>
      </div>

      {/* Synth panel overlay */}
      {showSynth && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="relative bg-black/80 backdrop-blur-md border border-cyan/10 rounded-sm p-6 max-w-md w-full mx-4">
            <button
              className="absolute top-3 right-3 text-white/30 hover:text-warn text-xs font-mono"
              onClick={() => setShowSynth(false)}
              data-interactive
            >
              ✕ CLOSE
            </button>
            <div className="font-mono text-xs text-dim tracking-widest mb-4">TTS SYNTHESIS</div>
            <div className="font-mono text-[10px] text-white/30 text-center py-8">
              Requires API keys configured in worker
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
