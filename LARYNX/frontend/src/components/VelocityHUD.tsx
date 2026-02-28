import { useEffect, useState } from 'react';
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

  useEffect(() => {
    // Resolve thresholds dynamically if possible
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

    setSensors([
      { label: 'T1', velocity: getSensorVelocity('T1'), threshold: tTongue },
      { label: 'T2', velocity: getSensorVelocity('T2'), threshold: tTongue },
      { label: 'T3', velocity: getSensorVelocity('T3'), threshold: tTongue },
      { label: 'JAW', velocity: getSensorVelocity('JAW'), threshold: tJaw },
      { label: 'UL', velocity: getSensorVelocity('UL'), threshold: tLip },
      { label: 'LL', velocity: getSensorVelocity('LL'), threshold: tLip },
    ]);
  }, [frames, currentFrame]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="fixed top-4 right-4 w-72 z-50 hud-panel hud-sweep p-4 text-[#EDEDED]"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow" />
        <div className="text-[10px] tracking-[0.3em] uppercase text-[#666] font-mono">VELOCITY ANALYSIS</div>
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
    </motion.div>
  );
}

function SensorRow({ s }: { s: SensorData }) {
    const valStr = s.velocity !== null ? s.velocity.toFixed(1) : '—';
    const isOver = s.velocity !== null && s.velocity > s.threshold;
    const pct = s.velocity !== null ? Math.min(s.velocity / (s.threshold * 2), 1) * 100 : 0;

    return (
        <div className={cn("flex flex-col gap-1 p-1 -mx-1 rounded transition-colors", isOver && "bg-warn/5")}>
        <div className="flex justify-between items-end">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">{s.label}</span>
            <span className={cn("text-sm font-mono tabular-nums leading-none", isOver ? "text-warn text-glow-warn animate-flicker" : "text-cyan")}>
            {valStr} <span className="text-[9px] text-[#444] ml-0.5">cm/s</span>
            </span>
        </div>
        <div className="gauge-track relative w-full h-1 mt-0.5 bg-[#1a1a1a]">
            {s.velocity !== null && (
            <div
                className={cn("absolute top-0 left-0 h-full transition-all duration-75", isOver ? "gauge-fill-warn" : "gauge-fill")}
                style={{ width: `${pct}%` }}
            />
            )}
            {/* Threshold marker */}
            <div className="absolute top-0 bottom-0 w-px bg-[#444] z-10" style={{ left: '50%' }} />
        </div>
        </div>
    );
}
