import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Stars, useGLTF, Text, Billboard } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { configureKTX2ForGLTFLoader } from '@/utils/ktx2Setup'
import { useLarynxStore } from '@/store/useLarynxStore'
import gsap from 'gsap'

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

function MouthBeacon({ portalState }: { portalState: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const icoRef = useRef<THREE.Mesh>(null)
  const arrowRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!groupRef.current) return

    // Volatile shaking
    const shake = 0.015
    groupRef.current.position.x = 1.2 + (Math.random() - 0.5) * shake + Math.sin(t * 1.3) * 0.03
    groupRef.current.position.y = -1.5 + Math.sin(t * 0.8) * 0.05 + (Math.random() - 0.5) * shake
    groupRef.current.position.z = 2.5 + (Math.random() - 0.5) * shake

    // Rotate icosahedron
    if (icoRef.current) {
      icoRef.current.rotation.x += 0.008
      icoRef.current.rotation.y += 0.012
      icoRef.current.rotation.z += 0.005
      // Volatile scale pulsing
      const pulse = 1 + Math.sin(t * 4) * 0.08 + Math.sin(t * 7.3) * 0.04
      icoRef.current.scale.setScalar(pulse)
    }

    // Arrow bob
    if (arrowRef.current) {
      arrowRef.current.position.x = -0.6 + Math.sin(t * 2) * 0.08
    }

    // Glow pulse
    if (glowRef.current) {
      glowRef.current.intensity = 0.6 + Math.sin(t * 3) * 0.3
    }
  })

  if (portalState === 'entering' || portalState === 'warping') return null

  return (
    <group ref={groupRef} position={[1.2, -1.5, 2.5]}>
      {/* Volatile icosahedron */}
      <mesh ref={icoRef}>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color="#38BDF8"
          emissive="#38BDF8"
          emissiveIntensity={0.6}
          transparent
          opacity={0.7}
          wireframe
        />
      </mesh>

      {/* Glow */}
      <pointLight ref={glowRef} color="#38BDF8" intensity={0.6} distance={3} />

      {/* Arrow pointing left toward mouth */}
      <group ref={arrowRef} position={[-0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <coneGeometry args={[0.06, 0.18, 4]} />
          <meshStandardMaterial
            color="#38BDF8"
            emissive="#38BDF8"
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Arrow shaft */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
          <meshStandardMaterial
            color="#38BDF8"
            emissive="#38BDF8"
            emissiveIntensity={0.6}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* Label pointing to mouth */}
      <Billboard position={[0.5, 0.3, 0]} follow lockX={false} lockY={false} lockZ={false}>
        <Text
          fontSize={0.08}
          color="#38BDF8"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.003}
          outlineColor="#0c2a3a"
          font={undefined}
        >
          DROP FILE IN MOUTH
        </Text>
      </Billboard>
    </group>
  )
}

function PortalCameraController({ portalState, setPortalState }: { portalState: string, setPortalState: (s: any) => void }) {
  const { camera } = useThree()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  
  useEffect(() => {
    if (portalState === 'entering') {
      // Kill any existing timeline
      if (tlRef.current) tlRef.current.kill()
      
      const c = camera as THREE.PerspectiveCamera
      
      tlRef.current = gsap.timeline({
        onComplete: () => {
          setPortalState('warping')
        }
      })
      
      tlRef.current.to(c.position, {
        x: 0,
        y: -0.2,
        z: 1.8, // Don't go too close — prevents WebGL context loss
        duration: 2.0,
        ease: 'power3.inOut',
      }, 0).to(c, {
        fov: 90, // Moderate warp FOV — less extreme
        duration: 2.0,
        ease: 'power2.inOut',
        onUpdate: () => c.updateProjectionMatrix()
      }, 0)
    }
    
    return () => {
      if (tlRef.current) tlRef.current.kill()
    }
  }, [portalState, camera, setPortalState])
  
  return null
}

