'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const handleProceed = useCallback(() => {
    if (isExiting) return;
    clearAllTimers();
    setIsExiting(true);

    // Fade bajo suave antes de montar la pasarela de autenticación
    setTimeout(() => {
      onComplete();
    }, 480);
  }, [isExiting, onComplete]);

  useEffect(() => {
    clearAllTimers();

    const pace = 1 / Math.max(0.2, speedMultiplier);

    // Paso 1: Aparición de la primera burbuja con TextAnimate
    const t1 = setTimeout(() => {
      setStep(1);
    }, 150 * pace);

    // Paso 2: Segunda burbuja de diálogo
    const t2 = setTimeout(() => {
      setStep(2);
    }, 1250 * pace);

    // Paso 3: Revelar botón de acceso
    const t3 = setTimeout(() => {
      setStep(3);
    }, 2350 * pace);

    // Paso 4: Transición automática tras 7.5 segundos
    const t4 = setTimeout(() => {
      handleProceed();
    }, 7500 * pace);

    timersRef.current = [t1, t2, t3, t4];

    return () => clearAllTimers();
  }, [handleProceed, speedMultiplier]);

  // Tecla Enter o Espacio para continuar sin ratón
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleProceed]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-[#09090b] text-neutral-100 p-6 sm:p-10 select-none overflow-hidden transition-all duration-500 antialiased ${
        isExiting ? 'animate-fade-down-exit pointer-events-none' : 'animate-in fade-in duration-300'
      }`}
    >
      {/* 1. Encabezado sobrio y editorial */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between relative z-10 pt-2 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 p-1.5 flex items-center justify-center shadow-sm">
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
            <div className="text-xs font-semibold tracking-tight text-neutral-200">
              2º SMR
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              Aula: Ni puta idea
            </div>
          </div>
        </div>

        {/* Indicador de estado sobrio */}
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-3 py-1 text-[10px] font-mono text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="tracking-widest uppercase">Portal Activo</span>
        </div>
      </header>

      {/* 2. Cuerpo Principal: Burbujas de Cult UI con TextAnimate */}
      <main className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center justify-center text-center space-y-4 sm:space-y-5 relative z-10 py-6">
        {/* Burbuja Principal 1: Text Animate calmInUp */}
        {step >= 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
            <SpeechBubble variant="light">
              <TextAnimate
                text="¡2º SMR ya está en línea!"
                type="calmInUp"
                delay={0.05}
                animate={true}
              />
            </SpeechBubble>
          </div>
        )}

        {/* Burbuja Secundaria 2: Text Animate shiftInUp */}
        {step >= 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
            <SpeechBubble variant="dark">
              <TextAnimate
                text="Estamos felices de que podáis usar esta web."
                type="shiftInUp"
                delay={0.05}
                animate={true}
              />
            </SpeechBubble>
          </div>
        )}

        {/* Botón de Entrada Minimalista */}
        {step >= 3 && (
          <div className="pt-4 sm:pt-6 animate-in fade-in duration-300">
            <button
              type="button"
              onClick={handleProceed}
              autoFocus
              className="group px-6 py-3 rounded-full bg-white hover:bg-neutral-200 text-black font-semibold text-xs sm:text-sm tracking-tight flex items-center gap-2 shadow-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Acceder al portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </main>

      {/* 3. Pie Editorial Minimalista */}
      <footer className="w-full max-w-2xl mx-auto flex items-center justify-between pt-4 border-t border-neutral-900 text-[11px] text-neutral-500 font-mono select-none">
        <span>Desarrollado por JuanFe y David</span>
        <button
          type="button"
          onClick={handleProceed}
          className="hover:text-neutral-300 transition-colors cursor-pointer"
        >
          Saltar (Enter)
        </button>
      </footer>
    </div>
  );
};

export default LaunchWelcomeSequence;
