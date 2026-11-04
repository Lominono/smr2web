'use client';

import React, { useState, useEffect } from 'react';
import { MacScreen } from '@/components/ui/MacScreen';
import { TextAnimate } from '@/components/ui/TextAnimate';

interface LaunchLoadingTransitionProps {
  onComplete: () => void;
  speedMultiplier?: number;
}

export const LaunchLoadingTransition: React.FC<LaunchLoadingTransitionProps> = ({
  onComplete,
  speedMultiplier = 1,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  const durationMs = 3500 / Math.max(0.2, speedMultiplier);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(currentPct);

      if (elapsed >= durationMs - 400 && !isExiting) {
        setIsExiting(true);
      }

      if (elapsed >= durationMs) {
        clearInterval(interval);
        onComplete();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [durationMs, isExiting, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090b] text-neutral-100 p-6 select-none overflow-hidden transition-all duration-500 antialiased ${
        isExiting ? 'opacity-0 scale-95 blur-xs transition-all duration-400 ease-out pointer-events-none' : 'animate-in fade-in duration-400'
      }`}
    >
      {/* Luz ambiental sutil detrás del Mac */}
      <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-neutral-800/20 blur-3xl pointer-events-none -translate-y-8" />

      {/* Contenedor central cinemático */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto">
        {/* Cult UI MacScreen Frame */}
        <div className="transform hover:scale-[1.01] transition-transform duration-500 ease-out">
          <MacScreen
            gifUrl="/component-frames/mac-screen-content.gif"
            alt="Inicializando SMR2"
          />
        </div>

        {/* Text Animate de Cult UI */}
        <div className="mt-8 sm:mt-10 space-y-3 flex flex-col items-center">
          <div className="min-h-[28px] sm:min-h-[32px] flex items-center justify-center">
            <TextAnimate
              text="Espere un momento, entrando al registro..."
              type="calmInUp"
              delay={0.1}
              animate={true}
              className="text-xs sm:text-sm font-mono tracking-tight text-neutral-300 font-medium"
            />
          </div>

          {/* Barra de progreso minimalista (Hairline) */}
          <div className="w-48 sm:w-64 space-y-2">
            <div className="w-full h-[2px] bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/60">
              <div
                className="h-full bg-neutral-300 transition-all duration-75 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-600">
              <span>SMR2 OS</span>
              <span>{progress}%</span>
              <span>Cargando</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchLoadingTransition;
