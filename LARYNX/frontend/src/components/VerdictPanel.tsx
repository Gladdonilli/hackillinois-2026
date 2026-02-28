import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLarynxStore } from '@/store/useLarynxStore';
import { Badge } from '@/components/ui/badge';
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
  const flashRef = useRef<HTMLDivElement>(null);
  
  // Need local state for the counting animation so we don't cause React re-renders on every frame
  const countRef = useRef({ val: 0 });
  const [displayConfidence, setDisplayConfidence] = useState("0.0");

  useGSAP(() => {
    if (status === 'complete' && containerRef.current && verdict) {
      const tl = gsap.timeline();
      
      // Flash screen effect
      if (flashRef.current) {
        gsap.to(flashRef.current, { opacity: 0, duration: 0.3 });
      }
      
      // Reset
      gsap.set(badgeRef.current, { scale: 0 });
      gsap.set(confidenceRef.current, { opacity: 0, y: 10 });
      if (evidenceRef.current?.children) {
        gsap.set(evidenceRef.current.children, { opacity: 0, y: 5 });
      }
      countRef.current.val = 0;
      setDisplayConfidence("0.0");

      // Badge Elastic pop
      tl.to(badgeRef.current, {
        scale: 1,
        ease: 'elastic.out(1, 0.4)',
        duration: 0.8
      }, 0.3);

      // Confidence fade up and count
      tl.to(confidenceRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out'
      }, 0.6);

      tl.to(countRef.current, {
        val: verdict.confidence * 100,
        duration: 1.2,
        ease: 'power3.out',
        onUpdate: () => {
          setDisplayConfidence(countRef.current.val.toFixed(1));
        }
      }, 0.6);

      // List stagger
      if (evidenceRef.current?.children) {
        tl.to(evidenceRef.current.children, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: 'power2.out'
        }, 1.0);
      }
    }
  }, [status, verdict]);

  if (status !== 'analyzing' && status !== 'complete') {
    return null;
  }

  return (
    <>
      {/* Full screen flash element */}
      {status === 'complete' && verdict && (
        <div ref={flashRef} className="fixed inset-0 bg-white z-[100] pointer-events-none opacity-10" />
      )}
      
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <AnimatePresence mode="wait">
          {status === 'analyzing' && progress && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="text-[10px] font-mono text-[#666] tracking-[0.3em] uppercase mb-1">
                {progress.message || "ANALYZING..."}
              </div>
              <div className="w-48 gauge-track h-1 relative">
                <div 
                  className="gauge-fill absolute top-0 left-0" 
                  style={{ width: `${progress.percent}%`, transition: 'width 0.1s linear' }} 
                />
              </div>
            </motion.div>
          )}

          {status === 'complete' && verdict && (
            <motion.div
              key="complete"
              ref={containerRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "hud-panel p-8 min-w-[340px] max-w-sm mx-auto flex flex-col items-center gap-6 animate-breathe",
                verdict.isGenuine ? "glow-genuine border-[#00FF88]/30" : "glow-warn border-[#FF3366]/30"
              )}
            >
              {/* BADGE */}
              <div ref={badgeRef}>
                <Badge 
                  variant={verdict.isGenuine ? "genuine" : "deepfake"} 
                  className={cn(
                    "text-xl font-bold px-8 py-2 border-none shadow-lg tracking-widest",
                    verdict.isGenuine ? "bg-[#00FF88] text-black" : "bg-[#FF3366] text-white"
                  )}
                >
                  {verdict.isGenuine ? "GENUINE" : "DEEPFAKE"}
                </Badge>
              </div>
              
              {/* CONFIDENCE */}
              <div ref={confidenceRef} className="flex flex-col items-center gap-1">
                  <div className={cn(
                      "text-5xl font-mono tabular-nums font-bold leading-none",
                      verdict.isGenuine ? "text-[#00FF88] text-glow-genuine" : "text-[#FF3366] text-glow-warn"
                  )}>
                      {displayConfidence}%
                  </div>
                  <div className="text-[10px] text-[#666] tracking-[0.2em] font-mono">CONFIDENCE</div>
              </div>
              
              {/* EVIDENCE */}
              <div ref={evidenceRef} className="flex flex-col gap-2 w-full pt-4 border-t border-white/5">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#444]">Peak Velocity:</span>
                  <span className="text-[#666]"><span className="text-[#EDEDED]">{verdict.peakVelocity.toFixed(1)}</span> cm/s</span>
                </div>
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#444]">Threshold:</span>
                  <span className="text-[#666]"><span className="text-[#EDEDED]">{verdict.threshold.toFixed(1)}</span> cm/s</span>
                </div>
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#444]">Anomalous Frames:</span>
                  <span className={cn(
                      "text-[#666]", 
                      !verdict.isGenuine && "text-warn"
                  )}><span className={cn("text-[#EDEDED]", !verdict.isGenuine && "text-warn")}>{Math.round((1 - verdict.confidence) * 120)}</span>/120</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
