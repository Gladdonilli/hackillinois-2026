import { useRef, useMemo } from 'react';
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
  const wireMeshRef = useRef<THREE.Mesh>(null);
  const tongueMeshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const tongueMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const breachIntensity = useRef(0);
  const baseColor = useMemo(() => new THREE.Color('#38BDF8'), []);
  const breachColor = useMemo(() => new THREE.Color('#ff3366'), []);
  const baseEmissive = useMemo(() => new THREE.Color('#38BDF8'), []);
  const breachEmissive = useMemo(() => new THREE.Color('#ff3366'), []);
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

    // Sync wireframe + tongue morph targets with solid mesh
    if (headMeshRef.current) {
      const srcInfluences = headMeshRef.current.morphTargetInfluences;
      if (srcInfluences) {
        if (wireMeshRef.current?.morphTargetInfluences) {
          for (let i = 0; i < srcInfluences.length; i++) {
            wireMeshRef.current.morphTargetInfluences[i] = srcInfluences[i];
          }
        }
        if (tongueMeshRef.current?.morphTargetInfluences) {
          for (let i = 0; i < srcInfluences.length; i++) {
            tongueMeshRef.current.morphTargetInfluences[i] = srcInfluences[i];
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

      materialRef.current.emissiveIntensity = 0.5 + breachIntensity.current * 0.8;
      materialRef.current.opacity = 0.25 + breachIntensity.current * 0.35;
    }

    // Tongue material: more visible, stronger velocity color response
    if (tongueMaterialRef.current) {
      const tongueBreachT = Math.min(1, breachIntensity.current * 1.5);
      lerpedColor.copy(baseColor).lerp(breachColor, tongueBreachT);
      tongueMaterialRef.current.color.copy(lerpedColor);
      tongueMaterialRef.current.emissive.copy(lerpedColor);
      tongueMaterialRef.current.emissiveIntensity = 1.0 + tongueBreachT * 2.0;
      tongueMaterialRef.current.opacity = 0.5 + tongueBreachT * 0.3;
    }

    // Vertex jitter on breach
    if (wireMeshRef.current && breachIntensity.current > 0.05) {
      const jitterAmp = breachIntensity.current * 0.3;
      const t = clock.elapsedTime;
      const jx = -10.903 + Math.sin(t * 47) * jitterAmp;
      const jy = -18.028 + Math.sin(t * 53) * jitterAmp * 0.7;
      const jz = -18.131 + Math.cos(t * 41) * jitterAmp * 0.5;
      wireMeshRef.current.position.set(jx, jy, jz);
      if (headMeshRef.current) headMeshRef.current.position.set(jx, jy, jz);
      if (tongueMeshRef.current) tongueMeshRef.current.position.set(jx, jy, jz);
    } else if (wireMeshRef.current) {
      wireMeshRef.current.position.set(-10.903, -18.028, -18.131);
      if (headMeshRef.current) headMeshRef.current.position.set(-10.903, -18.028, -18.131);
      if (tongueMeshRef.current) tongueMeshRef.current.position.set(-10.903, -18.028, -18.131);
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
              visible={false}
            >
              <meshStandardMaterial transparent opacity={0} />
            </mesh>
            {/* Wireframe overlay */}
            <mesh
              name="head-wire"
              ref={wireMeshRef}
              geometry={nodes.mesh_2.geometry}
              morphTargetDictionary={nodes.mesh_2.morphTargetDictionary}
              morphTargetInfluences={[...(nodes.mesh_2.morphTargetInfluences || [])]}
              position={[-10.903, -18.028, -18.131]}
              scale={0.002}
            >
              <meshStandardMaterial
                ref={materialRef}
                color="#38BDF8"
                emissive="#38BDF8"
                emissiveIntensity={0.5}
                transparent
                opacity={0.25}
                wireframe
                depthWrite={false}
              />
            </mesh>
            {/* Tongue inner mesh — visible solid with velocity glow */}
            <mesh
              name="tongue-inner"
              ref={tongueMeshRef}
              geometry={nodes.mesh_2.geometry}
              morphTargetDictionary={nodes.mesh_2.morphTargetDictionary}
              morphTargetInfluences={[...(nodes.mesh_2.morphTargetInfluences || [])]}
              position={[-10.903, -18.028, -18.131]}
              scale={0.002}
              renderOrder={1}
            >
              <meshStandardMaterial
                ref={tongueMaterialRef}
                color="#38BDF8"
                emissive="#38BDF8"
                emissiveIntensity={1.0}
                transparent
                opacity={0.5}
                depthWrite={false}
                side={THREE.FrontSide}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
