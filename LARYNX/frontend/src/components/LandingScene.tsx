import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Stars, useGLTF } from '@react-three/drei'
import { EffectComposer, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { SCENE, TIMING } from '@/constants'
import { configureKTX2ForGLTFLoader } from '@/utils/ktx2Setup'
import { useLarynxStore } from '@/store/useLarynxStore'
import { ConvergenceLines } from './ConvergenceLines'
import gsap from 'gsap'


function MouthGlow({ portalState }: { portalState: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!groupRef.current) return

    // Gentle volatile positioning
    const shake = 0.015
    groupRef.current.position.x = SCENE.MOUTH_BEACON_POSITION[0] + (Math.random() - 0.5) * shake + Math.sin(t * 1.3) * 0.02
    groupRef.current.position.y = SCENE.MOUTH_BEACON_POSITION[1] + Math.sin(t * 0.8) * 0.03 + (Math.random() - 0.5) * shake
    groupRef.current.position.z = SCENE.MOUTH_BEACON_POSITION[2] + (Math.random() - 0.5) * shake

    // Ring rotation + pulse
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.005
      const pulse = 1 + Math.sin(t * 3) * 0.12 + Math.sin(t * 5.7) * 0.08
      ringRef.current.scale.setScalar(pulse)
    }

    // Glow intensity pulse
    if (glowRef.current) {
      glowRef.current.intensity = 2.5 + Math.sin(t * 2.5) * 0.8
    }
  })

  if (portalState === 'entering' || portalState === 'warping') return null

  return (
    <group ref={groupRef} position={SCENE.MOUTH_BEACON_POSITION as [number, number, number]} renderOrder={10}>
      {/* Bright inner ring */}
      <mesh ref={ringRef} renderOrder={10}>
        <torusGeometry args={[0.35, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={[3.0, 2.5, 2.0]} // Clean warm white
          emissive={[3.0, 2.5, 2.0]}
          emissiveIntensity={1.8}
          transparent
          opacity={0.9}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Outer soft halo ring */}
      <mesh renderOrder={10}>
        <torusGeometry args={[0.38, 0.12, 16, 64]} />
        <meshStandardMaterial
          color={[2.5, 2.0, 1.5]} // Much more subtle halo
          emissive={[2.5, 2.0, 1.5]}
          emissiveIntensity={1.0}
          transparent
          opacity={0.1}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner glow disc - hollowed out effect */}
      <mesh renderOrder={10}>
        <circleGeometry args={[0.3, 32]} />
        <meshStandardMaterial
          color={[3.0, 2.5, 2.0]}
          emissive={[3.0, 2.5, 2.0]}
          emissiveIntensity={0.8}
          transparent
          opacity={0.12} // Deeply subtle so ring dominates
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Warm point light */}
      <pointLight ref={glowRef} color="#FFF0D0" intensity={1.2} distance={5} decay={1.5} />
    </group>
  )
}

function PortalCameraController({
  portalState,
  setPortalState,
}: {
  portalState: string
  setPortalState: (s: 'idle' | 'entering' | 'warping' | 'done') => void
}) {
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
        duration: TIMING.PORTAL_ENTER_DURATION,
        ease: 'power3.inOut',
      }, 0).to(c, {
        fov: 90, // Moderate warp FOV — less extreme
        duration: TIMING.PORTAL_ENTER_DURATION,
        ease: 'power2.inOut',
        onUpdate: () => c.updateProjectionMatrix()
      }, 0)
    } else if (portalState === 'idle') {
      if (tlRef.current) tlRef.current.kill()
      const c = camera as THREE.PerspectiveCamera
      tlRef.current = gsap.timeline({
        onUpdate: () => c.updateProjectionMatrix(),
      })
      tlRef.current.to(c.position, {
        x: 0,
        y: 0,
        z: 8,
        duration: 0.4,
        ease: 'power2.out',
      }, 0).to(c, {
        fov: 60,
        duration: 0.4,
        ease: 'power2.out',
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
      // Hide teeth mesh — check all known name variants + hide anything that isn't the main head
      if (child.name === 'teeth' || child.name === 'mesh_3' || child.name === 'Wolf3D_Teeth' ||
          (child.name && child.name.toLowerCase().includes('teeth'))) {
        child.visible = false
        return
      }
      // Also hide eye meshes (mesh_0, mesh_1) — only keep head (mesh_2)
      if ((child as THREE.Mesh).isMesh && child.name !== 'mesh_2' && child.name !== 'head' &&
          !child.name.includes('grp') && child.name !== '') {
        // Check if this is an unwanted sub-mesh (eyes, teeth)
        const meshIdx = child.name.match(/mesh_(\d+)/)
        if (meshIdx && parseInt(meshIdx[1]) !== 2) {
          child.visible = false
          return
        }
      }
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
      // Hide teeth mesh entirely
      if (child.name === 'teeth' || child.name === 'mesh_3' || child.name === 'Wolf3D_Teeth') {
        child.visible = false
        return
      }
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
  const lastTimeRef = useRef(0)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    // Parallax
    if (solidRef.current) {
      const targetRotX = mousePos.current.y * SCENE.PARALLAX_RANGE
      const targetRotY = mousePos.current.x * SCENE.PARALLAX_RANGE
      solidRef.current.rotation.x += (targetRotX - solidRef.current.rotation.x) * SCENE.PARALLAX_LERP
      solidRef.current.rotation.y += (targetRotY - solidRef.current.rotation.y) * SCENE.PARALLAX_LERP
    }

    // Morph targets — use elapsedTime diff instead of getDelta() (already consumed by R3F)
    const portalEntering = portalState === 'entering' || portalState === 'warping'
    if (portalEntering) {
      const dt = t - lastTimeRef.current
      portalTimeRef.current += dt
    } else {
      portalTimeRef.current = 0
    }
    lastTimeRef.current = t

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
    <group ref={solidRef} scale={SCENE.FACE_MODEL_SCALE} position={SCENE.FACE_MODEL_POSITION as [number, number, number]}>
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
      onCreated={({ gl }) => {
        const canvas = gl.domElement
        canvas.addEventListener('webglcontextlost', (e: Event) => {
          e.preventDefault()
          console.warn('[LARYNX] WebGL context lost (LandingScene)')
        })
        canvas.addEventListener('webglcontextrestored', () => {
          console.warn('[LARYNX] WebGL context restored (LandingScene)')
        })
      }}
    >
      <PortalCameraController portalState={portalState} setPortalState={setPortalState} />
      
      <color attach="background" args={['#030305']} />
      <fog attach="fog" args={['#030305', 5, 25]} />
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 5, 5]} intensity={0.8} color="#38BDF8" />
      <pointLight position={[-3, -2, 4]} intensity={0.4} color="#4488FF" />
      <spotLight position={[0, 3, 8]} angle={0.5} penumbra={0.8} intensity={0.6} color="#FFFFFF" />

      <Sparkles count={150} scale={15} size={2.5} speed={0.3} opacity={0.6} color="#38BDF8" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

      <FaceModel portalState={portalState} />
      <MouthGlow portalState={portalState} />
      <ConvergenceLines
        visible={portalState !== 'entering' && portalState !== 'warping'}
      />

      {/* Landing-specific postprocessing */}
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Vignette offset={0.1} darkness={1.1} />
        <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.02} />
      </EffectComposer>

    </Canvas>

  )
}
