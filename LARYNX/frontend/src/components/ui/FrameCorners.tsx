import { motion } from 'motion/react'

interface FrameCornersProps {
  color?: string
  size?: number
  className?: string
}

export function FrameCorners({ color = 'rgba(56, 189, 248, 0.4)', size = 20, className = '' }: FrameCornersProps) {
  const strokeProps = {
    stroke: color,
    strokeWidth: 1.5,
    fill: 'none',
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <div className={`pointer-events-none absolute inset-0 z-10 ${className}`}>
      <svg className="absolute top-0 left-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <motion.path d={`M0 ${size} L0 0 L${size} 0`} {...strokeProps} />
      </svg>
      <svg className="absolute top-0 right-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <motion.path d={`M0 0 L${size} 0 L${size} ${size}`} {...strokeProps} />
      </svg>
      <svg className="absolute bottom-0 left-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <motion.path d={`M0 0 L0 ${size} L${size} ${size}`} {...strokeProps} />
      </svg>
      <svg className="absolute bottom-0 right-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <motion.path d={`M${size} 0 L${size} ${size} L0 ${size}`} {...strokeProps} />
      </svg>
    </div>
  )
}
