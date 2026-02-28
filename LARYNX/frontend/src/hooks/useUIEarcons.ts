import { useCallback } from 'react'
import * as Tone from 'tone'
import { playHover, playClick, playSwoosh, playNavigationTransition, playError, playSuccess, playDropHover } from '@/audio/uiEarcons'

/**
 * Hook providing UI earcon sound functions.
 * Only plays after AudioContext is unlocked (first user gesture).
 * All Tone objects are module-scoped singletons in uiEarcons.ts.
 */
export function useUIEarcons() {
  const isReady = () => Tone.getContext().state === 'running'

  const hover = useCallback(() => {
    if (isReady()) playHover()
  }, [])

  const click = useCallback(() => {
    if (isReady()) playClick()
  }, [])

  const swoosh = useCallback(() => {
    if (isReady()) playSwoosh()
  }, [])

  const navTransition = useCallback(() => {
    if (isReady()) playNavigationTransition()
  }, [])

  const error = useCallback(() => {
    if (isReady()) playError()
  }, [])

  const success = useCallback(() => {
    if (isReady()) playSuccess()
  }, [])

  const dropHover = useCallback(() => {
    if (isReady()) playDropHover()
  }, [])

  return {
    playHover: hover,
    playClick: click,
    playSwoosh: swoosh,
    playNavigationTransition: navTransition,
    playError: error,
    playSuccess: success,
    playDropHover: dropHover,
  }
}
