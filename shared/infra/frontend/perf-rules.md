# Frontend Performance Rules

These are non-negotiable. LARYNX runs a GPU-driven 3D scene with real-time data streams. Drop below 60fps and the demo looks broken. Drop below 30fps and judges walk away.

---

## Rule 1: NEVER useState for Per-Frame Data

React re-renders on every `setState` call. At 60fps, that's 60 re-renders per second, which triggers diffing, reconciliation, and DOM updates on every frame. Your scene will stutter.

**Wrong:**
```tsx
const [tonguePosition, setTonguePosition] = useState({ x: 0, y: 0 });

useFrame(() => {
  const newPos = getLatestEMA();
  setTonguePosition(newPos); // 💀 60 re-renders/sec
});
```

**Right (Zustand transient):**
```tsx
// store.ts
interface AnimationStore {
  tonguePosition: { x: number; y: number };
  setTonguePosition: (pos: { x: number; y: number }) => void;
}

export const useAnimationStore = create<AnimationStore>((set) => ({
  tonguePosition: { x: 0, y: 0 },
  setTonguePosition: (pos) => set({ tonguePosition: pos }),
}));

// In useFrame — read WITHOUT subscribing
useFrame(() => {
  const pos = useAnimationStore.getState().tonguePosition;
  meshRef.current.position.set(pos.x, pos.y, 0);
});
```

**Right (mutable ref):**
```tsx
const dataRef = useRef({ x: 0, y: 0 });

useFrame(() => {
  const latest = getLatestEMA();
  dataRef.current = latest;
  meshRef.current.position.set(latest.x, latest.y, 0);
});
```

Use Zustand transient for data that multiple components read. Use refs for data local to one component.

---

## Rule 2: useFrame is Your Animation Loop

All per-frame logic goes in `useFrame`. Not in `useEffect`. Not in `setInterval`. Not in `requestAnimationFrame` called manually.

```tsx
useFrame((state, delta) => {
  // delta = seconds since last frame (typically ~0.016 at 60fps)
  
  // LERP for smooth following (0.15 = smoothing factor)
  meshRef.current.position.x = THREE.MathUtils.lerp(
    meshRef.current.position.x,
    targetX,
    1 - Math.pow(0.001, delta) // delta-time aware LERP
  );
  
  // Or simpler (good enough for hackathon):
  meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.15;
});
```

Delta-time awareness matters if frame rate drops. The simpler version (multiply by 0.15) works fine at stable 60fps but speeds up at lower framerates. For a hackathon demo on your own laptop, the simple version is fine. Use the exponential version if you're paranoid.

---

## Rule 3: GSAP Integration

### gsap.quickTo() for Real-Time Streams

4x faster than `gsap.to()`. Creates a reusable function that skips timeline creation overhead.

```tsx
import { useRef, useEffect } from 'react';
import gsap from 'gsap';

function DataDrivenMesh() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const quickX = useRef<gsap.QuickToFunc>(null!);
  const quickY = useRef<gsap.QuickToFunc>(null!);

  useEffect(() => {
    quickX.current = gsap.quickTo(meshRef.current.position, 'x', {
      duration: 0.3,
      ease: 'power2.out',
    });
    quickY.current = gsap.quickTo(meshRef.current.position, 'y', {
      duration: 0.3,
      ease: 'power2.out',
    });
  }, []);

  // Call from SSE handler or useFrame
  const onNewData = (pos: { x: number; y: number }) => {
    quickX.current(pos.x);
    quickY.current(pos.y);
  };

  return <mesh ref={meshRef}><sphereGeometry /><meshStandardMaterial /></mesh>;
}
```

### useGSAP for Cleanup

Always use the `@gsap/react` hook. It auto-kills timelines on unmount. Memory leaks from orphaned tweens will crash your demo 20 minutes in.

```tsx
import { useGSAP } from '@gsap/react';

function RevealSequence() {
  const container = useRef<HTMLDivElement>(null!);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from('.verdict', { opacity: 0, y: 20, duration: 0.5 })
      .from('.confidence', { opacity: 0, scale: 0.8, duration: 0.3 }, '-=0.2')
      .from('.details', { opacity: 0, duration: 0.4 });
    // No cleanup needed — useGSAP handles it
  }, { scope: container });

  return <div ref={container}>...</div>;
}
```

