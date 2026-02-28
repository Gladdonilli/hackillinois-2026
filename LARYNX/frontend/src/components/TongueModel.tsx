import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLarynxStore } from '@/store/useLarynxStore';

const NORMAL_COLOR = new THREE.Color('#CC6677');
const WARN_COLOR = new THREE.Color('#FF8800');
const ALERT_COLOR = new THREE.Color('#FF0044');

export function TongueModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;

    const { frames, currentFrame } = useLarynxStore.getState();
    const frame = frames[currentFrame];
    if (!frame || !frame.sensors) return;

    // Map T1 sensor to tongue tip position, JAW opening
    const t1 = frame.sensors.T1 || { x: 0, y: 0 };
    const jaw = frame.sensors.JAW || { x: 0, y: 0 };

    const targetX = t1.x / 50;
    const targetY = (t1.y / 50) - 0.2 + (jaw.y / 100);
    
    // Smooth translation (LERP)
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.15);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.15);

    // Velocity based visuals
    // Assuming tongueVelocity exists in the frame, fallback to a derived or 0 value
    const velocity = frame.tongueVelocity || (t1.velocity || 0);
    
    let targetColor = NORMAL_COLOR;
    let targetEmissiveIntensity = 0.1;
    let targetScale = 1.0;

    if (velocity > 80) {
      targetColor = ALERT_COLOR;
      targetEmissiveIntensity = velocity / 50;
      targetScale = 1 + velocity / 100; // Deepfake skull-clipping effect
    } else if (velocity > 50) {
      targetColor = ALERT_COLOR;
      targetEmissiveIntensity = velocity / 50;
    } else if (velocity > 20) {
      targetColor = WARN_COLOR;
      targetEmissiveIntensity = 0.5;
    }

    // Apply color and emissive LERP
    materialRef.current.color.lerp(targetColor, 0.15);
    materialRef.current.emissive.lerp(targetColor, 0.15);
    materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
      materialRef.current.emissiveIntensity, 
      targetEmissiveIntensity, 
      0.15
    );

    // Smooth scaling without clamping above 1.0
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
  });

  return (
    <mesh ref={meshRef} position={[0, -0.2, 0.3]}>
      <capsuleGeometry args={[0.15, 0.5, 8, 16]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#CC6677"
        roughness={0.6}
        metalness={0.1}
        emissive="#CC6677"
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}
