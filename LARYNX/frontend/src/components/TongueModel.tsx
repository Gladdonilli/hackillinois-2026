import { MeshDistortMaterial, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useLarynxStore } from '@/store/useLarynxStore';
import * as THREE from 'three';

export function TongueModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<any>(null); // MeshDistortMaterial ref
  const colorObj = useRef(new THREE.Color('#38BDF8'));
  const scalePulseRef = useRef(1.0);
  const wasAbove80Ref = useRef(false);

  useFrame((_, delta) => {
    const { frames, currentFrame, tongueVelocity } = useLarynxStore.getState();
    const velocity = tongueVelocity || 0;
    
    if (!meshRef.current || !matRef.current) return;
    
    // Position from EMA data
    const frame = frames[currentFrame];
    if (frame?.sensors?.T1) {
      meshRef.current.position.x += (frame.sensors.T1.x - meshRef.current.position.x) * 0.15;
      meshRef.current.position.y += (frame.sensors.T1.y - meshRef.current.position.y) * 0.15;
    }
    
    let targetDistort = 0.1;
    let targetSpeed = 2;
    let targetEmissive = 0.3;
    let targetHex = '#38BDF8'; // sky-300 cyan

    if (velocity > 80) {
        targetDistort = 0.9;
        targetSpeed = 25;
        targetEmissive = 4.0;
        targetHex = '#DC2626'; // red-600
    } else if (velocity > 50) {
        targetDistort = 0.6;
        targetSpeed = 15;
        targetEmissive = 2.0;
        targetHex = '#EA580C'; // orange-600
    } else if (velocity > 22) {
        targetDistort = 0.3;
        targetSpeed = 8;
        targetEmissive = 1.0;
        targetHex = '#FDE047'; // yellow-300
    }

    matRef.current.distort += (targetDistort - matRef.current.distort) * 10 * delta;
    matRef.current.speed += (targetSpeed - matRef.current.speed) * 10 * delta;
    matRef.current.emissiveIntensity += (targetEmissive - matRef.current.emissiveIntensity) * 10 * delta;
    
    colorObj.current.lerp(new THREE.Color(targetHex), 10 * delta);
    matRef.current.color = colorObj.current;
    matRef.current.emissive = colorObj.current;

    // Scale pulse
    if (velocity > 80 && !wasAbove80Ref.current) {
        scalePulseRef.current = 1.3;
    }
    wasAbove80Ref.current = velocity > 80;

    if (scalePulseRef.current > 1.0) {
        scalePulseRef.current = Math.max(1.0, scalePulseRef.current - delta * 3.0); // 1.3 -> 1.0 in ~100ms
    }
    meshRef.current.scale.setScalar(scalePulseRef.current);
  });

  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.1}>
      <mesh ref={meshRef} position={[0, -0.3, 0.3]}>
        <capsuleGeometry args={[0.15, 0.5, 8, 16]} />
        <MeshDistortMaterial
          ref={matRef}
          color="#38BDF8"
          emissive="#38BDF8"
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
