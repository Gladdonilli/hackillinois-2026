import { useRef, useState, useCallback } from 'react'
import useLarynxStore from '@/store/useLarynxStore'
import { useUIEarcons } from '@/hooks/useUIEarcons'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/ogg", "audio/flac", "audio/x-m4a"]
const ALLOWED_EXTS = [".wav", ".mp3", ".ogg", ".flac"]

interface AudioContextConstructor {
  new (contextOptions?: AudioContextOptions): AudioContext
}

export function useAudioIntake() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isProcessingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const audioFile = useLarynxStore((s) => s.audioFile)
  const setAudioFile = useLarynxStore((s) => s.setAudioFile)
  const { playSuccess, playSwoosh, playDropHover } = useUIEarcons()

  const validateAndProcessFile = useCallback(async (file: File) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setError(null)

    const isExtValid = ALLOWED_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!isExtValid && !ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid file format. Please upload .wav, .mp3, .ogg, or .flac")
      isProcessingRef.current = false
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
      isProcessingRef.current = false
      return
    }

    try {
      const AudioCtx: AudioContextConstructor = window.AudioContext || (window as unknown as { webkitAudioContext: AudioContextConstructor }).webkitAudioContext
      const audioContext = new AudioCtx()
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      setDuration(audioBuffer.duration)

      playSuccess()
      setAudioFile(file)
    } catch (err) {
      console.error("Failed to decode audio", err)
      setError("Failed to decode audio file.")
    } finally {
      isProcessingRef.current = false
    }
  }, [playSuccess, setAudioFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!isDragging) {
      playDropHover()
    }
    setIsDragging(true)
  }, [isDragging, playDropHover])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await validateAndProcessFile(file)
    }
  }, [validateAndProcessFile])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await validateAndProcessFile(file)
    }
  }, [validateAndProcessFile])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const clearFile = useCallback(() => {
    playSwoosh()
    setAudioFile(null)
    setDuration(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [playSwoosh, setAudioFile])

  return {
    fileInputRef,
    isDragging,
    error,
    duration,
    audioFile,
    openFilePicker,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    clearFile,
    validateAndProcessFile,
  }
}
