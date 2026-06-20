import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Grid / frame in
      setTimeout(() => setPhase(2), 1500),  // Stats card in
      setTimeout(() => setPhase(3), 3500),  // Sub-stats stagger in
      setTimeout(() => setPhase(4), 6000),  // Asset logos / types
      setTimeout(() => setPhase(5), 10500), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center p-24 z-10"
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: "0%", opacity: 1 }}
      exit={{ x: "-50%", opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-1/2 flex flex-col gap-8 pr-16">
        <motion.div
          className="h-1 w-16 bg-primary"
          initial={{ scaleX: 0, originX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.h2 
          className="text-5xl font-bold text-text-primary leading-tight"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Secure Multi-Asset<br/>Portfolio Management
        </motion.h2>
        <motion.p 
          className="text-xl text-text-secondary"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          KYC-protected Send, Receive, Withdraw, and Trade.
        </motion.p>

        <div className="flex gap-4 mt-8">
          {['BTC', 'ETH', 'USDT', 'SOL'].map((asset, i) => (
            <motion.div 
              key={asset}
              className="px-6 py-3 rounded-full border border-primary/30 bg-bg-light/50 backdrop-blur text-primary font-mono text-sm"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={phase >= 4 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.5, delay: phase >= 4 ? i * 0.1 : 0, type: "spring" }}
            >
              {asset}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="w-1/2 relative h-full flex items-center justify-center">
        <motion.div 
          className="w-full max-w-lg aspect-[4/3] rounded-2xl border border-white/10 bg-bg-light/40 backdrop-blur-md p-10 flex flex-col justify-between overflow-hidden relative"
          initial={{ opacity: 0, rotateY: 30, z: -100 }}
          animate={phase >= 2 ? { opacity: 1, rotateY: 0, z: 0 } : { opacity: 0, rotateY: 30, z: -100 }}
          transition={{ duration: 1.2, type: "spring", bounce: 0.2 }}
          style={{ perspective: 1000 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full" />
          
          <div>
            <motion.p 
              className="text-sm text-text-muted font-mono mb-2"
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
            >
              TOTAL ASSETS SECURED
            </motion.p>
            <motion.h3 
              className="text-6xl font-bold text-white tracking-tighter"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8 }}
            >
              $2.47B
            </motion.h3>
            <motion.p 
              className="text-success font-mono mt-2"
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.3 }}
            >
              +12.4% 24h
            </motion.p>
          </div>

          <div className="h-1/2 flex items-end">
            {/* Abstract chart bars */}
            <div className="flex gap-2 w-full items-end h-full pt-8">
              {[40, 70, 45, 90, 65, 100, 85].map((h, i) => (
                <motion.div 
                  key={i}
                  className="flex-1 bg-primary/80 rounded-t-sm"
                  initial={{ height: 0 }}
                  animate={phase >= 3 ? { height: `${h}%` } : { height: 0 }}
                  transition={{ duration: 1, delay: phase >= 3 ? 0.5 + (i * 0.1) : 0, ease: "easeOut" }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}