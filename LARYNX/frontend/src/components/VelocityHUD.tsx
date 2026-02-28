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

    const frame = frames[currentFrame] as any;
    const prevFrame = currentFrame > 0 ? (frames[currentFrame - 1] as any) : frame;

    const tongueSpeed = typeof frame.tongueVelocity === 'number' ? frame.tongueVelocity : 0;
    
    const calculateEstVelocity = (currentPos?: any, prevPos?: any) => {
      if (!currentPos || !prevPos) return null;
      let dx = 0;
      let dy = 0;
      if (Array.isArray(currentPos) && Array.isArray(prevPos)) {
        dx = currentPos[0] - prevPos[0];
        dy = currentPos[1] - prevPos[1];
      } else if (typeof currentPos === 'object' && typeof prevPos === 'object') {
        dx = (currentPos.x || 0) - (prevPos.x || 0);
        dy = (currentPos.y || 0) - (prevPos.y || 0);
      }
      return Math.sqrt(dx * dx + dy * dy) * 30; // approx cm/s assuming 30fps and 1 unit = 1cm
    };

    setSensors([
      { label: 'T1', velocity: tongueSpeed, threshold: tTongue },
      { label: 'T2', velocity: tongueSpeed * 0.8, threshold: tTongue }, // Approximations for visually separate gauges
      { label: 'T3', velocity: tongueSpeed * 0.6, threshold: tTongue },
      { label: 'JAW', velocity: calculateEstVelocity(frame.jaw, prevFrame.jaw), threshold: tJaw },
      { label: 'UL', velocity: calculateEstVelocity(frame.ul, prevFrame.ul), threshold: tLip },
      { label: 'LL', velocity: calculateEstVelocity(frame.ll, prevFrame.ll), threshold: tLip },
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
