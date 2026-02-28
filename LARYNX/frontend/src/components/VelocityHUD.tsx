import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useLarynxStore } from '@/store/useLarynxStore';
import { VELOCITY_THRESHOLDS } from '@/types/larynx';
import { cn } from '@/lib/utils';
import { useUIEarcons } from '@/hooks/useUIEarcons';

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
  const flashData = useRef<{ isFlashing: boolean; timeoutId: ReturnType<typeof setTimeout> | null; lastColor: string }>({ isFlashing: false, timeoutId: null, lastColor: '' });
  const wasBreaching = useRef(false);
  const headerTextRef = useRef<HTMLDivElement>(null);
  const maxVelRef = useRef<HTMLDivElement>(null);
  const maxTargets = useRef({ vel: 0 });
  const maxDisplay = useRef({ vel: 0 });

  useEffect(() => {
    maxTargets.current.vel = Math.max(0, ...sensors.map(s => s.velocity || 0));
  }, [sensors]);

  useEffect(() => {
    const interval = setInterval(() => {
      const trg = maxTargets.current.vel;
      const cur = maxDisplay.current.vel;
      const next = cur + (trg - cur) * 0.2;
      maxDisplay.current.vel = next;
      
      const isDanger = next > 80;
      
      if (maxVelRef.current) {
        maxVelRef.current.textContent = `MAX: ${next.toFixed(1)} cm/s`;
        maxVelRef.current.className = cn(
          "text-[24px] font-mono tracking-tighter transition-colors",
          next < 22 ? "text-cyan text-glow-cyan" :
          next < 50 ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" :
          next <= 80 ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" :
          "text-warn text-glow-warn animate-flicker"
        );
      }

      if (panelRef.current) {
        if (isDanger) {
          panelRef.current.classList.add('danger-mode-panel');
          panelRef.current.style.backgroundColor = 'rgba(220, 38, 38, 0.15)';
        } else {
          panelRef.current.classList.remove('danger-mode-panel');
          panelRef.current.style.backgroundColor = '';
        }
      }

      if (headerTextRef.current) {
        if (isDanger) {
          headerTextRef.current.classList.add('glitch-text', 'text-warn');
          headerTextRef.current.classList.remove('text-dim');
        } else {
          headerTextRef.current.classList.remove('glitch-text', 'text-warn');
          headerTextRef.current.classList.add('text-dim');
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

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
        panelRef.current.style.setProperty('border-color', 'rgba(220, 38, 38, 0.8)', 'important');
        panelRef.current.classList.add('bg-warn/10', 'border-warn/50');
        
        if (flashData.current.timeoutId !== null) {
          clearTimeout(flashData.current.timeoutId);
        }
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
  const r = Math.round(56 + (220 - 56) * interp);
  const g = Math.round(189 + (38 - 189) * interp);
  const b = Math.round(248 + (38 - 248) * interp);
  const reactiveBorderColor = `rgba(${r}, ${g}, ${b}, 0.35)`;

  useEffect(() => {
    flashData.current.lastColor = reactiveBorderColor;
    if (panelRef.current && !flashData.current.isFlashing && !panelRef.current.classList.contains('danger-mode-panel')) {
      panelRef.current.style.borderColor = reactiveBorderColor;
    }
  }, [reactiveBorderColor]);

  return (
    <>
      <style>{`
        @keyframes pulse-sensor {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .animate-pulse-fast {
          animation: pulse-sensor 0.25s ease-in-out infinite;
        }
        @keyframes danger-blink {
          0%, 100% { border-color: rgba(220, 38, 38, 1); }
          50% { border-color: transparent; }
        }
        .danger-mode-panel {
          animation: danger-blink 0.125s step-end infinite !important;
        }
      `}</style>
      <motion.div
        ref={panelRef as React.RefObject<HTMLDivElement>}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed top-4 right-4 w-72 z-50 hud-panel p-4 text-[#E4E4E7] transition-colors duration-200 border"
      >
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow" />
            <div ref={headerTextRef} className="text-[10px] tracking-[0.3em] uppercase text-dim font-mono animate-flicker transition-colors">VELOCITY SENSORS</div>
          </div>
          <div className="flex justify-center py-2 bg-surface/40 rounded-sm border border-surface-elevated">
            <span ref={maxVelRef} className="text-[24px] font-mono tracking-tighter text-cyan text-glow-cyan">
              MAX: 0.0 cm/s
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
        {/* Tongue Group */}
        <div className="flex flex-col gap-2">
            <div className="text-[8px] text-dim/50 tracking-[0.3em] uppercase mb-1">TONGUE</div>
            {sensors.slice(0, 3).map((s) => (
                <SensorRow key={s.label} s={s} />
            ))}
        </div>

        {/* Articulators Group */}
        <div className="flex flex-col gap-2">
            <div className="text-[8px] text-dim/50 tracking-[0.3em] uppercase mb-1">ARTICULATORS</div>
            {sensors.slice(3, 6).map((s) => (
                <SensorRow key={s.label} s={s} />
            ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-surface-elevated">
        <div className="flex items-center justify-between text-[8px] font-mono text-dim/60 tracking-wider uppercase">
          <span className="animate-pulse-glow flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" /> LIVE
          </span>
          <span>FRAME {currentFrame}/{frames?.length || 0}</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
      </div>
      </motion.div>
    </>
  );
}

function SensorRow({ s }: { s: SensorData }) {
    const { playHover } = useUIEarcons();
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
                    rowRef.current.classList.add('bg-warn/5', 'animate-pulse-fast');
                } else {
                    rowRef.current.classList.remove('bg-warn/5', 'animate-pulse-fast');
                }
            }
        }, 50);

        return () => clearInterval(interval);
    }, []);

    const initValStr = s.velocity !== null ? s.velocity.toFixed(1) : '0.0';
    const initPct = s.velocity !== null ? Math.min(s.velocity / (s.threshold * 2), 1) * 100 : 0;
    const initOver = s.velocity !== null && s.velocity > s.threshold;

    return (
        <div 
          ref={rowRef} 
          onMouseEnter={() => playHover()}
          className={cn("group flex flex-col gap-1 p-1 -mx-1 rounded-sm transition-colors hud-sweep relative overflow-hidden", initOver && "bg-warn/5 animate-pulse-fast")}
        >
        <div className="flex justify-between items-end relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-dim">{s.label}</span>
            <span className="text-sm font-mono tabular-nums leading-none">
            <span ref={valRef} className={cn("transition-colors", initOver ? "text-warn text-glow-warn animate-flicker" : "text-cyan")}>
                {initValStr}
            </span> 
            <span className="text-[9px] text-dim/60 ml-0.5">cm/s</span>
            </span>
        </div>
        <div className="gauge-track relative w-full h-1 mt-0.5 bg-surface">
            {s.velocity !== null && (
            <div
                ref={barRef}
                className={cn("absolute top-0 left-0 h-full transition-all duration-75", initOver ? "gauge-fill-warn" : "gauge-fill")}
                style={{ width: `${initPct}%` }}
            />
            )}
            {/* Threshold marker */}
            <div className="absolute top-0 bottom-0 w-px bg-dim/30 z-10 group-hover:bg-dim/60 transition-colors" style={{ left: '50%' }}>
                <span className="absolute left-1 -top-[10px] text-[7px] text-dim opacity-0 group-hover:opacity-100 transition-opacity font-mono">LIMIT</span>
            </div>
        </div>
        </div>
    );
}
