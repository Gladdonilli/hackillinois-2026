import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles, Stars, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

// Shared ref for chromatic aberration offset
const chromaticOffset = new THREE.Vector2(0, 0)

function GlitchEffectHandler() {
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const glitchTime = t % 7
    const isGlitching = glitchTime < 0.2

    if (isGlitching) {
      chromaticOffset.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05)
    } else {
      // Subtle default aberration
      chromaticOffset.set(0.002, 0.002)
    }
  })
  return null
}

function SoundWaveRings() {
  const ringsCount = 4
  const ringsRef = useRef<THREE.Mesh[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ringsRef.current.forEach((ring, i) => {
      if (!ring) return
      const phase = (t + i * 0.5) % 2.0
      const progress = phase / 2.0

      const scale = 1 + progress * 2
      ring.scale.set(scale, scale, scale)

      const material = ring.material as THREE.MeshStandardMaterial
      material.opacity = (1 - progress) * 0.5
    })
  })

  return (
    <group position={[0, -0.3, 0.5]}>
      {Array.from({ length: ringsCount }).map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) ringsRef.current[i] = el }}>
          <torusGeometry args={[0.5, 0.02, 16, 64]} />
          <meshStandardMaterial 
            color="#00FFFF" 
            emissive="#00FFFF" 
            emissiveIntensity={0.8} 
            transparent 
            opacity={0} 
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function FaceModel() {
  const { scene } = useGLTF('/models/facecap.glb')
  const solidRef = useRef<THREE.Group>(null)

  const clonedSolidScene = useMemo(() => scene.clone(), [scene])
  const clonedWireScene = useMemo(() => scene.clone(), [scene])

  const mousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mousePos.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  const customShader = useMemo(() => {
    return {
      uniforms: {
        scanY: { value: 10.0 },
        scanWidth: { value: 0.5 }
      },
      onBeforeCompile: (shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) => {
        shader.uniforms.scanWidth = customShader.uniforms.scanWidth
        
        shader.vertexShader = `
          varying vec3 vWorldPos;
          ${shader.vertexShader}
        `.replace(
          `#include <worldpos_vertex>`,
          `#include <worldpos_vertex>
           vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        )
        
        shader.fragmentShader = `
          uniform float scanY;
          uniform float scanWidth;
          varying vec3 vWorldPos;
          ${shader.fragmentShader}
        `.replace(
          `#include <dithering_fragment>`,
          `#include <dithering_fragment>
           if (vWorldPos.y < scanY && vWorldPos.y > scanY - scanWidth) {
             discard;
           }
          `
        )
      }
    }
  }, [])

  useEffect(() => {
    clonedSolidScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mat = new THREE.MeshStandardMaterial({
          color: '#88ccff',
          emissive: '#00FFFF',
          emissiveIntensity: 0.1,
          transparent: true,
          opacity: 0.25,
          wireframe: false,
        })
        mat.onBeforeCompile = customShader.onBeforeCompile
        mat.customProgramCacheKey = () => 'scanline'
        mesh.material = mat
      }
    })

    clonedWireScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#00FFFF',
          emissive: '#00FFFF',
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.15,
          wireframe: true,
        })
      }
    })
  }, [clonedSolidScene, clonedWireScene, customShader])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    // Parallax
    if (solidRef.current) {
      const targetRotX = mousePos.current.y * 0.1
      const targetRotY = mousePos.current.x * 0.1
      solidRef.current.rotation.x += (targetRotX - solidRef.current.rotation.x) * 0.05
      solidRef.current.rotation.y += (targetRotY - solidRef.current.rotation.y) * 0.05
    }

    // Morph targets
    const morphScenes = [clonedSolidScene, clonedWireScene]
    morphScenes.forEach((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s.traverse((child: any) => {
        if (child.isMesh && child.morphTargetDictionary) {
          const dict = child.morphTargetDictionary
          const influences = child.morphTargetInfluences

          if (dict['jawOpen'] !== undefined) {
             influences[dict['jawOpen']] = (Math.sin(t * 1.5) + 1) * 0.1
          }
          if (dict['mouthSmile'] !== undefined) {
             influences[dict['mouthSmile']] = (Math.sin(t * 0.8) + 1) * 0.2
          }
          if (dict['eyeBlinkLeft'] !== undefined) {
             influences[dict['eyeBlinkLeft']] = Math.sin(t * 3.1) > 0.95 ? 1 : 0
          }
          if (dict['eyeBlinkRight'] !== undefined) {
             influences[dict['eyeBlinkRight']] = Math.sin(t * 3.1) > 0.95 ? 1 : 0
          }
        }
      })
    })

    // X-ray sweep
    const sweepTime = t % 4
    let currentScanY = 10
    if (sweepTime < 1) {
      currentScanY = 3.0 - sweepTime * 6.0
    }
    customShader.uniforms.scanY.value = currentScanY

    // Glitch effect
    const glitchTime = t % 7
    if (glitchTime < 0.2 && solidRef.current) {
      solidRef.current.position.x = (Math.random() - 0.5) * 0.2
      solidRef.current.scale.x = 2.5 + (Math.random() - 0.5) * 0.2
    } else if (solidRef.current) {
      solidRef.current.position.x = 0
      solidRef.current.scale.x = 2.5
    }
  })

  return (
    <group ref={solidRef} scale={2.5} position={[0, 0.5, 0]}>
      <primitive object={clonedWireScene} />
      <primitive object={clonedSolidScene} />
      <SoundWaveRings />
    </group>
  )
}

export function LandingScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
    >
      <fog attach="fog" args={['#000000', 5, 30]} />
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 5, 5]} intensity={0.3} color="#00FFFF" />

      <Sparkles count={150} scale={15} size={2.5} speed={0.3} opacity={0.6} color="#00FFFF" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

      <FaceModel />
      <GlitchEffectHandler />

      <EffectComposer>
        <Bloom luminanceThreshold={1} mipmapBlur={true} intensity={1.2} />
        <ChromaticAberration offset={chromaticOffset} blendFunction={BlendFunction.NORMAL} radialModulation={false} modulationOffset={0} />
      </EffectComposer>
    </Canvas>
  )
}

useGLTF.preload('/models/facecap.glb')
