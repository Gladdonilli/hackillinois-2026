import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useLarynxStore } from '@/store/useLarynxStore'
import * as THREE from 'three'

const COUNT = 200
const BOUNDS = 10

export function ParticleField() {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Store initial particle properties to calculate speeds and offsets
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < COUNT; i++) {
        temp.push({
            position: new THREE.Vector3(
                (Math.random() - 0.5) * BOUNDS,
                (Math.random() - 0.5) * BOUNDS,
                (Math.random() - 0.5) * BOUNDS
            ),
            scale: 0.01 + Math.random() * 0.02, // r=0.01-0.03
            speedOffset: Math.random() * 2
        })
    }
    return temp
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorTarget = useMemo(() => new THREE.Color('#00FFFF'), [])

  useFrame(() => {
    if (!meshRef.current) return
    
    const storeState = useLarynxStore.getState()
    const { status, verdict } = storeState
    
    // Determine target color and target speed
    let targetHex = '#00FFFF' // Default cyan
    let targetIntensity = 1.0
    let baseSpeed = 0.002 // Default speed

    if (status === 'analyzing') {
      baseSpeed = 0.008 // Move faster
      targetIntensity = 2.0 // Glow brighter
    } else if (status === 'complete') {
      targetHex = verdict?.isGenuine ? '#00FF88' : '#FF3366'
    }

    // Material transitions
    const material = meshRef.current.material as THREE.MeshStandardMaterial
    if (material) {
        colorTarget.set(targetHex)
        material.color.lerp(colorTarget, 0.05)
        material.emissive.copy(material.color)
        material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, targetIntensity, 0.1)
    }

    

    // Update instance positions
    particles.forEach((particle, i) => {
        // Upward drift
        particle.position.y += baseSpeed * (1 + particle.speedOffset * 0.5)
        
        // Wrap around within bounds
        if (particle.position.y > BOUNDS / 2) {
            particle.position.y = -BOUNDS / 2
        }

        // Apply to dummy matrix
        dummy.position.copy(particle.position)
        dummy.scale.setScalar(particle.scale)
        dummy.updateMatrix()
        
        meshRef.current!.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial 
        transparent
        opacity={0.3}
        color="#00FFFF"
        emissive="#00FFFF"
        toneMapped={false}
      />
    </instancedMesh>
  )
}
