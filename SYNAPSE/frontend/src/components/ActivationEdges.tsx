import * as THREE from 'three';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore as useSynapseStore } from '../store';
import gsap from 'gsap';

const BASE_COLOR = new THREE.Color('#00FFFF');
const MAX_EDGES = 10000;

export function ActivationEdges() {
  const lineRef = useRef<THREE.LineSegments>(null);
  
  const positions = useMemo(() => new Float32Array(MAX_EDGES * 2 * 3), []);
  const colors = useMemo(() => new Float32Array(MAX_EDGES * 2 * 4), []);
  
  const edgeOpacities = useMemo(() => {
    return Array.from({ length: MAX_EDGES }, () => ({ value: 1.0 }));
  }, []);
  
  const opacitySetters = useMemo(() => {
    return edgeOpacities.map(obj => gsap.quickTo(obj, "value", { duration: 0.3, ease: "power2.out" }));
  }, [edgeOpacities]);

  const featureMap = useRef<Map<string, [number, number, number]>>(new Map());

  useFrame(() => {
    if (!lineRef.current) return;
    const { features, edges, ablations } = useSynapseStore.getState();
    
    featureMap.current.clear();
    for (let i = 0; i < features.length; i++) {
        featureMap.current.set(features[i].feature_id, features[i].umap_xyz);
    }
    
    const edgeCount = Math.min(edges.length, MAX_EDGES);
    let posIdx = 0;
    let colIdx = 0;

    for (let i = 0; i < edgeCount; i++) {
      const [featA, featB, correlation] = edges[i];
      const posA = featureMap.current.get(featA);
      const posB = featureMap.current.get(featB);
      
      if (!posA || !posB) continue;
      
      positions[posIdx++] = posA[0];
      positions[posIdx++] = posA[1];
      positions[posIdx++] = posA[2];
      positions[posIdx++] = posB[0];
      positions[posIdx++] = posB[1];
      positions[posIdx++] = posB[2];
      
      const isAblated = (featA in ablations) || (featB in ablations);
      // dim cyan at 20% opacity base, scaled by correlation
      const targetOpacity = isAblated ? 0 : correlation * 0.2;
      
      opacitySetters[i](targetOpacity);
      const currentOpacity = edgeOpacities[i].value;
      
      colors[colIdx++] = BASE_COLOR.r;
      colors[colIdx++] = BASE_COLOR.g;
      colors[colIdx++] = BASE_COLOR.b;
      colors[colIdx++] = currentOpacity;
      
      colors[colIdx++] = BASE_COLOR.r;
      colors[colIdx++] = BASE_COLOR.g;
      colors[colIdx++] = BASE_COLOR.b;
      colors[colIdx++] = currentOpacity;
    }
    
    const geometry = lineRef.current.geometry;
    geometry.setDrawRange(0, edgeCount * 2);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={MAX_EDGES * 2} array={positions} itemSize={3} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-color" count={MAX_EDGES * 2} array={colors} itemSize={4} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors={true} transparent={true} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}
