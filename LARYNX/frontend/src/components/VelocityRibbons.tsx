import { Trail } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLarynxStore } from '@/store/useLarynxStore'

// Typing helper to avoid 'any' when setting color natively
type MaterialWithColor = THREE.Material & { color?: THREE.Color }

export function VelocityRibbons() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const trailRef = useRef<THREE.Group>(null!)

  // Pre-allocate values outside useFrame to avoid allocations
  const _normalColor = useRef(new THREE.Color('#00FFFF'))
  const _warnColor = useRef(new THREE.Color('#FFAA00'))
  const _dangerColor = useRef(new THREE.Color('#FF3366'))
  const currentColor = useRef(new THREE.Color('#00FFFF'))
  const targetColor = useRef(new THREE.Color('#00FFFF'))

  // Memoize attenuation so it doesn't trigger Trail component re-renders
  const handleAttenuation = useMemo(() => (t: number) => t * t, [])

  useFrame((_, delta) => {
    const state = useLarynxStore.getState()
    const velocity = state.tongueVelocity || 0
    const t1 = state.tongueT1 || { x: 0, y: 0 }

    // Map velocity to t1 position (using exact model coordinate mapping)
    if (meshRef.current) {
      meshRef.current.position.set(t1.x / 50, t1.y / 50, 0.3)
    }

    // Determine target color based on velocity thresholds
    if (velocity < 20) {
      targetColor.current.copy(_normalColor.current)
    } else if (velocity >= 20 && velocity <= 50) {
      const fraction = (velocity - 20) / 30
      targetColor.current.lerpColors(_normalColor.current, _warnColor.current, fraction)
    } else {
      targetColor.current.copy(_dangerColor.current)
    }

    // Smoothly interpolate current frame's path color to target
    currentColor.current.lerp(targetColor.current, 10 * delta)

    // Apply color directly to Trail child material (skips React DOM updates for 60fps)
    if (trailRef.current) {
      trailRef.current.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as MaterialWithColor
          if (mat && mat.color) {
            mat.color.copy(currentColor.current)
          }
        }
      })
    }
  })

  return (
    <Trail
      ref={trailRef}
      width={0.3}
      length={8}
      decay={1}
      color={currentColor.current}
      attenuation={handleAttenuation}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </Trail>
  )
}
