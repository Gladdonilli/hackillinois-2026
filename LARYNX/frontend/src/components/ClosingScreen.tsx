import { motion } from 'motion/react'
import { SoundEngine } from '@/audio/SoundEngine'

interface ClosingScreenProps {
  onReset: () => void;
}

export function ClosingScreen({ onReset }: ClosingScreenProps) {
  const title = "LARYNX";
  const subtitle = "Deepfake Voice Detection via Articulatory Physics";
  
  const sponsors = [
    { name: "Modal", track: "Best AI Inference" },
    { name: "Cloudflare", track: "Pages + Workers" },
    { name: "OpenAI", track: "TTS Generation" },
    { name: "Supermemory", track: "Analysis History" }
  ];

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.5,
      }
    }
  };

  const charVariants = {
    hidden: { opacity: 0, textShadow: "0 0 0px #00ffff" },
    visible: { 
      opacity: 1, 
      textShadow: ["0 0 20px #00ffff", "0 0 0px #00ffff"],
      transition: { duration: 0.2 }
    }
  };

  const playBeepSafe = () => {
    try {
      SoundEngine.playBeep();
    } catch (e) {
      // ignore
    }
  };

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050510] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none scanline-overlay opacity-20" />
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Title Section */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.h1 
          className="font-mono text-7xl md:text-8xl tracking-[0.4em] uppercase text-white glitch-text mb-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          data-text={title}
        >
          {title.split('').map((char, index) => (
            <motion.span 
              key={index} 
              variants={charVariants}
              onAnimationStart={playBeepSafe}
            >
              {char}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p 
          className="font-sans text-lg md:text-xl tracking-[0.2em] text-cyan-400/80 uppercase mb-16 text-center px-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          {subtitle}
        </motion.p>
      </div>

      {/* Sponsor Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-20 z-10 px-8 max-w-5xl">
        {sponsors.map((sponsor, i) => (
          <motion.div 
            key={sponsor.name}
            className="flex flex-col items-center p-4 border border-cyan-900/30 bg-black/40 backdrop-blur-sm hud-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 + i * 0.2, duration: 0.5 }}
          >
            <span className="text-white font-mono text-lg tracking-widest mb-1 text-glow-cyan">{sponsor.name}</span>
            <span className="text-cyan-500/50 font-mono text-[10px] uppercase tracking-tighter text-center">{sponsor.track}</span>
          </motion.div>
        ))}
      </div>

      {/* Team Info */}
      <motion.div 
        className="mb-12 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 0.8 }}
      >
        <span className="font-mono text-sm tracking-[0.5em] text-white/40 uppercase">HackIllinois 2026</span>
      </motion.div>

      {/* CTA Button */}
      <motion.button
        onClick={onReset}
        className="px-10 py-4 border border-cyan-500/50 bg-cyan-500/5 hover:bg-cyan-500/20 text-cyan-400 font-mono tracking-[0.3em] uppercase transition-all duration-300 group z-10 hover:shadow-[0_0_30px_rgba(0,255,255,0.2)]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 3.2, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Try it yourself <span className="inline-block transition-transform group-hover:translate-x-2">→</span>
      </motion.button>

      {/* Decorative HUD corners */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t border-l border-cyan-500/30 pointer-events-none" />
      <div className="absolute top-8 right-8 w-12 h-12 border-t border-r border-cyan-500/30 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b border-l border-cyan-500/30 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b border-r border-cyan-500/30 pointer-events-none" />
    </motion.div>
  );
}
