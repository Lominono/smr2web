'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { ArrowRight, Check } from 'lucide-react';

interface WindowsWelcomeModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onClose: () => void;
}

const PHRASES = [
  { text: 'Hola :)', subtext: '', duration: 1800 },
  { text: 'Estamos preparando todo para ti.', subtext: '', duration: 2000 },
  { text: 'Esto puede tardar unos minutos...', subtext: 'Por favor, espera.', duration: 1900 },
  { text: 'No apagues el equipo.', subtext: '', duration: 1800 },
  { text: 'Casi hemos terminado.', subtext: '', duration: 1700 },
];

export const WindowsWelcomeModal: React.FC<WindowsWelcomeModalProps> = ({
  isOpen,
  user,
  onClose,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const audioPlayedRef = useRef(false);

  const username = user?.username || 'Alumno';

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setIsFinished(false);
      setOpacity(0);
      audioPlayedRef.current = false;
      return;
    }

    let isMounted = true;
    audioPlayedRef.current = false;
    let current = 0;

    const showStep = () => {
      if (!isMounted) return;

      if (current >= PHRASES.length) {
        setIsFinished(true);
        if (!audioPlayedRef.current) {
          audioPlayedRef.current = true;
          try {
            sound.windowsStartup();
          } catch {}
        }
        return;
      }

      setStepIndex(current);
      // Fade in
      setOpacity(1);

      const phraseDuration = PHRASES[current].duration;

      // Start fade out before the step ends
      const fadeOutTimer = setTimeout(() => {
        if (!isMounted) return;
        setOpacity(0);

        // Advance to next step after fade out completes
        const nextTimer = setTimeout(() => {
          if (!isMounted) return;
          current += 1;
          showStep();
        }, 500);

        return () => clearTimeout(nextTimer);
      }, phraseDuration - 500);

      return () => clearTimeout(fadeOutTimer);
    };

    // Small delay on mount before starting first phrase
    const initialTimer = setTimeout(() => {
      showStep();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinish = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      try {
        localStorage.setItem('smr2_windows_welcome_dismissed', 'true');
      } catch {}
    }
    onClose();
  };

  const handleSkip = () => {
    setIsFinished(true);
    if (!audioPlayedRef.current) {
      audioPlayedRef.current = true;
      try {
        sound.windowsStartup();
      } catch {}
    }
  };

  const currentPhrase = PHRASES[stepIndex] || PHRASES[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black text-white select-none overflow-hidden font-sans">
      <style jsx>{`
        @keyframes winDotSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Botón sutil para saltar en la esquina */}
      {!isFinished && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-5 right-5 sm:top-8 sm:right-8 text-xs text-neutral-500 hover:text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span>Saltar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {!isFinished ? (
        /* Secuencia de frases limpia sobre fondo negro puro */
        <div className="max-w-xl w-full text-center px-4 flex flex-col items-center justify-center min-h-[280px]">
          {/* Anillo de carga de puntos clásico Windows */}
          <div className="relative w-10 h-10 mb-12">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-start justify-center"
                style={{
                  animation: 'winDotSpin 2.8s cubic-bezier(0.5, 0.05, 0.45, 0.95) infinite',
                  animationDelay: `${i * 0.15}s`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
              </div>
            ))}
          </div>

          {/* Frase con animación fade suave */}
          <div
            className="transition-opacity duration-700 ease-in-out"
            style={{ opacity }}
          >
            <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-white leading-relaxed">
              {currentPhrase.text}
            </h1>

            {currentPhrase.subtext && (
              <p className="mt-3 text-xs sm:text-sm text-neutral-400 font-normal">
                {currentPhrase.subtext}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Pantalla final simple y limpia */
        <div className="max-w-sm w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-6 sm:p-7 text-center space-y-5 animate-in fade-in duration-500">
          <div className="w-12 h-12 rounded-full bg-white text-black mx-auto flex items-center justify-center shadow-md font-bold">
            <Check className="w-6 h-6 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              ¡Listo!
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Sesión iniciada como <strong className="text-white font-medium">@{username}</strong>. Tu cuenta tiene 1.000 monedas de bienvenida.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={handleFinish}
              className="w-full min-h-[44px] bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Continuar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <label className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 hover:text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded-[3px] border-neutral-700 bg-neutral-900 text-white accent-white cursor-pointer"
              />
              <span>No volver a mostrar esta pantalla</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
