import { Suspense, useRef } from 'react';
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

function GridFloor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -2.5, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial color="#00FFFF" opacity={0.015} transparent wireframe />
    </mesh>
  );
}

function AnimatedSpotLight() {
  const lightRef = useRef<THREE.SpotLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.position.x = 3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
      lightRef.current.position.z = 5 + Math.cos(state.clock.elapsedTime * 0.3) * 0.5;
    }
  });

  return (
    <spotLight
      ref={lightRef}
      position={[3, 4, 5]}
      color="#00FFFF"
      intensity={2}
      angle={0.4}
      penumbra={0.5}
      castShadow
    />
  );
}

export function AnalysisView() {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Suspense fallback={<ScannerLoader />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}> {/* Loader is outside Canvas */}
            <fog attach="fog" args={['#000000', 8, 25]} />
            
            {/* Lighting */}
            <ambientLight intensity={0.08} />
            <AnimatedSpotLight />
            <pointLight position={[-4, 0, 3]} intensity={0.5} color="#1a1a4a" /> {/* fill */}
            <pointLight position={[0, 2, -4]} intensity={0.3} color="#FF3366" /> {/* rim */}
            
            {/* Environment Upgrades */}
            <Sparkles count={200} scale={8} size={1.5} speed={0.2} opacity={0.4} color="#00FFFF" />
            <ContactShadows position={[0, -2.5, 0]} opacity={0.2} scale={10} blur={2} far={4} color="#00FFFF" />
            
            {/* Scene */}
            <Float speed={0.8} rotationIntensity={0.02} floatIntensity={0.05}>
              <HeadModel />
            </Float>
            <TongueModel />
            <EMAMarkers />
<VelocityRibbons />
            <ParticleField />
            <SkullClipEffect />
            <GridFloor />
            
            {/* Effects */}
            <PostProcessingEffects />
            <CameraController />
            <OrbitControls enablePan={false} enableZoom={true} minDistance={2} maxDistance={10} />
            <Environment preset="night" />
          </Suspense>
        </Canvas>
      </Suspense>
    </div>
  );
}
