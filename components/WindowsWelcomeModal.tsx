'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { ArrowRight, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { saveStudentIdentification, checkStudentNumberAvailability } from '@/lib/authService';

interface WindowsWelcomeModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onSuccessIdentification?: (updatedUser: UserProfile) => void;
  onClose: () => void;
}

type OnboardingStage = 'identify' | 'loading_animation' | 'accept';

export const WindowsWelcomeModal: React.FC<WindowsWelcomeModalProps> = ({
  isOpen,
  user,
  onSuccessIdentification,
  onClose,
}) => {
  // Etapa del flujo: 1. Identificación -> 2. Animación Windows (fondo negro) -> 3. Aceptar beneficios
  const [stage, setStage] = useState<OnboardingStage>('identify');

  // Formulario de identificación
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [studentNumber, setStudentNumber] = useState(user?.student_number || '');
  const [isSubmittingIdent, setIsSubmittingIdent] = useState(false);
  const [identError, setIdentError] = useState<string | null>(null);

  // Estados de la animación de carga estilo Windows
  const [stepIndex, setStepIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'hidden' | 'visible' | 'exiting'>('hidden');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const audioPlayedRef = useRef(false);

  // Sincronizar datos si el usuario ya los tiene
  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    if (user?.student_number) setStudentNumber(user.student_number);
  }, [user]);

  // Al abrir el modal, decidir si pedir datos o pasar directo a la animación
  useEffect(() => {
    if (!isOpen) return;

    // Si el usuario ya tiene nombre y número (ej. reabierto desde Ajustes), ir directo a la animación
    if (user?.full_name && user?.student_number) {
      setStage('loading_animation');
    } else {
      setStage('identify');
    }
  }, [isOpen, user]);

  // Frases de la animación de inicio
  const displayName = fullName.trim() ? fullName.trim().split(' ')[0] : 'Alumno';
  const PHRASES = [
    { text: `Hola, ${displayName}`, subtext: '', duration: 2600 },
    { text: 'Estamos preparando todo para ti.', subtext: 'Configurando tu entorno personal...', duration: 3200 },
    { text: 'Esto puede tardar unos minutos.', subtext: 'Por favor, no apagues el equipo.', duration: 3200 },
    { text: 'Configurando el aula de 2º SMR...', subtext: 'Sincronizando servicios de red y bolsa en tiempo real.', duration: 3200 },
    { text: 'Acreditando 1.000 monedas en tu cuenta...', subtext: 'Saldo inicial de cortesía del Departamento de Informática.', duration: 3200 },
    { text: 'Casi hemos terminado.', subtext: 'Últimos retoques en el escritorio.', duration: 2800 },
  ];

  // Control de la secuencia de animación estilo Windows (Fase 2)
  useEffect(() => {
    if (!isOpen || stage !== 'loading_animation') return;

    let isMounted = true;
    audioPlayedRef.current = false;
    let current = 0;

    const playStep = () => {
      if (!isMounted) return;

      if (current >= PHRASES.length) {
        // Fin de la animación: sonar chime y pasar a la fase 3 (Aceptar todo)
        if (!audioPlayedRef.current) {
          audioPlayedRef.current = true;
          try {
            sound.windowsStartup();
          } catch {}
        }
        setStage('accept');
        return;
      }

      setStepIndex(current);
      setFadeState('visible');

      const phraseDuration = PHRASES[current].duration;

      // Iniciar Fade Out suave 800ms antes de que concluya el tiempo de la frase
      const fadeOutTimer = setTimeout(() => {
        if (!isMounted) return;
        setFadeState('exiting');

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

    const initialTimer = setTimeout(() => {
      playStep();
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
    };
  }, [isOpen, stage]);

  if (!isOpen) return null;

  // Manejar envío del formulario de identificación inicial
  const handleSubmitIdentification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentError(null);

    const cleanName = fullName.trim();
    const cleanNumber = studentNumber.trim().toUpperCase();

    if (cleanName.length < 3) {
      setIdentError('Escribe tu nombre y apellidos reales completos (mínimo 3 letras).');
      return;
    }

    if (cleanNumber.length < 1) {
      setIdentError('Introduce tu número de lista o de estudiante.');
      return;
    }

    setIsSubmittingIdent(true);

    try {
      const targetUserId = user?.id || 'guest_user_' + Date.now();
      const res = await saveStudentIdentification(targetUserId, cleanName, cleanNumber);

      if (!res.success && res.error) {
        setIdentError(res.error);
        setIsSubmittingIdent(false);
        return;
      }

      if (res.user && onSuccessIdentification) {
        onSuccessIdentification(res.user);
      }

      try {
        sound.tap();
      } catch {}

      // Pasar inmediatamente a la animación en fondo negro
      setStage('loading_animation');
    } catch {
      // Fallback local
      setStage('loading_animation');
    } finally {
      setIsSubmittingIdent(false);
    }
  };

  // Manejar el botón final "Aceptar todo lo que te dan"
  const handleAcceptEverything = () => {
    try {
      sound.coinWin();
      localStorage.setItem('smr2_windows_welcome_dismissed', 'true');
    } catch {}
    onClose();
  };

  const handleSkipAnimation = () => {
    if (!audioPlayedRef.current) {
      audioPlayedRef.current = true;
      try {
        sound.windowsStartup();
      } catch {}
    }
    setStage('accept');
  };

  const currentPhrase = PHRASES[stepIndex] || PHRASES[0];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-black text-white select-none overflow-hidden font-sans">
      <style jsx>{`
        @keyframes winDotSpinExact {
          0% {
            transform: rotate(0deg);
            animation-timing-function: cubic-bezier(0.5, 0.05, 0.5, 0.95);
          }
          35% {
            transform: rotate(260deg);
            animation-timing-function: linear;
          }
          70% {
            transform: rotate(450deg);
            animation-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
          }
          100% {
            transform: rotate(720deg);
          }
        }
      `}</style>

      {/* =========================================================================
          FASE 1: IDENTIFICACIÓN INICIAL (NOMBRE COMPLETO Y LUEGO NÚMERO)
      ========================================================================= */}
      {stage === 'identify' && (
        <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-7 sm:p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1">
              Aula 204 · 2º SMR
            </div>
            <h2 className="text-xl sm:text-2xl font-light tracking-tight text-white">
              Identificación de Estudiante
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
              Introduce tus datos reales para preparar tu escritorio y acreditar tus 1.000 monedas iniciales.
            </p>
          </div>

          <form onSubmit={handleSubmitIdentification} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                Nombre y apellidos completos
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan Manuel Pérez García"
                autoFocus
                required
                className="w-full h-11 px-3.5 bg-neutral-900 border border-neutral-800 focus:border-white text-white rounded-xl text-xs font-sans placeholder:text-neutral-600 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                Número de lista o de estudiante (NIA)
              </label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="Ej: 14"
                required
                className="w-full h-11 px-3.5 bg-neutral-900 border border-neutral-800 focus:border-white text-white rounded-xl text-xs font-mono placeholder:text-neutral-600 focus:outline-none transition-colors"
              />
            </div>

            {identError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{identError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingIdent || fullName.trim().length < 3 || !studentNumber.trim()}
              className="w-full min-h-[44px] bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-semibold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              <span>{isSubmittingIdent ? 'Verificando...' : 'Continuar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          FASE 2: ANIMACIÓN ESTILO INICIO DE WINDOWS (FONDO NEGRO, SIN LOGO, CÍRCULO FLUIDO)
      ========================================================================= */}
      {stage === 'loading_animation' && (
        <div className="max-w-xl w-full text-center px-4 flex flex-col items-center justify-center min-h-[360px] relative">
          {/* Botón sutil para saltar */}
          <button
            type="button"
            onClick={handleSkipAnimation}
            className="absolute top-[-40px] right-2 text-xs text-neutral-500 hover:text-white px-3 py-1.5 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Saltar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Círculo animado Windows de 5 puntos con física no-lineal ultra fluida */}
          <div className="relative w-12 h-12 mb-14">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-start justify-center"
                style={{
                  animation: 'winDotSpinExact 3.5s infinite',
                  animationDelay: `${i * 0.14}s`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
              </div>
            ))}
          </div>

          {/* Frases con desenfoque suave y fade in/out cinematográfico */}
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
      )}

      {/* =========================================================================
          FASE 3: ACEPTAR TODO LO QUE TE DAN (VERIFICACIÓN EXPLÍCITA)
      ========================================================================= */}
      {stage === 'accept' && (
        <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-7 sm:p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="w-12 h-12 rounded-full bg-white text-black mx-auto flex items-center justify-center font-bold shadow-lg">
            <Check className="w-6 h-6 stroke-[2.5]" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-light tracking-tight text-white">
              Bienvenido a 2º SMR
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
              Se ha verificado tu identidad y configurado tu puesto de trabajo en el Aula 204.
            </p>
          </div>

          {/* Resumen minimalista de todo lo concedido al alumno */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 text-left text-xs space-y-2.5 text-neutral-300">
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
              <span className="text-neutral-400">Alumno verificado:</span>
              <span className="font-semibold text-white truncate max-w-[180px]">
                {fullName || 'Estudiante'} (Nº {studentNumber || '1'})
              </span>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
              <span className="text-neutral-400">Aula asignada:</span>
              <span className="font-mono text-white">Aula 204 · SMR</span>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
              <span className="text-neutral-400">Saldo inicial acreditado:</span>
              <span className="font-mono font-bold text-emerald-400">+1.000 monedas</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Servicios activos:</span>
              <span className="text-neutral-300">Tablón, Bolsa, Horario & Ruleta</span>
            </div>
          </div>

          <div className="pt-1 space-y-3">
            {/* Botón explícito de aceptación */}
            <button
              type="button"
              onClick={handleAcceptEverything}
              className="w-full min-h-[46px] bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Aceptar y entrar al portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <label className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 hover:text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded-[3px] border-neutral-700 bg-neutral-900 text-white accent-white cursor-pointer"
              />
              <span>No volver a mostrar esta pantalla al iniciar sesión</span>
            </label>
          </div>
        </div>
      )}

      {/* Pie de pantalla minimalista */}
      <div className="absolute bottom-5 text-center text-[10px] text-neutral-600 font-mono tracking-wider uppercase">
        2º Sistemas Microinformáticos y Redes · Aula 204
      </div>
    </div>
  );
};
