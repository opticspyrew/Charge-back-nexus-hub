import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';

// Total runtime: ~46 seconds
export const SCENE_DURATIONS = {
  intro: 10000,       // 10s: Intro & Tagline
  portfolio: 12000,   // 12s: Portfolio & Secure Management
  forensics: 12000,   // 12s: Recovery & Forensics
  outro: 12000        // 12s: Trust & Outro
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: Scene1,
  portfolio: Scene2,
  forensics: Scene3,
  outro: Scene4,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-bg-dark text-text-primary">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          src={`${import.meta.env.BASE_URL}videos/cyber_flow.mp4`}
          autoPlay
          muted
          playsInline
          loop
        />

        <motion.div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/grid_texture.png)`, backgroundSize: 'cover' }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />

        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px] pointer-events-none mix-blend-screen"
          style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
          animate={{
            x: ['-20%', '10%', '-10%', '-20%'],
            y: ['-10%', '20%', '10%', '-10%'],
            opacity: [0.05, 0.1, 0.05],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
