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
      className="fixed top-4 right-4 w-72 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 z-50 text-text shadow-lg"
    >
      <div className="font-mono text-xs text-dim tracking-widest mb-4">VELOCITY</div>
      <div className="grid grid-cols-2 gap-4">
        {sensors.map((s) => {
          const valStr = s.velocity !== null ? s.velocity.toFixed(1) : '—';
          const isOver = s.velocity !== null && s.velocity > s.threshold;
          const pct = s.velocity !== null ? Math.min(s.velocity / (s.threshold * 2), 1) * 100 : 0;

          return (
            <div key={s.label} className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <span className="font-mono text-xs text-dim">{s.label}</span>
                <span className={cn("font-mono text-sm", isOver ? "text-warn" : "text-cyan")}>
                  {valStr} <span className="text-xs text-dim">cm/s</span>
                </span>
              </div>
              <div className="relative h-1 w-full bg-[#1F1F1F] rounded-full overflow-hidden">
                {s.velocity !== null && (
                  <div
                    className={cn("h-full rounded-full transition-all duration-75", isOver ? "bg-warn" : "bg-cyan")}
                    style={{ width: `${pct}%` }}
                  />
                )}
                {/* 50% Threshold marker */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/30" />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
