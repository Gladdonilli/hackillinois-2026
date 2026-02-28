import * as THREE from 'three';
import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore as useSynapseStore } from '../store';
import { FeatureTooltip } from './FeatureTooltip';
import type { Feature } from '../types';

const MAX_INSTANCES = 5000;
const RESTING_COLOR = new THREE.Color().setHSL(270 / 360, 0.3, 0.15); // dark purple
const FIRING_COLOR = new THREE.Color('#00FFFF'); // cyan
const ABLATED_COLOR = new THREE.Color('#111111');
const TARGETED_COLOR = new THREE.Color('#FF0044');

export function NeuronGraph() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const scratchObject = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  
  const currentColors = useMemo(() => Array.from({ length: MAX_INSTANCES }, () => new THREE.Color(RESTING_COLOR)), []);
  const currentScales = useMemo(() => new Float32Array(MAX_INSTANCES).fill(0.05), []);
  const currentPositions = useMemo(() => Array.from({ length: MAX_INSTANCES }, () => new THREE.Vector3()), []);

  const [hoveredFeature, setHoveredFeature] = useState<Feature | null>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const { features, selectedFeatureId, ablations } = useSynapseStore.getState();
    const count = Math.min(features.length, MAX_INSTANCES);
    meshRef.current.count = count;

    for (let i = 0; i < count; i++) {
      const feature = features[i];
      const isSelected = feature.feature_id === selectedFeatureId;
      const isAblated = feature.feature_id in ablations;
      
      let targetEmi = 0.8;
      if (isSelected) {
        scratchColor.copy(TARGETED_COLOR);
        targetEmi = 3.0; // Emissive multiplier for bloom
      } else if (isAblated) {
        scratchColor.copy(ABLATED_COLOR);
        targetEmi = 0.0;
      } else {
        const activation = feature.activation_strength;
        if (activation > 0.5) {
          scratchColor.copy(RESTING_COLOR).lerp(FIRING_COLOR, (activation - 0.5) * 2);
          targetEmi = 2.5; // Emissive multiplier for bloom
        } else {
          scratchColor.copy(RESTING_COLOR);
          targetEmi = 0.8;
        }
      }
      
      scratchColor.multiplyScalar(targetEmi);
      currentColors[i].lerp(scratchColor, 0.1);
      meshRef.current.setColorAt(i, currentColors[i]);

      const [x, y, z] = feature.umap_xyz;
      const targetPos = scratchObject.position.set(x, y, z);
      currentPositions[i].lerp(targetPos, 0.1);
      
      const targetScale = 0.05 + Math.log1p(feature.activation_strength) * 0.1;
      currentScales[i] += (targetScale - currentScales[i]) * 0.1;

      scratchObject.position.copy(currentPositions[i]);
      scratchObject.scale.setScalar(currentScales[i]);
      scratchObject.updateMatrix();
      meshRef.current.setMatrixAt(i, scratchObject.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const features = useSynapseStore.getState().features;
      if (features[e.instanceId]) {
        setHoveredFeature(features[e.instanceId]);
      }
    }
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHoveredFeature(null);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const feature = useSynapseStore.getState().features[e.instanceId];
      if (feature) {
        const store = useSynapseStore.getState() as any;
        if (store.setSelectedFeatureId) {
          store.setSelectedFeatureId(feature.feature_id);
        } else {
          useSynapseStore.setState({ selectedFeatureId: feature.feature_id });
        }
      }
    }
  };

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[null as any, null as any, MAX_INSTANCES]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      
      <FeatureTooltip feature={hoveredFeature} />
    </>
  );
}
