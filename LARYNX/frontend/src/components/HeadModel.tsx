import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useLarynxStore } from '@/store/useLarynxStore';

export function HeadModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  
  // Enable local clipping for the sagittal slice
  gl.localClippingEnabled = true;
  
  // Create a clipping plane on the +X side to cut the sphere in half
  const clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];

  useFrame(() => {
    const { status } = useLarynxStore.getState();
    if (status === 'idle' && meshRef.current) {
      meshRef.current.rotation.y += 0.001; // Subtle idle animation
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={[1, 1.3, 1]}>
      <sphereGeometry args={[1.2, 64, 64]} />
      <MeshTransmissionMaterial
        transmission={0.92}
        thickness={2.5}
        roughness={0.1}
        chromaticAberration={0.5}
        anisotropy={0.3}
        color="#88ccff"
        backside={true}
        samples={6}
        resolution={512}
        clippingPlanes={clippingPlanes}
        clipShadows={true}
      />
    </mesh>
  );
}
