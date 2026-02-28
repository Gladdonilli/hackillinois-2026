import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLarynxStore } from '@/store/useLarynxStore';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';

export function VerdictPanel() {
  const status = useLarynxStore((state) => state.status);
  const progress = useLarynxStore((state) => state.progress);
  const verdict = useLarynxStore((state) => state.verdict);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const confidenceRef = useRef<HTMLDivElement>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (status === 'complete' && containerRef.current) {
      if (badgeRef.current) {
        gsap.fromTo(
          badgeRef.current,
          { scale: 0 },
          { scale: 1, ease: 'elastic.out(1, 0.3)', duration: 0.8 }
        );
      }
      if (confidenceRef.current) {
        gsap.fromTo(
          confidenceRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, delay: 0.3, duration: 0.5 }
        );
      }
      if (evidenceRef.current) {
        gsap.fromTo(
          evidenceRef.current,
          { opacity: 0 },
          { opacity: 1, delay: 0.6, duration: 0.5 }
        );
      }
    }
  }, [status]);

  if (status !== 'analyzing' && status !== 'complete') {
    return null;
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-6 text-center min-w-[400px] z-50 text-text shadow-2xl">
      <AnimatePresence mode="wait">
        {status === 'analyzing' && progress && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            <div className="font-mono text-sm text-cyan tracking-wider">
              {progress.message || "ANALYZING..."}
            </div>
            <div className="animate-pulse">
              <Progress value={progress.percent} className="h-2 bg-border [&>div]:bg-cyan" />
            </div>
          </motion.div>
        )}

        {status === 'complete' && verdict && (
          <motion.div
            key="complete"
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div ref={badgeRef}>
              <Badge 
                variant={verdict.isGenuine ? "genuine" : "deepfake"} 
                className={cn(
                  "text-2xl font-bold px-6 py-3 border-none shadow-lg",
                  verdict.isGenuine ? "bg-[#00FF88] text-black" : "bg-[#FF3366] text-white"
                )}
              >
                {verdict.isGenuine ? "GENUINE" : "DEEPFAKE"}
              </Badge>
            </div>
            
            <div ref={confidenceRef} className="font-mono text-lg font-semibold tracking-wide text-text">
              {(verdict.confidence * 100).toFixed(1)}% confidence
            </div>
            
            <div ref={evidenceRef} className="font-mono text-sm text-dim">
              Peak velocity: {verdict.peakVelocity.toFixed(1)} cm/s (threshold: {verdict.threshold.toFixed(1)} cm/s)
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
