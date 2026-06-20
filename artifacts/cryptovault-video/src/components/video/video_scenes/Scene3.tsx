import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Image / Nodes fade in
      setTimeout(() => setPhase(2), 2000),  // Intelligence text
      setTimeout(() => setPhase(3), 4000),  // Stats & Risk score
      setTimeout(() => setPhase(4), 6500),  // Forensic data mono text typing
      setTimeout(() => setPhase(5), 10500), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-row-reverse items-center p-24 z-10"
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ y: "-100%", opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-1/2 flex flex-col gap-8 pl-16 z-10">
        <motion.div
          className="h-1 w-16 bg-secondary"
          initial={{ scaleX: 0, originX: 0 }}
          animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.h2 
          className="text-5xl font-bold text-text-primary leading-tight"
          initial={{ opacity: 0, x: 30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{ duration: 0.8 }}
        >
          Forensic Blockchain<br/>Intelligence
        </motion.h2>
        <motion.p 
          className="text-xl text-text-secondary"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Read-only on-chain analysis. Audit-ready evidence packages.
        </motion.p>

        <div className="mt-8 space-y-4">
          <motion.div 
            className="flex justify-between border-b border-white/10 pb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-text-muted">Assets Traced</span>
            <span className="text-white font-mono text-xl">$482M</span>
          </motion.div>
          <motion.div 
            className="flex justify-between border-b border-white/10 pb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="text-text-muted">Cases Investigated</span>
            <span className="text-white font-mono text-xl">1,240+</span>
          </motion.div>
          <motion.div 
            className="flex justify-between pb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="text-text-muted">Chains Analyzed</span>
            <span className="text-white font-mono text-xl">17</span>
          </motion.div>
        </div>
      </div>

      <div className="w-1/2 relative h-full flex items-center justify-center">
        {/* Nodes Image */}
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ opacity: 0, filter: 'blur(20px)' }}
          animate={phase >= 1 ? { opacity: 0.8, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(20px)' }}
          transition={{ duration: 2 }}
        >
          <img 
            src={`${import.meta.env.BASE_URL}images/nodes.png`} 
            className="w-full h-full object-contain mix-blend-screen opacity-60"
            alt="" 
          />
        </motion.div>

        {/* Forensic Terminal Box */}
        <motion.div 
          className="w-full max-w-md bg-bg-dark/80 backdrop-blur-xl border border-secondary/50 rounded-lg p-6 font-mono text-sm relative z-10"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={phase >= 4 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <div className="flex gap-2 mb-4 border-b border-white/10 pb-4">
            <div className="w-3 h-3 rounded-full bg-error" />
            <div className="w-3 h-3 rounded-full bg-warning" />
            <div className="w-3 h-3 rounded-full bg-success" />
          </div>
          
          <div className="space-y-2 text-text-secondary">
            <p><span className="text-secondary">SYS></span> Init path-of-funds analysis</p>
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }} 
              transition={{ delay: 0.5 }}
            >
              <span className="text-secondary">SYS></span> Target: 0x7a2...9f1e
            </motion.p>
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }} 
              transition={{ delay: 1.0 }}
            >
              <span className="text-secondary">SYS></span> Risk Score: <span className="text-error font-bold">98/100 (HIGH)</span>
            </motion.p>
            <motion.p 
              className="text-primary mt-4"
              initial={{ opacity: 0 }} 
              animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }} 
              transition={{ delay: 1.5 }}
            >
              AI SUMMARY: Pattern matches known drainer tactic. Evidence package compiled (AES-256).
            </motion.p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}