import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useLarynxStore } from '@/store/useLarynxStore'
import * as THREE from 'three'

const COUNT = 600

export function ParticleField() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  const activeCountRef = useRef(200)
  const wasAbove80Ref = useRef(false)

  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < COUNT; i++) {
        temp.push({
            position: new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            ),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            ),
            scale: 0.01 + Math.random() * 0.02,
            speedOffset: Math.random() * 2
        })
    }
    return temp
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorTarget = useMemo(() => new THREE.Color('#38BDF8'), [])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    
    const storeState = useLarynxStore.getState()
    const { status, verdict, tongueVelocity } = storeState
    const velocity = tongueVelocity || 0

    let targetHex = '#38BDF8'
    let targetIntensity = 1.0
    let baseSpeed = 0.002

    if (velocity > 80) {
        targetHex = '#DC2626'
        targetIntensity = 4.0
        baseSpeed = 0.05
    } else if (status === 'analyzing') {
        baseSpeed = 0.008 
        targetIntensity = 2.0 
    } else if (status === 'complete') {
        targetHex = verdict?.isGenuine ? '#2DD4BF' : '#DC2626'
    }

    if (velocity > 80 && !wasAbove80Ref.current) {
        activeCountRef.current = 600
        for (let i = 200; i < 600; i++) {
            particles[i].position.set(0, 0, 0)
            particles[i].velocity.set(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            )
        }
    }
    wasAbove80Ref.current = velocity > 80

    if (activeCountRef.current > 200) {
        activeCountRef.current = Math.max(200, activeCountRef.current - 400 * delta * 1.5)
    }
    
    meshRef.current.count = Math.floor(activeCountRef.current)

    const material = meshRef.current.material as THREE.MeshStandardMaterial
    if (material) {
        colorTarget.set(targetHex)
        material.color.lerp(colorTarget, 10 * delta)
        material.emissive.copy(material.color)
        material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, targetIntensity, 10 * delta)
    }

    const bounds = 10
    const currentActive = Math.floor(activeCountRef.current)
    
    for(let i = 0; i < currentActive; i++) {
        const particle = particles[i]
        
        if (i < 200) {
            if (velocity > 80) {
                particle.position.addScaledVector(particle.velocity, delta * 0.1)
            } else {
                particle.position.y += baseSpeed * (1 + particle.speedOffset * 0.5)
            }
            if (particle.position.y > bounds / 2) particle.position.y = -bounds / 2
            if (particle.position.x > bounds / 2) particle.position.x = -bounds / 2
            if (particle.position.z > bounds / 2) particle.position.z = -bounds / 2
            if (particle.position.x < -bounds / 2) particle.position.x = bounds / 2
            if (particle.position.z < -bounds / 2) particle.position.z = bounds / 2
        } else {
            particle.position.addScaledVector(particle.velocity, delta)
        }

        dummy.position.copy(particle.position)
        dummy.scale.setScalar(particle.scale)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial transparent opacity={0.3} color="#38BDF8" emissive="#38BDF8" toneMapped={false} />
    </instancedMesh>
  )
}
