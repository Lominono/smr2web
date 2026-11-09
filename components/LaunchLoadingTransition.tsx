'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { MacScreen } from '@/components/ui/MacScreen';
import { TextAnimate } from '@/components/ui/TextAnimate';
import { Sparkles, Heart } from 'lucide-react';

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
  const [isMacUnmounted, setIsMacUnmounted] = useState(false);
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

  // Duración de la animación del Mac: 4.8 segundos (4800ms)
  const durationMs = Math.round(4800 / Math.max(0.2, speedMultiplier));
  // Duración del Easter Egg antes del desvanecimiento suave (3000ms)
  const easterEggDurationMs = Math.round(3000 / Math.max(0.2, speedMultiplier));

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
    }, 25);

    // 1. Iniciar salida suave del Mac 500ms antes del final
    const macExitTimer = setTimeout(() => {
      setIsMacExiting(true);
    }, Math.max(100, durationMs - 500));

    // 2. Montar el Easter Egg fotográfico con solapamiento suave
    const eggMountTimer = setTimeout(() => {
      setEasterEggVisible(true);
      // Desmontar el Mac del layout poco después del crossfade
      setTimeout(() => setIsMacUnmounted(true), 400);
    }, Math.max(100, durationMs - 150));

    // 3. Activar animación de entrada fluida del Easter Egg
    const eggEnterTimer = setTimeout(() => {
      setEasterEggEntered(true);
    }, durationMs);

    // 4. Iniciar desvanecimiento cinematográfico de salida hacia el login
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, durationMs + easterEggDurationMs);

    // 5. Concluir completamente y montar el login
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

  // Si el usuario toca la foto, se desvanece suavemente al instante
  const handleEasterEggClick = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onCompleteRef.current();
    }, 700);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f5f5f7] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 p-4 sm:p-6 select-none overflow-hidden transition-all duration-1000 ease-in-out antialiased ${
        isExiting ? 'opacity-0 scale-95 blur-md pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Luz ambiental sutil detrás - adaptable a modo claro y oscuro */}
      <div
        className={`absolute w-80 sm:w-[480px] h-80 sm:h-[480px] rounded-full blur-3xl pointer-events-none -translate-y-4 transition-all duration-1000 ease-out ${
          easterEggVisible
            ? 'bg-gradient-to-tr from-pink-300/35 via-rose-200/40 to-amber-100/35 dark:from-rose-500/25 dark:via-pink-600/20 dark:to-neutral-950 scale-125 opacity-100'
            : 'bg-neutral-300/40 dark:bg-neutral-800/25 scale-100 opacity-60'
        }`}
      />

      {/* FASE 1: Animación de Mac con barra de carga de alto contraste */}
      {!isMacUnmounted && (
        <div
          className={`relative z-10 flex flex-col items-center text-center max-w-sm sm:max-w-md mx-auto transition-all duration-700 ease-out ${
            isMacExiting
              ? 'opacity-0 scale-95 blur-xs -translate-y-3 pointer-events-none'
              : 'opacity-100 scale-100 translate-y-0'
          }`}
        >
          {/* MacScreen con renderizado por hardware */}
          <div className="transform hover:scale-[1.01] transition-transform duration-500 ease-out drop-shadow-sm">
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
                className="text-xs sm:text-sm font-mono tracking-tight text-neutral-800 dark:text-neutral-200 font-medium"
              />
            </div>

            {/* Barra de progreso de alto contraste perfecta en modo claro y oscuro */}
            <div className="w-52 sm:w-64 space-y-2">
              <div className="w-full h-[4px] bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-300/90 dark:border-neutral-700/80 shadow-xs">
                <div
                  className="h-full bg-neutral-950 dark:bg-neutral-50 rounded-full animate-progress-fill-5s transition-all"
                  style={{
                    animationDuration: `${durationMs}ms`,
                    animationTimingFunction: 'linear',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                <span>SMR2 OS</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{percent}%</span>
                <span>Iniciando</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FASE 2: Easter Egg con entrada ultra-suave y presentación Apple impecable */}
      {easterEggVisible && (
        <div
          onClick={handleEasterEggClick}
          className={`relative z-20 flex flex-col items-center text-center cursor-pointer transition-all duration-1000 ease-out ${
            easterEggEntered && !isExiting
              ? 'opacity-100 scale-100 translate-y-0 blur-0'
              : 'opacity-0 scale-90 translate-y-6 blur-md'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          title="Toca para continuar"
        >
          {/* Tarjeta fotográfica Apple con marco pulido tanto en modo claro como oscuro */}
          <div className="relative p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-neutral-900/90 border border-neutral-200/90 dark:border-neutral-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl max-h-[70vh] max-w-[88vw] sm:max-w-sm md:max-w-md transition-transform duration-700 ease-out hover:scale-[1.015] active:scale-[0.99]">
            <div className="overflow-hidden rounded-xl sm:rounded-2xl ring-1 ring-black/5 dark:ring-white/10 bg-neutral-100 dark:bg-neutral-950">
              <Image
                src="/easter-egg.jpg"
                alt="Easter Egg SMR2"
                width={480}
                height={420}
                className="object-cover w-full h-auto max-h-[60vh] select-none pointer-events-none"
                priority
              />
            </div>

            {/* Pie de foto Apple con tipografía limpia y armónica */}
            <div className="pt-2 sm:pt-2.5 pb-0.5 flex items-center justify-between px-1 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                <span>2º SMR</span>
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                Toca para entrar
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaunchLoadingTransition;
