import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLarynxStore } from '@/store/useLarynxStore'

export function BackgroundWaves() {
  const meshRef = useRef<THREE.LineSegments>(null)
  
  // Create geometry for a grid of horizontal lines
  const { geometry, positions, initialPositions } = useMemo(() => {
    const lines = 40
    const pointsPerLine = 100
    const width = 30
    const height = 15
    
    // We need 2 points per segment for LineSegments geometry
    const totalPoints = lines * (pointsPerLine - 1) * 2
    const positions = new Float32Array(totalPoints * 3)
    const initialPositions = new Float32Array(totalPoints * 3)
    
    let index = 0
    for (let i = 0; i < lines; i++) {
      // Y goes from bottom (-height/2) to top (+height/2), with non-linear clustering towards center
      const normalizedY = (i / (lines - 1)) * 2 - 1
      const y = Math.sign(normalizedY) * Math.pow(Math.abs(normalizedY), 1.5) * (height / 2)
      
      for (let j = 0; j < pointsPerLine - 1; j++) {
        const x1 = (j / (pointsPerLine - 1) - 0.5) * width
        const x2 = ((j + 1) / (pointsPerLine - 1) - 0.5) * width
        
        // Point A
        positions[index] = x1
        positions[index + 1] = y
        positions[index + 2] = 0
        initialPositions[index] = x1
        initialPositions[index + 1] = y
        initialPositions[index + 2] = 0
        index += 3
        
        // Point B
        positions[index] = x2
        positions[index + 1] = y
        positions[index + 2] = 0
        initialPositions[index] = x2
        initialPositions[index + 1] = y
        initialPositions[index + 2] = 0
        index += 3
      }
    }
    
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    return { geometry: geom, positions, initialPositions }
  }, [])
  
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    
    const t = clock.elapsedTime
    const tongueVelocity = useLarynxStore.getState().tongueVelocity
    
    // Base agitation + velocity-based agitation
    const baseAmplitude = 0.2
    const extraAmplitude = Math.min(tongueVelocity * 0.05, 1.5)
    const amplitude = baseAmplitude + extraAmplitude
    
    const baseSpeed = 1.0
    const extraSpeed = Math.min(tongueVelocity * 0.1, 4.0)
    const speed = baseSpeed + extraSpeed
    
    // Update Y coordinates along the sine waves
    for (let i = 0; i < positions.length; i += 3) {
      const x = initialPositions[i]
      const initialY = initialPositions[i + 1]
      
      // Multi-frequency wave formula
      const wave1 = Math.sin(x * 0.5 - t * speed * 0.5) * amplitude
      const wave2 = Math.cos(x * 0.2 + t * speed * 0.3) * (amplitude * 0.5)
      
      // Attenuate waves at the left/right edges
      const edgeAttenuation = Math.max(0, 1.0 - Math.abs(x) / 15.0)
      
      // Less wave action on the outer lines, more in the center
      const centerAttenuation = Math.max(0.1, 1.0 - Math.abs(initialY) / 7.5)
      
      positions[i + 1] = initialY + (wave1 + wave2) * edgeAttenuation * centerAttenuation
    }
    
    // Tell Three.js the geometry changed
    meshRef.current.geometry.attributes.position.needsUpdate = true
    
    // Subtle rotation and color shifting
    meshRef.current.position.y = Math.sin(t * 0.2) * 0.2
  })
  
  return (
    <lineSegments ref={meshRef} geometry={geometry} position={[0, 0, -5]} renderOrder={-1}>
      <lineBasicMaterial
        color="#0ea5e9" // Tailwind sky-500 equivalent, fitting the cyan/#38BDF8 theme but darker
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}