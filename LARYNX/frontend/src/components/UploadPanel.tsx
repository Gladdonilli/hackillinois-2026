import React, { useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Upload, AudioWaveform, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import useLarynxStore from "@/store/useLarynxStore"
import { useAnalysisStream } from '@/hooks/useAnalysisStream'


const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/ogg", "audio/flac", "audio/x-m4a"]
const ALLOWED_EXTS = [".wav", ".mp3", ".ogg", ".flac"]

export default function UploadPanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [status, setStatus] = useState<"idle" | "analyzing">("idle")
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glitchActive, setGlitchActive] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioFile = useLarynxStore((state) => state.audioFile)
  const setAudioFile = useLarynxStore((state) => state.setAudioFile)
  const { startStream } = useAnalysisStream()

  React.useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 200)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height
    setTilt({ x: y * -3, y: x * 3 })
  }, [])

  const handleMouseLeave = React.useCallback(() => {
    setTilt({ x: 0, y: 0 })
  }, [])

  const validateAndProcessFile = async (file: File) => {
    setError(null)
    
    // Check extension
    const isExtValid = ALLOWED_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!isExtValid && !ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid file format. Please upload .wav, .mp3, .ogg, or .flac")
      return
    }

    // Check size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
      return
    }

    try {
      // Decode audio to get duration
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      setDuration(audioBuffer.duration)
      
      // Update store
      setAudioFile(file)
    } catch (err) {
      console.error("Failed to decode audio", err)
      setError("Failed to decode audio file. It might be corrupted or unsupported.")
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
    setStatus("analyzing")
    startStream()
  }

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setAudioFile(null)
    setDuration(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const formatSize = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  return (
    <div
      className="flex w-full flex-col items-center justify-center p-6 min-h-[60vh]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        ref={panelRef}
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: "transform 0.15s ease-out" }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-mono tracking-[0.3em] uppercase glitch-text text-glow-cyan text-[#EDEDED] mb-2"
            style={{ animationPlayState: glitchActive ? 'running' : 'paused' }}
            data-text="LARYNX.">
            LARYNX.
          </h2>
          <p className="text-xs tracking-[0.4em] uppercase text-[#666] mt-2">
            DEEPFAKE VOICE DETECTION
          </p>
          <div className="h-[1px] w-24 mx-auto mt-4 mb-8 bg-gradient-to-r from-transparent via-[var(--cyan)] to-transparent" />
        </div>

        <motion.div
          whileHover={{ scale: audioFile ? 1 : 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg transition-all duration-300 hud-panel group",
            isDragging
              ? "border-[var(--cyan)] bg-[rgba(0,255,255,0.03)]"
              : "border-glow bg-[#0A0A0A]/80 backdrop-blur-sm group-hover:shadow-[0_0_30px_rgba(0,255,255,0.15)] group-hover:border-solid border-dashed"
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
          
          <div className="pointer-events-none flex flex-col items-center space-y-4 text-center p-6">
            <motion.div 
              initial={{ scale: 1 }}
              animate={{ scale: isDragging ? 1.2 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "rounded-full p-4 transition-colors",
                isDragging ? "text-[var(--cyan)] glow-cyan" : "text-[var(--cyan)] animate-breathe"
              )}>
              <Upload className="h-8 w-8" strokeWidth={1.5} />
            </motion.div>
            <div>
              <p className="text-sm text-[#666] mb-1">
                Drop <span className="text-[var(--cyan)] font-medium">audio file</span> here
              </p>
              <p className="text-xs text-[#666] mt-1 font-mono tracking-wider">
                .wav, .mp3, .ogg, .flac &middot; Max 10MB
              </p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="popLayout">
          {/* Error Display */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: [-4, 4, -4, 4, 0] }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 flex items-center space-x-2 text-sm text-[var(--warn)] hud-panel border-[var(--warn)]/30 p-3 bg-[var(--warn)]/5"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-mono">{error}</span>
            </motion.div>
          )}

          {/* File Preview & Analyze Button */}
          {audioFile && duration !== null && !error && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="mt-6 flex flex-col gap-4"
            >
              <div className="hud-panel hud-sweep p-4 flex items-center justify-between border-[var(--cyan)]/20 hover:-translate-y-0.5 transition-transform duration-300">
                <div className="flex items-center space-x-4 overflow-hidden">
                  <div className="text-[var(--cyan)] glow-cyan shrink-0 relative flex items-center justify-center h-8 w-8">
                    <motion.div
                      animate={{ scaleY: [0.5, 1.2, 0.8, 1.5, 0.5], opacity: [0.5, 1, 0.7, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 border border-[var(--cyan)] rounded-full opacity-30"
                    />
                    <AudioWaveform className="h-5 w-5 z-10" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-foreground text-sm">{audioFile.name}</p>
                    <p className="text-xs text-[#666] font-mono mt-1">
                      {formatSize(audioFile.size)} &middot; {formatDuration(duration)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={clearFile}
                  className="p-2 text-[#666] hover:text-[var(--warn)] transition-colors shrink-0"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                whileTap={{ scale: 0.98 }}
                className="w-full"
              >
                <Button 
                  onClick={handleAnalyze} 
                  disabled={status === "analyzing"}
                  className={cn(
                    "w-full h-12 bg-transparent border border-[var(--cyan)] text-[var(--cyan)] uppercase tracking-[0.2em] font-mono text-sm hover:bg-[var(--cyan)]/10 hover:glow-cyan transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
                    status === "idle" && "animate-pulse-glow"
                  )}
                >
                  {status === "analyzing" ? (
                    <span className="flex items-center space-x-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-4 w-4 border-2 border-[var(--cyan)] border-t-transparent rounded-full" />
                      <span className="animate-pulse">INITIALIZING...</span>
                    </span>
                  ) : (
                    "INITIATE SCAN"
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Footer */}
        <motion.div className="mt-8 flex justify-center items-center space-x-3 text-[10px] text-[#555] font-mono tracking-wider uppercase" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.2 } } }}>
          <motion.span variants={{ hidden: { opacity: 0, y: 5 }, visible: { opacity: 1, y: 0 } }}>PROTOCOL v2.1</motion.span>
          <span className="h-[2px] w-[2px] rounded-full bg-[#444]" />
          <motion.span variants={{ hidden: { opacity: 0, y: 5 }, visible: { opacity: 1, y: 0 } }}>ARTICULATORY PHYSICS</motion.span>
          <span className="h-[2px] w-[2px] rounded-full bg-[#444]" />
          <motion.span variants={{ hidden: { opacity: 0, y: 5 }, visible: { opacity: 1, y: 0 } }}>EMA 6-SENSOR</motion.span>
        </motion.div>
      </motion.div>
    </div>
  )
}
