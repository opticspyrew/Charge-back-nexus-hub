import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Badges fade in
      setTimeout(() => setPhase(2), 2000),  // Institutional text
      setTimeout(() => setPhase(3), 5000),  // Wipe to final logo lockup
      setTimeout(() => setPhase(4), 6500),  // Final tagline
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-bg-dark z-20"
      initial={{ clipPath: "circle(0% at 50% 50%)" }}
      animate={{ clipPath: "circle(150% at 50% 50%)" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* Phases 1 & 2: Trust */}
      {phase < 3 && (
        <div className="flex flex-col items-center text-center px-12 absolute inset-0 justify-center">
          <motion.div 
            className="flex gap-8 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8 }}
          >
            {['SOC 2 Type II', 'ISO 27001', 'AML/KYC Ready'].map((badge, i) => (
              <div key={i} className="px-6 py-3 border border-white/20 rounded font-mono text-sm text-text-secondary bg-white/5 backdrop-blur">
                {badge}
              </div>
            ))}
          </motion.div>

          <motion.h2 
            className="text-4xl font-light text-white max-w-3xl leading-relaxed"
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={phase >= 2 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 1 }}
          >
            Operated under formal controls —<br/>trusted by firms, counsel, and individuals.
          </motion.h2>
        </div>
      )}

      {/* Phases 3 & 4: Outro Lockup */}
      {phase >= 3 && (
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* Hex Shield / Vault mark for recovery side */}
          <motion.svg 
            viewBox="0 0 100 100" 
            className="w-24 h-24 mb-6 stroke-primary fill-none"
            strokeWidth="2"
            initial={{ scale: 0.8, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 1, type: "spring" }}
          >
            <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" />
            <circle cx="50" cy="50" r="15" className="fill-primary/20" />
          </motion.svg>

          <motion.h1 
            className="text-6xl font-bold tracking-tight text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            CryptoVault
          </motion.h1>

          <motion.div
            className="h-px w-24 bg-primary/50 mb-6"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />

          <motion.p 
            className="text-xl text-primary tracking-widest uppercase text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.8 }}
          >
            Measured. Transparent. Ongoing.
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  );
}