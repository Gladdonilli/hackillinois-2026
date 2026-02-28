import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLarynxStore } from '@/store/useLarynxStore'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export function AnalysisOverlay() {
  const status = useLarynxStore((state) => state.status)
  const progress = useLarynxStore((state) => state.progress)
  const currentFrame = useLarynxStore((state) => state.currentFrame)
  const frames = useLarynxStore((state) => state.frames)
  
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const isVisible = status === 'uploading' || status === 'analyzing'

  // Timer effect
  useEffect(() => {
    if (isVisible) {
      // Start timer
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    } else {
      // Clean up timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isVisible])

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const message = status === 'uploading' ? 'Uploading...' : progress.message

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            "pointer-events-none"
          )}
        >
          <div className="pointer-events-auto w-full max-w-sm rounded-lg border border-border/50 bg-card/60 p-6 shadow-xl backdrop-blur-md">
            
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="font-sans text-sm font-semibold text-[#EDEDED]">
                Pipeline Status
              </h3>
              <span className="font-mono text-xs text-[#00FFFF]">
                {formatTime(elapsed)}
              </span>
            </div>

            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-sans text-[#666666]">
                {message || 'Initializing...'}
              </span>
              {status === 'analyzing' && frames.length > 0 && (
                <span className="font-mono text-[#666666]">
                  Frame {currentFrame} / {frames.length}
                </span>
              )}
            </div>

            <Progress 
              value={status === 'uploading' ? null : progress.percent} 
              className={cn(
                "h-2 w-full",
                status === 'uploading' && "animate-pulse opacity-50"
              )}
            />

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
