import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useLarynxStore } from '@/store/useLarynxStore';

/**
 * Procedural cranium geometry — elongated skull profile with jaw ridge.
 * Sagittal-sliced via clipping plane for x-ray cross-section view.
 * Will be replaced with GLTF model when Ready Player Me export is ready.
 */
function createCraniumGeometry(): THREE.BufferGeometry {
  // Start from a sphere and deform to skull-like profile
  const geo = new THREE.SphereGeometry(1.2, 64, 64);
  const pos = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);

    // Normalize to unit sphere for deformation
    const r = vertex.length();
    // const theta = Math.atan2(vertex.z, vertex.x); // azimuth (reserved for future asymmetric deformation)
    const phi = Math.acos(vertex.y / r);           // polar

    let scale = 1.0;

    // Elongate cranium top (flatten slightly on top, extend back)
    // More volume in back of skull (occipital)
    const yNorm = vertex.y / r;
    if (yNorm > 0.3) {
      // Top of head — slight flattening
      scale *= 0.95 + 0.05 * Math.cos(phi * 0.8);
    }

    // Push back of skull outward (occipital bulge)
    const zNorm = vertex.z / r;
    if (zNorm < -0.2) {
      scale *= 1.0 + 0.12 * Math.pow(Math.abs(zNorm), 2);
    }

    // Forehead — slight forward prominence
    if (yNorm > 0.2 && zNorm > 0.3) {
      scale *= 1.0 + 0.08 * yNorm * zNorm;
    }

    // Jaw ridge — pinch inward at bottom, slight chin protrusion
    if (yNorm < -0.3) {
      // Narrow the jaw laterally
      const jawPinch = 0.85 + 0.15 * (1.0 + yNorm); // tighter at bottom
      vertex.x *= jawPinch;

      // Chin protrusion forward
      if (zNorm > 0.1 && yNorm < -0.5) {
        vertex.z += 0.08 * (1.0 - (yNorm + 1.0));
      }
    }

    // Cheekbone ridges — subtle lateral bulge at mid-height
    if (Math.abs(yNorm) < 0.2) {
      const xNorm = Math.abs(vertex.x / r);
      if (xNorm > 0.5) {
        scale *= 1.0 + 0.05 * xNorm;
      }
    }

    // Temple indent — slight inward curve above cheekbones
    if (yNorm > 0.1 && yNorm < 0.4) {
      const xNorm = Math.abs(vertex.x / r);
      if (xNorm > 0.6) {
        scale *= 0.97;
      }
    }

    vertex.x *= scale;
    vertex.y *= scale;
    vertex.z *= scale;

    pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geo.computeVertexNormals();
  return geo;
}

export function HeadModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  const clippingPlanes = useMemo(
    () => [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)],
    []
  );

  // Memoize the cranium geometry so it's only computed once
  const craniumGeo = useMemo(() => createCraniumGeometry(), []);

  useFrame(() => {
    const { status } = useLarynxStore.getState();
    if (status === 'idle' && meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={[1, 1.3, 1]} geometry={craniumGeo}>
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
