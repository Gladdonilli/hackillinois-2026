import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SoundEngine } from '@/audio/SoundEngine'

interface IntroSequenceProps {
  onComplete: () => void;
}

export function IntroSequence({ onComplete }: IntroSequenceProps) {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    try {
      if (!SoundEngine.isInitialized()) {
        SoundEngine.init();
      }
    } catch (e) {
      console.warn("AudioContext init failed", e);
    }

    const timer = setTimeout(() => {
      setComplete(true);
      setTimeout(onComplete, 1200); // Wait for fade out
    }, 5500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const text = "LARYNX.";
  const subtitleTxt = "Deepfake Voice Detection via Articulatory Physics";
  const readoutLines = [
    "> ARTICULATORY PHYSICS ENGINE ... OK",
    "> EMA SENSOR ARRAY [6x] ... CALIBRATED",
    "> DEEPFAKE DETECTION MODEL ... LOADED",
  ];

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.8,
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

  const scanlines = [
    { delay: 0, duration: 0.8, opacity: [0, 1, 1, 0], height: "2px", color: "#00FFFF" },
    { delay: 0.1, duration: 0.7, opacity: [0, 0.8, 0.8, 0], height: "1px", color: "#FFFFFF" },
    { delay: 0.2, duration: 0.9, opacity: [0, 0.5, 0.5, 0], height: "4px", color: "#0088FF" },
  ];
  return (
    <AnimatePresence>
      {!complete && (
        <motion.div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black grid-bg pointer-events-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Scanline Sweep */}
          {scanlines.map((line, i) => (
            <motion.div 
              key={`scanline-${i}`}
              className="absolute top-0 left-0 w-full"
              style={{
                height: line.height,
                background: `linear-gradient(90deg, transparent 0%, ${line.color} 50%, transparent 100%)`,
                boxShadow: `0 0 10px ${line.color}, 0 0 20px ${line.color}`
              }}
              initial={{ y: "-10vh", opacity: 0 }}
              animate={{ y: "110vh", opacity: line.opacity }}
              transition={{ delay: line.delay, duration: line.duration, ease: "linear" }}
            />
          ))}

          <motion.div
            className="relative mb-2"
            animate={{ x: [0, -10, 8, -5, 5, 0], opacity: [1, 0.6, 1, 0.8, 1, 1] }}
            transition={{ delay: 1.5, duration: 0.2, ease: "linear" }}
          >
            <motion.div 
              className="font-mono text-5xl tracking-[0.3em] uppercase text-white glitch-text"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              data-text={text}
            >
              {text.split('').map((char, index) => (
                <motion.span 
                  key={index} 
                  variants={charVariants}
                  onAnimationStart={playBeepSafe}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          <div className="font-sans text-sm tracking-[0.2em] text-[#666666] uppercase relative mb-8 flex flex-col items-center">
            <div className="flex items-center">
              {subtitleTxt.split('').map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                transition={{ delay: 1.5 + i * 0.03, duration: 0.01 }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: 1.5, repeat: Infinity, duration: 0.8 }}
                className="ml-1 text-[#00FFFF]"
              >
                █
              </motion.span>
            </div>
            
            <motion.div 
              className="absolute -bottom-4 left-1/2 h-[1px] bg-[#00FFFF]"
              initial={{ width: 0, x: "-50%", opacity: 0 }}
              animate={{ width: "16rem", opacity: 0.8 }}
              transition={{ delay: 2.0, duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Data Readout */}
          <div className="flex flex-col items-start gap-1 font-mono text-[10px] tracking-widest text-cyan mt-2 w-[320px]">
            {readoutLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, textShadow: "0 0 20px #FFFFFF", filter: "brightness(2)" }}
                animate={{ opacity: 0.6, textShadow: "0 0 0px #FFFFFF", filter: "brightness(1)" }}
                transition={{ delay: 2.5 + i * 0.15, duration: 0.3 }}
              >
                {line}
              </motion.div>
            ))}
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
