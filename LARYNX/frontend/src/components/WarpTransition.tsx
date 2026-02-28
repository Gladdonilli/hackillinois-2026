import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import gsap from 'gsap'

interface WarpTransitionProps {
  isActive: boolean
  onComplete?: () => void
}

export function WarpTransition({ isActive, onComplete }: WarpTransitionProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const tunnelRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!isActive) return
    
    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete()
      }
    })
    
    // Quick burst to bright white/cyan then fade to reveal analysis
    if (overlayRef.current && tunnelRef.current) {
      tl.to(tunnelRef.current, {
        scale: 4,
        opacity: 1,
        duration: 0.15,
        ease: 'power2.in'
      })
      .to(overlayRef.current, {
        opacity: 1,
        duration: 0.1,
        ease: 'power1.out'
      }, "-=0.05")
      .to(overlayRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: 'power3.in',
      })
      .to(tunnelRef.current, {
        opacity: 0,
        duration: 0.2
      }, "-=0.8")
    }

    return () => {
      tl.kill()
    }
  }, [isActive, onComplete])

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Tunnel / Light speed streaks background */}
          <div ref={tunnelRef} className="absolute inset-0 opacity-0 scale-50" style={{
            background: 'radial-gradient(circle at center, transparent 0%, rgba(56, 189, 248, 0.4) 40%, white 100%)'
          }} />
          
          {/* Flash overlay */}
          <div ref={overlayRef} className="absolute inset-0 bg-[#E4F0FF] opacity-0 mix-blend-screen" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
