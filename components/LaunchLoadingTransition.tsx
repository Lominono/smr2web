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
  const [phase, setPhase] = useState<'loading' | 'easter_egg'>('loading');
  const [isMacExiting, setIsMacExiting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [percent, setPercent] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Pre-carga inmediata de la imagen del easter egg para que aparezca al instante sin retardo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const img = new window.Image();
      img.src = '/easter-egg.jpg';
    }
  }, []);

  // Duración de la carga Mac: exactamente 5 segundos (5000ms)
  const durationMs = Math.round(5000 / Math.max(0.2, speedMultiplier));
  // Duración en pantalla del easter egg antes de desvanecerse hacia el login
  const easterEggDurationMs = Math.round(2500 / Math.max(0.2, speedMultiplier));

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

    // 1. Desvanecer pantalla de Mac al alcanzar el 100%
    const macExitTimer = setTimeout(() => {
      setIsMacExiting(true);
    }, Math.max(100, durationMs - 300));

    // 2. Revelar el easter egg fotográfico tras la animación del Mac
    const easterEggTimer = setTimeout(() => {
      setPhase('easter_egg');
    }, durationMs);

    // 3. Iniciar el desvanecimiento suave hacia el inicio de sesión
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, durationMs + easterEggDurationMs);

    // 4. Concluir transición y transferir control total a AuthGate
    const finishTimer = setTimeout(() => {
      onCompleteRef.current();
    }, durationMs + easterEggDurationMs + 800);

    return () => {
      clearInterval(interval);
      clearTimeout(macExitTimer);
      clearTimeout(easterEggTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, easterEggDurationMs]);

  // Si el usuario hace clic durante el easter egg, desvanece suavemente de inmediato
  const handleEasterEggClick = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onCompleteRef.current();
    }, 700);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090b] text-neutral-100 p-6 select-none overflow-hidden transition-all duration-800 ease-out antialiased ${
        isExiting ? 'opacity-0 scale-98 blur-xs pointer-events-none' : 'animate-in fade-in duration-300'
      }`}
    >
      {/* Luz ambiental sutil detrás */}
      <div
        className={`absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-3xl pointer-events-none -translate-y-6 transition-all duration-700 ${
          phase === 'easter_egg' ? 'bg-pink-500/15 scale-125' : 'bg-neutral-800/20'
        }`}
      />

      {/* FASE 1: Animación de Mac con barra de carga */}
      {phase === 'loading' && (
        <div
          className={`relative z-10 flex flex-col items-center text-center max-w-sm sm:max-w-md mx-auto transition-all duration-300 ease-out ${
            isMacExiting ? 'opacity-0 scale-95 blur-xs' : 'opacity-100 scale-100'
          }`}
        >
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
      )}

      {/* FASE 2: Easter Egg fotográfico tras la animación del Mac */}
      {phase === 'easter_egg' && (
        <div
          onClick={handleEasterEggClick}
          className="relative z-10 flex flex-col items-center text-center max-w-xs sm:max-w-sm md:max-w-md mx-auto cursor-pointer animate-in fade-in zoom-in-95 duration-500 ease-out"
          title="Haz clic para continuar"
        >
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-neutral-700/60 ring-1 ring-white/10 max-h-[70vh] bg-neutral-950">
            <Image
              src="/easter-egg.jpg"
              alt="Easter Egg SMR2"
              width={480}
              height={420}
              className="object-cover w-full h-auto max-h-[70vh] transition-transform duration-700 ease-out hover:scale-[1.02]"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LaunchLoadingTransition;
