import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface IntroSequenceProps {
  onComplete: () => void;
}

export function IntroSequence({ onComplete }: IntroSequenceProps) {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setComplete(true);
      setTimeout(onComplete, 800); // Wait for fade out
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const text = "LARYNX.";

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.8, // Start typing after sweep
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

  return (
    <AnimatePresence>
      {!complete && (
        <motion.div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black pointer-events-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Scanline Sweep */}
          <motion.div 
            className="absolute top-0 left-0 w-full h-[2px]"
            style={{
              background: "linear-gradient(90deg, transparent 0%, #00FFFF 50%, transparent 100%)",
              boxShadow: "0 0 10px #00FFFF, 0 0 20px #00FFFF"
            }}
            initial={{ y: "-10vh", opacity: 0 }}
            animate={{ y: "110vh", opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.8, ease: "linear" }}
          />

          <motion.div 
            className="relative font-mono text-5xl tracking-[0.3em] uppercase text-white mb-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            data-text={text}
          >
            {text.split('').map((char, index) => (
              <motion.span key={index} variants={charVariants}>
                {char}
              </motion.span>
            ))}
          </motion.div>

          <motion.div
            className="font-sans text-sm tracking-[0.2em] text-[#666666] uppercase relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          >
            Deepfake Voice Detection via Articulatory Physics
            
            <motion.div 
              className="absolute -bottom-4 left-1/2 h-[1px] bg-[#00FFFF]"
              initial={{ width: 0, x: "-50%", opacity: 0 }}
              animate={{ width: "12rem", opacity: 0.8 }}
              transition={{ delay: 2.0, duration: 0.4, ease: "easeOut" }}
            />
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
