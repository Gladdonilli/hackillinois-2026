import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useLarynxStore } from '@/store/useLarynxStore';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

type FacecapGLTF = GLTF & {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.Material>;
};

export function HeadModel() {
  const groupRef = useRef<THREE.Group>(null);
  const headMeshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  const { nodes } = useGLTF('/models/facecap.glb') as unknown as FacecapGLTF;

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  const clippingPlanes = useMemo(
    () => [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)],
    []
  );

  useFrame(() => {
    const { status, frames, currentFrame } = useLarynxStore.getState();
    
    if (status === 'idle' && groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }

    if (headMeshRef.current && frames && frames.length > 0 && currentFrame < frames.length) {
      const frame = frames[currentFrame];
      if (frame?.sensors?.JAW && frame?.sensors?.T1) {
        const dict = headMeshRef.current.morphTargetDictionary;
        const influences = headMeshRef.current.morphTargetInfluences;
        if (dict && influences) {
          const jawOpenIdx = dict['jawOpen'];
          const tongueOutIdx = dict['tongueOut'];

          if (jawOpenIdx !== undefined) {
            const jawY = frame.sensors.JAW.y || 0;
            // Jaw: un-clamped max, only clamped at 0 for closure (allows deepfake to break limit)
            influences[jawOpenIdx] = THREE.MathUtils.clamp(-jawY / 20, 0, 3.5); 
          }

          if (tongueOutIdx !== undefined) {
            const t1x = frame.sensors.T1.x || 0;
            influences[tongueOutIdx] = Math.max(0, t1x / 15);
          }
        }
      }
    }
  });

  // Render the core head mesh with the exact transforms from gltfjsx
  return (
    <group ref={groupRef} position={[0, -0.5, 0]} scale={[1.5, 1.5, 1.5]}>
      <group name="Empty" scale={10}>
        <group name="grp_scale" rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
          <group name="grp_transform" rotation={[-0.022, -0.033, -0.008]}>
            <mesh 
              name="head"
              ref={headMeshRef}
              geometry={nodes.mesh_2.geometry}
              morphTargetDictionary={nodes.mesh_2.morphTargetDictionary}
              morphTargetInfluences={nodes.mesh_2.morphTargetInfluences}
              position={[-10.903, -18.028, -18.131]}
              scale={0.002}
            >
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
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/models/facecap.glb');
