import { useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ----------------------------------------------------------------------------
// CANVAS MINI MODEL
// ----------------------------------------------------------------------------
const MiniModel = ({ isFake = false }: { isFake?: boolean }) => {
  const { scene } = useGLTF('/models/facecap.glb');
  const clone = useMemo(() => scene.clone(), [scene]);
  const headMeshRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useEffect(() => {
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (mesh.name === 'mesh_2' || mesh.morphTargetDictionary) {
          headMeshRef.current = mesh;
        }
        if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = isFake ? 0.9 : 0.6;
          mat.color.set(isFake ? '#FF3366' : '#00FFFF');
          mat.emissive.set(isFake ? '#330011' : '#001122');
          mat.emissiveIntensity = 0.5;
          if (isFake) mat.wireframe = true;
        }
      }
    });
  }, [clone, isFake]);

  useFrame((_state, delta) => {
    time.current += delta;
    if (headMeshRef.current && headMeshRef.current.morphTargetInfluences && headMeshRef.current.morphTargetDictionary) {
      const idx = headMeshRef.current.morphTargetDictionary['jawOpen'];
      if (idx !== undefined) {
        if (isFake) {
          const t = time.current * 15;
          let val = Math.sin(t) * Math.sin(t * 2.3) * Math.sin(t * 1.7);
          val = Math.max(0, val * 3.5); 
          if (Math.random() > 0.95) val += Math.random() * 2;
          headMeshRef.current.morphTargetInfluences[idx] = val;
        } else {
          const t = time.current * 2;
          const val = ((Math.sin(t) + 1) / 2) * 0.3;
          headMeshRef.current.morphTargetInfluences[idx] = val;
        }
      }
    }
  });

  return (
    <primitive object={clone} scale={1.2} position={[0, -1.5, 0]} rotation={[0, -Math.PI / 8, 0]} />
  );
};

// ----------------------------------------------------------------------------
// RAW CANVAS VELOCITY GRAPH
// ----------------------------------------------------------------------------
const VelocityGraph = ({ isFake }: { isFake: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeInfo = useRef({ time: 0, history: [] as number[], lastPeak: 0 });
  const valueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let reqId: number;
    const maxDataPoints = 120;
    const maxY = 200;

    const render = () => {
      timeInfo.current.time += 0.05;
      
      let nextVal = 0;
      if (isFake) {
        nextVal = 30 + Math.random() * 60;
        if (Math.random() > 0.85) nextVal += 80 + Math.random() * 120; // spikes up to ~230
      } else {
        const t = timeInfo.current.time;
        nextVal = 10 + Math.sin(t) * 1.5 + Math.cos(t * 0.8) * 1.2 + Math.random() * 0.5;
      }

      const hist = timeInfo.current.history;
      hist.push(nextVal);
      if (hist.length > maxDataPoints) hist.shift();

      if (Math.random() > 0.9) {
        timeInfo.current.lastPeak = isFake ? Math.max(...hist.slice(-10)) : Math.max(...hist);
      }
      
      if (valueRef.current) {
        valueRef.current.innerText = `Peak: ${timeInfo.current.lastPeak.toFixed(1)} cm/s`;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;

      const thresholdY = height - (22 / maxY) * height;

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, thresholdY);
      ctx.lineTo(width, thresholdY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const x = (i / (maxDataPoints - 1)) * width;
        const mappedY = Math.min(maxY, hist[i]);
        const y = height - (mappedY / maxY) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = isFake ? '#FF3366' : '#00FFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fillStyle = isFake ? 'rgba(255, 51, 102, 0.15)' : 'rgba(0, 255, 255, 0.15)';
      ctx.fill();

      // Flashing text logic for fake peak
      if (isFake && valueRef.current) {
         if (nextVal > 150) {
            valueRef.current.className = `text-2xl font-bold font-mono text-glow-warn animate-flicker text-[#FF3366] whitespace-nowrap`;
         } else {
            valueRef.current.className = `text-2xl font-bold font-mono text-glow-warn text-[#FF3366] whitespace-nowrap`;
         }
      }

      reqId = requestAnimationFrame(render);
    };

    reqId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(reqId);
  }, [isFake]);

  return (
    <div className="flex flex-col relative pt-4">
      <div className="absolute top-0 right-2 z-10 flex justify-end min-w-[200px]">
         <div ref={valueRef} className={`text-2xl font-bold font-mono whitespace-nowrap ${isFake ? 'text-glow-warn text-[#FF3366]' : 'text-glow-cyan text-[#00FFFF]'}`}>
           Peak: 0.0 cm/s
         </div>
      </div>
      <canvas ref={canvasRef} width={600} height={160} className="w-full h-[160px] opacity-90" />
    </div>
  );
};

