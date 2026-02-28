import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLarynxStore } from '@/store/useLarynxStore'
import { cn } from '@/lib/utils'

export function AnalysisOverlay() {
  const status = useLarynxStore((state) => state.status)
  const progress = useLarynxStore((state) => state.progress)
  const currentFrame = useLarynxStore((state) => state.currentFrame)
  const frames = useLarynxStore((state) => state.frames)
  
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isVisible = status === 'uploading' || status === 'analyzing'

  // Timer effect
  useEffect(() => {
    if (isVisible) {
      setElapsed(0)
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

  const pipelineSteps = [
    { label: 'Audio ingestion' },
    { label: 'Formant extraction' },
    { label: 'Articulatory mapping' },
    { label: 'Velocity analysis' },
    { label: 'Verdict computation' }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
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
                  <div key={step.label} className="flex items-center font-mono text-[11px]">
                    <div className="w-6 flex justify-center items-center">
                      {isCompleted && (
                        <motion.span 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1, transition: { type: "spring", bounce: 0.5 } }}
                          className="text-cyan font-bold"
                        >
                          ✓
                        </motion.span>
                      )}
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow shadow-[0_0_8px_cyan]" />
                      )}
                      {isPending && (
                        <span className="text-[#444]">○</span>
                      )}
                    </div>
                    <div className={cn(
                      "flex-1 ml-2",
                      isCompleted && "text-[#888]",
                      isActive && "text-cyan leading-tight",
                      isPending && "text-[#555]"
                    )}>
                      {step.label}
                    </div>
                    {isActive && (
                       <div className="text-cyan animate-pulse">...</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-1.5 gauge-track relative overflow-hidden bg-[#111] rounded">
                 <div 
                   className="absolute top-0 left-0 h-full gauge-fill bg-cyan transition-all duration-300" 
                   style={{ width: `${Math.max(0, p)}%` }}
                 />
              </div>
              <div className="font-mono text-[11px] text-[#888] w-8 text-right">
                {Math.floor(p)}%
              </div>
            </div>

            <div className="flex justify-between items-center font-mono text-[10px] text-[#555] pt-2 border-t border-[#333]">
              <div>
                {status === 'analyzing' && frames.length > 0 
                  ? `Frame ${Math.max(0, currentFrame)} / ${frames.length}`
                  : 'Processing...'}
              </div>
              <div>{formatTime(elapsed)}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}