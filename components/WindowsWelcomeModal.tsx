'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { Sparkles, ArrowRight, ShieldCheck, Coins, Laptop } from 'lucide-react';

interface WindowsWelcomeModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onClose: () => void;
}

const PHRASES = [
  { text: 'Hola :)', subtext: '', duration: 1300 },
  { text: 'Estamos preparando todo para ti.', subtext: 'Configurando tu entorno personal...', duration: 1500 },
  { text: 'Esto puede tardar unos minutos...', subtext: 'Por favor, espera.', duration: 1400 },
  { text: 'No apagues el equipo.', subtext: 'No desconectes los cables de red del aula.', duration: 1500 },
  { text: 'Acreditando 1.000 monedas...', subtext: 'Bono de bienvenida del Departamento de Informática.', duration: 1500 },
  { text: 'Conectando a la Bolsa de El Botellón...', subtext: 'Sincronizando cotizaciones en tiempo real.', duration: 1400 },
  { text: 'Casi hemos terminado.', subtext: 'Últimos retoques en el escritorio.', duration: 1300 },
];

export const WindowsWelcomeModal: React.FC<WindowsWelcomeModalProps> = ({
  isOpen,
  user,
  onClose,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const audioPlayedRef = useRef(false);

  const username = user?.username || 'Alumno';

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setIsFinished(false);
      setFadeState('in');
      audioPlayedRef.current = false;
      return;
    }

    let isMounted = true;
    audioPlayedRef.current = false;

    // Ejecutar la secuencia de frases estilo Windows OOBE
    let current = 0;

    const playNextPhrase = () => {
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
      setFadeState('in');

      const currentDuration = PHRASES[current].duration;

      // Tiempo visible antes de empezar a desvanecerse
      const fadeOutTimer = setTimeout(() => {
        if (!isMounted) return;
        setFadeState('out');

        // Tiempo de desvanecimiento hacia la siguiente frase
        const nextTimer = setTimeout(() => {
          if (!isMounted) return;
          current += 1;
          playNextPhrase();
        }, 320);

        return () => clearTimeout(nextTimer);
      }, currentDuration - 320);

      return () => clearTimeout(fadeOutTimer);
    };

    playNextPhrase();

    return () => {
      isMounted = false;
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#001026] via-[#00224d] to-[#001433] text-white select-none overflow-hidden animate-in fade-in duration-300 font-sans"
      style={{
        backgroundSize: '200% 200%',
        animation: 'bgPulse 10s ease infinite alternate',
      }}
    >
      <style jsx>{`
        @keyframes bgPulse {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
        @keyframes dotSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Botón sutil para saltar la animación en la esquina superior derecha */}
      {!isFinished && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-xs text-white/40 hover:text-white/90 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-all cursor-pointer backdrop-blur-xs flex items-center gap-1.5 active:scale-95"
        >
          <span>Saltar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Marca de agua sutil de Windows SMR 2.0 */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 opacity-30 pointer-events-none">
        <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
          <div className="bg-[#00adef] rounded-[0.5px]" />
          <div className="bg-[#00adef] rounded-[0.5px]" />
          <div className="bg-[#00adef] rounded-[0.5px]" />
          <div className="bg-[#00adef] rounded-[0.5px]" />
        </div>
        <span className="text-[11px] font-mono tracking-widest uppercase">
          Windows SMR 2.0
        </span>
      </div>

      {!isFinished ? (
        /* Secuencia de arranque OOBE estilo Windows 10/11 */
        <div className="max-w-xl w-full text-center px-4 flex flex-col items-center justify-center min-h-[320px]">
          {/* Anillo de carga de Windows: 6 puntos que rotan a velocidad no-lineal */}
          <div className="relative w-12 h-12 mb-10">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-start justify-center"
                style={{
                  animation: 'dotSpin 2.6s cubic-bezier(0.5, 0.05, 0.45, 0.95) infinite',
                  animationDelay: `${i * 0.14}s`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-300/90 shadow-[0_0_8px_rgba(103,232,249,0.8)]" />
              </div>
            ))}
          </div>

          {/* Texto de la frase con transición suave */}
          <div 
            className={`transition-all duration-300 ease-out transform ${
              fadeState === 'in' 
                ? 'opacity-100 translate-y-0 scale-100' 
                : 'opacity-0 -translate-y-2 scale-98'
            }`}
          >
            <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-white drop-shadow-md leading-tight">
              {currentPhrase.text}
            </h1>

            {currentPhrase.subtext && (
              <p className="mt-3 text-xs sm:text-sm text-cyan-200/70 font-normal tracking-wide max-w-md mx-auto">
                {currentPhrase.subtext}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Pantalla final ¡Listo! estilo bienvenida completada */
        <div className="max-w-md w-full bg-white/10 dark:bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-7 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-white/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              ¡Todo está listo, @{username}!
            </h2>
            <p className="text-xs text-cyan-100/80 leading-relaxed">
              Tu cuenta ha sido configurada en el sistema de 2º SMR con éxito.
            </p>
          </div>

          {/* Detalles del entorno */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-white/90">
              <span className="flex items-center gap-2 text-white/60">
                <Coins className="w-4 h-4 text-amber-400" />
                Saldo asignado:
              </span>
              <span className="font-semibold text-emerald-400 font-mono">
                +1.000 monedas
              </span>
            </div>

            <div className="flex items-center justify-between text-white/90">
              <span className="flex items-center gap-2 text-white/60">
                <Laptop className="w-4 h-4 text-cyan-400" />
                Entorno:
              </span>
              <span className="font-medium text-white/80 font-mono">
                AULA_2_SMR
              </span>
            </div>

            <div className="flex items-center justify-between text-white/90">
              <span className="flex items-center gap-2 text-white/60">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Mercado en vivo:
              </span>
              <span className="text-white/80">Conectado (WebSockets)</span>
            </div>
          </div>

          <p className="text-[11px] text-white/50 italic leading-relaxed">
            💡 Consejo del sistema: No apagues el router del aula ni vendas todo en pánico si baja el precio del Kebab.
          </p>

          <div className="pt-1 space-y-3">
            <button
              type="button"
              onClick={handleFinish}
              className="w-full min-h-[44px] bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Empezar</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <label className="flex items-center justify-center gap-2 text-[11px] text-white/50 hover:text-white/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded-[3px] border-white/30 bg-white/10 text-cyan-500 accent-cyan-500 cursor-pointer"
              />
              <span>No volver a mostrar esta bienvenida</span>
            </label>
          </div>
        </div>
      )}

      {/* Pie de pantalla */}
      <div className="absolute bottom-4 text-center text-[11px] text-white/30 font-mono">
        Microsoft Windows SMR 2.0 • Edición Formación Profesional
      </div>
    </div>
  );
};
