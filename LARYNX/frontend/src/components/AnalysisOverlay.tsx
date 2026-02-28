import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLarynxStore } from '@/store/useLarynxStore'
import { cn } from '@/lib/utils'
import { SoundEngine } from '@/audio/SoundEngine'

export function AnalysisOverlay() {
  const status = useLarynxStore((state) => state.status)
  const progress = useLarynxStore((state) => state.progress)
  const currentFrame = useLarynxStore((state) => state.currentFrame)
  const frames = useLarynxStore((state) => state.frames)
  
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playedStepsRef = useRef<Set<number>>(new Set())
  const [frameBlink, setFrameBlink] = useState(false)

  const isVisible = status === 'uploading' || status === 'analyzing'

  // Timer effect
  useEffect(() => {
    if (isVisible) {
      setElapsed(0)
      playedStepsRef.current.clear()
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isVisible])
  // Frame blink effect
  useEffect(() => {
    if (frames.length > 0) {
      setFrameBlink(true)
      const t = setTimeout(() => setFrameBlink(false), 150)
      return () => clearTimeout(t)
    }
  }, [currentFrame, frames.length])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Map progress percent to pipeline steps.
  const p = progress.percent || 0;
  let activeStep = 0;
  if (status === 'uploading') activeStep = 0;
  else if (p < 15) activeStep = 0;
  else if (p < 35) activeStep = 1;
  else if (p < 65) activeStep = 2;
  else if (p < 85) activeStep = 3;
  else if (p <= 100) activeStep = 4;
  if (status === 'complete' || status === 'error') activeStep = 5;
  // Sound cue effect
  useEffect(() => {
    if (isVisible && activeStep >= 0 && activeStep < 5) {
      if (!playedStepsRef.current.has(activeStep)) {
        SoundEngine.playBeep()
        playedStepsRef.current.add(activeStep)
      }
    }
  }, [activeStep, isVisible])

  const pipelineSteps = [
    { label: 'Audio ingestion' },
    { label: 'Formant extraction' },
    { label: 'Articulatory mapping' },
    { label: 'Velocity analysis' },
    { label: 'Verdict computation' }
  ];

  return (
    <>
      <style>{`
        @keyframes driftParticleX {
          from { background-position: 0 0; }
          to { background-position: 20px 0; }
        }
        .progress-particles {
          background-image: radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px);
          background-size: 10px 10px;
          animation: driftParticleX 1s linear infinite;
        }
      `}</style>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10, filter: 'blur(0px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(8px)', transition: { duration: 0.5 } }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
          <div className="hud-panel p-4 w-[320px] mx-auto opacity-100 !bg-black/90 backdrop-blur-md border border-[#333]">
            <div className="font-mono text-[11px] text-[#666] tracking-[0.2em] mb-4 uppercase text-center border-b border-[#333] pb-2">
              ANALYSIS PIPELINE
            </div>
            
            <div className="space-y-3 mb-6">
              {pipelineSteps.map((step, idx) => {
                const isCompleted = activeStep > idx;
                const isActive = activeStep === idx;
                const isPending = activeStep < idx;

                return (
                  <motion.div 
                    key={step.label} 
                    className="relative flex items-center font-mono text-[11px] px-1 rounded -mx-1"
                    initial={false}
                    animate={{
                      backgroundColor: isActive 
                        ? ["rgba(255,255,255,0)", "rgba(255,255,255,0.3)", "rgba(255,255,255,0)"] 
                        : "rgba(255,255,255,0)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-6 flex justify-center items-center">
                      {isCompleted && (
                        <motion.span 
                          initial={{ scale: 0 }} 
                          animate={{ scale: [0, 1.1, 1.0] }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          className="text-cyan font-bold"
                        >
                          ✓
                        </motion.span>
                      )}
                      {isActive && (
                        <div className="relative flex items-center justify-center w-1.5 h-1.5">
                          <span className="absolute w-full h-full rounded-full bg-cyan shadow-[0_0_8px_cyan]" />
                          <motion.span 
                            className="absolute w-full h-full rounded-full border border-cyan"
                            animate={{ scale: [1, 2], opacity: [1, 0] }}
                            transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
                          />
                        </div>
                      )}
                      {isPending && (
                        <span className="text-[#444]">○</span>
                      )}
                    </div>
                    <div className={cn(
                      "flex-1 ml-2 transition-colors duration-300",
                      isCompleted && "text-[#888]",
                      isActive && "text-cyan leading-tight",
                      isPending && "text-[#555]"
                    )}>
                      {step.label}
                    </div>
                    {isActive && (
                       <div className="text-cyan animate-pulse">...</div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-1.5 gauge-track relative bg-[#111] rounded overflow-hidden">
                 <div 
                   className="absolute top-0 left-0 h-full bg-cyan transition-all duration-300 flex justify-end overflow-hidden" 
                   style={{ width: `${Math.max(0, p)}%` }}
                 >
                   <div className="absolute inset-0 progress-particles opacity-40 mix-blend-overlay" />
                   <div className="w-4 h-full bg-white opacity-80 blur-[2px] shadow-[0_0_12px_#fff]" />
                 </div>
              </div>
              <div className="font-mono text-[11px] text-[#888] w-8 text-right">
                {Math.floor(p)}%
              </div>
            </div>

            <div className="flex justify-between items-center font-mono text-[10px] pt-2 border-t border-[#333]">
              <div className={cn("transition-colors duration-150", frameBlink ? "text-cyan text-glow-cyan" : "text-[#555]")}>
                {status === 'analyzing' && frames.length > 0 
                  ? `Frame ${Math.max(0, currentFrame)} / ${frames.length}`
                  : 'Processing...'}
              </div>
              <div className={cn("font-bold tracking-wider", isVisible ? "text-cyan text-glow-cyan" : "text-[#555]")}>
                T+{formatTime(elapsed)}
              </div>
          </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}