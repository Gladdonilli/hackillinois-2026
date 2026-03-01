import { useState } from 'react'
import useLarynxStore from '@/store/useLarynxStore'
import { useGenerateCompareStream } from '@/hooks/useGenerateCompareStream'
import type { GeminiVoice, OpenAIVoice } from '@/types/larynx'

const API_BASE = import.meta.env.VITE_API_URL || 'https://larynx-api.tianyi35.workers.dev'

const GEMINI_VOICES: GeminiVoice[] = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']
const OPENAI_VOICES: OpenAIVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

export default function GenerateComparePanel() {
  const audioFile = useLarynxStore((s) => s.audioFile)
  const generatePromptText = useLarynxStore((s) => s.generatePromptText)
  const selectedEngine = useLarynxStore((s) => s.selectedEngine)
  const geminiVoice = useLarynxStore((s) => s.geminiVoice)
  const openaiVoice = useLarynxStore((s) => s.openaiVoice)
  const isTranscribing = useLarynxStore((s) => s.isTranscribing)
  const setGeneratePromptText = useLarynxStore((s) => s.setGeneratePromptText)
  const setSelectedEngine = useLarynxStore((s) => s.setSelectedEngine)
  const setGeminiVoice = useLarynxStore((s) => s.setGeminiVoice)
  const setOpenaiVoice = useLarynxStore((s) => s.setOpenaiVoice)
  const setIsTranscribing = useLarynxStore((s) => s.setIsTranscribing)
  const setTranscribedText = useLarynxStore((s) => s.setTranscribedText)

  const { startGenerateCompare, isGenerating } = useGenerateCompareStream()
  const [error, setError] = useState<string | null>(null)

  const showGeminiVoice = selectedEngine === 'gemini' || selectedEngine === 'both'
  const showOpenaiVoice = selectedEngine === 'openai' || selectedEngine === 'both'

  const handleTranscribe = async () => {
    if (!audioFile) {
      setError('Upload a real audio file first')
      return
    }
    setError(null)
    setIsTranscribing(true)

    const formData = new FormData()
    formData.append('file', audioFile)

    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/transcribe`, {
        method: 'POST',
        body: formData,
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.success || !payload?.data?.text) {
        const msg = payload?.error?.message || `Transcription failed (${res.status})`
        throw new Error(msg)
      }

      const text = payload.data.text as string
      setTranscribedText(text)
      setGeneratePromptText(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleGenerateCompare = async () => {
    if (!audioFile) {
      setError('Upload a real audio file first')
      return
    }
    if (!generatePromptText.trim()) {
      setError('Enter text or transcribe first')
      return
    }

    setError(null)
    await startGenerateCompare(audioFile)
  }

  return (
    <div className="hud-panel p-4 w-[520px] max-w-[90vw] pointer-events-auto border-cyan/30 bg-black/70 backdrop-blur-md">
      <div className="text-xs font-mono tracking-widest text-cyan/80 mb-2">GENERATE + COMPARE</div>

      <textarea
        value={generatePromptText}
        onChange={(e) => setGeneratePromptText(e.target.value)}
        placeholder="Type the phrase you want Gemini/OpenAI to synthesize..."
        className="w-full h-24 rounded-sm border border-cyan/30 bg-black/40 text-white/90 px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan/60"
      />

      <div className="grid grid-cols-3 gap-2 mt-3">
        <select
          value={selectedEngine}
          onChange={(e) => setSelectedEngine(e.target.value as 'gemini' | 'openai' | 'both')}
          className="rounded-sm border border-cyan/30 bg-black/40 text-white/90 px-2 py-2 text-xs font-mono"
        >
          <option value="gemini">Gemini only</option>
          <option value="openai">OpenAI only</option>
          <option value="both">Both engines</option>
        </select>

        <select
          value={geminiVoice}
          onChange={(e) => setGeminiVoice(e.target.value as GeminiVoice)}
          disabled={!showGeminiVoice}
          className="rounded-sm border border-cyan/30 bg-black/40 text-white/90 px-2 py-2 text-xs font-mono disabled:opacity-40"
        >
          {GEMINI_VOICES.map((voice) => (
            <option key={voice} value={voice}>{voice}</option>
          ))}
        </select>

        <select
          value={openaiVoice}
          onChange={(e) => setOpenaiVoice(e.target.value as OpenAIVoice)}
          disabled={!showOpenaiVoice}
          className="rounded-sm border border-cyan/30 bg-black/40 text-white/90 px-2 py-2 text-xs font-mono disabled:opacity-40"
        >
          {OPENAI_VOICES.map((voice) => (
            <option key={voice} value={voice}>{voice}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleTranscribe}
          disabled={!audioFile || isTranscribing || isGenerating}
          className="px-3 py-2 rounded-sm border border-cyan/40 bg-black/50 text-cyan/90 text-xs font-mono tracking-wider disabled:opacity-40"
        >
          {isTranscribing ? 'TRANSCRIBING...' : 'TRANSCRIBE REAL AUDIO'}
        </button>

        <button
          onClick={handleGenerateCompare}
          disabled={!audioFile || !generatePromptText.trim() || isGenerating || isTranscribing}
          className="px-3 py-2 rounded-sm border border-violation/40 bg-black/50 text-violation text-xs font-mono tracking-wider disabled:opacity-40"
        >
          {isGenerating ? 'GENERATING...' : 'GENERATE + COMPARE'}
        </button>
      </div>

      {error && <div className="text-xs font-mono text-warn mt-2">{error}</div>}
    </div>
  )
}