// ----------------------------------------------------------------------------
// MAIN LAYOUT
// ----------------------------------------------------------------------------
export const CompareView = () => {
  return (
    <div className="fixed inset-0 z-50 bg-[#050510] flex flex-col justify-center items-center overflow-hidden p-8 backdrop-blur-md">
      
      <div className="grid grid-cols-11 w-full max-w-[1400px] h-[80vh] border-glow hud-panel">
        
        {/* LEFT SIDE: REAL */}
        <div className="col-span-5 flex flex-col h-full bg-black/40 relative border-r border-[#00ffff]/20">
          <div className="p-6 border-b border-[#00ffff]/20 flex justify-between items-center bg-gradient-to-r from-[#00ffff]/10 to-transparent">
            <h2 className="text-3xl font-black tracking-widest text-[#00FFFF] text-glow-cyan">HUMAN</h2>
            <div className="px-4 py-1 rounded bg-[#00FF88]/20 border border-[#00FF88]/40 text-[#00FF88] text-glow-genuine font-bold tracking-wide">
              GENUINE
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
              <Suspense fallback={null}>
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} color="#00ffff" />
                <MiniModel isFake={false} />
              </Suspense>
            </Canvas>
          </div>
          
          <div className="h-[160px] border-t border-[#00ffff]/20 bg-black/60 relative">
            <VelocityGraph isFake={false} />
          </div>
        </div>

        {/* CENTER DIVIDER */}
        <div className="col-span-1 flex flex-col items-center justify-center relative bg-black/80 z-10">
          <div className="absolute inset-y-0 w-[1px] bg-gradient-to-b from-[#00ffff]/0 via-[#00ffff]/50 to-[#ff3366]/50"></div>
          <div className="bg-[#050510] border border-[#00ffff]/30 rounded-full w-12 h-12 flex items-center justify-center relative z-20 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
            <span className="font-bold text-white opacity-80">VS</span>
          </div>
        </div>

        {/* RIGHT SIDE: FAKE */}
        <div className="col-span-5 flex flex-col h-full bg-black/40 relative border-l border-[#ff3366]/20">
          <div className="p-6 border-b border-[#ff3366]/20 flex justify-between items-center bg-gradient-to-l from-[#ff3366]/10 to-transparent">
            <div className="px-4 py-1 rounded bg-[#FF3366]/20 border border-[#FF3366]/40 text-[#FF3366] text-glow-warn font-bold tracking-wide animate-pulse-glow glitch-text" data-text="DEEPFAKE">
              DEEPFAKE
            </div>
            <h2 className="text-3xl font-black tracking-widest text-[#FF3366] text-glow-warn" data-text="AI GENERATED">AI GENERATED</h2>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
              <Suspense fallback={null}>
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <directionalLight position={[-10, -10, -5]} intensity={2} color="#ff3366" />
                <directionalLight position={[10, 10, 5]} intensity={1} color="#ff0000" />
                <MiniModel isFake={true} />
              </Suspense>
            </Canvas>
            
            {/* SPORADIC FLASH OVERLAY */}
            <div className="absolute inset-0 pointer-events-none bg-[#ff3366]/5 animate-flicker mix-blend-screen"></div>
          </div>
          
          <div className="h-[160px] border-t border-[#ff3366]/20 bg-black/60 relative">
            <VelocityGraph isFake={true} />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4 text-white/60 font-mono text-sm tracking-widest">
          <div className="w-8 h-[1px] border-b border-dashed border-white/40"></div>
          <span>HUMAN TONGUE MAX: 22 CM/S</span>
          <div className="w-8 h-[1px] border-b border-dashed border-white/40"></div>
        </div>
        <div className="text-xl font-bold tracking-[0.2em] opacity-80 mt-2">
          THE PHYSICS DON'T LIE.
        </div>
      </div>

    </div>
  );
};

useGLTF.preload('/models/facecap.glb');