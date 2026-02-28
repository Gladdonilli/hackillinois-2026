import React, { useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { AudioWaveform, AlertCircle, X } from "lucide-react"
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
              <p className="text-xs text-dim font-mono mt-1">
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { playClick, playSwoosh, playDropHover, playSuccess } = useUIEarcons()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const audioFile = useLarynxStore((s) => s.audioFile)
  const setAudioFile = useLarynxStore((s) => s.setAudioFile)
  const setPortalState = useLarynxStore((s) => s.setPortalState)
  const { startStream } = useAnalysisStream()

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
      
      playSuccess()
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
    if (!isDragging) {
      playDropHover()
    }
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
      className="absolute inset-0 z-20 pointer-events-none"
    >
      {/* Invisible full-screen drop target — pointer-events only on lower 60% */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[60%] pointer-events-auto cursor-pointer transition-all duration-500",
          isDragging && "bg-cyan/[0.03]"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !audioFile && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".wav,.mp3,.ogg,.flac"
          onChange={handleFileChange}
        />

        {/* Subtle drag-active indicator — just a border glow, no box */}
        {isDragging && (
          <div className="absolute inset-0 border border-cyan/15 rounded-sm pointer-events-none" />
        )}
      </div>

      {/* File card overlay — shows briefly after valid drop */}
      <AnimatePresence>
        {audioFile && duration !== null && !error && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30">
            <FileCard
              file={audioFile}
              duration={duration}
              clearFile={clearFile}
              setDuration={setDuration}
              setError={setError}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Error toast */}
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
  )
}
