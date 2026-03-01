import { useRef, useState } from 'react';
import { SoundEngine } from '@/audio/SoundEngine';
import { motion, AnimatePresence } from 'motion/react';
import { useLarynxStore } from '@/store/useLarynxStore';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { TIMING, SPRING, GLITCH, COLORS, COLORS_RGBA } from '@/constants';

export function VerdictPanel() {
  const status = useLarynxStore((state) => state.status);
  const progress = useLarynxStore((state) => state.progress);
  const verdict = useLarynxStore((state) => state.verdict);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const confidenceRef = useRef<HTMLDivElement>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  
  const noiseRef = useRef<HTMLDivElement>(null);
  const checkIconRef = useRef<HTMLSpanElement>(null);
  const badgeTextRef = useRef<HTMLSpanElement>(null);

  // Need local state for the counting animation so we don't cause React re-renders on every frame
  const countRef = useRef({ val: 0 });
  const [displayConfidence, setDisplayConfidence] = useState("0.0");

  useGSAP(() => {
    if (status === 'complete' && containerRef.current && verdict) {
      const tl = gsap.timeline();
      
      // Flash screen effect
      if (flashRef.current) {
        gsap.to(flashRef.current, { opacity: 0, duration: TIMING.VERDICT_FLASH });
      }
      
      // Reset
      gsap.set(badgeRef.current, { scale: 0 });
      gsap.set(confidenceRef.current, { opacity: 0, y: 10 });
      if (evidenceRef.current?.children) {
        gsap.set(evidenceRef.current.children, { opacity: 0, y: 5 });
      }
      if (checkIconRef.current) gsap.set(checkIconRef.current, { scale: 0 });
      countRef.current.val = 0;
      setDisplayConfidence("0.0");

      const badgePopTime = verdict.isGenuine ? 0.3 : 0.4;

      // Badge Elastic pop
      tl.to(badgeRef.current, {
        scale: 1,
        ease: SPRING.BADGE_EASE,
        duration: 0.8,
        onStart: () => {
          if (verdict.isGenuine) {
            SoundEngine.playBeep();
          }
        }
      }, badgePopTime);

      if (!verdict.isGenuine) {
        // Screen shake
        tl.to(containerRef.current, { 
          x: `random(-${SPRING.SHAKE_X}, ${SPRING.SHAKE_X})`, 
          y: `random(-${SPRING.SHAKE_Y}, ${SPRING.SHAKE_Y})`, 
          duration: 0.05, 
          repeat: SPRING.SHAKE_REPEATS, 
          yoyo: true,
          clearProps: 'x,y',
          onComplete: () => {
            gsap.set(containerRef.current, { x: 0, y: 0 });
          }
        }, badgePopTime);
        
        // Glitch text
        if (badgeTextRef.current) {
          let cycles = 0;
          const chars = GLITCH.CHARS;
          const interval = window.setInterval(() => {
            if (badgeTextRef.current) {
              const glitched = Array.from(verdict.isGenuine ? "GENUINE" : "DEEPFAKE")
                .map(c => Math.random() > 0.4 ? chars[Math.floor(Math.random() * chars.length)] : c)
                .join('');
              badgeTextRef.current.innerText = glitched;
              badgeTextRef.current.setAttribute('data-text', glitched);
            }
            cycles++;
            if (cycles >= GLITCH.CYCLES) {
              window.clearInterval(interval);
              if (badgeTextRef.current) {
                badgeTextRef.current.innerText = verdict.isGenuine ? "GENUINE" : "DEEPFAKE";
                badgeTextRef.current.setAttribute('data-text', verdict.isGenuine ? "GENUINE" : "DEEPFAKE");
              }
            }
          }, GLITCH.INTERVAL_MS);
        }

        // Static noise overlay
        if (noiseRef.current) {
          tl.set(noiseRef.current, { opacity: 0.1 }, badgePopTime);
          tl.to(noiseRef.current, { opacity: 0, duration: TIMING.VERDICT_NOISE_DECAY, ease: 'power2.out' }, badgePopTime);
        }

        // Border pulse
        if (containerRef.current) {
          tl.to(containerRef.current, {
            borderColor: COLORS_RGBA.VIOLATION_80,
            boxShadow: `0 0 20px ${COLORS_RGBA.VIOLATION_40}`,
            duration: 0.125,
            repeat: 15,
            yoyo: true,
            clearProps: 'borderColor,boxShadow'
          }, badgePopTime);
        }
      } else {
        // Genuine effect
        if (containerRef.current) {
          tl.to(containerRef.current, {
             boxShadow: `0 0 40px ${COLORS_RGBA.GENUINE_40}`,
             duration: 1.5,
             ease: 'power2.inOut'
          }, badgePopTime);
        }
        if (checkIconRef.current) {
          tl.to(checkIconRef.current, {
            scale: 1,
            ease: 'elastic.out(1, 0.3)',
            duration: 0.6
          }, badgePopTime + 0.3);
        }
      }

      // Confidence fade up and count
      tl.to(confidenceRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out'
      }, badgePopTime + 0.3);

      tl.to(countRef.current, {
        val: verdict.confidence * 100,
        duration: TIMING.CONFIDENCE_COUNT_DURATION,
        ease: 'power3.out',
        onUpdate: () => {
          setDisplayConfidence(countRef.current.val.toFixed(1));
        },
        onComplete: () => {
          if (verdict.isGenuine && confidenceRef.current) {
            gsap.to(confidenceRef.current, {
              scale: 1.05,
              duration: 0.1,
              yoyo: true,
              repeat: 1
            });
          }
        }
      }, badgePopTime + 0.3);

      // List stagger
      if (evidenceRef.current?.children) {
        tl.to(evidenceRef.current.children, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: 'power2.out'
        }, badgePopTime + 0.7);

        if (!verdict.isGenuine) {
          Array.from(evidenceRef.current.children).forEach((child, i) => {
            tl.to(child.children, {
              color: COLORS.VIOLATION,
              duration: 0.1,
              yoyo: true,
              repeat: 1,
              clearProps: 'color'
            }, badgePopTime + 0.7 + (i * 0.1));
          });
        }
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
        <>
          <div ref={flashRef} className="fixed inset-0 bg-white z-[100] pointer-events-none opacity-10" />
          {!verdict.isGenuine && (
            <div 
              ref={noiseRef} 
              className="fixed inset-0 pointer-events-none z-[90] opacity-0 mix-blend-overlay" 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />
          )}
        </>
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
              <div className="text-[10px] font-mono text-dim tracking-[0.3em] uppercase mb-1">
                {progress.message || "ANALYZING..."}
              </div>
              <Progress value={progress.percent} className="w-48 h-1" />
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
                verdict.isGenuine ? "glow-genuine border-genuine/30" : "glow-warn border-violation/30"
              )}
            >
              {/* BADGE */}
              <div ref={badgeRef}>
                <Badge 
                  variant={verdict.isGenuine ? "genuine" : "deepfake"} 
                  className={cn(
                    "text-xl font-bold px-8 py-2 border-none shadow-lg tracking-widest",
                    verdict.isGenuine ? "bg-genuine text-black" : "bg-violation text-white"
                  )}
                >
                  {verdict.isGenuine && <span ref={checkIconRef} className="inline-block mr-2 origin-center">✓</span>}
                  <span ref={badgeTextRef} data-text={verdict.isGenuine ? "GENUINE" : "DEEPFAKE"} className={cn(!verdict.isGenuine && "glitch-text")}>
                    {verdict.isGenuine ? "GENUINE" : "DEEPFAKE"}
                  </span>
                </Badge>
              </div>
              
              {/* CONFIDENCE */}
              <div ref={confidenceRef} className="flex flex-col items-center gap-1">
                  <div className={cn(
                      "text-5xl font-mono tabular-nums font-bold leading-none",
                      verdict.isGenuine ? "text-genuine text-glow-genuine" : "text-violation text-glow-warn"
                  )}>
                      {displayConfidence}%
                  </div>
                  <div className="text-[10px] text-dim tracking-[0.2em] font-mono">CONFIDENCE</div>
              </div>
              
              {/* EVIDENCE */}
              <div ref={evidenceRef} className="flex flex-col gap-2 w-full pt-4 border-t border-white/5">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-zinc-700">Peak Velocity:</span>
                  <span className="text-dim"><span className="text-white/90">{(verdict.peakVelocity ?? 0).toFixed(1)}</span> cm/s</span>
                </div>
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-zinc-700">Threshold:</span>
                  <span className="text-dim"><span className="text-white/90">{(verdict.threshold ?? 0).toFixed(1)}</span> cm/s</span>
                </div>
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-zinc-700">Anomalous Frames:</span>
                  <span className={cn(
                      "text-dim",
                      !verdict.isGenuine && "text-warn"
                  )}>  <span className={cn("text-white/90", !verdict.isGenuine && "text-warn")}>{verdict.anomalousFrameCount ?? 0}</span>/{verdict.totalFrameCount ?? 0}</span>
                </div>

                {/* Physics Violations Subject */}
                <div className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase mt-2 mb-1">
                  <span>Physics Violations</span>
                </div>

                {!verdict.isGenuine && (
                  <div className="flex items-start gap-2 font-mono text-xs text-violation bg-violation/10 p-2 rounded">
                    <span>⚠</span>
                    <span>Peak velocity {(verdict.peakVelocity ?? 0).toFixed(1)} cm/s exceeds human limit of {(verdict.threshold ?? 0).toFixed(1)} cm/s</span>
                  </div>
                )}

                <div className={cn("flex items-start gap-2 font-mono text-xs p-2 rounded", verdict.isGenuine ? "text-genuine bg-genuine/10" : "text-violation bg-violation/10")}>
                  <span>{verdict.isGenuine ? "✓" : "⚠"}</span>
                  <span>Anomalous frames: {verdict.anomalousFrameCount ?? 0}/{verdict.totalFrameCount ?? 0} ({Math.round((verdict.anomalyRatio ?? 0) * 100)}%)</span>
                </div>

                <div className={cn("flex items-start gap-2 font-mono text-xs p-2 rounded", verdict.isGenuine ? "text-genuine bg-genuine/10" : "text-violation bg-violation/10")}>
                  <span>{verdict.isGenuine ? "✓" : "⚠"}</span>
                  <span>{Math.round((verdict.confidence ?? 0) * 100)}% probability of synthetic generation</span>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4 font-mono tracking-widest text-xs" onClick={() => useLarynxStore.getState().setStatus('comparing')}>
                COMPARE ANALYSIS &rarr;
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
