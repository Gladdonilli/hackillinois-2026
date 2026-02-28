import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import NumberFlow from '@number-flow/react';

// Reusing same CSS classes as other components
// Requires motion, gsap, NumberFlow as requested

export const TechnicalDetailPanel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Stats refs for counting up
  const fpsRef = useRef({ value: 0 });
  const dofRef = useRef({ value: 0 });
  const humanVelRef = useRef({ value: 0 });
  const fakeVelRef = useRef({ value: 0 });
  const confRef = useRef({ value: 0 });
  
  // React state for the NumberFlow elements (since it requires state to animate)
  // We use setState here ONLY for the final values to trigger NumberFlow,
  // NOT for per-frame animation. The gsap.to does the internal object interpolation,
  // but NumberFlow needs the target value to animate towards.
  const [stats, setStats] = React.useState({
    fps: 0,
    dof: 0,
    humanVel: 0,
    fakeVel: 0,
    conf: 0
  });

  useGSAP(() => {
    // Animate the stats up sequentially or together
    gsap.to(fpsRef.current, {
      value: 100,
      duration: 1.5,
      ease: "power2.out",
      onUpdate: () => setStats(prev => ({ ...prev, fps: Math.round(fpsRef.current.value) }))
    });
    
    gsap.to(dofRef.current, {
      value: 12,
      duration: 1.5,
      delay: 0.2,
      ease: "power2.out",
      onUpdate: () => setStats(prev => ({ ...prev, dof: Math.round(dofRef.current.value) }))
    });

    gsap.to(humanVelRef.current, {
      value: 22,
      duration: 1.5,
      delay: 0.4,
      ease: "power2.out",
      onUpdate: () => setStats(prev => ({ ...prev, humanVel: Math.round(humanVelRef.current.value) }))
    });

    gsap.to(fakeVelRef.current, {
      value: 184,
      duration: 2.0,
      delay: 0.6,
      ease: "power4.out",
      onUpdate: () => setStats(prev => ({ ...prev, fakeVel: Math.round(fakeVelRef.current.value) }))
    });

    gsap.to(confRef.current, {
      value: 99.9,
      duration: 2.0,
      delay: 0.8,
      ease: "power2.out",
      onUpdate: () => setStats(prev => ({ ...prev, conf: Number(confRef.current.value.toFixed(1)) }))
    });
  }, []);

  // Formant drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    // Animation state
    let animationFrameId: number;
    const startTime = Date.now();
    const duration = 2000; // 2 seconds to draw

    const draw = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for progress (power2.out)
      const easeProgress = 1 - Math.pow(1 - progress, 2);

      ctx.clearRect(0, 0, width, height);

      // Draw grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      
      // Horizontal lines
      for (let i = 0; i < 5; i++) {
        const y = i * (height / 4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Vertical lines
      for (let i = 0; i < 10; i++) {
        const x = i * (width / 9);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw active width based on progress
      const currentWidth = width * easeProgress;

      // Draw Formant 1 (Cyan - Lowest frequency)
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#38BDF8'; // cyan
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38BDF8';
      
      for (let x = 0; x < currentWidth; x++) {
        // Base y is near the bottom (high value = lower physically on canvas)
        const baseY = height * 0.75;
        // Wavy line with some noise
        const y = baseY + Math.sin(x * 0.05) * 15 + Math.sin(x * 0.01) * 30;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Formant 2 (Green - Mid frequency)
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#2DD4BF'; // green
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#2DD4BF';
      
      for (let x = 0; x < currentWidth; x++) {
        // Higher up
        const baseY = height * 0.45;
        // Different frequency wave
        const y = baseY + Math.sin(x * 0.06 + 1) * 20 + Math.sin(x * 0.02) * 25;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Formant 3 (Yellow - High frequency)
      ctx.beginPath();
      ctx.strokeStyle = '#FFFF00'; // yellow
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFFF00';
      ctx.shadowBlur = 10;
      
      for (let x = 0; x < currentWidth; x++) {
        const baseY = height * 0.2;
        const y = baseY + Math.sin(x * 0.08 + 2) * 10 + Math.sin(x * 0.03) * 15;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Stagger variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  const boxVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  };

  return (
    <motion.div 
      className="hud-panel absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] bg-[#09090B]/90 backdrop-blur-md border border-cyan/30 rounded-sm p-8 flex flex-col gap-8 shadow-[0_0_50px_rgba(56,189,248,0.1)] z-50 overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background grid overlay */}

      <div className="absolute inset-0 bg-[linear-gradient(rgba(56, 189, 248, 0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(56, 189, 248, 0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      {/* Top Split: Formants vs Inversion */}
      <div className="flex flex-row space-x-8 w-full h-[300px] relative z-10">
        
        {/* Left: Formant Analysis */}
        <motion.div variants={itemVariants} className="flex-1 flex flex-col bg-black/40 border border-cyan-900/50 rounded-sm p-5">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
            <h2 className="text-cyan font-mono tracking-widest text-sm font-bold text-glow-cyan">FORMANT EXTRACTION</h2>
          </div>
          <div className="relative flex-1 rounded overflow-hidden border border-cyan/20 bg-black/60 isolate">
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full"
            />
            {/* Labels overlaid on canvas */}
            <div className="absolute left-4 top-[15%] text-[10px] font-mono text-yellow-500/90 font-bold bg-black/50 px-1 rounded">
              F3: 2000-3500 Hz
            </div>
            <div className="absolute left-4 top-[40%] text-[10px] font-mono text-green-400/90 font-bold bg-black/50 px-1 rounded">
              F2: 800-2400 Hz
            </div>
            <div className="absolute left-4 top-[70%] text-[10px] font-mono text-cyan/90 font-bold bg-black/50 px-1 rounded">
              F1: 300-900 Hz
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex-1 flex flex-col bg-black/40 border border-cyan-900/50 rounded-sm p-5">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
            <h2 className="text-cyan font-mono tracking-widest text-sm font-bold text-glow-cyan">ARTICULATORY INVERSION</h2>
          </div>

          <div className="flex-1 flex flex-col justify-center relative">
            {/* The Pipeline diagram */}
            <motion.div 
              className="flex justify-between items-center w-full"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {[
                { label: "AUDIO", color: "text-white" },
                { label: "MEL SPEC", color: "text-white" },
                { label: "12D EMA", color: "text-green-400" },
                { label: "AAI MODEL", color: "text-cyan font-bold glow-cyan border-cyan shadow-[0_0_15px_rgba(56,189,248,0.3)]" },
                { label: "VELOCITY", color: "text-rose-500 font-bold" }
              ].map((step, i, arr) => (
                <React.Fragment key={step.label}>
                  <motion.div 
                    variants={boxVariants}
                    className={`flex items-center justify-center p-2 rounded bg-black/80 border border-white/10 text-[10px] font-mono tracking-wider min-w-[70px] text-center ${step.color}`}
                  >
                    {step.label}
                  </motion.div>
                  {i < arr.length - 1 && (
                    <motion.div 
                      className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-cyan/50 to-transparent mx-1 relative"
                      variants={{
                        hidden: { width: 0, opacity: 0 },
                        visible: { width: 'auto', opacity: 1, transition: { duration: 0.5 } }
                      }}
                    >
                      {/* Animated dot on line */}
                      <motion.div 
                        className="absolute top-1/2 -mt-[2px] w-1 h-1 rounded-full bg-cyan shadow-[0_0_5px_#38BDF8]"
                        animate={{ left: ["0%", "100%"] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
                      />
                    </motion.div>
                  )}
                </React.Fragment>
              ))}
            </motion.div>
            
            <motion.div variants={itemVariants} className="mt-8 text-xs font-mono text-cyan-50/70 text-center mx-auto max-w-[80%] leading-relaxed border-t border-white/5 pt-4">
              Mapping acoustic observations to physical constraints. 
              The <span className="text-cyan">AAI Wav2Vec2 backbone</span> translates formants into <span className="text-green-400">tongue kinematics</span>. Deepfakes generate physically impossible <span className="text-rose-500">velocity spikes</span>.
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Bottom: Key Stats */}
        
      <motion.div variants={itemVariants} className="w-full bg-black/60 border border-cyan-900/40 rounded-sm p-6 relative z-10 flex justify-between items-center divide-x divide-white/10">
        <div className="flex flex-col items-center px-6 flex-1">
          <div className="text-[10px] font-mono text-cyan/60 mb-2 tracking-widest uppercase">Analysis Rate</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono text-white font-light">
              <NumberFlow value={stats.fps} format={{ maximumFractionDigits: 0 }} />
            </span>
            <span className="text-sm font-mono text-cyan/50">fps</span>
          </div>
        </div>

        <div className="flex flex-col items-center px-6 flex-1">
          <div className="text-[10px] font-mono text-cyan/60 mb-2 tracking-widest uppercase">Sensor Inputs</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono text-white font-light">
              <NumberFlow value={stats.dof} format={{ maximumFractionDigits: 0 }} />
            </span>
            <span className="text-sm font-mono text-green-400/60">DOF</span>
          </div>
        </div>

        <div className="flex flex-col items-center px-6 flex-1">
          <div className="text-[10px] font-mono text-cyan/60 mb-2 tracking-widest uppercase">Human Limit</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono text-white font-light">
              <NumberFlow value={stats.humanVel} format={{ maximumFractionDigits: 0 }} />
            </span>
            <span className="text-sm font-mono text-cyan/50">cm/s</span>
          </div>
        </div>

        <div className="flex flex-col items-center px-6 flex-1">
          <div className="text-[10px] font-mono text-rose-500/80 tracking-widest uppercase mb-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            Fake Peak
          </div>
          <div className="flex items-baseline gap-1 text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">
            <span className="text-sm font-mono mr-1">&gt;</span>
            <span className="text-3xl font-mono font-bold">
              <NumberFlow value={stats.fakeVel} format={{ maximumFractionDigits: 0 }} />
            </span>
            <span className="text-sm font-mono">cm/s</span>
          </div>
        </div>

        <div className="flex flex-col items-center px-6 flex-1 border-r-0">
          <div className="text-[10px] font-mono text-cyan/60 mb-2 tracking-widest uppercase">Confidence</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono text-cyan-300 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
              <NumberFlow value={stats.conf} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />
            </span>
            <span className="text-xl font-mono text-cyan-300">%</span>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};
