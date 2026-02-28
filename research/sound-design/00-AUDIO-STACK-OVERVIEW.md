# LARYNX Audio Stack & Architecture

> Technical reference for sound implementation — Feb 28, 2026

## Stack Overview

| Layer | Library | Size | Purpose |
|-------|---------|------|---------|
| UI sounds | `use-sound` | ~3kb | Clicks, transitions, notifications |
| Engine | Howler.js | ~9kb | Loaded by use-sound automatically |
| 3D spatial | Drei `<PositionalAudio>` | 0kb (bundled w/ R3F) | Scene-tied sounds |
| Procedural | Tone.js | ~16kb | Synthesized neural/electrical sounds |
| **Total** | | **~28kb** | Under 60kb animation budget |

## Architecture

```
SoundProvider (Zustand store)
├── isMuted: boolean
├── masterVolume: number (0-1)
├── bgmVolume: number (0-1)
├── audioUnlocked: boolean (first-click gate)
└── consumed by all useSound() calls via soundEnabled prop

"Click to Enter" overlay
└── Unlocks AudioContext (browser autoplay policy)
└── Howler.ctx.resume() + THREE.AudioListener.resume()

2D Layer (Howler via use-sound)
├── UI interactions (sprite sheet — one .mp3, many sounds)
├── Page transitions
├── Dramatic reveal moments
└── Volume ducking: bgm.fade(0.5, 0.1, 300) during SFX

3D Layer (Three.js Audio)
├── AudioListener on camera
├── PositionalAudio on meshes (auto-inherit position)
├── AudioAnalyser → shader uniforms (bloom/chromatic react to audio)
└── Tone.js synths → PositionalAudio GainNode (procedural spatial)

Master Bus (MANDATORY)
├── Tone.Filter({ frequency: 120, type: "highpass", rolloff: -24 })
├── Tone.Limiter(-1)
└── Prevents IMD distortion + digital clipping on small speakers
```

## SSR / Next.js 15 Rules

- All audio hooks inside `'use client'` components
- Never `play()` on mount — always user-initiated
- Use mounted state check to avoid hydration errors
- Lazy load Tone.js via `next/dynamic` (16kb savings on initial load)

## Sprite Sheet Strategy

Bundle multiple short SFX into one .mp3 file:

```typescript
const SPRITE_MAP = {
  click:      [0, 150],
  swoosh:     [200, 450],
  beep:       [500, 300],
  success:    [900, 1200],
  zap:        [2200, 400],
  snap1:      [2700, 350],
  snap2:      [3100, 350],
  snap3:      [3500, 380],
  glitch:     [4000, 800],
  reveal:     [5000, 1500],
} as const;

// Usage
const [play] = useSound('/sounds/sprites.mp3', {
  sprite: SPRITE_MAP,
  volume: 0.6,
});
play({ id: 'zap' });
```

One file, ~10 SFX, ~50-100kb total. Downloaded once, cached.

## Zustand Sound Store

```typescript
import { create } from 'zustand';

interface SoundState {
  isMuted: boolean;
  masterVolume: number;
  bgmVolume: number;
  audioUnlocked: boolean;
  toggleMute: () => void;
  setMasterVolume: (v: number) => void;
  setBgmVolume: (v: number) => void;
  unlockAudio: () => void;
}

export const useSoundStore = create<SoundState>((set) => ({
  isMuted: false,
  masterVolume: 0.7,
  bgmVolume: 0.15,
  audioUnlocked: false,
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setMasterVolume: (v) => set({ masterVolume: v }),
  setBgmVolume: (v) => set({ bgmVolume: v }),
  unlockAudio: () => set({ audioUnlocked: true }),
}));
```

## AudioContext Unlock Pattern

```typescript
'use client';
import { useCallback } from 'react';
import { useSoundStore } from '@/stores/sound';
import * as Tone from 'tone';

export function AudioGate({ children }: { children: React.ReactNode }) {
  const { audioUnlocked, unlockAudio } = useSoundStore();

  const handleUnlock = useCallback(async () => {
    await Tone.start(); // Resumes AudioContext
    // If using Howler separately: Howler.ctx?.resume();
    unlockAudio();
  }, [unlockAudio]);

  if (!audioUnlocked) {
    return (
      <div onClick={handleUnlock} className="cursor-pointer ...">
        <h1>Click to Enter</h1>
        <p>Audio experience requires interaction</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

## Volume Ducking Pattern

```typescript
// When a dramatic SFX plays, duck the background music
function playRevealWithDuck(bgmSound: Howl) {
  // Duck BGM instantly
  bgmSound.fade(0.15, 0.02, 50);   // 15% → 2% in 50ms

  // Play reveal SFX
  revealPlay({ id: 'sting' });

  // Restore BGM after 4 seconds
  setTimeout(() => {
    bgmSound.fade(0.02, 0.15, 2000); // 2% → 15% over 2s
  }, 4000);
}
```

## R3F Spatial Audio Pattern

```tsx
import { PositionalAudio } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function VelocityRibbon({ velocity }: { velocity: number }) {
  const audioRef = useRef<THREE.PositionalAudio>(null!);

  useFrame(() => {
    if (audioRef.current) {
      // Volume scales with velocity
      audioRef.current.setVolume(Math.min(velocity / 100, 1.0));
    }
  });

  return (
    <mesh>
      {/* ribbon geometry */}
      <PositionalAudio
        ref={audioRef}
        url="/sounds/ribbon-hum.mp3"
        distance={5}
        loop
      />
    </mesh>
  );
}
```

## Free Asset Sources

| Source | License | Best For | URL |
|--------|---------|----------|-----|
| Pixabay | Royalty-free, no attribution | UI SFX, dramatic reveals | pixabay.com/sound-effects |
| Freesound.org | Filter CC0 only | Ambient drones, clinical sounds | freesound.org |
| YouTube Audio Library | No attribution filter available | Background music loops | studio.youtube.com/channel/audio |
| sfxr.me / JSFXR | Generated (yours) | Retro blips, custom zaps | sfxr.me |
| NASA Audio | Public Domain | Space/sci-fi ambience | nasa.gov/audio-and-ringtones |
| ElevenLabs | MLH partner freebie | Dynamic voice narration | elevenlabs.io |

**Avoid**: BBC Sound Effects (RemArc license, personal only), CC-BY-NC (grey area for public MIT repos).

## Dependencies to Install

```bash
npm install use-sound tone zustand
# use-sound pulls howler.js automatically
# @react-three/drei already included (has PositionalAudio)
```

## File Structure

```
public/
  sounds/
    sprites.mp3          # UI SFX sprite sheet
    ambient-drone.mp3    # Background loop
    ribbon-hum.mp3       # 3D spatial loop for ribbons
src/
  stores/
    sound.ts             # Zustand sound state
  components/
    audio/
      AudioGate.tsx      # "Click to Enter" overlay
      SoundProvider.tsx   # Global audio setup
      MasterBus.tsx      # HPF + Limiter chain
  hooks/
    useTonesynth.ts      # Tone.js synth initialization
    useVelocityAudio.ts  # Data-reactive audio hook
```
