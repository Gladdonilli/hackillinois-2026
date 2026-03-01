import { useRef, useEffect, useMemo, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Sparkles, Stars } from '@react-three/drei'
import { EffectComposer, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { SCENE, TIMING, THRESHOLDS } from '@/constants'
import { configureKTX2ForGLTFLoader } from '@/utils/ktx2Setup'
import { useLarynxStore } from '@/store/useLarynxStore'
import { SoundEngine } from '@/audio/SoundEngine'
import { ConvergenceLines } from './ConvergenceLines'
import gsap from 'gsap'


const isTeethOrChild = (child: THREE.Object3D): boolean => {
  // Check name directly
  const name = child.name.toLowerCase()
  if (name.includes('teeth') || name.includes('tooth') || name === 'mesh_3') return true
  // Walk parent chain — catches unnamed children of 'teeth' group
  let parent = child.parent
  while (parent) {
    const pn = parent.name.toLowerCase()
    if (pn.includes('teeth') || pn.includes('tooth')) return true
    parent = parent.parent
  }
  // Also catch unnamed meshes that aren't the head (mesh_2) or eyes (mesh_0, mesh_1)
  if ((child as THREE.Mesh).isMesh && child.name === '') {
    return true  // unnamed mesh = teeth child
  }
  return false
}

function MouthGlow({
  portalState,
  canAnalyze = false,
  onAnalyze,
}: {
  portalState: string
  canAnalyze?: boolean
  onAnalyze?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.PointLight>(null)
  const auraMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const outerMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const hitboxMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const breachGlow = useRef(0)
  const proximityRef = useRef(0)
  const hoverRef = useRef(false)

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime
    if (!groupRef.current) return

    // Mouse proximity to mouth center (normalized 0-1, 1=closest)
    // Mouth is roughly at screen center-bottom, pointer is -1..1 NDC
    const mouthScreenX = 0
    const mouthScreenY = -0.15
    const dx = pointer.x - mouthScreenX
    const dy = pointer.y - mouthScreenY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const rawProximity = Math.max(0, 1 - dist / 1.2)
    const delta = Math.min(clock.getDelta(), 0.1)
    proximityRef.current += (rawProximity - proximityRef.current) * Math.min(0.08 + delta * 3, 0.99)
    const prox = proximityRef.current

    // Breach intensity from tongue velocity
    const tongueVelocity = useLarynxStore.getState().tongueVelocity
    const rawBreach = tongueVelocity > THRESHOLDS.BREACH ? Math.min((tongueVelocity - THRESHOLDS.BREACH) / THRESHOLDS.BREACH_RANGE, 1) : 0
    breachGlow.current += (rawBreach - breachGlow.current) * 0.08

    // Soft pulsing scale — grows when mouse is near
    const pulse = 1 + Math.sin(t * 2.2) * 0.15 + Math.sin(t * 4.7) * 0.08
    const breachPulse = breachGlow.current * (Math.sin(t * 14) * 0.2 + 0.3)
    const proxScale = 1 + prox * 0.4
    groupRef.current.scale.setScalar((pulse + breachPulse) * proxScale)

    // Aura color: cyan → brighter cyan on proximity, → hot pink on breach
    if (auraMaterialRef.current) {
      const r = 0.22 + breachGlow.current * 0.8
      const g = 0.74 - breachGlow.current * 0.4 + prox * 0.1
      const b = 0.97 - breachGlow.current * 0.3 + prox * 0.03
      auraMaterialRef.current.color.setRGB(r, g, b)
      auraMaterialRef.current.opacity = 0.18 + Math.sin(t * 3.1) * 0.06 + breachGlow.current * 0.15 + prox * 0.12
    }

    // Outer glow reacts to proximity too
    if (outerMaterialRef.current) {
      outerMaterialRef.current.opacity = 0.06 + prox * 0.08
    }

    // Point light pulse — brighter on proximity
    if (glowRef.current) {
      glowRef.current.intensity = 1.5 + Math.sin(t * 2.5) * 0.5 + breachGlow.current * 2.5 + prox * 1.5
      const lg = 0.85 - breachGlow.current * 0.4
      const lb = 0.95 - breachGlow.current * 0.3
      glowRef.current.color.setRGB(0.3 + breachGlow.current * 0.7, lg, lb)
    }
    // Hitbox hover glow when armed
    if (hitboxMaterialRef.current) {
      const targetOpacity = hoverRef.current && canAnalyze ? 0.08 : 0
      hitboxMaterialRef.current.opacity += (targetOpacity - hitboxMaterialRef.current.opacity) * 0.12
    }
  })

  if (portalState === 'entering' || portalState === 'warping') return null

  return (
    <group ref={groupRef} position={[0, -0.36, 0.22]}>
      {/* Soft glowing aura sphere */}
      <mesh renderOrder={5} raycast={() => null}>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshBasicMaterial
          ref={auraMaterialRef}
          color={[0.22, 0.74, 0.97]}
          transparent
          opacity={0.2}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Larger outer glow */}
      <mesh renderOrder={4} raycast={() => null}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshBasicMaterial
          ref={outerMaterialRef}
          color={[0.15, 0.55, 0.85]}
          transparent
          opacity={0.06}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight ref={glowRef} color="#38BDF8" intensity={1.5} distance={4} decay={1.8} />
      {/* Invisible clickable hitbox — the aura IS the analyze button */}
      <mesh
        renderOrder={6}
        onClick={(e) => {
          if (canAnalyze && onAnalyze) {
            e.stopPropagation()
            onAnalyze()
          }
        }}
        onPointerOver={(e) => {
          if (canAnalyze) {
            e.stopPropagation()
            hoverRef.current = true
            document.body.style.cursor = 'pointer'
          }
        }}
        onPointerOut={() => {
          hoverRef.current = false
          document.body.style.cursor = ''
        }}
      >
        <sphereGeometry args={[0.48, 18, 18]} />
        <meshBasicMaterial
          ref={hitboxMaterialRef}
          color={[0.22, 0.74, 0.97]}
          transparent={false}
          opacity={1}
          colorWrite={false}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
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
  canAnalyze = false,
  onAnalyze,
}: {
  portalState: string
  anchorRef: MutableRefObject<THREE.Vector3>
  canAnalyze?: boolean
  onAnalyze?: () => void
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

  const clonedSolidScene = useMemo(() => {
    const clone = scene.clone()
    // Nuclear teeth removal: collect then detach from scene graph entirely
    const toRemove: THREE.Object3D[] = []
    clone.traverse((child) => {
      if (isTeethOrChild(child)) {
        toRemove.push(child)
      }
    })
    toRemove.forEach((obj) => {
      obj.removeFromParent()
      // Dispose geometry+material to free GPU memory
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose()
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose())
        else mesh.material?.dispose()
      }
    })
    if (toRemove.length > 0) console.log(`[LARYNX] Removed ${toRemove.length} teeth nodes from solid scene`)
    // DIAGNOSTIC: Log every remaining mesh so we can identify the teeth impostor
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh
        const bb = new THREE.Box3().setFromObject(m)
        const size = new THREE.Vector3()
        bb.getSize(size)
        const center = new THREE.Vector3()
        bb.getCenter(center)
        console.log(`[LARYNX-DIAG] Mesh: "${m.name}" | parent: "${m.parent?.name}" | verts: ${m.geometry?.attributes?.position?.count} | center: [${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)}] | size: [${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)}] | visible: ${m.visible}`)
      }
    })
    return clone
  }, [scene])
  const clonedWireScene = useMemo(() => {
    const clone = scene.clone()
    const toRemove: THREE.Object3D[] = []
    clone.traverse((child) => {
      if (isTeethOrChild(child)) {
        toRemove.push(child)
      }
    })
    toRemove.forEach((obj) => {
      obj.removeFromParent()
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose()
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose())
        else mesh.material?.dispose()
      }
    })
    if (toRemove.length > 0) console.log(`[LARYNX] Removed ${toRemove.length} teeth nodes from wire scene`)
    return clone
  }, [scene])


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
      // Hide teeth mesh entirely
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
    return () => {
      // Dispose cloned scene materials on unmount to prevent leaks
      [clonedSolidScene, clonedWireScene].forEach(s => {
        s.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
              else (mesh.material as THREE.Material).dispose();
            }
          }
        });
      });
    };
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

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime

    // Mouse-reactive parallax (blended with subtle time drift)
    if (solidRef.current) {
      const timeDriftX = Math.sin(t * 0.27) * SCENE.PARALLAX_RANGE * 0.1
      const timeDriftY = Math.cos(t * 0.19) * SCENE.PARALLAX_RANGE * 0.1
      const targetRotX = -pointer.y * SCENE.PARALLAX_RANGE * 0.6 + timeDriftX
      const targetRotY = pointer.x * SCENE.PARALLAX_RANGE * 0.6 + timeDriftY
      const delta = Math.min(clock.getDelta(), 0.1)
      const lerpFactor = Math.min(SCENE.PARALLAX_LERP + delta * 2, 0.99)
      solidRef.current.rotation.x += (targetRotX - solidRef.current.rotation.x) * lerpFactor
      solidRef.current.rotation.y += (targetRotY - solidRef.current.rotation.y) * lerpFactor

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
      <primitive object={clonedWireScene} raycast={() => null} />
      <primitive object={clonedSolidScene} raycast={() => null} />
      {/* Opaque black disc inside mouth cavity to occlude beige interior geometry */}
      <mesh position={[0, -0.44, 0.12]} rotation={[0.2, 0, 0]}>
        <circleGeometry args={[0.32, 32]} />
        <meshBasicMaterial color="#000000" side={THREE.DoubleSide} depthWrite={true} transparent={false} />
      </mesh>
      <MouthGlow portalState={portalState} canAnalyze={canAnalyze} onAnalyze={onAnalyze} />
    </group>
  )
}

export function LandingScene({
  canAnalyze = false,
  onAnalyze,
}: {
  canAnalyze?: boolean
  onAnalyze?: () => void
} = {}) {
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
      
      <fog attach="fog" args={['#000000', 10, 45]} />
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 5, 5]} intensity={0.8} color="#38BDF8" />
      <pointLight position={[-3, -2, 4]} intensity={0.4} color="#4488FF" />
      <spotLight position={[0, 3, 8]} angle={0.5} penumbra={0.8} intensity={0.6} color="#FFFFFF" />

      <Sparkles count={150} scale={15} size={2.5} speed={0.3} opacity={0.6} color="#38BDF8" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <FaceModel portalState={portalState} anchorRef={mouthAnchorRef} canAnalyze={canAnalyze} onAnalyze={onAnalyze} />
      {/* MouthGlow moved inside FaceModel group */}
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