### Timelines for Choreographed Sequences

Use GSAP timelines for the demo's "hero moment" (skull reveal, tongue clip). Don't try to choreograph multi-step sequences with chained promises or setTimeout.

```tsx
const heroTimeline = gsap.timeline({ paused: true });
heroTimeline
  .to(camera.position, { z: 2, duration: 1.5, ease: 'power2.inOut' })
  .to(skull.rotation, { y: Math.PI * 0.5, duration: 1, ease: 'power1.out' }, '-=0.5')
  .call(() => playSound('reveal'))
  .to(tongue.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.8, ease: 'elastic.out' });

// Trigger it
heroTimeline.play();
```

---

## Rule 4: Motion (Framer Motion) Scope

Motion is for **UI panels only**. Mount/unmount animations, layout transitions, presence detection.

```tsx
import { AnimatePresence, motion } from 'motion/react';

function ResultPanel({ show, verdict }: { show: boolean; verdict: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="result-panel"
        >
          {verdict}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**NEVER use Motion for:**
- Canvas/3D object animation (use useFrame + GSAP)
- Per-frame data visualization (use refs + GSAP quickTo)
- Anything inside the R3F `<Canvas>` tree

Motion re-renders its subtree on every animation frame via React state. Fine for a panel sliding in. Catastrophic for 60fps 3D.

---

## Rule 5: InstancedMesh for Repeated Objects

If your scene has more than ~100 identical objects (particles, neurons, data points), use `InstancedMesh`. One draw call instead of 100.

```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function NeuronField({ count = 500 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useRef(new THREE.Object3D());

  useFrame(() => {
    for (let i = 0; i < count; i++) {
      dummy.current.position.set(
        Math.sin(i * 0.1) * 5,
        Math.cos(i * 0.15) * 5,
        Math.sin(i * 0.2) * 5
      );
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial color="#4fc3f7" />
    </instancedMesh>
  );
}
```

---

## Rule 6: PostProcessing with a Kill Switch

Use `@react-three/postprocessing` EffectComposer. But measure performance, and disable effects if you're dropping frames.

```tsx
import { EffectComposer, Bloom, ChromaticAberration, Scanline } from '@react-three/postprocessing';

function Effects() {
  const enabled = useAnimationStore((s) => s.postProcessingEnabled);
  
  if (!enabled) return null;

  return (
    <EffectComposer>
      <Bloom intensity={0.5} luminanceThreshold={0.8} />
      <ChromaticAberration offset={[0.002, 0.002]} />
      <Scanline density={1.5} opacity={0.1} />
    </EffectComposer>
  );
}
```

**Auto-disable below 30fps:**
```tsx
useFrame((_, delta) => {
  const fps = 1 / delta;
  if (fps < 30 && frameCount > 60) { // wait 60 frames before measuring
    useAnimationStore.getState().setPostProcessingEnabled(false);
    console.warn('PostProcessing disabled — FPS dropped below 30');
  }
});
```

---

## Rule 7: Asset Loading

```tsx
import { useGLTF, Preload } from '@react-three/drei';
import { Suspense } from 'react';

// Preload critical models at module level
useGLTF.preload('/models/skull.glb');

function Scene() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <SkullModel />
      <Preload all /> {/* preloads everything in the scene graph */}
    </Suspense>
  );
}

function SkullModel() {
  const { scene } = useGLTF('/models/skull.glb');
  return <primitive object={scene} />;
}
```

Compress models before shipping. Run this once on any `.glb`:

```bash
npx gltf-transform optimize skull.glb skull-optimized.glb --compress draco
```

Draco compression typically cuts file size 60-80%.

---

## Rule 8: Bundle Size

Target: **< 300KB initial JavaScript** (gzipped).

```tsx
// Lazy load the entire R3F canvas
const Scene3D = lazy(() => import('./components/Scene3D'));

function App() {
  return (
    <Suspense fallback={<div className="loading">Loading 3D scene...</div>}>
      <Scene3D />
    </Suspense>
  );
}
```

The landing/upload screen doesn't need Three.js. Load it after the user submits their file. Perceived performance matters more than actual performance at a demo.

Check your bundle regularly:

```bash
npx vite-bundle-visualizer
```

If `three` is over 200KB gzipped, you're importing something wrong. Check for accidental full-library imports like `import * as THREE from 'three'` in files that only need a type.
