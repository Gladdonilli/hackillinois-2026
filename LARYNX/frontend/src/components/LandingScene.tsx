import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles, Float, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

function MouseGlow() {
  const meshRef = useRef<THREE.Mesh>(null)
  const mousePos = useRef({ x: 0, y: 0 })
  
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / window.innerWidth - 0.5) * 4
      mousePos.current.y = -(e.clientY / window.innerHeight - 0.5) * 4
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])
  
  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.position.x += (mousePos.current.x - meshRef.current.position.x) * 0.02
    meshRef.current.position.y += (mousePos.current.y - meshRef.current.position.y) * 0.02
  })
  
  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial 
        color="#00FFFF" 
        emissive="#00FFFF" 
        emissiveIntensity={0.08} 
        transparent 
        opacity={0.03} 
      />
    </mesh>
  )
}

export function LandingScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
    >
      <fog attach="fog" args={['#000000', 5, 30]} />
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 5, 5]} intensity={0.3} color="#00FFFF" />
      
      {/* 400 cyan sparkles filling the scene */}
      <Sparkles count={400} scale={15} size={2.5} speed={0.3} opacity={0.6} color="#00FFFF" />
      
      {/* Distant star field for depth */}
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      
      {/* Mouse-reactive glow sphere */}
      <MouseGlow />
      
      {/* Floating geometric shapes */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.4}>
        <mesh position={[4, 2, -5]}>
          <icosahedronGeometry args={[0.8, 1]} />
          <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={0.3} transparent opacity={0.08} wireframe />
        </mesh>
      </Float>
      
      <Float speed={1.5} rotationIntensity={0.8} floatIntensity={0.6}>
        <mesh position={[-5, 1, -6]}>
          <octahedronGeometry args={[1.2]} />
          <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={0.2} transparent opacity={0.12} />
        </mesh>
      </Float>
      
      <Float speed={3} rotationIntensity={0.4} floatIntensity={0.5}>
        <mesh position={[6, -2, -4]}>
          <torusKnotGeometry args={[0.5, 0.15, 64, 8]} />
          <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={0.4} transparent opacity={0.05} wireframe />
        </mesh>
      </Float>
      
      <Float speed={2.5} rotationIntensity={0.6} floatIntensity={0.3}>
        <mesh position={[-4, -1.5, -3]}>
          <icosahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={0.15} transparent opacity={0.1} />
        </mesh>
      </Float>
      
      <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
        <mesh position={[2, 4, -7]}>
          <octahedronGeometry args={[1.5]} />
          <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={0.25} transparent opacity={0.06} wireframe />
        </mesh>
      </Float>
      
      <Float speed={1.8} rotationIntensity={0.7} floatIntensity={0.5}>
        <mesh position={[-6, 3, -5]}>
          <torusGeometry args={[0.7, 0.2, 16, 32]} />
          <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={0.3} transparent opacity={0.08} />
        </mesh>
      </Float>
      
      {/* Post-processing: Bloom for emissive glow */}
      <EffectComposer>
        <Bloom luminanceThreshold={1} mipmapBlur={true} intensity={1.2} />
      </EffectComposer>
    </Canvas>
  )
}
