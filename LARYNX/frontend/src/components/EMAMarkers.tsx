import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useLarynxStore } from '@/store/useLarynxStore';
import { VELOCITY_THRESHOLDS } from '@/types/larynx';

const SENSOR_NAMES = ['UL', 'LL', 'JAW', 'T1', 'T2', 'T3'] as const;
type SensorNameType = typeof SENSOR_NAMES[number];

const NORMAL_COLOR = new THREE.Color('#38BDF8');
const WARN_COLOR = new THREE.Color('#DC2626');

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
          emissive="#38BDF8"
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

type TextMaterial = THREE.Material & { color: THREE.Color };
type TextMesh = THREE.Mesh & { text: string, color: THREE.Color, material: TextMaterial, sync?: () => void };

function MarkerLabel({ name }: { name: SensorNameType }) {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<TextMesh>(null);
  
  useFrame(() => {
    if (!groupRef.current || !textRef.current) return;
    const { frames, currentFrame } = useLarynxStore.getState();
    const frame = frames[currentFrame];
    if (!frame || !frame.sensors || !frame.sensors[name]) return;
    
    // Position the group (Billboard handles camera facing)
    const sensor = frame.sensors[name];
    groupRef.current.position.set(sensor.x / 50, (sensor.y / 50) + 0.08, 0.3);

    // Directly update text and color for 60fps
    const velocity = sensor.velocity || 0;
    const threshold = VELOCITY_THRESHOLDS[name];
    
    textRef.current.text = `${name} ${velocity.toFixed(1)}`;
    textRef.current.color = velocity > threshold ? WARN_COLOR : NORMAL_COLOR;
    
    if (textRef.current.sync) {
      textRef.current.sync();
    }
  });

  return (
    <group ref={groupRef}>
      <Billboard>
        <Text 
          ref={textRef}
          fontSize={0.08}
          color={NORMAL_COLOR}
          anchorX="center"
          anchorY="middle"
        >{' '}</Text>
      </Billboard>
    </group>
  );
}
