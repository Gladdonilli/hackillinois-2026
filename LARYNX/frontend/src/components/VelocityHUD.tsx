import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useLarynxStore } from '@/store/useLarynxStore';
import { VELOCITY_THRESHOLDS } from '@/types/larynx';
import { cn } from '@/lib/utils';

interface SensorData {
  label: string;
  velocity: number | null;
  threshold: number;
}

export function VelocityHUD() {
  const frames = useLarynxStore((state) => state.frames);
  const currentFrame = useLarynxStore((state) => state.currentFrame);
  const [sensors, setSensors] = useState<SensorData[]>([
    { label: 'T1', velocity: null, threshold: 20 },
    { label: 'T2', velocity: null, threshold: 20 },
    { label: 'T3', velocity: null, threshold: 20 },
    { label: 'JAW', velocity: null, threshold: 15 },
    { label: 'UL', velocity: null, threshold: 10 },
    { label: 'LL', velocity: null, threshold: 10 },
  ]);

  const panelRef = useRef<HTMLDivElement>(null);
  const flashData = useRef({ isFlashing: false, timeoutId: 0 as any, lastColor: '' });
  const wasBreaching = useRef(false);

  useEffect(() => {
    const thresholds = VELOCITY_THRESHOLDS as Record<string, number> | undefined;
    const tTongue = thresholds?.tongue || thresholds?.TONGUE || 20;
    const tJaw = thresholds?.jaw || thresholds?.JAW || 15;
    const tLip = thresholds?.lip || thresholds?.LIP || thresholds?.ul || 10;

    if (!frames || frames.length === 0 || currentFrame < 0 || currentFrame >= frames.length) {
      setSensors(prev => prev.map(p => ({ 
        ...p, 
        threshold: p.label.startsWith('T') ? tTongue : p.label === 'JAW' ? tJaw : tLip 
      })));
      return;
    }

    const frame = frames[currentFrame];
    const prevFrame = currentFrame > 0 ? frames[currentFrame - 1] : frame;

    const getSensorVelocity = (sensorName: string): number | null => {
      const sensor = frame.sensors[sensorName as keyof typeof frame.sensors];
      if (sensor && typeof sensor.velocity === 'number') return sensor.velocity;
      // Fallback: compute from position delta
      const prev = prevFrame.sensors[sensorName as keyof typeof prevFrame.sensors];
      if (!sensor || !prev) return null;
      const dx = sensor.x - prev.x;
      const dy = sensor.y - prev.y;
      return Math.sqrt(dx * dx + dy * dy) * 30; // ~cm/s at 30fps
    };

    const newSensors = [
      { label: 'T1', velocity: getSensorVelocity('T1'), threshold: tTongue },
      { label: 'T2', velocity: getSensorVelocity('T2'), threshold: tTongue },
      { label: 'T3', velocity: getSensorVelocity('T3'), threshold: tTongue },
      { label: 'JAW', velocity: getSensorVelocity('JAW'), threshold: tJaw },
      { label: 'UL', velocity: getSensorVelocity('UL'), threshold: tLip },
      { label: 'LL', velocity: getSensorVelocity('LL'), threshold: tLip },
    ];

    setSensors(newSensors);

    // Threshold breach flash
    const hasBreach = newSensors.some(s => s.velocity !== null && s.velocity > s.threshold);
    if (hasBreach && !wasBreaching.current) {
      if (panelRef.current && !flashData.current.isFlashing) {
        flashData.current.isFlashing = true;
        panelRef.current.style.setProperty('border-color', 'rgba(255, 51, 102, 0.8)', 'important');
        panelRef.current.classList.add('bg-warn/10', 'border-warn/50');
        
        clearTimeout(flashData.current.timeoutId);
        flashData.current.timeoutId = setTimeout(() => {
          if (panelRef.current) {
            panelRef.current.style.removeProperty('border-color');
            panelRef.current.classList.remove('bg-warn/10', 'border-warn/50');
            panelRef.current.style.borderColor = flashData.current.lastColor;
          }
          flashData.current.isFlashing = false;
        }, 300);
      }
    }
    wasBreaching.current = hasBreach;
  }, [frames, currentFrame]);

  // Reactive border color
  const maxTongueVel = Math.max(0, ...(sensors.slice(0, 3).map(s => s.velocity || 0)));
  const interp = Math.min(maxTongueVel / 80, 1.0);
  const r = Math.round(0 + (255 - 0) * interp);
  const g = Math.round(255 + (51 - 255) * interp);
  const b = Math.round(255 + (102 - 255) * interp);
  const reactiveBorderColor = `rgba(${r}, ${g}, ${b}, 0.35)`;

  useEffect(() => {
    flashData.current.lastColor = reactiveBorderColor;
    if (panelRef.current && !flashData.current.isFlashing) {
      panelRef.current.style.borderColor = reactiveBorderColor;
    }
  }, [reactiveBorderColor]);

  return (
    <motion.div
      ref={panelRef as any}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="fixed top-4 right-4 w-72 z-50 hud-panel p-4 text-[#EDEDED] transition-colors duration-200 border"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow" />
        <div className="text-[10px] tracking-[0.3em] uppercase text-[#666] font-mono animate-flicker">VELOCITY ANALYSIS</div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Tongue Group */}
        <div className="flex flex-col gap-2">
            <div className="text-[8px] text-[#333] tracking-[0.3em] uppercase mb-1">TONGUE</div>
            {sensors.slice(0, 3).map((s) => (
                <SensorRow key={s.label} s={s} />
            ))}
        </div>

        {/* Articulators Group */}
        <div className="flex flex-col gap-2">
            <div className="text-[8px] text-[#333] tracking-[0.3em] uppercase mb-1">ARTICULATORS</div>
            {sensors.slice(3, 6).map((s) => (
                <SensorRow key={s.label} s={s} />
            ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#1F1F1F]">
        <div className="flex items-center justify-between text-[8px] font-mono text-[#444] tracking-wider uppercase">
          <span className="animate-pulse-glow flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" /> LIVE
          </span>
          <span>FRAME {currentFrame}/{frames?.length || 0}</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
      </div>
    </motion.div>
  );
}

function SensorRow({ s }: { s: SensorData }) {
    const valRef = useRef<HTMLSpanElement>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const rowRef = useRef<HTMLDivElement>(null);
    
    // Store latest target values in a ref to decouple lerp from render
    const targets = useRef({ targetVel: s.velocity || 0, thresh: s.threshold });
    useEffect(() => {
        targets.current = { targetVel: s.velocity || 0, thresh: s.threshold };
    }, [s.velocity, s.threshold]);

    const displayValues = useRef({ vel: s.velocity || 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            const trg = targets.current.targetVel;
            const cur = displayValues.current.vel;
            const thresh = targets.current.thresh;
            
            // Lerp
            const next = cur + (trg - cur) * 0.2;
            displayValues.current.vel = next;
            
            const isOver = next > thresh;
            const pct = Math.min(next / (thresh * 2), 1) * 100;

            if (valRef.current) {
                valRef.current.textContent = next.toFixed(1);
                // Class toggling
                if (isOver) {
                    valRef.current.classList.add('text-warn', 'text-glow-warn', 'animate-flicker');
                    valRef.current.classList.remove('text-cyan');
                } else {
                    valRef.current.classList.remove('text-warn', 'text-glow-warn', 'animate-flicker');
                    valRef.current.classList.add('text-cyan');
                }
            }

            if (barRef.current) {
                barRef.current.style.width = `${pct}%`;
                if (isOver) {
                    barRef.current.classList.add('gauge-fill-warn');
                    barRef.current.classList.remove('gauge-fill');
                } else {
                    barRef.current.classList.remove('gauge-fill-warn');
                    barRef.current.classList.add('gauge-fill');
                }
            }

            if (rowRef.current) {
                if (isOver) {
                    rowRef.current.classList.add('bg-warn/5');
                } else {
                    rowRef.current.classList.remove('bg-warn/5');
                }
            }
        }, 50);

        return () => clearInterval(interval);
    }, []);

    const initValStr = s.velocity !== null ? s.velocity.toFixed(1) : '0.0';
    const initPct = s.velocity !== null ? Math.min(s.velocity / (s.threshold * 2), 1) * 100 : 0;
    const initOver = s.velocity !== null && s.velocity > s.threshold;

    return (
        <div ref={rowRef} className={cn("flex flex-col gap-1 p-1 -mx-1 rounded transition-colors hud-sweep relative overflow-hidden", initOver && "bg-warn/5")}>
        <div className="flex justify-between items-end relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">{s.label}</span>
            <span className="text-sm font-mono tabular-nums leading-none">
            <span ref={valRef} className={cn("transition-colors", initOver ? "text-warn text-glow-warn animate-flicker" : "text-cyan")}>
                {initValStr}
            </span> 
            <span className="text-[9px] text-[#444] ml-0.5">cm/s</span>
            </span>
        </div>
        <div className="gauge-track relative w-full h-1 mt-0.5 bg-[#1a1a1a]">
            {s.velocity !== null && (
            <div
                ref={barRef}
                className={cn("absolute top-0 left-0 h-full transition-all duration-75", initOver ? "gauge-fill-warn" : "gauge-fill")}
                style={{ width: `${initPct}%` }}
            />
            )}
            {/* Threshold marker */}
            <div className="absolute top-0 bottom-0 w-px bg-[#444] z-10" style={{ left: '50%' }} />
        </div>
        </div>
    );
}
