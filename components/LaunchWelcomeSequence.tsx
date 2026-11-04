'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { TextAnimate } from '@/components/ui/TextAnimate';
import { sound } from '@/lib/audio';

interface LaunchWelcomeSequenceProps {
  onComplete: () => void;
  speedMultiplier?: number;
  soundEnabled?: boolean;
}

export const LaunchWelcomeSequence: React.FC<LaunchWelcomeSequenceProps> = ({
  onComplete,
  speedMultiplier = 1,
  soundEnabled = true,
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
    if (soundEnabled) {
      try {
        sound.tap();
      } catch {}
    }
    setIsExiting(true);

    // Fade bajo: desvanecimiento suave hacia abajo antes de montar AuthGate
    setTimeout(() => {
      onComplete();
    }, 520);
  }, [isExiting, onComplete, soundEnabled]);

  useEffect(() => {
    clearAllTimers();
    if (soundEnabled) {
      try {
        sound.toastClink();
      } catch {}
    }

    const pace = 1 / Math.max(0.2, speedMultiplier);

    // Paso 1: Primera burbuja con TextAnimate
    const t1 = setTimeout(() => {
      setStep(1);
    }, 180 * pace);

    // Paso 2: Segunda burbuja con TextAnimate
    const t2 = setTimeout(() => {
      setStep(2);
      if (soundEnabled) {
        try {
          sound.tap();
        } catch {}
      }
    }, 1350 * pace);

    // Paso 3: Revelar botón de entrada
    const t3 = setTimeout(() => {
      setStep(3);
    }, 2450 * pace);

    // Paso 4: Transición automática tras 7.5 segundos
    const t4 = setTimeout(() => {
      handleProceed();
    }, 7500 * pace);

    timersRef.current = [t1, t2, t3, t4];

    return () => clearAllTimers();
  }, [handleProceed, soundEnabled, speedMultiplier]);

  // Soporte de tecla Enter para avanzar rápido
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
      {/* 1. Header Minimalista */}
      <header className="w-full max-w-3xl mx-auto flex items-center justify-between relative z-10 pt-2 select-none">
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

        {/* Indicador de estado sobrio Cult UI */}
        <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-3 py-1 text-[10px] font-mono text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="tracking-widest uppercase">Portal Activo</span>
        </div>
      </header>

      {/* 2. Cuerpo Principal: Burbujas de Cult UI con TextAnimate */}
      <main className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6 relative z-10 py-6">
        {/* Burbuja Principal 1: Text Animate calmInUp */}
        {step >= 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SpeechBubble variant="light" showCursor={step < 2}>
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
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <SpeechBubble
              variant="dark"
              tailDirection="left"
              showCursor={step < 3}
              className="ml-6 md:ml-10 mr-0"
            >
              <TextAnimate
                text="Felices de que podáis usar esta web. Todo listo."
                type="shiftInUp"
                delay={0.05}
                animate={true}
              />
            </SpeechBubble>
          </div>
        )}

        {/* Botón de Entrada (Aparece de forma sobria y minimalista) */}
        {step >= 3 && (
          <div className="pt-4 sm:pt-6 animate-in fade-in duration-300">
            <button
              type="button"
              onClick={handleProceed}
              autoFocus
              className="group px-6 py-3 rounded-full bg-neutral-100 hover:bg-white text-black font-semibold text-xs sm:text-sm tracking-tight flex items-center gap-2 shadow-2xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Acceder al portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </main>

      {/* 3. Pie Editorial Minimalista */}
      <footer className="w-full max-w-3xl mx-auto flex items-center justify-between pt-4 border-t border-neutral-900 text-[11px] text-neutral-500 font-mono select-none">
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
