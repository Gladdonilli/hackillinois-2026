# LARYNX 3D Asset Pipeline

## Quick Start (15 minutes)

### Step 1: Get Head Model (5 min)

**Option A: Ready Player Me (Recommended)**
1. Go to https://readyplayer.me
2. Create any avatar (doesn't matter what it looks like — we'll slice it)
3. Copy the GLB URL from the final screen
4. Append `?morphTargets=ARKit` to the URL:
   ```
   https://models.readyplayer.me/{YOUR_ID}.glb?morphTargets=ARKit
   ```
5. Download the GLB file, save to `LARYNX/frontend/public/models/head.glb`

**Option B: VRoid Studio (Better oral cavity)**
1. Download VRoid Studio from Steam (free)
2. Create character, export as VRM
3. Rename .vrm → .glb (same format)
4. Note: May need Blender VRM addon for blendshape name mapping

**What you get:** GLB with 52 ARKit blendshapes including:
- `jawOpen` — jaw opening (maps to F1 formant)
- `tongueOut` — tongue protrusion
- `mouthClose`, `mouthFunnel`, `mouthPucker` — lip shapes
- Wolf3D_Teeth mesh, mouth cavity, tongue geometry

### Step 2: NO Blender Needed — Use Clipping Planes (2 min)

**CRITICAL: Do NOT boolean-cut the model in Blender.**
Boolean modifier destroys vertex order → breaks all 52 shape keys.

Instead, use THREE.js clipping planes in R3F for a real-time sagittal slice:

```tsx
import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

export function SagittalHead({ clipOffset = 0 }: { clipOffset?: number }) {
  const { scene } = useGLTF('/models/head.glb');

  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(1, 0, 0), clipOffset),
    [clipOffset]
  );

  // Enable clipping on all materials in the model
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial;
      mat.clippingPlanes = [clipPlane];
      mat.clipShadows = true;
      mat.side = THREE.DoubleSide; // Show inside of mouth cavity
    }
  });

  return <primitive object={scene} />;
}
```

**In your Canvas:**
```tsx
<Canvas gl={{ localClippingEnabled: true }}>
  <SagittalHead clipOffset={0} />
</Canvas>
```

### Step 3: X-Ray Glass Material (5 min)

For the sci-fi transparent look from the design:

```tsx
import { MeshTransmissionMaterial } from '@react-three/drei';

// Apply to the skin mesh only
<mesh geometry={skinGeometry}>
  <MeshTransmissionMaterial
    transmission={0.9}
    thickness={2.5}
    chromaticAberration={0.5}
    roughness={0.1}
    ior={1.5}
    color="#1a1a2e"
    backside={true}
  />
</mesh>
```

### Step 4: Drive Morph Targets from EMA Data (3 min)

```tsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useStore } from '../store/useLarynxStore';

export function AnimatedHead() {
  const meshRef = useRef<THREE.SkinnedMesh>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh?.morphTargetInfluences || !mesh.morphTargetDictionary) return;

    // Read from transient store (NOT useState — perf rule)
    const frame = useStore.getState().currentEMAFrame;
    if (!frame) return;

    const dict = mesh.morphTargetDictionary;

    // CRITICAL: Do NOT clamp to [0, 1]
    // Deepfake values > 1.0 cause tongue to clip through skull
    // This IS the visual evidence
    mesh.morphTargetInfluences[dict['jawOpen']] = frame.jaw_open;
    mesh.morphTargetInfluences[dict['tongueOut']] = frame.tongue_z;

    // Lerp for smoothness (0.15 factor)
    // mesh.morphTargetInfluences[dict['jawOpen']] =
    //   THREE.MathUtils.lerp(
    //     mesh.morphTargetInfluences[dict['jawOpen']],
    //     frame.jaw_open,
    //     0.15
    //   );
  });

  return <skinnedMesh ref={meshRef} />;
}
```

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Sagittal slice | Clipping plane, not Blender boolean | Preserves all 52 morph targets |
| Material | MeshTransmissionMaterial | X-ray glass aesthetic, shows oral cavity |
| Morph target clamping | UNCLAMPED (allow > 1.0) | Deepfake skull-clip is the demo moment |
| Animation approach | useFrame + useStore.getState() | 60fps, no React re-renders |
| Model source | Ready Player Me | Free, 52 ARKit blendshapes, oral cavity included |

## Post-Processing Stack

```tsx
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';

// Normal state
<Bloom luminanceThreshold={1.0} intensity={0.2} mipmapBlur />
<ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />

// Deepfake detected — escalate effects
<Bloom luminanceThreshold={0.8} intensity={2.5} mipmapBlur />
<ChromaticAberration offset={new THREE.Vector2(0.05, 0.05)} />
// Also add Scanline effect for "glitch" feel
```

## File Checklist

- [ ] `LARYNX/frontend/public/models/head.glb` — RPM head with ARKit blendshapes
- [ ] `LARYNX/frontend/src/components/HeadModel.tsx` — Clipping plane + transmission material
- [ ] `LARYNX/frontend/src/components/TongueModel.tsx` — Driven by EMA tongue_z/tongue_y
- [ ] `LARYNX/frontend/src/components/EMAMarkers.tsx` — 6 sensor position indicators
- [ ] `LARYNX/frontend/src/components/PostProcessingEffects.tsx` — Bloom + ChromaticAberration
- [ ] `LARYNX/frontend/src/components/CameraController.tsx` — OrbitControls limited to sagittal view
