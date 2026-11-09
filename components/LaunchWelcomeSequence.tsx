'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { TextAnimate } from '@/components/ui/TextAnimate';

interface LaunchWelcomeSequenceProps {
  onComplete: () => void;
  speedMultiplier?: number;
}

export const LaunchWelcomeSequence: React.FC<LaunchWelcomeSequenceProps> = ({
  onComplete,
  speedMultiplier = 1,
}) => {
  const [step, setStep] = useState<number>(0);
  const [isExiting, setIsExiting] = useState(false);

  // Referencias estables para evitar re-montajes y bucles infinitos
  const hasTriggeredRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const speedRef = useRef(speedMultiplier);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    speedRef.current = speedMultiplier;
  }, [onComplete, speedMultiplier]);

  const advanceToLoading = useCallback(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setIsExiting(true);

    setTimeout(() => {
      onCompleteRef.current();
    }, 450);
  }, []);

  useEffect(() => {
    const pace = 1 / Math.max(0.2, speedRef.current);

    // 1. Aparece primera burbuja
    const t1 = setTimeout(() => {
      setStep(1);
    }, 150 * pace);

    // 2. Aparece segunda burbuja
    const t2 = setTimeout(() => {
      setStep(2);
    }, 1100 * pace);

    // 3. Avance 100% automático y fluido a la pantalla de carga (sin botones ni prompts)
    const t3 = setTimeout(() => {
      advanceToLoading();
    }, 3100 * pace);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [advanceToLoading]);

  // Si el usuario toca la pantalla o pulsa cualquier tecla, avanza de inmediato
  const handleUserTap = () => {
    advanceToLoading();
  };

  useEffect(() => {
    const handleKeyDown = () => {
      advanceToLoading();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceToLoading]);

  return (
    <div
      onClick={handleUserTap}
      className={`fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-[#f5f5f7] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 p-6 sm:p-10 select-none overflow-hidden transition-all duration-500 ease-out cursor-pointer antialiased ${
        isExiting ? 'opacity-0 scale-95 blur-xs pointer-events-none' : 'animate-in fade-in duration-300'
      }`}
    >
      {/* 1. Encabezado sobrio y minimalista */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between relative z-10 pt-2 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 flex items-center justify-center shadow-xs">
            <Image
              src="/logo.png"
              alt="SMR2 Logo"
              width={22}
              height={22}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-200">
              2º SMR
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              Aula: Ni puta idea
            </div>
          </div>
        </div>

        {/* Indicador de estado sobrio */}
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md px-3 py-1 text-[10px] font-mono text-neutral-600 dark:text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="tracking-widest uppercase">Portal Activo</span>
        </div>
      </header>

      {/* 2. Burbujas de Cult UI limpias con TextAnimate */}
      <main className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center justify-center text-center space-y-4 sm:space-y-5 relative z-10 py-6">
        {/* Burbuja Principal 1 */}
        {step >= 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
            <SpeechBubble variant="light">
              <TextAnimate
                text="¡Bienvenidos a 2º SMR!"
                type="calmInUp"
                delay={0.05}
                animate={true}
              />
            </SpeechBubble>
          </div>
        )}

        {/* Burbuja Secundaria 2 */}
        {step >= 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
            <SpeechBubble variant="dark">
              <TextAnimate
                text="El portal ya es vuestro."
                type="shiftInUp"
                delay={0.05}
                animate={true}
              />
            </SpeechBubble>
          </div>
        )}
      </main>

      {/* 3. Pie Editorial Minimalista */}
      <footer className="w-full max-w-2xl mx-auto flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-900 text-[11px] text-neutral-500 font-mono select-none">
        <span>Desarrollado por JuanFe y David</span>
        <span className="text-neutral-600">Cargando sistema...</span>
      </footer>
    </div>
  );
};

export default LaunchWelcomeSequence;
