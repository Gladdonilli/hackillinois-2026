import React, { useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Upload, AudioWaveform, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import useLarynxStore from "@/store/useLarynxStore"
import { useAnalysisStream } from '@/hooks/useAnalysisStream'
import { useUIEarcons } from '@/hooks/useUIEarcons'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/ogg", "audio/flac", "audio/x-m4a"]
const ALLOWED_EXTS = [".wav", ".mp3", ".ogg", ".flac"]

function FileCard({
  file,
  duration,
  clearFile
}: {
  file: File | null
  duration: number | null
  clearFile: () => void
  setDuration: React.Dispatch<React.SetStateAction<number | null>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}) {
  if (!file) return null

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 pointer-events-auto"
    >
      <div className="hud-panel p-4 flex flex-col gap-4 border-[var(--cyan)]/30 backdrop-blur-md shadow-lg shadow-[var(--cyan)]/10">
        <div className="flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="text-[var(--cyan)] glow-cyan shrink-0 relative flex items-center justify-center h-8 w-8">
              <motion.div
                animate={{ scaleY: [0.5, 1.2, 0.8, 1.5, 0.5], opacity: [0.5, 1, 0.7, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 border border-[var(--cyan)] rounded-full opacity-30"
              />
              <AudioWaveform className="h-5 w-5 z-10" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 pointer-events-auto">
              <p className="truncate font-mono text-foreground text-sm">{file.name}</p>
              <p className="text-xs text-[#666] font-mono mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {duration && ` • ${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`}
              </p>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation()
              clearFile()
            }}
            className="p-1 rounded-full text-[#666] hover:text-[var(--warn)] hover:bg-[var(--warn)]/10 transition-colors shrink-0 pointer-events-auto"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function UploadPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { playClick, playSwoosh } = useUIEarcons()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [glitchActive, setGlitchActive] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioFile = useLarynxStore((state) => state.audioFile)
  const setAudioFile = useLarynxStore((state) => state.setAudioFile)
  const setPortalState = useLarynxStore((state) => state.setPortalState)
  const { startStream } = useAnalysisStream()

  React.useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 200)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const validateAndProcessFile = async (file: File) => {
    setError(null)
    
    const isExtValid = ALLOWED_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!isExtValid && !ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid file format. Please upload .wav, .mp3, .ogg, or .flac")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
      return
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      setDuration(audioBuffer.duration)
      
      setAudioFile(file)
      
      // Immediately trigger portal process after setting file
      setTimeout(() => {
        handleAnalyze()
      }, 400) // Small delay so the user sees the file card briefly
    } catch (err) {
      console.error("Failed to decode audio", err)
      setError("Failed to decode audio file.")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await validateAndProcessFile(file)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await validateAndProcessFile(file)
    }
  }

  const handleAnalyze = () => {
    playClick()
    setPortalState('entering')
    startStream()
  }

  const clearFile = () => {
    playSwoosh()
    setAudioFile(null)
    setDuration(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-between py-12"
    >
      <div className="w-full max-w-lg mx-auto h-full flex flex-col justify-between">
        
        {/* Header Text - Remains at top */}
        <div className="text-center mt-6">
          <h2 className="text-4xl font-mono tracking-[0.3em] uppercase glitch-text text-glow-cyan text-[#EDEDED] mb-2"
            style={{ animationPlayState: glitchActive ? 'running' : 'paused' }}
            data-text="LARYNX.">
            LARYNX.
          </h2>
          <p className="text-xs tracking-[0.4em] uppercase text-[#666] mt-2">
            DEEPFAKE VOICE DETECTION
          </p>
          <div className="h-[1px] w-24 mx-auto mt-4 bg-gradient-to-r from-transparent via-[var(--cyan)] to-transparent" />
        </div>

        {/* Main interactive area */}
        <div className="flex-1 flex items-center justify-center pointer-events-none relative">
          <AnimatePresence mode="wait">
            {audioFile && duration !== null && !error ? (
              <FileCard
                file={audioFile}
                duration={duration}
                clearFile={clearFile}
                setDuration={setDuration}
                setError={setError}
              />
            ) : (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-center mt-32 pointer-events-auto"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={cn(
                    "relative flex w-48 h-48 cursor-pointer flex-col items-center justify-center rounded-3xl transition-all duration-300 group overflow-hidden",
                    isDragging
                      ? "bg-[rgba(0,255,255,0.08)] border-[var(--cyan)] border-solid border shadow-[0_0_40px_rgba(0,255,255,0.3)] backdrop-blur-sm"
                      : "bg-[rgba(0,255,255,0.02)] border border-[rgba(0,255,255,0.1)] border-dashed hover:bg-[rgba(0,255,255,0.05)] hover:border-[rgba(0,255,255,0.2)] hover:border-solid hover:shadow-[0_0_20px_rgba(0,255,255,0.1)] backdrop-blur-[2px]"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !audioFile && fileInputRef.current?.click()}
                >
                  <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[rgba(0,255,255,0.3)] pointer-events-none rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[rgba(0,255,255,0.3)] pointer-events-none rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[rgba(0,255,255,0.3)] pointer-events-none rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[rgba(0,255,255,0.3)] pointer-events-none rounded-br-xl" />
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".wav,.mp3,.ogg,.flac"
                    onChange={handleFileChange}
                  />
                  
                  <div className="pointer-events-none flex flex-col items-center space-y-3 text-center p-4">
                    <motion.div 
                      initial={{ scale: 1 }}
                      animate={{ scale: isDragging ? 1.2 : 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={cn(
                        "rounded-full p-2 transition-colors duration-300",
                        isDragging ? "text-[var(--cyan)] glow-cyan" : "text-[rgba(0,255,255,0.3)] group-hover:text-[rgba(0,255,255,0.7)]"
                      )}>
                      <Upload className="h-6 w-6" strokeWidth={1.5} />
                    </motion.div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-[10px] text-[#00FFFF]/70 mb-1 font-mono uppercase tracking-widest drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">
                        TARGET AUDIO
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center space-x-2 text-sm text-[var(--warn)] hud-panel border-[var(--warn)]/30 p-3 bg-[var(--warn)]/5 pointer-events-none z-30"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-mono">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
