import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SpeedGaugeProps {
  value: number;
  maxValue?: number;
  className?: string;
}

export function SpeedGauge({ value, maxValue = 120, className }: SpeedGaugeProps) {
  const needleRef = useRef<SVGGElement>(null);
  const textRef = useRef<SVGTextElement>(null);

  // Math for the arc
  const radius = 80;
  const strokeWidth = 12;
  const cx = 100;
  const cy = 90;
  // Arc length for 180 degrees
  const arcLength = Math.PI * radius;

  // Thresholds mapping to UI colors
  const thresholds = [
    { limit: 22, color: '#38BDF8', glow: 'rgba(56,189,248,0.5)' }, // Cyan
    { limit: 50, color: '#EAB308', glow: 'rgba(234,179,8,0.5)' }, // Yellow
    { limit: 80, color: '#F97316', glow: 'rgba(249,115,22,0.5)' }, // Orange
    { limit: maxValue, color: '#EF4444', glow: 'rgba(239,68,68,0.5)' }, // Red
  ];



  useEffect(() => {
    // Clamp value
    const clampedValue = Math.max(0, Math.min(value, maxValue));
    
    // Calculate angle (-90deg is far left, 90deg is far right)
    const angle = -90 + (clampedValue / maxValue) * 180;
    
    // Update DOM directly bypassing React for performance
    if (needleRef.current) {
      needleRef.current.style.transform = `rotate(${angle}deg)`;
    }
    
    if (textRef.current) {
      textRef.current.textContent = clampedValue.toFixed(1);
      
      // Update text color based on thresholds
      let activeColor = thresholds[0].color;
      let activeShadow = thresholds[0].glow;
      
      for (const t of thresholds) {
        if (clampedValue <= t.limit) {
          activeColor = t.color;
          activeShadow = t.glow;
          break;
        }
      }
      
      textRef.current.style.fill = activeColor;
      textRef.current.style.filter = `drop-shadow(0 0 8px ${activeShadow})`;
      
      // Glitch effect if in red zone
      if (clampedValue > 80) {
          textRef.current.classList.add('animate-flicker');
      } else {
          textRef.current.classList.remove('animate-flicker');
      }
    }
  }, [value, maxValue, thresholds]);

  // Tick marks
  const renderTicks = () => {
    return thresholds.slice(0, 3).map(t => {
      const angle = -Math.PI/2 + (t.limit / maxValue) * Math.PI;
      const x1 = cx + (radius - strokeWidth/2) * Math.cos(angle);
      const y1 = cy + (radius - strokeWidth/2) * Math.sin(angle);
      const x2 = cx + (radius + strokeWidth/2 + 4) * Math.cos(angle);
      const y2 = cy + (radius + strokeWidth/2 + 4) * Math.sin(angle);
      
      return (
        <line 
          key={`tick-${t.limit}`}
          x1={x1} y1={y1} x2={x2} y2={y2} 
          stroke="rgba(255,255,255,0.8)" 
          strokeWidth="2" 
        />
      );
    });
  };

  return (
    <div className={cn("relative flex flex-col items-center justify-center pt-2", className)}>
      <svg 
        width="200" 
        height="110" 
        viewBox="0 0 200 110" 
        className="overflow-visible drop-shadow-xl"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
             {/* Simple continuous gradient to avoid React Fragment import issues in raw string */}
             <stop offset="0%" stopColor="#38BDF8" />
             <stop offset="18%" stopColor="#38BDF8" />
             <stop offset="18.1%" stopColor="#EAB308" />
             <stop offset="41%" stopColor="#EAB308" />
             <stop offset="41.1%" stopColor="#F97316" />
             <stop offset="66%" stopColor="#F97316" />
             <stop offset="66.1%" stopColor="#EF4444" />
             <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background Arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Foreground Colored Arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset="0"
          filter="url(#glow)"
        />

        {/* Threshold Ticks */}
        {renderTicks()}

        {/* Needle */}
        <g 
          ref={needleRef} 
          className="transition-transform duration-150 ease-out origin-[100px_90px]"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Base circle */}
          <circle cx={cx} cy={cy} r="6" fill="#1f2937" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
          {/* Pointer */}
          <path 
            d={`M ${cx - 3} ${cy} L ${cx} ${cy - radius + 10} L ${cx + 3} ${cy}`} 
            fill="rgba(255,255,255,0.9)" 
          />
        </g>

        {/* Value Text */}
        <text
          ref={textRef}
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          className="font-mono font-bold text-3xl tracking-tighter"
          style={{ 
            fill: '#38BDF8', 
            filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.5))' 
          }}
        >
          0.0
        </text>
        
        {/* Unit */}
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          className="font-mono text-[10px] tracking-wider fill-white/50"
        >
          cm/s
        </text>
      </svg>
    </div>
  );
}
