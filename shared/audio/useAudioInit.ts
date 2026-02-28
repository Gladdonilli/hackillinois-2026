import { useState, useEffect, useCallback } from 'react';
import { SoundEngine } from './SoundEngine';

export function useAudioInit() {
  const [isAudioReady, setIsAudioReady] = useState(() => SoundEngine.getInstance().isReady);

  const initAudio = useCallback(async () => {
    const engine = SoundEngine.getInstance();
    if (!engine.isReady) {
      await engine.init();
      setIsAudioReady(true);
    }
  }, []);

  useEffect(() => {
    if (isAudioReady) return;

    const handleInteraction = () => {
      initAudio().catch(console.error);
    };

    document.addEventListener('pointerdown', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('pointerdown', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [initAudio, isAudioReady]);

  return { isAudioReady, initAudio };
}
