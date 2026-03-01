import { useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { COLORS, SCENE, CAMERA, THRESHOLDS } from '@/constants';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { configureKTX2ForGLTFLoader } from '@/utils/ktx2Setup';
import { useLarynxStore } from '@/store/useLarynxStore';
import type { EMAFrame } from '@/types/larynx';
// ----------------------------------------------------------------------------
// CANVAS MINI MODEL
// ----------------------------------------------------------------------------
const MiniModel = ({ isFake = false }: { isFake?: boolean }) => {
  const { gl } = useThree();
  const { scene } = useGLTF(
    '/models/facecap.glb',
    false,
    true,
    (loader) => {
      configureKTX2ForGLTFLoader(loader, gl);
    }
  );
  const clone = useMemo(() => scene.clone(), [scene]);
  const headMeshRef = useRef<THREE.Mesh | null>(null);
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
          mat.color.set(isFake ? COLORS.VIOLATION : COLORS.CYAN);
          mat.emissive.set(isFake ? COLORS.VIOLATION : COLORS.CYAN);
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
    <primitive object={clone} scale={SCENE.COMPARE_MODEL_SCALE} position={[0, SCENE.COMPARE_MODEL_Y, 0]} rotation={[0, -Math.PI / 8, 0]} />
  );
};

