import { EffectComposer, Bloom, ChromaticAberration, Scanline, Glitch, BrightnessContrast } from '@react-three/postprocessing'
import { GlitchMode, BlendFunction } from 'postprocessing'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useLarynxStore } from '@/store/useLarynxStore'
import { VELOCITY_THRESHOLDS, POST_PROCESSING } from '@/constants'
export function PostProcessingEffects() {
  const enabled = useLarynxStore((s) => s.postProcessingEnabled)
  const bloomIntensityRef = useRef(POST_PROCESSING.BLOOM_BASELINE)
  const offsetRef = useRef(new THREE.Vector2(POST_PROCESSING.CA_BASELINE, POST_PROCESSING.CA_BASELINE))
  const scanlineDensityRef = useRef(1.5)
  
  const frameCount = useRef(0)
  
  const wasAbove80 = useRef(false)
  const flashOpacityRef = useRef(0)

  const bloomRef = useRef<any>(null)
  const caRef = useRef<any>(null)
  const scanlineRef = useRef<any>(null)
  const glitchRef = useRef<any>(null)
  const bcRef = useRef<any>(null)

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

    let targetIntensity = 0.3
    if (velocity > VELOCITY_THRESHOLDS.SKULL_CLIP) targetIntensity = 3.0
    else if (velocity > VELOCITY_THRESHOLDS.GLITCH) targetIntensity = 2.0
    else if (velocity > VELOCITY_THRESHOLDS.HUMAN_MAX) targetIntensity = 1.0

    bloomIntensityRef.current += (targetIntensity - bloomIntensityRef.current) * 10 * delta

    let targetOffset: number = POST_PROCESSING.CA_BASELINE
    if (velocity > VELOCITY_THRESHOLDS.SKULL_CLIP) targetOffset = POST_PROCESSING.CA_TIER_3
    else if (velocity > VELOCITY_THRESHOLDS.GLITCH) targetOffset = POST_PROCESSING.CA_TIER_2
    else if (velocity > VELOCITY_THRESHOLDS.HUMAN_MAX) targetOffset = POST_PROCESSING.CA_TIER_1

    offsetRef.current.x += (targetOffset - offsetRef.current.x) * 10 * delta
    offsetRef.current.y += (targetOffset - offsetRef.current.y) * 10 * delta

    let targetScanline = 1.5
    if (velocity > VELOCITY_THRESHOLDS.SKULL_CLIP) targetScanline = 3.0
    scanlineDensityRef.current += (targetScanline - scanlineDensityRef.current) * 10 * delta

    let currentGlitchMode = GlitchMode.DISABLED
    let currentDelay: [number, number] = [0.5, 1]
    if (velocity > VELOCITY_THRESHOLDS.SKULL_CLIP) {
      currentGlitchMode = GlitchMode.CONSTANT_WILD
      currentDelay = [0, 0]
    } else if (velocity > VELOCITY_THRESHOLDS.GLITCH) {
      currentGlitchMode = GlitchMode.SPORADIC
      currentDelay = [0.5, 1]
    }

    if (velocity > VELOCITY_THRESHOLDS.SKULL_CLIP && !wasAbove80.current) {
        flashOpacityRef.current = 1.0
    }
    wasAbove80.current = velocity > VELOCITY_THRESHOLDS.SKULL_CLIP

    if (flashOpacityRef.current > 0) {
        flashOpacityRef.current = Math.max(0, flashOpacityRef.current - delta * 5)
    }

    if (bloomRef.current) bloomRef.current.intensity = bloomIntensityRef.current
    if (caRef.current) {
        caRef.current.offset.set(offsetRef.current.x, offsetRef.current.y)
    }
    if (scanlineRef.current) scanlineRef.current.density = scanlineDensityRef.current
    
    if (glitchRef.current) {
        glitchRef.current.mode = currentGlitchMode
        glitchRef.current.delay = new THREE.Vector2(currentDelay[0], currentDelay[1])
    }
    
    if (bcRef.current) {
        bcRef.current.brightness = flashOpacityRef.current * 0.9
    }
  })

  if (!enabled) return null

  return (
    <EffectComposer enableNormalPass={false} multisampling={4}>
      <Bloom ref={bloomRef} luminanceThreshold={1.0} intensity={bloomIntensityRef.current} mipmapBlur />
      <ChromaticAberration ref={caRef} offset={offsetRef.current as any} blendFunction={BlendFunction.NORMAL} radialModulation={false} modulationOffset={0.0} />
      <Scanline ref={scanlineRef} density={scanlineDensityRef.current} opacity={0.12} blendFunction={BlendFunction.OVERLAY} />
      <Glitch ref={glitchRef} delay={new THREE.Vector2(0.5, 1)} mode={GlitchMode.DISABLED} active={true} />
      <BrightnessContrast ref={bcRef} brightness={0} contrast={0} />
    </EffectComposer>
  )
}
