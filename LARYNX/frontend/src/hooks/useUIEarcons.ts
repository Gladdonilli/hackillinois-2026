import { useCallback } from 'react'
import * as Tone from 'tone'
import { playHover, playClick, playSwoosh } from '@/audio/uiEarcons'

/**
 * Hook providing UI earcon sound functions.
 * Only plays after AudioContext is unlocked (first user gesture).
 * All Tone objects are module-scoped singletons in uiEarcons.ts.
 */
export function useUIEarcons() {
  const hover = useCallback(() => {
    if (Tone.getContext().state === 'running') playHover()
  }, [])

  const click = useCallback(() => {
    if (Tone.getContext().state === 'running') playClick()
  }, [])

  const swoosh = useCallback(() => {
    if (Tone.getContext().state === 'running') playSwoosh()
  }, [])

  return { playHover: hover, playClick: click, playSwoosh: swoosh }
}