function FaceModel({ portalState }: { portalState: string }) {
  const { gl } = useThree()
  const { scene } = useGLTF(
    '/models/facecap.glb',
    false,
    true,
    (loader) => {
      configureKTX2ForGLTFLoader(loader, gl)
    }
  )
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
        scanWidth: { value: 0.08 }  // Thin scan line, not a thick band
      },
      onBeforeCompile: (shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) => {
        shader.uniforms.scanY = customShader.uniforms.scanY
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
           float scanDist = abs(vWorldPos.y - scanY);
           if (scanDist < scanWidth) {
             // Fade out instead of hard discard — translucent scan line
             gl_FragColor.rgb *= 0.3 + 0.7 * (scanDist / scanWidth);
           gl_FragColor.rgb += vec3(0.22, 0.74, 0.97) * (1.0 - scanDist / scanWidth) * 0.3;
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
          color: '#a8d8ea',
          emissive: '#38BDF8',
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.45,
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
          color: '#38BDF8',
          emissive: '#38BDF8',
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.25,
          wireframe: true,
        })
      }
    })
  }, [clonedSolidScene, clonedWireScene, customShader])

  const portalTimeRef = useRef(0)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    // Parallax
    if (solidRef.current) {
      const targetRotX = mousePos.current.y * 0.08
      const targetRotY = mousePos.current.x * 0.08
      solidRef.current.rotation.x += (targetRotX - solidRef.current.rotation.x) * 0.03
      solidRef.current.rotation.y += (targetRotY - solidRef.current.rotation.y) * 0.03
    }

    // Morph targets
    const portalEntering = portalState === 'entering' || portalState === 'warping'
    if (portalEntering) {
      portalTimeRef.current += clock.getDelta()
    } else {
      portalTimeRef.current = 0
    }

    const morphScenes = [clonedSolidScene, clonedWireScene]
    morphScenes.forEach((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s.traverse((child: any) => {
        if (child.isMesh && child.morphTargetDictionary) {
          const dict = child.morphTargetDictionary
          const influences = child.morphTargetInfluences

          if (dict['jawOpen'] !== undefined) {
             if (portalEntering) {
               // Smoothly open jaw to ~0.95 during portal sequence
               const target = Math.min(0.95, portalTimeRef.current * 0.8)
               influences[dict['jawOpen']] += (target - influences[dict['jawOpen']]) * 0.1
             } else {
               influences[dict['jawOpen']] = (Math.sin(t * 1.5) + 1) * 0.1
             }
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
    const sweepTime = t % 8  // Slower sweep cycle
    let currentScanY = 10
    if (sweepTime < 0.5) {
      currentScanY = 3.0 - sweepTime * 12.0  // Faster pass, less visible time
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
    <group ref={solidRef} scale={2.5} position={[0, -0.3, 0]}>
      <primitive object={clonedWireScene} />
      <primitive object={clonedSolidScene} />
    </group>
  )
}

export function LandingScene() {
  const portalState = useLarynxStore((state) => state.portalState)
  const setPortalState = useLarynxStore((state) => state.setPortalState)

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
    >
      <PortalCameraController portalState={portalState} setPortalState={setPortalState} />
      
      <fog attach="fog" args={['#000000', 10, 45]} />
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 5, 5]} intensity={0.8} color="#38BDF8" />
      <pointLight position={[-3, -2, 4]} intensity={0.4} color="#4488FF" />
      <spotLight position={[0, 3, 8]} angle={0.5} penumbra={0.8} intensity={0.6} color="#FFFFFF" />

      <Sparkles count={150} scale={15} size={2.5} speed={0.3} opacity={0.6} color="#38BDF8" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

      <FaceModel portalState={portalState} />
      <MouthBeacon portalState={portalState} />
      <GlitchEffectHandler />

      <EffectComposer>
        <Bloom luminanceThreshold={1} mipmapBlur={true} intensity={1.2} />
        <ChromaticAberration offset={chromaticOffset} blendFunction={BlendFunction.NORMAL} radialModulation={false} modulationOffset={0} />
      </EffectComposer>
    </Canvas>
  )
}