// ----------------------------------------------------------------------------
// RAW CANVAS VELOCITY GRAPH
// ----------------------------------------------------------------------------
const VelocityGraph = ({ isFake, frames }: { isFake: boolean; frames?: EMAFrame[] }) => {
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
      // Use real frame data if available, otherwise simulate
      if (frames && frames.length > 0) {
        const frameIdx = Math.floor(timeInfo.current.time * 20) % frames.length;
        nextVal = frames[frameIdx]?.tongueVelocity ?? 0;
      } else if (isFake) {
        nextVal = 30 + Math.random() * 60;
        if (Math.random() > 0.85) nextVal += 80 + Math.random() * 120;
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

      const thresholdY = height - (THRESHOLDS.COMPARE_LINE / maxY) * height;

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

      ctx.strokeStyle = isFake ? COLORS.VIOLATION : COLORS.CYAN;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fillStyle = isFake ? 'rgba(255, 0, 60, 0.15)' : 'rgba(56, 189, 248, 0.15)';
      ctx.fill();
      // Flashing text logic for fake peak
      if (isFake && valueRef.current) {
         if (nextVal > 150) {
            valueRef.current.className = `text-2xl font-bold font-mono text-glow-warn animate-flicker text-violation whitespace-nowrap`;
         } else {
            valueRef.current.className = `text-2xl font-bold font-mono text-glow-warn text-violation whitespace-nowrap`;
         }
      }

      reqId = requestAnimationFrame(render);
    };

    reqId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(reqId);
  }, [isFake, frames]);

  return (
    <div className="flex flex-col relative pt-4">
      <div className="absolute top-0 right-2 z-10 flex justify-end min-w-[200px]">
         <div ref={valueRef} className={`text-2xl font-bold font-mono whitespace-nowrap ${isFake ? 'text-glow-warn text-violation' : 'text-glow-cyan text-cyan'}`}>
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
  const comparison = useLarynxStore((s) => s.comparison);
  const status = useLarynxStore((s) => s.status);
  const progress = useLarynxStore((s) => s.progress);

  const hasRealData = comparison.channelFrames[0].length > 0 || comparison.channelFrames[1].length > 0;
  const verdictA = comparison.channelVerdicts[0];
  const verdictB = comparison.channelVerdicts[1];

  const labelA = verdictA ? (verdictA.isGenuine ? 'GENUINE' : 'DEEPFAKE') : 'HUMAN';
  const labelB = verdictB ? (verdictB.isGenuine ? 'GENUINE' : 'DEEPFAKE') : 'AI GENERATED';
  const isFakeA = verdictA ? !verdictA.isGenuine : false;
  const isFakeB = verdictB ? !verdictB.isGenuine : true;

  return (
    <div className="fixed inset-0 z-50 bg-[#050510] flex flex-col justify-center items-center overflow-hidden p-8 backdrop-blur-md">

      {/* Progress bar when comparing */}
      {status === 'comparing' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
          <div className="text-white/60 font-mono text-sm tracking-widest">{progress.message}</div>
          <div className="w-64 h-1 bg-white/10 rounded-sm overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan to-violation transition-all duration-300" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-11 w-full max-w-[1400px] h-[80vh] border-glow hud-panel">

        {/* LEFT SIDE: FILE A */}
        <div className="col-span-5 flex flex-col h-full bg-black/40 relative border-r border-cyan/20">
          <div className="p-6 border-b border-cyan/20 flex justify-between items-center bg-gradient-to-r from-cyan/10 to-transparent">
            <h2 className={`text-3xl font-black tracking-widest ${isFakeA ? 'text-violation text-glow-warn' : 'text-cyan text-glow-cyan'}`}>
              {hasRealData ? 'FILE A' : 'HUMAN'}
            </h2>
            <div className={`px-4 py-1 rounded border font-bold tracking-wide ${
              isFakeA
                ? 'bg-violation/20 border-violation/40 text-violation text-glow-warn animate-pulse-glow'
                : 'bg-genuine/20 border-genuine/40 text-genuine text-glow-genuine'
            }`}>
              {labelA}
              {verdictA && <span className="ml-2 text-xs opacity-70">({(verdictA.confidence * 100).toFixed(0)}%)</span>}
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <Canvas camera={{ position: CAMERA.COMPARE_POSITION, fov: 45 }}
              onCreated={({ gl }) => {
                const canvas = gl.domElement;
                canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
                canvas.addEventListener('webglcontextrestored', () => {});
              }}
            >
              <Suspense fallback={null}>
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} color={isFakeA ? COLORS.VIOLATION : COLORS.CYAN} />
                <MiniModel isFake={isFakeA} />
              </Suspense>
            </Canvas>
          </div>

          <div className="h-[160px] border-t border-cyan/20 bg-black/60 relative">
            <VelocityGraph isFake={isFakeA} frames={hasRealData ? comparison.channelFrames[0] : undefined} />
          </div>
        </div>

        {/* CENTER DIVIDER */}
        <div className="col-span-1 flex flex-col items-center justify-center relative bg-black/80 z-10">
          <div className="absolute inset-y-0 w-[1px] bg-gradient-to-b from-cyan/0 via-cyan/50 to-violation/50"></div>
          <div className="bg-[#050510] border border-cyan/30 rounded-sm w-12 h-12 flex items-center justify-center relative z-20 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            <span className="font-bold text-white opacity-80">VS</span>
          </div>
        </div>

        {/* RIGHT SIDE: FILE B */}
        <div className="col-span-5 flex flex-col h-full bg-black/40 relative border-l border-violation/20">
          <div className="p-6 border-b border-violation/20 flex justify-between items-center bg-gradient-to-l from-violation/10 to-transparent">
            <div className={`px-4 py-1 rounded border font-bold tracking-wide ${
              isFakeB
                ? 'bg-violation/20 border-violation/40 text-violation text-glow-warn animate-pulse-glow glitch-text'
                : 'bg-genuine/20 border-genuine/40 text-genuine text-glow-genuine'
            }`}>
              {labelB}
              {verdictB && <span className="ml-2 text-xs opacity-70">({(verdictB.confidence * 100).toFixed(0)}%)</span>}
            </div>
            <h2 className={`text-3xl font-black tracking-widest ${isFakeB ? 'text-violation text-glow-warn' : 'text-cyan text-glow-cyan'}`}>
              {hasRealData ? 'FILE B' : 'AI GENERATED'}
            </h2>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <Canvas camera={{ position: CAMERA.COMPARE_POSITION, fov: 45 }}
              onCreated={({ gl }) => {
                const canvas = gl.domElement;
                canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
                canvas.addEventListener('webglcontextrestored', () => {});
              }}
            >
              <Suspense fallback={null}>
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <directionalLight position={[-10, -10, -5]} intensity={2} color={COLORS.VIOLATION} />
                <directionalLight position={[10, 10, 5]} intensity={1} color={isFakeB ? COLORS.VIOLATION : COLORS.CYAN} />
                <MiniModel isFake={isFakeB} />
              </Suspense>
            </Canvas>

            {/* SPORADIC FLASH OVERLAY for fake */}
            {isFakeB && (
              <div className="absolute inset-0 pointer-events-none bg-violation/5 animate-flicker mix-blend-screen"></div>
            )}
          </div>

          <div className="h-[160px] border-t border-violation/20 bg-black/60 relative">
            <VelocityGraph isFake={isFakeB} frames={hasRealData ? comparison.channelFrames[1] : undefined} />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        {comparison.comparisonSummary ? (
          <div className="text-lg font-mono text-white/80 max-w-2xl text-center">{comparison.comparisonSummary}</div>
        ) : (
          <>
            <div className="flex items-center gap-4 text-white/60 font-mono text-sm tracking-widest">
              <div className="w-8 h-[1px] border-b border-dashed border-white/40"></div>
              <span>HUMAN TONGUE MAX: 22 CM/S</span>
              <div className="w-8 h-[1px] border-b border-dashed border-white/40"></div>
            </div>
            <div className="text-xl font-bold tracking-[0.2em] opacity-80 mt-2">
              THE PHYSICS DON'T LIE.
            </div>
          </>
        )}
        <div className="flex gap-4 mt-4">
          <button
            className="px-6 py-2 border border-cyan/30 bg-black/40 text-cyan font-mono text-sm tracking-widest hover:bg-cyan/10 transition-colors"
            onClick={() => useLarynxStore.getState().setStatus('complete')}
          >
            ← BACK TO VERDICT
          </button>
          <button
            className="px-6 py-2 border border-cyan/30 bg-black/40 text-white/70 font-mono text-sm tracking-widest hover:bg-cyan/10 transition-colors"
            onClick={() => useLarynxStore.getState().setStatus('idle')}
          >
            NEW ANALYSIS
          </button>
        </div>
      </div>

    </div>
  );
};
