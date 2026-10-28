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
  { text: 'Hola :)', subtext: '', duration: 2800 },
  { text: 'Estamos preparando todo para ti.', subtext: 'Configurando tu entorno personal...', duration: 3200 },
  { text: 'Esto puede tardar unos minutos...', subtext: 'Por favor, no apagues el equipo.', duration: 3400 },
  { text: 'Configurando el aula de 2º SMR...', subtext: 'Sincronizando servicios de red y bolsa en tiempo real.', duration: 3300 },
  { text: 'Acreditando 1.000 monedas en tu cuenta...', subtext: 'Saldo inicial de cortesía del Departamento de Informática.', duration: 3300 },
  { text: 'Casi hemos terminado.', subtext: 'Últimos retoques en el escritorio.', duration: 2700 },
];

export const WindowsWelcomeModal: React.FC<WindowsWelcomeModalProps> = ({
  isOpen,
  user,
  onClose,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [fadeState, setFadeState] = useState<'hidden' | 'visible' | 'exiting'>('hidden');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const audioPlayedRef = useRef(false);

  const username = user?.username || 'Alumno';

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setIsFinished(false);
      setFadeState('hidden');
      audioPlayedRef.current = false;
      return;
    }

    let isMounted = true;
    audioPlayedRef.current = false;
    let current = 0;

    const playStep = () => {
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
      // Suave Fade In con cubic-bezier
      setFadeState('visible');

      const phraseDuration = PHRASES[current].duration;

      // Iniciar Fade Out suave 850ms antes de que concluya el tiempo de la frase
      const fadeOutTimer = setTimeout(() => {
        if (!isMounted) return;
        setFadeState('exiting');

        // Pausa en negro puro (350ms) entre frases antes de montar la siguiente
        const gapTimer = setTimeout(() => {
          if (!isMounted) return;
          setFadeState('hidden');
          current += 1;

          const nextTimer = setTimeout(() => {
            if (!isMounted) return;
            playStep();
          }, 350);

          return () => clearTimeout(nextTimer);
        }, 850);

        return () => clearTimeout(gapTimer);
      }, Math.max(1600, phraseDuration - 850));

      return () => clearTimeout(fadeOutTimer);
    };

    // Pausa inicial en negro absoluto antes de la primera frase
    const initialTimer = setTimeout(() => {
      playStep();
    }, 500);

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

      {/* Botón discreto para saltar la intro en la esquina */}
      {!isFinished && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-6 right-6 sm:top-8 sm:right-8 text-xs text-neutral-500 hover:text-white px-3.5 py-1.5 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <span>Saltar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {!isFinished ? (
        /* Secuencia de arranque pausada y cinematográfica */
        <div className="max-w-xl w-full text-center px-4 flex flex-col items-center justify-center min-h-[320px]">
          {/* Anillo de carga de Windows: 6 puntos que rotan a velocidad no-lineal */}
          <div className="relative w-12 h-12 mb-14">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-start justify-center"
                style={{
                  animation: 'winDotSpin 3.4s cubic-bezier(0.5, 0.05, 0.45, 0.95) infinite',
                  animationDelay: `${i * 0.16}s`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              </div>
            ))}
          </div>

          {/* Frase con animación fade pura cinematográfica */}
          <div
            className="transition-all duration-900 ease-out transform"
            style={{
              opacity: fadeState === 'visible' ? 1 : 0,
              transform:
                fadeState === 'visible'
                  ? 'translateY(0px) scale(1)'
                  : fadeState === 'exiting'
                  ? 'translateY(-6px) scale(1.008)'
                  : 'translateY(8px) scale(0.985)',
              filter: fadeState === 'visible' ? 'blur(0px)' : 'blur(1.5px)',
            }}
          >
            <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-white leading-relaxed">
              {currentPhrase.text}
            </h1>

            {currentPhrase.subtext && (
              <p className="mt-3.5 text-xs sm:text-sm text-neutral-400 font-normal tracking-wide max-w-md mx-auto">
                {currentPhrase.subtext}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Pantalla final ¡Listo! limpia, sobria y elegante */
        <div className="max-w-md w-full bg-neutral-950 border border-neutral-800/80 rounded-2xl p-7 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-700 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-white text-black mx-auto flex items-center justify-center shadow-lg font-bold">
            <Check className="w-7 h-7 stroke-[2.5]" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              ¡Listo!
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
              Sesión iniciada correctamente como <strong className="text-white font-medium">@{username}</strong>. Se han acreditado 1.000 monedas de bienvenida en tu cuenta.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-left text-xs space-y-2 text-neutral-300">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Entorno:</span>
              <span className="font-mono text-white">AULA_2_SMR</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Saldo inicial:</span>
              <span className="font-semibold text-emerald-400 font-mono">+1.000 monedas</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Mercado:</span>
              <span className="text-white">Tiempo Real (WebSockets)</span>
            </div>
          </div>

          <div className="pt-1 space-y-3">
            <button
              type="button"
              onClick={handleFinish}
              className="w-full min-h-[44px] bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Iniciar escritorio</span>
              <ArrowRight className="w-4 h-4" />
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

      {/* Pie de pantalla sutil */}
      <div className="absolute bottom-5 text-center text-[10px] text-neutral-600 font-mono tracking-wider uppercase">
        2º Sistemas Microinformáticos y Redes
      </div>
    </div>
  );
};
