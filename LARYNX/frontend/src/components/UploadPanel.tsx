import React, { useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Upload, FileAudio, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import useLarynxStore from "@/store/useLarynxStore"
import { useAnalysisStream } from '@/hooks/useAnalysisStream'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/ogg", "audio/flac", "audio/x-m4a"]
const ALLOWED_EXTS = [".wav", ".mp3", ".ogg", ".flac"]

export default function UploadPanel() {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioFile = useLarynxStore((state) => state.audioFile)
  const { startStream } = useAnalysisStream()

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
      useLarynxStore.getState().setAudioFile(file)
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
    startStream()
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex w-full items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-[#EDEDED] mb-2">LARYNX.</h2>
          <p className="text-[#666666]">Deepfake Voice Detection via Articulatory Physics</p>
        </div>

        <div
          className={cn(
            "relative flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200",
            isDragging
              ? "border-[#00FFFF] bg-[#00FFFF]/5"
              : "border-[#1F1F1F] bg-[#0A0A0A] hover:border-[#666666]"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".wav,.mp3,.ogg,.flac"
            onChange={handleFileChange}
          />
          
          <div className="pointer-events-none flex flex-col items-center space-y-4 text-center">
            <div className={cn(
              "rounded-full p-4 transition-colors",
              isDragging ? "bg-[#00FFFF]/10 text-[#00FFFF]" : "bg-[#1F1F1F] text-[#666666]"
            )}>
              <Upload className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[#EDEDED] font-medium mb-1">
                Drop audio file here <span className="text-[#666666]">or click to browse</span>
              </p>
              <p className="text-xs text-[#666666]">
                .wav, .mp3, .ogg, .flac &middot; Max 10MB
              </p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex items-center space-x-2 text-sm text-[#FF3366]"
            >
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </motion.div>
          )}

          {audioFile && duration !== null && !error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="rounded bg-[#1F1F1F] p-2 text-[#00FFFF]">
                    <FileAudio className="h-5 w-5" />
                  </div>
                  <div className="truncate text-sm">
                    <p className="truncate font-medium text-[#EDEDED]">{audioFile.name}</p>
                    <p className="text-[#666666]">
                      {(audioFile.size / 1024 / 1024).toFixed(2)} MB &middot; {formatDuration(duration)}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleAnalyze} 
                  className="ml-4 shrink-0 font-semibold tracking-wide"
                >
                  Analyze
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}