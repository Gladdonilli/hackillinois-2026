import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useLarynxStore } from '@/store/useLarynxStore';
import { VELOCITY_THRESHOLDS } from '@/types/larynx';

const SENSOR_NAMES = ['UL', 'LL', 'JAW', 'T1', 'T2', 'T3'] as const;
type SensorNameType = typeof SENSOR_NAMES[number];

const NORMAL_COLOR = new THREE.Color('#00FFFF');
const WARN_COLOR = new THREE.Color('#FF3366');

export function EMAMarkers() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!meshRef.current) return;

    const { frames, currentFrame } = useLarynxStore.getState();
    const frame = frames[currentFrame];
    if (!frame || !frame.sensors) return;

    SENSOR_NAMES.forEach((name, i) => {
      const sensor = frame.sensors[name];
      if (!sensor) return;

      // Position: x/50, y/50, z=0.3 on sagittal plane
      const targetX = sensor.x / 50;
      const targetY = sensor.y / 50;
      
      dummy.position.set(targetX, targetY, 0.3);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Velocity-based color mapping
      const velocity = sensor.velocity || 0;
      const threshold = VELOCITY_THRESHOLDS[name];
      
      if (velocity > threshold) {
        color.copy(WARN_COLOR);
      } else {
        color.copy(NORMAL_COLOR);
      }
      
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, 6]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#00FFFF"
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </instancedMesh>
      
      {/* HTML Labels */}
      {SENSOR_NAMES.map((name) => (
        <MarkerLabel key={name} name={name} />
      ))}
    </group>
  );
}

function MarkerLabel({ name }: { name: SensorNameType }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current) return;
    const { frames, currentFrame } = useLarynxStore.getState();
    const frame = frames[currentFrame];
    if (!frame || !frame.sensors || !frame.sensors[name]) return;
    
    // Mirror the exact position of the instance
    const sensor = frame.sensors[name];
    groupRef.current.position.set(sensor.x / 50, sensor.y / 50, 0.3);
  });

  return (
    <group ref={groupRef}>
      <Html 
        distanceFactor={4} 
        zIndexRange={[100, 0]}
        style={{
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '10px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          textShadow: '0 0 2px #000000',
          transition: 'color 0.2s',
        }}
        className="hover:text-cyan-400"
      >
        <div>{name}</div>
      </Html>
    </group>
  );
}
