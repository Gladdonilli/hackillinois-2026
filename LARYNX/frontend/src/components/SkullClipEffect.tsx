import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useLarynxStore } from '@/store/useLarynxStore'
import * as THREE from 'three'

export function SkullClipEffect() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  // The skull is a sphere at origin with radius 1.2, scale [1, 1.3, 1]
  const baseScale = new THREE.Vector3(1, 1.3, 1)

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return
    
    // Read directly from store via getState(), never useState for animation
    const tongueVelocity = useLarynxStore.getState().tongueVelocity
    const isActive = tongueVelocity > 80 // Threshold for skull-clip

    if (isActive) {
      meshRef.current.visible = true
      
      // Calculate emissive intensity based on velocity above threshold
      const velocityOverLimit = tongueVelocity - 80
      const intensity = 1.0 + (velocityOverLimit * 0.05)
      materialRef.current.emissiveIntensity = THREE.MathUtils.clamp(intensity, 1.0, 5.0)
      
      // Pulse animation: scale oscillates 1.0-1.1 at 2Hz
      const time = state.clock.elapsedTime
      // Math.sin(time * Math.PI * 4) covers a full 2pi cycle twice per second (2Hz)
      // Normalize from [-1, 1] to [0, 1] -> multiply by 0.1 -> [0, 0.1] -> add 1.0
      const pulseMultiplier = 1.0 + ((Math.sin(time * Math.PI * 4) + 1) / 2) * 0.1

      meshRef.current.scale.set(
        baseScale.x * pulseMultiplier,
        baseScale.y * pulseMultiplier,
        baseScale.z * pulseMultiplier
      )
    } else {
      meshRef.current.visible = false
    }
  })

  return (
    <mesh ref={meshRef} visible={false}>
      <torusGeometry args={[1.2, 0.02, 16, 64]} />
      <meshStandardMaterial 
        ref={materialRef}
        color="#FF3366"
        emissive="#FF3366"
        transparent
        opacity={0.8}
        toneMapped={false} // Prevents realistic tone mapping from dulling the emissive glow
      />
    </mesh>
  )
}
