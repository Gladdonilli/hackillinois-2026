import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useLarynxStore } from '@/store/useLarynxStore'
import * as THREE from 'three'

export function SkullClipEffect() {
  const mesh1 = useRef<THREE.Mesh>(null)
  const mesh2 = useRef<THREE.Mesh>(null)
  const mesh3 = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const material2Ref = useRef<THREE.MeshStandardMaterial>(null)
  const material3Ref = useRef<THREE.MeshStandardMaterial>(null)

  const baseScale = new THREE.Vector3(1, 1.3, 1)

  useFrame((state, delta) => {
    const tongueVelocity = useLarynxStore.getState().tongueVelocity || 0
    const isActive = tongueVelocity > 50 

    if (isActive) {
      if (mesh1.current) mesh1.current.visible = true
      
      const velocityOverLimit = Math.max(0, tongueVelocity - 50)
      const intensity = 1.0 + (velocityOverLimit * 0.1)
      const targetInt = THREE.MathUtils.clamp(intensity, 1.0, 5.0)

      if (materialRef.current) materialRef.current.emissiveIntensity += (targetInt - materialRef.current.emissiveIntensity) * 10 * delta
      if (material2Ref.current) material2Ref.current.emissiveIntensity += (targetInt - material2Ref.current.emissiveIntensity) * 10 * delta
      if (material3Ref.current) material3Ref.current.emissiveIntensity += (targetInt - material3Ref.current.emissiveIntensity) * 10 * delta

      const time = state.clock.elapsedTime
      
      if (mesh1.current) {
         const pulseMultiplier = 1.0 + ((Math.sin(time * Math.PI * 4) + 1) / 2) * 0.1
         mesh1.current.scale.set(baseScale.x * pulseMultiplier, baseScale.y * pulseMultiplier, baseScale.z * pulseMultiplier)
      }

      if (tongueVelocity > 80) {
          const pulseSpeed = 4 + (tongueVelocity - 80) * 0.1
          
          if (mesh2.current) {
              mesh2.current.visible = true
              const pm2 = 1.0 + ((Math.sin(time * Math.PI * pulseSpeed + 2) + 1) / 2) * 0.15
              mesh2.current.scale.set(baseScale.x * pm2 * 1.15, baseScale.y * pm2 * 1.15, baseScale.z * pm2 * 1.15)
          }
          if (mesh3.current) {
              mesh3.current.visible = true
              const pm3 = 1.0 + ((Math.sin(time * Math.PI * pulseSpeed + 4) + 1) / 2) * 0.2
              mesh3.current.scale.set(baseScale.x * pm3 * 1.3, baseScale.y * pm3 * 1.3, baseScale.z * pm3 * 1.3)
          }
      } else {
          if (mesh2.current) mesh2.current.visible = false
          if (mesh3.current) mesh3.current.visible = false
      }
    } else {
      if (mesh1.current) mesh1.current.visible = false
      if (mesh2.current) mesh2.current.visible = false
      if (mesh3.current) mesh3.current.visible = false
    }
  })

  return (
    <group>
      <mesh ref={mesh1} visible={false}>
        <torusGeometry args={[1.2, 0.02, 16, 64]} />
        <meshStandardMaterial ref={materialRef} color="#DC2626" emissive="#DC2626" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <mesh ref={mesh2} visible={false}>
        <torusGeometry args={[1.2, 0.02, 16, 64]} />
        <meshStandardMaterial ref={material2Ref} color="#DC2626" emissive="#DC2626" transparent opacity={0.4} toneMapped={false} />
      </mesh>
      <mesh ref={mesh3} visible={false}>
        <torusGeometry args={[1.2, 0.02, 16, 64]} />
        <meshStandardMaterial ref={material3Ref} color="#DC2626" emissive="#DC2626" transparent opacity={0.2} toneMapped={false} />
      </mesh>
    </group>
  )
}
