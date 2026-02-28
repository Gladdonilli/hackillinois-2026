import { useCallback } from 'react'
import { useLarynxStore } from '@/store/useLarynxStore'

export function useAnalysisStream() {
  const startStream = useCallback(() => {
    const store = useLarynxStore.getState()
    if (!store.audioFile) return
    
    // Delegate to store's startAnalysis which handles mock data generation
    store.startAnalysis()
  }, [])

  return { startStream }
}

export function useSSEAnalysis(endpoint: string) {
  const startSSE = useCallback(() => {
    const store = useLarynxStore.getState()
    if (!store.audioFile) return

    const formData = new FormData()
    formData.append('audio', store.audioFile)

    // Upload
    store.setStatus('uploading')
    
    fetch(endpoint, { method: 'POST', body: formData })
      .then((response: Response) => {
        if (!response.ok) throw new Error('Upload failed')
        if (!response.body) throw new Error('No stream')
        
        store.setStatus('analyzing')
        
        // SSE parsing would go here
        // For now, fall back to mock
        store.startAnalysis()
      })
      .catch(() => {
        store.setStatus('error')
      })
  }, [endpoint])

  return { startSSE }
}
