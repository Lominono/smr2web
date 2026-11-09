'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
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
  const [percent, setPercent] = useState(0);
  const [isMacExiting, setIsMacExiting] = useState(false);
  const [easterEggVisible, setEasterEggVisible] = useState(false);
  const [easterEggEntered, setEasterEggEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Pre-carga anticipada de la imagen para garantizar fluidez absoluta sin tirones
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const img = new window.Image();
      img.src = '/easter-egg.jpg';
    }
  }, []);

  // Duración de la animación del Mac: exactamente 5 segundos (5000ms)
  const durationMs = Math.round(5000 / Math.max(0.2, speedMultiplier));
  // Duración del Easter Egg antes del desvanecimiento suave
  const easterEggDurationMs = Math.round(2600 / Math.max(0.2, speedMultiplier));

  useEffect(() => {
    const startTime = Date.now();

    // Actualizador fluido y continuo del porcentaje
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      setPercent(currentPct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
      }
    }, 30);

    // 1. Desvanecer pantalla del Mac suavemente hacia el final de la barra
    const macExitTimer = setTimeout(() => {
      setIsMacExiting(true);
    }, Math.max(100, durationMs - 400));

    // 2. Montar el Easter Egg fotográfico al concluir la carga
    const eggMountTimer = setTimeout(() => {
      setEasterEggVisible(true);
    }, durationMs);

    // 3. Activar animación de entrada suave del Easter Egg
    const eggEnterTimer = setTimeout(() => {
      setEasterEggEntered(true);
    }, durationMs + 50);

    // 4. Iniciar desvanecimiento suave de toda la pantalla hacia el final
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, durationMs + easterEggDurationMs);

    // 5. Concluir completamente todas las animaciones y dar paso al login
    const finishTimer = setTimeout(() => {
      onCompleteRef.current();
    }, durationMs + easterEggDurationMs + 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(macExitTimer);
      clearTimeout(eggMountTimer);
      clearTimeout(eggEnterTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, easterEggDurationMs]);

  // Si el usuario toca la foto, se desvanece suavemente de inmediato
  const handleEasterEggClick = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onCompleteRef.current();
    }, 800);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f5f5f7] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 p-6 select-none overflow-hidden transition-all duration-1000 ease-in-out antialiased ${
        isExiting ? 'opacity-0 scale-95 blur-md pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Luz ambiental sutil detrás - adaptable a modo claro y oscuro */}
      <div
        className={`absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-3xl pointer-events-none -translate-y-6 transition-all duration-1000 ease-in-out ${
          easterEggVisible
            ? 'bg-rose-400/25 dark:bg-rose-500/20 scale-125'
            : 'bg-neutral-300/40 dark:bg-neutral-800/30'
        }`}
      />

      {/* FASE 1: Animación de Mac con barra de carga de alto contraste */}
      {!easterEggVisible && (
        <div
          className={`relative z-10 flex flex-col items-center text-center max-w-sm sm:max-w-md mx-auto transition-all duration-700 ease-in-out ${
            isMacExiting
              ? 'opacity-0 scale-95 blur-sm -translate-y-2 pointer-events-none'
              : 'opacity-100 scale-100 translate-y-0'
          }`}
        >
          {/* MacScreen con renderizado por hardware */}
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
                className="text-xs sm:text-sm font-mono tracking-tight text-neutral-700 dark:text-neutral-300 font-medium"
              />
            </div>

            {/* Barra de progreso de alto contraste perfecta en modo claro y oscuro */}
            <div className="w-48 sm:w-60 space-y-2">
              <div className="w-full h-[3px] bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-300/80 dark:border-neutral-700/80 shadow-inner">
                <div
                  className="h-full bg-neutral-900 dark:bg-neutral-100 rounded-full animate-progress-fill-5s"
                  style={{
                    animationDuration: `${durationMs}ms`,
                    animationTimingFunction: 'linear',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                <span>SMR2 OS</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{percent}%</span>
                <span>Iniciando</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FASE 2: Easter Egg con entrada ultra-suave y salida cinematográfica */}
      {easterEggVisible && (
        <div
          onClick={handleEasterEggClick}
          className={`relative z-10 flex flex-col items-center text-center cursor-pointer transition-all duration-800 ease-out ${
            easterEggEntered && !isExiting
              ? 'opacity-100 scale-100 translate-y-0 blur-0'
              : 'opacity-0 scale-90 translate-y-4 blur-sm'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          title="Toca para continuar"
        >
          {/* Tarjeta fotográfica con acabado Apple, compatible con modo claro y oscuro */}
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/90 dark:border-neutral-700/60 ring-1 ring-black/5 dark:ring-white/10 bg-white dark:bg-neutral-900 max-h-[65vh] max-w-[85vw] sm:max-w-sm md:max-w-md transition-transform duration-700 ease-out hover:scale-[1.02]">
            <Image
              src="/easter-egg.jpg"
              alt="Easter Egg SMR2"
              width={480}
              height={420}
              className="object-cover w-full h-auto max-h-[65vh] select-none pointer-events-none"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LaunchLoadingTransition;
