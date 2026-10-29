'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Rocket, Lock, KeyRound, Sparkles, X, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { sound } from '@/lib/audio';
import { TARGET_LAUNCH_TIMESTAMP } from '@/lib/launchConfig';

export { TARGET_LAUNCH_TIMESTAMP };

interface LaunchCountdownGateProps {
  onUnlock: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isCompleted: boolean;
}

function calculateTime(): TimeLeft {
  const diff = TARGET_LAUNCH_TIMESTAMP - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isCompleted: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isCompleted: false };
}

export const LaunchCountdownGate: React.FC<LaunchCountdownGateProps> = ({ onUnlock }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTime);
  const [mounted, setMounted] = useState(false);

  // Modal para JuanFe Ospina y David con autenticación segura en el servidor
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [bypassCode, setBypassCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Detección de parámetro de acceso seguro en URL (?dev=1 o ?access=1)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('dev') || params.has('access') || params.has('early')) {
        setShowBypassModal(true);
      }
    }

    // Atajo seguro de teclado: Ctrl + Shift + D o Alt + D para abrir la terminal de acceso
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') ||
        (e.altKey && e.key.toLowerCase() === 'd')
      ) {
        e.preventDefault();
        setShowBypassModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const timer = setInterval(() => {
      const current = calculateTime();
      setTimeLeft(current);

      // Si la cuenta atrás llega a 0 mientras el usuario tiene la página abierta, desbloquear automáticamente
      if (current.isCompleted) {
        clearInterval(timer);
        try {
          sound.windowsStartup();
        } catch {}
        setTimeout(() => {
          onUnlock();
        }, 1200);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUnlock]);

  if (!mounted) {
    return <div className="fixed inset-0 bg-black z-[9999]" />;
  }

  const handleBypassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = bypassCode.trim();

    if (!clean || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Verificación segura en el servidor: sin claves en el frontend, con rate-limit y firma criptográfica
      const res = await fetch('/api/access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        try {
          sound.toastClink();
        } catch {}
        setShowBypassModal(false);
        setBypassCode('');
        // Desbloquear directamente para el desarrollador (sin solapar con el Easter Egg)
        onUnlock();
      } else {
        setErrorMessage(data.error || 'Clave de acceso anticipado no autorizada.');
        try {
          sound.impact(0.5);
        } catch {}
      }
    } catch {
      setErrorMessage('Error de red al contactar con el servidor de autenticación.');
      try {
        sound.impact(0.5);
      } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between p-4 sm:p-8 bg-black text-white select-none overflow-y-auto font-sans">
      {/* Sutil halo ambiental en el fondo */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/8 blur-[120px] pointer-events-none rounded-full" />

      {/* Cabecera: Logotipo y Portal */}
      <header className="w-full max-w-4xl flex items-center justify-between pt-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-900 border border-neutral-800 p-1.5 flex items-center justify-center shadow-md">
            <Image
              src="/logo.png"
              alt="SMR2 Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
              PORTAL 2º SMR
            </h2>
            <p className="text-[11px] text-neutral-400 font-mono">
              Aula 204 · Sistemas Microinformáticos y Redes
            </p>
          </div>
        </div>

        {/* Botón discreto de acceso seguro para desarrolladores */}
        <button
          type="button"
          onClick={() => {
            sound.tap();
            setShowBypassModal(true);
          }}
          className="text-xs text-neutral-500 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-800/80 hover:border-neutral-700 bg-neutral-950/70 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Terminal de desarrollo (Atajo: Ctrl + Shift + D)"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Desarrollo</span>
        </button>
      </header>

      {/* Núcleo: Título en Grande y Cuenta Regresiva Gigante */}
      <main className="w-full max-w-3xl flex flex-col items-center text-center my-auto py-8 sm:py-12 relative z-10 space-y-6 sm:space-y-8">
        {/* Etiqueta animada */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider animate-pulse">
          <Rocket className="w-3.5 h-3.5" />
          <span>Salida Oficial de la Web</span>
        </div>

        {/* Gran Título */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Próximo Lanzamiento
          </h1>
          <p className="text-sm sm:text-lg text-neutral-400 font-light max-w-xl mx-auto">
            El portal abrirá sus puertas para todos los alumnos el{' '}
            <strong className="text-white font-medium underline decoration-amber-500 underline-offset-4">
              9 de noviembre a las 8:35 A.M.
            </strong>
          </p>
        </div>

        {/* Cajas de Cuenta Regresiva en GRANDE */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 md:gap-6 w-full max-w-2xl px-2">
          {/* DÍAS */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-neutral-950 border border-neutral-800/90 shadow-2xl relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <span className="font-mono text-3xl sm:text-6xl md:text-7xl font-extrabold text-amber-400 tracking-tight">
              {timeLeft.days}
            </span>
            <span className="text-[10px] sm:text-xs font-mono tracking-widest text-neutral-400 uppercase mt-1 sm:mt-2 font-semibold">
              Días
            </span>
          </div>

          {/* HORAS */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-neutral-950 border border-neutral-800/90 shadow-2xl relative overflow-hidden group hover:border-neutral-700 transition-colors">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="font-mono text-3xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-mono tracking-widest text-neutral-400 uppercase mt-1 sm:mt-2 font-semibold">
              Horas
            </span>
          </div>

          {/* MINUTOS */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-neutral-950 border border-neutral-800/90 shadow-2xl relative overflow-hidden group hover:border-neutral-700 transition-colors">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="font-mono text-3xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-mono tracking-widest text-neutral-400 uppercase mt-1 sm:mt-2 font-semibold">
              Minutos
            </span>
          </div>

          {/* SEGUNDOS */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-neutral-950 border border-neutral-800/90 shadow-2xl relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <span className="font-mono text-3xl sm:text-6xl md:text-7xl font-extrabold text-amber-400 tracking-tight animate-pulse">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-mono tracking-widest text-neutral-400 uppercase mt-1 sm:mt-2 font-semibold">
              Segundos
            </span>
          </div>
        </div>

        {/* Tarjeta explicativa con tono sobrio y formal */}
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs sm:text-sm text-neutral-300 max-w-lg space-y-1.5 shadow-xl leading-relaxed">
          <p className="font-medium text-white flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Fase de Despliegue y Pruebas Finales</span>
          </p>
          <p className="text-neutral-400 text-xs">
            La plataforma permanece cerrada provisionalmente mientras se configuran los módulos de red, la bolsa de El Botellón y los sistemas del aula. Al concluir la cuenta atrás, se habilitará de forma automática el registro e inicio de sesión para toda la clase.
          </p>
        </div>
      </main>

      {/* Pie de pantalla: Créditos oficiales obligatorios */}
      <footer className="w-full max-w-4xl pt-4 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs text-neutral-500 relative z-10">
        <div>
          Desarrollado y creado por{' '}
          <strong className="text-neutral-300 font-semibold">JuanFe Ospina</strong> y{' '}
          <strong className="text-neutral-300 font-semibold">David</strong>
        </div>

        <div className="font-mono text-[11px] text-neutral-600 flex items-center gap-2">
          <span>2º Sistemas Microinformáticos y Redes</span>
          <span className="opacity-40">·</span>
          <span className="text-[10px] text-neutral-700">Ctrl+Shift+D</span>
        </div>
      </footer>

      {/* Modal de Acceso Seguro de Desarrollo (Verificación Server-Side Criptográfica) */}
      {showBypassModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-sm w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-left space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Acceso Anticipado</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">Entorno de Desarrollo</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowBypassModal(false);
                  setErrorMessage('');
                  setBypassCode('');
                }}
                className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Introduce la clave maestra de desarrollo para acceder al portal antes de la salida oficial. La verificación se realiza de forma criptográfica en el servidor:
            </p>

            <form onSubmit={handleBypassSubmit} className="space-y-3">
              <input
                type="password"
                value={bypassCode}
                onChange={(e) => {
                  setBypassCode(e.target.value);
                  setErrorMessage('');
                }}
                disabled={isSubmitting}
                placeholder="Clave maestra de desarrollo..."
                autoFocus
                className="w-full text-xs bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors font-mono disabled:opacity-50"
              />

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 leading-tight font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-neutral-600 font-mono">
                  Protección anti-fuerza bruta
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBypassModal(false);
                      setErrorMessage('');
                    }}
                    disabled={isSubmitting}
                    className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !bypassCode.trim()}
                    className="px-4 py-2 bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <span>Acceder</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
