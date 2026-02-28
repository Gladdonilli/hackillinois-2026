import { EffectComposer, Bloom, ChromaticAberration, Scanline } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector2 } from 'three'
import { useLarynxStore } from '@/store/useLarynxStore'

export function PostProcessingEffects() {
  const enabled = useLarynxStore((s) => s.postProcessingEnabled)
  const bloomRef = useRef<{ intensity: number }>(null!)
  const chromaticAberrationRef = useRef<{ offset: Vector2 }>(null!)
  const offsetRef = useRef(new Vector2(0.002, 0.002))
  const frameCount = useRef(0)

  useFrame((_, delta) => {
    frameCount.current++
    if (frameCount.current > 60) {
      const fps = 1 / delta
      if (fps < 30) {
        useLarynxStore.getState().setPostProcessingEnabled(false)
      }
    }

    const state = useLarynxStore.getState()
    const velocity = state.tongueVelocity || 0

    // Bloom lerp
    if (bloomRef.current) {
      let targetIntensity = 0.5
      if (velocity > 50) {
        targetIntensity = 2.5
      } else if (velocity >= 20) {
        targetIntensity = 0.5 + ((velocity - 20) / 30) * 1.0
      }
      bloomRef.current.intensity += (targetIntensity - bloomRef.current.intensity) * 10 * delta
    }

    // Chromatic aberration lerp
    if (chromaticAberrationRef.current) {
      let targetOffset = 0.002
      if (velocity > 50) {
        targetOffset = 0.05
      }

      offsetRef.current.x += (targetOffset - offsetRef.current.x) * 10 * delta
      offsetRef.current.y += (targetOffset - offsetRef.current.y) * 10 * delta

      if (chromaticAberrationRef.current.offset) {
        chromaticAberrationRef.current.offset.set(offsetRef.current.x, offsetRef.current.y)
      }
    }
  })

  if (!enabled) return null

  return (
    <EffectComposer enableNormalPass={false} multisampling={4}>
      <Bloom
        ref={bloomRef}
        luminanceThreshold={1.0}
        intensity={0.5}
        mipmapBlur
      />
      <ChromaticAberration
        ref={chromaticAberrationRef}
        offset={offsetRef.current}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={false}
        modulationOffset={0.0}
      />
      <Scanline
        density={1.5}
        opacity={0.12}
        blendFunction={BlendFunction.OVERLAY}
      />
    </EffectComposer>
  )
}
