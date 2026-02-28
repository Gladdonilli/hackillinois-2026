import { MeshDistortMaterial, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useLarynxStore } from '@/store/useLarynxStore';
import * as THREE from 'three';

export function TongueModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<any>(null); // MeshDistortMaterial ref
  const colorObj = useRef(new THREE.Color('#00FFFF'));
  useFrame(() => {
    const { frames, currentFrame, tongueVelocity } = useLarynxStore.getState();
    if (!meshRef.current || !matRef.current) return;
    
    // Position from EMA data
    const frame = frames[currentFrame];
    if (frame?.sensors?.T1) {
      meshRef.current.position.x += (frame.sensors.T1.x - meshRef.current.position.x) * 0.15;
      meshRef.current.position.y += (frame.sensors.T1.y - meshRef.current.position.y) * 0.15;
    }
    
    // Velocity-driven distortion
    const normalizedVel = Math.min(tongueVelocity / 100, 1);
    matRef.current.distort = 0.1 + normalizedVel * 0.7;
    matRef.current.speed = 2 + normalizedVel * 15;
    
    // Color lerp: cyan → warn → red
    if (tongueVelocity > 80) {
      colorObj.current.lerp(new THREE.Color('#FF0000'), 0.1);
    } else if (tongueVelocity > 50) {
      colorObj.current.lerp(new THREE.Color('#FF3366'), 0.1);
    } else {
      colorObj.current.lerp(new THREE.Color('#00FFFF'), 0.05);
    }
    matRef.current.color = colorObj.current;
    matRef.current.emissiveIntensity = 0.3 + normalizedVel * 2.5;
  });
  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.1}>
      <mesh ref={meshRef} position={[0, -0.3, 0.3]}>
        <capsuleGeometry args={[0.15, 0.5, 8, 16]} />
        <MeshDistortMaterial
          ref={matRef}
          color="#00FFFF"
          emissive="#00FFFF"
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.1}
          distort={0.15}
          speed={3}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}
