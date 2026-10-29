'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { ArrowRight, Check, Sparkles, Monitor } from 'lucide-react';

interface WindowsWelcomeModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onClose: () => void;
}

const PHRASES = [
  { text: 'Hola', subtext: '', duration: 2600 },
  { text: 'Estamos preparando todo para ti.', subtext: 'Configurando tu entorno personal...', duration: 3200 },
  { text: 'Esto puede tardar unos minutos.', subtext: 'Por favor, no apagues el equipo.', duration: 3300 },
  { text: 'Configurando el aula de 2º SMR...', subtext: 'Sincronizando servicios de red y bolsa en tiempo real.', duration: 3200 },
  { text: 'Acreditando 1.000 monedas en tu cuenta...', subtext: 'Saldo inicial de cortesía del Departamento de Informática.', duration: 3200 },
  { text: 'Casi hemos terminado.', subtext: 'Últimos retoques en el escritorio.', duration: 2800 },
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
      setFadeState('visible');

      const phraseDuration = PHRASES[current].duration;

      // Iniciar Fade Out suave 800ms antes de concluir la frase
      const fadeOutTimer = setTimeout(() => {
        if (!isMounted) return;
        setFadeState('exiting');

        // Pausa en negro puro entre frases antes de montar la siguiente
        const gapTimer = setTimeout(() => {
          if (!isMounted) return;
          setFadeState('hidden');
          current += 1;

          const nextTimer = setTimeout(() => {
            if (!isMounted) return;
            playStep();
          }, 320);

          return () => clearTimeout(nextTimer);
        }, 800);

        return () => clearTimeout(gapTimer);
      }, Math.max(1500, phraseDuration - 800));

      return () => clearTimeout(fadeOutTimer);
    };

    // Pausa inicial en negro absoluto antes de la primera frase
    const initialTimer = setTimeout(() => {
      playStep();
    }, 450);

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
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 text-white select-none overflow-hidden font-sans"
      style={{
        background:
          'radial-gradient(ellipse at 50% 45%, rgba(0, 114, 206, 0.22) 0%, rgba(0, 50, 120, 0.08) 50%, #01040a 90%)',
      }}
    >
      <style jsx>{`
        @keyframes winDotSpinNonLinear {
          0% {
            transform: rotate(0deg);
            animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
          }
          38% {
            transform: rotate(270deg);
            animation-timing-function: linear;
          }
          70% {
            transform: rotate(450deg);
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
          }
          100% {
            transform: rotate(720deg);
          }
        }
      `}</style>

      {/* Botón discreto para saltar la intro */}
      {!isFinished && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-6 right-6 sm:top-8 sm:right-8 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg bg-neutral-900/60 hover:bg-neutral-800/90 border border-white/5 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 backdrop-blur-md"
        >
          <span>Saltar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {!isFinished ? (
        /* Secuencia de arranque estilo Windows 10 / 11 */
        <div className="max-w-xl w-full text-center px-4 flex flex-col items-center justify-center min-h-[360px]">
          {/* Logo estilo Windows 11 de 4 paneles de cristal con brillo azul */}
          <div className="grid grid-cols-2 gap-1.5 w-11 h-11 mb-10 mx-auto select-none drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]">
            <div className="rounded-[2.5px] bg-gradient-to-br from-sky-400 to-sky-600" />
            <div className="rounded-[2.5px] bg-gradient-to-br from-sky-300 to-sky-500" />
            <div className="rounded-[2.5px] bg-gradient-to-br from-blue-500 to-blue-700" />
            <div className="rounded-[2.5px] bg-gradient-to-br from-blue-400 to-blue-600" />
          </div>

          {/* Anillo de carga no lineal de Windows: 5 puntos */}
          <div className="relative w-12 h-12 mb-12">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-start justify-center"
                style={{
                  animation: 'winDotSpinNonLinear 3.6s infinite',
                  animationDelay: `${i * 0.15}s`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
              </div>
            ))}
          </div>

          {/* Frase cinematográfica con desenfoque suave y fade in/out */}
          <div
            className="transition-all duration-700 ease-out transform"
            style={{
              opacity: fadeState === 'visible' ? 1 : 0,
              transform:
                fadeState === 'visible'
                  ? 'translateY(0px) scale(1)'
                  : fadeState === 'exiting'
                  ? 'translateY(-6px) scale(1.008)'
                  : 'translateY(8px) scale(0.985)',
              filter: fadeState === 'visible' ? 'blur(0px)' : 'blur(2px)',
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
        /* Pantalla final Windows 11 Acrylic con tarjeta de bienvenida */
        <div className="max-w-md w-full bg-neutral-900/80 border border-sky-500/20 rounded-2xl p-7 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-700 shadow-[0_0_50px_rgba(0,120,215,0.2)] backdrop-blur-2xl">
          {/* Icono de escritorio Windows */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Monitor className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-light tracking-tight text-white">
              ¡Todo listo!
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
              Bienvenido al sistema, <strong className="text-white font-medium">@{username}</strong>. Tu entorno de escritorio y servicios de red están preparados.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-left text-xs space-y-2 text-neutral-300">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Sesión iniciada:</span>
              <span className="font-mono text-sky-400 font-semibold">@{username}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Entorno:</span>
              <span className="font-mono text-white">AULA_204 · SMR</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Saldo inicial:</span>
              <span className="font-semibold text-emerald-400 font-mono">+1.000 monedas</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Servicios:</span>
              <span className="text-neutral-300">Bolsa, Tablón & Ruleta</span>
            </div>
          </div>

          <div className="pt-1 space-y-3">
            <button
              type="button"
              onClick={handleFinish}
              className="w-full min-h-[44px] bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
            >
              <span>Iniciar escritorio</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <label className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 hover:text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded-[3px] border-neutral-700 bg-neutral-900 text-sky-500 accent-sky-500 cursor-pointer"
              />
              <span>No volver a mostrar esta pantalla</span>
            </label>
          </div>
        </div>
      )}

      {/* Pie de pantalla discreto */}
      <div className="absolute bottom-5 text-center text-[10px] text-neutral-500 font-mono tracking-wider uppercase">
        2º Sistemas Microinformáticos y Redes · Aula 204
      </div>
    </div>
  );
};
