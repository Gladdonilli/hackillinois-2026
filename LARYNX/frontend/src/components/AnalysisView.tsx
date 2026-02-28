import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

import { HeadModel } from '@/components/HeadModel';
import { TongueModel } from '@/components/TongueModel';
import { EMAMarkers } from '@/components/EMAMarkers';
import { PostProcessingEffects } from '@/components/PostProcessingEffects';
import { CameraController } from '@/components/CameraController';

function Loader() {
  return (
    <Html center>
      <div style={{ color: '#00FFFF', fontFamily: 'monospace', fontSize: '14px', letterSpacing: '0.1em' }}>
        SCANNING...
      </div>
    </Html>
  );
}

export function AnalysisView() {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        <Suspense fallback={<Loader />}>
          <fogExp2 attach="fog" args={['#000000', 0.15]} />

          {/* Lighting Setup */}
          <ambientLight intensity={0.15} />
          <pointLight position={[5, 5, 5]} intensity={0.8} color="#00FFFF" />
          <pointLight position={[-3, -2, 4]} intensity={0.4} color="#FF3366" />
          
          <Environment preset="night" />

          {/* Scene Contents */}
          <HeadModel />
          <TongueModel />
          <EMAMarkers />

          {/* Global Systems */}
          <PostProcessingEffects />
          <CameraController />
          
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={2} 
            maxDistance={10} 
            autoRotate={false} 
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
