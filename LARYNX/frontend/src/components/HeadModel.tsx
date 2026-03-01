import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useLarynxStore } from '@/store/useLarynxStore';
import { configureKTX2ForGLTFLoader } from '@/utils/ktx2Setup';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

type FacecapGLTF = GLTF & {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.Material>;
};

export function HeadModel() {
  const groupRef = useRef<THREE.Group>(null);
  const headMeshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const breachIntensity = useRef(0);
  const baseColor = useMemo(() => new THREE.Color('#c7ecff'), []);
  const breachColor = useMemo(() => new THREE.Color('#ff3366'), []);
  const baseEmissive = useMemo(() => new THREE.Color('#38BDF8'), []);
  const breachEmissive = useMemo(() => new THREE.Color('#800020'), []);
  const lerpedColor = useMemo(() => new THREE.Color(), []);
  const lerpedEmissive = useMemo(() => new THREE.Color(), []);
  const { gl } = useThree();
  const { nodes } = useGLTF(
    '/models/facecap.glb',
    false,
    true,
    (loader) => {
      configureKTX2ForGLTFLoader(loader, gl);
    }
  ) as unknown as FacecapGLTF;

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  const clippingPlanes = useMemo(
    () => [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)],
    []
  );

  useFrame(({ clock }) => {
    const { status, frames, currentFrame, tongueVelocity } = useLarynxStore.getState();
    
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
            influences[jawOpenIdx] = THREE.MathUtils.clamp(-jawY / 20, 0, 3.5); 
          }

          if (tongueOutIdx !== undefined) {
            const t1x = frame.sensors.T1.x || 0;
            influences[tongueOutIdx] = Math.max(0, t1x / 15);
          }
        }
      }
    }

    // Pink Trombone breach effects: color shift + jitter
    const threshold = 20;
    const rawIntensity = tongueVelocity > threshold ? Math.min((tongueVelocity - threshold) / 60, 1) : 0;
    breachIntensity.current += (rawIntensity - breachIntensity.current) * 0.08;

    if (materialRef.current) {
      lerpedColor.copy(baseColor).lerp(breachColor, breachIntensity.current);
      materialRef.current.color.copy(lerpedColor);

      lerpedEmissive.copy(baseEmissive).lerp(breachEmissive, breachIntensity.current);
      materialRef.current.emissive.copy(lerpedEmissive);

      materialRef.current.emissiveIntensity = 0.18 + breachIntensity.current * 0.6;
      materialRef.current.opacity = 0.36 + breachIntensity.current * 0.25;
    }

    // Vertex jitter on breach
    if (headMeshRef.current && breachIntensity.current > 0.05) {
      const jitterAmp = breachIntensity.current * 0.3;
      const t = clock.elapsedTime;
      headMeshRef.current.position.x = -10.903 + Math.sin(t * 47) * jitterAmp;
      headMeshRef.current.position.y = -18.028 + Math.sin(t * 53) * jitterAmp * 0.7;
      headMeshRef.current.position.z = -18.131 + Math.cos(t * 41) * jitterAmp * 0.5;
    } else if (headMeshRef.current) {
      headMeshRef.current.position.set(-10.903, -18.028, -18.131);
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
              <meshStandardMaterial
                ref={materialRef}
                color="#c7ecff"
                emissive="#38BDF8"
                emissiveIntensity={0.18}
                transparent
                opacity={0.36}
                roughness={0.45}
                metalness={0.02}
                depthWrite={false}
                clippingPlanes={clippingPlanes}
                clipShadows={false}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
