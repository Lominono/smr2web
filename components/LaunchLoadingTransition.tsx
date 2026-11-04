'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [percent, setPercent] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Duración solicitada: exactamente 5 segundos (5000ms)
  const durationMs = Math.round(5000 / Math.max(0.2, speedMultiplier));
  const exitLeadMs = Math.round(450 / Math.max(0.2, speedMultiplier));

  useEffect(() => {
    const startTime = Date.now();

    // Actualizador fluido del porcentaje numérico
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      setPercent(currentPct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
      }
    }, 40);

    // Desvanecimiento suave antes de finalizar
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(100, durationMs - exitLeadMs));

    // Finalización a los 5 segundos
    const finishTimer = setTimeout(() => {
      onCompleteRef.current();
    }, durationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, exitLeadMs]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090b] text-neutral-100 p-6 select-none overflow-hidden transition-all duration-400 ease-out antialiased ${
        isExiting ? 'opacity-0 scale-95 blur-xs pointer-events-none' : 'animate-in fade-in duration-300'
      }`}
    >
      {/* Luz ambiental sutil detrás del Mac */}
      <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-neutral-800/20 blur-3xl pointer-events-none -translate-y-6" />

      {/* Contenedor central estático */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm sm:max-w-md mx-auto">
        {/* Cult UI MacScreen Memoizado con renderizado por hardware */}
        <div className="transform hover:scale-[1.01] transition-transform duration-500 ease-out">
          <MacScreen
            gifUrl="/component-frames/mac-screen-content.gif"
            alt="Inicializando SMR2"
          />
        </div>

        {/* Text Animate de Cult UI */}
        <div className="mt-7 sm:mt-9 space-y-3 flex flex-col items-center w-full">
          <div className="min-h-[26px] flex items-center justify-center">
            <TextAnimate
              text="Espere un momento, entrando al registro..."
              type="calmInUp"
              delay={0.05}
              animate={true}
              className="text-xs sm:text-sm font-mono tracking-tight text-neutral-300 font-medium"
            />
          </div>

          {/* Barra de progreso de 5 segundos garantizada por keyframe CSS */}
          <div className="w-48 sm:w-60 space-y-2">
            <div className="w-full h-[2.5px] bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80">
              <div
                className="h-full bg-neutral-200 rounded-full animate-progress-fill-5s"
                style={{
                  animationDuration: `${durationMs}ms`,
                  animationTimingFunction: 'linear',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-500">
              <span>SMR2 OS</span>
              <span>{percent}%</span>
              <span>Iniciando</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchLoadingTransition;
