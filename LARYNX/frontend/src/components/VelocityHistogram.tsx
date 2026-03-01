import { useEffect, useRef } from 'react';
import useLarynxStore from '@/store/useLarynxStore';

const BINS = [
  { label: 'SAFE', min: 0, max: 22, color: '#22c55e' },
  { label: 'ELEV', min: 22, max: 50, color: '#EAB308' },
  { label: 'HIGH', min: 50, max: 80, color: '#F97316' },
  { label: 'EXTR', min: 80, max: Infinity, color: '#EF4444' },
];

export function VelocityHistogram() {
  const barsRef = useRef<Array<HTMLDivElement | null>>([]);
  const countsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const pctRef = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    let animationFrameId: number;

    const updateHistogram = () => {
      const state = useLarynxStore.getState();
      const frames = state.frames;
      
      if (!frames || frames.length === 0) {
        animationFrameId = requestAnimationFrame(updateHistogram);
        return;
      }

      const total = frames.length;
      const counts = [0, 0, 0, 0];

      // Bin the velocities
      for (let i = 0; i < total; i++) {
        const vel = frames[i].tongueVelocity;
        if (vel < BINS[1].min) counts[0]++;
        else if (vel < BINS[2].min) counts[1]++;
        else if (vel < BINS[3].min) counts[2]++;
        else counts[3]++;
      }

      // Update DOM
      for (let i = 0; i < 4; i++) {
        const count = counts[i];
        const pct = (count / total) * 100;
        
        if (barsRef.current[i]) {
          barsRef.current[i]!.style.width = `${pct}%`;
        }
        if (countsRef.current[i]) {
          countsRef.current[i]!.textContent = count.toString();
        }
        if (pctRef.current[i]) {
          pctRef.current[i]!.textContent = `${pct.toFixed(1)}%`;
        }
      }

      animationFrameId = requestAnimationFrame(updateHistogram);
    };

    updateHistogram();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xl bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-lg z-10 pointer-events-none">
      <div className="flex justify-between items-end mb-3">
        <h3 className="text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase">Velocity Distribution (cm/s)</h3>
        <span className="text-[10px] font-mono text-white/30">TONGUE TIP (T1)</span>
      </div>
      
      <div className="flex flex-col gap-2">
        {BINS.map((bin, i) => (
          <div key={bin.label} className="flex items-center gap-3 text-xs font-mono">
            <div className="w-12 text-right opacity-70" style={{ color: bin.color }}>
              {bin.label}
            </div>
            <div className="w-16 text-white/40 text-right">
               {bin.min === 80 ? '80+' : `${bin.min}-${bin.max}`}
            </div>
            
            <div className="flex-1 h-3 bg-white/5 rounded-sm overflow-hidden relative">
              <div 
                ref={el => barsRef.current[i] = el}
                className="absolute inset-y-0 left-0 transition-all duration-200 ease-out"
                style={{ backgroundColor: bin.color, width: '0%' }}
              />
            </div>
            
            <div className="w-24 flex justify-between text-white/70">
              <span ref={el => countsRef.current[i] = el}>0</span>
              <span ref={el => pctRef.current[i] = el} className="opacity-50">0.0%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
