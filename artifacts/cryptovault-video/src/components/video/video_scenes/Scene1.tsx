import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Vault Icon draws
      setTimeout(() => setPhase(2), 2000),  // CryptoVault text reveals
      setTimeout(() => setPhase(3), 4500),  // Tagline
      setTimeout(() => setPhase(4), 8500),  // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Vault Logo */}
        <motion.svg 
          viewBox="0 0 100 100" 
          className="w-32 h-32 mb-8 stroke-primary fill-none"
          strokeWidth="3"
        >
          <motion.rect 
            x="15" y="15" width="70" height="70" rx="15"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={phase >= 1 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
          <motion.path 
            d="M 65 35 C 50 20, 30 35, 30 50 C 30 65, 50 80, 65 65"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={phase >= 1 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
          />
          <motion.circle 
            cx="50" cy="50" r="5"
            className="fill-primary"
            initial={{ scale: 0 }}
            animate={phase >= 1 ? { scale: 1 } : { scale: 0 }}
            transition={{ duration: 0.5, delay: 1.5, type: "spring" }}
          />
        </motion.svg>

        <motion.h1 
          className="text-7xl font-bold tracking-tight text-text-primary"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          CryptoVault
        </motion.h1>

        <div className="mt-8 overflow-hidden h-20">
          <motion.p 
            className="text-2xl text-text-secondary font-light max-w-2xl text-center"
            initial={{ opacity: 0, y: "100%" }}
            animate={phase >= 3 ? { opacity: 1, y: "0%" } : { opacity: 0, y: "100%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            The secure operating console for digital asset management & recovery.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}