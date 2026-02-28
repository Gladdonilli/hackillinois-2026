import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sparkles, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

import { HeadModel } from '@/components/HeadModel';
import { TongueModel } from '@/components/TongueModel';
import { EMAMarkers } from '@/components/EMAMarkers';
import { VelocityRibbons } from '@/components/VelocityRibbons';
import { PostProcessingEffects } from '@/components/PostProcessingEffects';
import { CameraController } from '@/components/CameraController';
import { ParticleField } from '@/components/ParticleField';
import { SkullClipEffect } from '@/components/SkullClipEffect';
import { CAMERA } from '@/constants';
function ScannerLoader() {
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-black">
      {/* Pulsing ring */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border border-cyan/30 animate-ping" />
        <div className="absolute inset-2 rounded-full border border-cyan/50 animate-pulse" />
        <div className="absolute inset-4 rounded-full border border-cyan animate-breathe" />
      </div>
      {/* Text */}
      <p className="mt-6 text-[10px] font-mono tracking-[0.4em] uppercase text-cyan/60 animate-pulse-glow">
        Initializing Scanner
      </p>
      {/* Progress dots */}
      <div className="flex gap-1 mt-2">
        <div className="w-1 h-1 rounded-full bg-cyan animate-pulse" style={{ animationDelay: '0s' }} />
        <div className="w-1 h-1 rounded-full bg-cyan animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-1 h-1 rounded-full bg-cyan animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

function MeasurementGrid() {
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = state.clock.elapsedTime * 0.1;
    const scale = 1.0 + Math.sin(state.clock.elapsedTime * Math.PI) * 0.01;
    ringRef.current.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <ringGeometry args={[0.5, 3, 64, 1]} />
      <meshBasicMaterial wireframe color="#38BDF8" transparent opacity={0.08} />
    </mesh>
  );
}

function DataParticles() {
  const count = 50;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8 - 2,
      z: (Math.random() - 0.5) * 8,
      speed: 0.1 + Math.random() * 0.2,
    }));
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      p.y += p.speed * delta;
      if (p.y > 4) p.y = -4;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(state.clock.elapsedTime * p.speed, state.clock.elapsedTime * p.speed * 0.5, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[0.01, 0.02]} />
      <meshBasicMaterial color="#38BDF8" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

function LightCone() {
  return (
    <mesh position={[3, 5, 2]} rotation={[Math.PI / 4, 0, -Math.PI / 6]}>
      <coneGeometry args={[2, 8, 32, 1, true]} />
      <meshBasicMaterial transparent opacity={0.03} color="#38BDF8" side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

export function AnalysisView() {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Suspense fallback={<ScannerLoader />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: CAMERA.DEFAULT_FOV, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent' }}
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); console.warn('[LARYNX] WebGL context lost (AnalysisView)'); });
            canvas.addEventListener('webglcontextrestored', () => { console.warn('[LARYNX] WebGL context restored (AnalysisView)'); });
          }}
        >
          <Suspense fallback={null}> {/* Loader is outside Canvas */}
            <fogExp2 attach="fog" args={['#050510', 0.15]} />
            
            {/* Lighting */}
            <ambientLight intensity={0.08} />
            <spotLight position={[3, 5, 2]} color="#38BDF8" intensity={3} angle={0.4} penumbra={0.5} castShadow />
            <LightCone />
            <pointLight position={[-3, 1, 2]} intensity={0.5} color="#1a1a4a" />
            <pointLight position={[2, 0, -3]} intensity={0.8} color="#FF003C" />
            
            {/* Environment Upgrades */}
            <Sparkles count={200} scale={8} size={1.5} speed={0.2} opacity={0.4} color="#38BDF8" />
            <ContactShadows position={[0, -2.5, 0]} opacity={0.2} scale={10} blur={2} far={4} color="#38BDF8" />
            
            {/* Scene */}
            <Float speed={0.8} rotationIntensity={0.02} floatIntensity={0.05}>
              <HeadModel />
            </Float>
            <TongueModel />
            <EMAMarkers />
            <VelocityRibbons />
            <ParticleField />
            <SkullClipEffect />
            <MeasurementGrid />
            <DataParticles />
            
            {/* Effects */}
            <PostProcessingEffects />
            <CameraController />
            <OrbitControls enablePan={false} enableZoom={true} minDistance={2} maxDistance={10} />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </Suspense>
    </div>
  );
}
