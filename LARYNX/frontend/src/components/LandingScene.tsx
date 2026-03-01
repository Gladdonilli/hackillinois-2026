import { useRef, useEffect, useMemo, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { EffectComposer, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { SCENE, TIMING } from '@/constants'
import { configureKTX2ForGLTFLoader } from '@/utils/ktx2Setup'
import { useLarynxStore } from '@/store/useLarynxStore'
import { SoundEngine } from '@/audio/SoundEngine'
import { ConvergenceLines } from './ConvergenceLines'
import gsap from 'gsap'


function MouthGlow({
  portalState,
  anchorRef,
}: {
  portalState: string
  anchorRef: MutableRefObject<THREE.Vector3>
}) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.PointLight>(null)
  const ringMaterialRef = useRef<THREE.MeshStandardMaterial>(null)
  const breachGlow = useRef(0)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!groupRef.current) return

    groupRef.current.position.lerp(anchorRef.current, 0.42)

    // Breach intensity from tongue velocity
    const tongueVelocity = useLarynxStore.getState().tongueVelocity
    const rawBreach = tongueVelocity > 20 ? Math.min((tongueVelocity - 20) / 60, 1) : 0
    breachGlow.current += (rawBreach - breachGlow.current) * 0.08

    if (ringRef.current) {
      ringRef.current.rotation.z += 0.0035 + breachGlow.current * 0.012
      const basePulse = 1 + Math.sin(t * 2.8) * 0.1 + Math.sin(t * 5.1) * 0.06
      const breachPulse = breachGlow.current * (Math.sin(t * 18) * 0.15 + 0.2)
      ringRef.current.scale.setScalar(basePulse + breachPulse)
    }

    // Gold → hot pink color shift on breach
    if (ringMaterialRef.current) {
      const r = 3.2 + breachGlow.current * 1.8
      const g = 2.85 - breachGlow.current * 2.0
      const b = 1.75 - breachGlow.current * 1.2
      ringMaterialRef.current.color.setRGB(r, g, b)
      ringMaterialRef.current.emissive.setRGB(r, g, b)
      ringMaterialRef.current.emissiveIntensity = 2.4 + breachGlow.current * 2.0
    }

    // Point light intensity + color shift on breach
    if (glowRef.current) {
      glowRef.current.intensity = 2.8 + Math.sin(t * 2.5) * 0.75 + breachGlow.current * 3.0
      const lg = 0.91 - breachGlow.current * 0.5
      const lb = 0.7 - breachGlow.current * 0.4
      glowRef.current.color.setRGB(1.0, lg, lb)
    }
  })

  if (portalState === 'entering' || portalState === 'warping') return null

  return (
    <group ref={groupRef} position={SCENE.MOUTH_BEACON_POSITION as [number, number, number]} renderOrder={10}>
      <mesh ref={ringRef} renderOrder={10}>
        <torusGeometry args={[0.34, 0.045, 18, 80]} />
        <meshStandardMaterial
          ref={ringMaterialRef}
          color={[3.2, 2.85, 1.75]}
          emissive={[3.2, 2.85, 1.75]}
          emissiveIntensity={2.4}
          transparent
          opacity={0.94}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Outer soft halo ring */}
      <mesh renderOrder={10}>
        <torusGeometry args={[0.39, 0.13, 16, 72]} />
        <meshStandardMaterial
          color={[2.8, 2.45, 1.6]}
          emissive={[2.8, 2.45, 1.6]}
          emissiveIntensity={1.35}
          transparent
          opacity={0.14}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight ref={glowRef} color="#FFE8B3" intensity={1.4} distance={5.5} decay={1.45} />
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

function FaceModel({
  portalState,
  anchorRef,
}: {
  portalState: string
  anchorRef: MutableRefObject<THREE.Vector3>
}) {
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

  const isTeethOrChild = (child: THREE.Object3D): boolean => {
    // Check name directly
    const name = child.name.toLowerCase()
    if (name.includes('teeth') || name.includes('tooth') || name === 'mesh_3') return true
    // Check if any parent is teeth (catches unnamed child meshes)
    let parent = child.parent
    while (parent) {
      const pn = parent.name.toLowerCase()
      if (pn.includes('teeth') || pn.includes('tooth')) return true
      parent = parent.parent
    }
    return false
  }

  useEffect(() => {
    clonedSolidScene.traverse((child) => {
      if (isTeethOrChild(child)) {
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
      if (isTeethOrChild(child)) {
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
  const mouthLocalPoint = useMemo(() => {
    const [mx, my, mz] = SCENE.MOUTH_BEACON_POSITION
    const [fx, fy, fz] = SCENE.FACE_MODEL_POSITION
    const scale = SCENE.FACE_MODEL_SCALE
    return new THREE.Vector3((mx - fx) / scale, (my - fy) / scale, (mz - fz) / scale)
  }, [])
  const mouthRotatedRef = useRef(new THREE.Vector3())
  const mouthWorldRef = useRef(new THREE.Vector3())

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    // Time-based auto-parallax (replaces mouse tracking)
    if (solidRef.current) {
      const targetRotX = Math.sin(t * 0.27) * SCENE.PARALLAX_RANGE * 0.25
      const targetRotY = Math.cos(t * 0.19) * SCENE.PARALLAX_RANGE * 0.25
      solidRef.current.rotation.x += (targetRotX - solidRef.current.rotation.x) * SCENE.PARALLAX_LERP
      solidRef.current.rotation.y += (targetRotY - solidRef.current.rotation.y) * SCENE.PARALLAX_LERP

      mouthRotatedRef.current
        .copy(mouthLocalPoint)
        .multiplyScalar(SCENE.FACE_MODEL_SCALE)
        .applyEuler(solidRef.current.rotation)
      mouthWorldRef.current.copy(solidRef.current.position).add(mouthRotatedRef.current)
      anchorRef.current.lerp(mouthWorldRef.current, 0.4)
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
  const lastPortalStateRef = useRef(portalState)
  const mouthAnchorRef = useRef(new THREE.Vector3(...SCENE.MOUTH_BEACON_POSITION))

  useEffect(() => {
    if (!SoundEngine.isInitialized()) {
      lastPortalStateRef.current = portalState
      return
    }

    if (portalState !== lastPortalStateRef.current) {
      if (portalState === 'entering') SoundEngine.playPortalEntry()
      if (portalState === 'warping') SoundEngine.playWarpTransition()
      if (portalState === 'done') SoundEngine.playScanSweep()
    }

    lastPortalStateRef.current = portalState
  }, [portalState])

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

      <FaceModel portalState={portalState} anchorRef={mouthAnchorRef} />
      <MouthGlow portalState={portalState} anchorRef={mouthAnchorRef} />
      <ConvergenceLines
        visible={portalState !== 'entering' && portalState !== 'warping'}
        anchorRef={mouthAnchorRef}
      />

      {/* Landing-specific postprocessing */}
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Vignette offset={0.1} darkness={1.1} />
        <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.02} />
      </EffectComposer>

    </Canvas>

  )
}
