import { EffectComposer, Bloom, ChromaticAberration, Scanline } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector2 } from 'three'
import { useLarynxStore } from '@/store/useLarynxStore'

export function PostProcessingEffects() {
  const enabled = useLarynxStore((s) => s.postProcessingEnabled)
  const bloomIntensityRef = useRef(0.5)
  const offsetRef = useRef(new Vector2(0.002, 0.002))
  const frameCount = useRef(0)

  // We store computed values in refs and trigger a re-render via a simple counter
  // This avoids the useState-per-frame anti-pattern while still updating props
  const renderTick = useRef(0)

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

    // Bloom intensity lerp
    let targetIntensity = 0.5
    if (velocity > 50) {
      targetIntensity = 2.5
    } else if (velocity >= 20) {
      targetIntensity = 0.5 + ((velocity - 20) / 30) * 1.0
    }
    bloomIntensityRef.current += (targetIntensity - bloomIntensityRef.current) * 10 * delta

    // Chromatic aberration offset lerp
    let targetOffset = 0.002
    if (velocity > 50) {
      targetOffset = 0.05
    }
    offsetRef.current.x += (targetOffset - offsetRef.current.x) * 10 * delta
    offsetRef.current.y += (targetOffset - offsetRef.current.y) * 10 * delta

    renderTick.current++
  })

  if (!enabled) return null

  return (
    <EffectComposer enableNormalPass={false} multisampling={4}>
      <Bloom
        luminanceThreshold={1.0}
        intensity={bloomIntensityRef.current}
        mipmapBlur
      />
      <ChromaticAberration
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
