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
  const [fillProgress, setFillProgress] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Duración sincronizada: 3200ms = exactamente 4 ciclos completos de 800ms de la animación
  const durationMs = Math.round(3200 / Math.max(0.2, speedMultiplier));
  const exitLeadMs = Math.round(380 / Math.max(0.2, speedMultiplier));

  useEffect(() => {
    // Inicia la barra de progreso con aceleración por GPU (0 re-renders de React)
    const animFrame = requestAnimationFrame(() => {
      setFillProgress(true);
    });

    // Desvanecimiento de salida suave antes del cambio
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(100, durationMs - exitLeadMs));

    // Finalización de la transición y paso a AuthGate
    const finishTimer = setTimeout(() => {
      onCompleteRef.current();
    }, durationMs);

    return () => {
      cancelAnimationFrame(animFrame);
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
      <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-neutral-800/25 blur-3xl pointer-events-none -translate-y-6" />

      {/* Contenedor central estático para no reiniciar el decodificador de imagen */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm sm:max-w-md mx-auto">
        {/* Cult UI MacScreen Memoizado */}
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

          {/* Barra de progreso minimalista fluida por hardware */}
          <div className="w-44 sm:w-56 space-y-2">
            <div className="w-full h-[2px] bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80">
              <div
                className="h-full bg-neutral-300 rounded-full"
                style={{
                  width: fillProgress ? '100%' : '0%',
                  transition: `width ${durationMs}ms cubic-bezier(0.2, 0.8, 0.4, 1)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-600">
              <span>SMR2 OS</span>
              <span>Cargando</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchLoadingTransition;
