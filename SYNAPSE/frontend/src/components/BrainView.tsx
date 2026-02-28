import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

export default function BrainView() {
  return (
    <div className="w-full h-full bg-black relative">
       {/* UI Overlay Placeholder */}
      <div className="absolute top-4 left-4 z-10 text-xs font-mono text-dim tracking-wider uppercase">
        Network Topology // Status: Resting
      </div>

      <Canvas
        camera={{ position: [0, 0, 5], fov: 50, near: 0.1, far: 1000 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2, antialias: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        
        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          minDistance={1}
          maxDistance={20}
        />

        {/* Temporary Placeholder Mesh */}
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial 
            color="#00FFFF" 
            emissive="#00FFFF"
            emissiveIntensity={0.5} 
            wireframe
          />
        </mesh>

        <EffectComposer disableNormalPass>
          <Bloom 
            luminanceThreshold={1.0} 
            intensity={1.5} 
            mipmapBlur={true} 
            kernelSize={5}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
