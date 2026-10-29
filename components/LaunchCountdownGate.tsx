'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { sound } from '@/lib/audio';

// Fecha oficial de lanzamiento: 9 de noviembre de 2026 a las 8:35 AM (CET)
export const TARGET_LAUNCH_TIMESTAMP = new Date('2026-11-09T08:35:00+01:00').getTime();

interface LaunchCountdownGateProps {
  onUnlock: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUnlocked: boolean;
}

function calculateTimeRemaining(): TimeRemaining {
  const diff = TARGET_LAUNCH_TIMESTAMP - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isUnlocked: false };
}

export const LaunchCountdownGate: React.FC<LaunchCountdownGateProps> = ({ onUnlock }) => {
  const [time, setTime] = useState<TimeRemaining>(calculateTimeRemaining);
  const [mounted, setMounted] = useState(false);

  // Consola de autenticación segura (sin botones visibles)
  const [isConsoleActive, setIsConsoleActive] = useState(false);
  const [authInput, setAuthInput] = useState('');
  const [authStatus, setAuthStatus] = useState<'idle' | 'verifying' | 'denied' | 'granted'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const tapCounterRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keyBufferRef = useRef<string>('');

  useEffect(() => {
    setMounted(true);

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTime(remaining);

      if (remaining.isUnlocked) {
        clearInterval(interval);
        try {
          sound.windowsStartup();
        } catch {}
        setTimeout(() => onUnlock(), 800);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onUnlock]);

  // Activación segura por atajo de teclado: Shift+Esc o escribir "smr" en el teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + Escape activa o desactiva la línea de comandos
      if (e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        setIsConsoleActive((prev) => !prev);
        setAuthStatus('idle');
        setStatusMessage('');
        return;
      }

      // Si la consola está abierta y pulsa Escape, cerrar
      if (isConsoleActive && e.key === 'Escape') {
        e.preventDefault();
        setIsConsoleActive(false);
        setAuthStatus('idle');
        return;
      }

      // Si la consola no está abierta, capturar secuencia oculta "smr" o "root"
      if (!isConsoleActive && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        keyBufferRef.current = (keyBufferRef.current + e.key.toLowerCase()).slice(-6);
        if (keyBufferRef.current.endsWith('smr') || keyBufferRef.current.endsWith('root')) {
          setIsConsoleActive(true);
          setAuthStatus('idle');
          setStatusMessage('');
          keyBufferRef.current = '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConsoleActive]);

  // Auto-foco al abrir el prompt
  useEffect(() => {
    if (isConsoleActive) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setAuthInput('');
    }
  }, [isConsoleActive]);

  // Activación móvil: Triple toque rápido sobre el identificador SMR2
  const handleMonogramTap = useCallback(() => {
    tapCounterRef.current += 1;
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

    if (tapCounterRef.current >= 3) {
      tapCounterRef.current = 0;
      setIsConsoleActive(true);
      setAuthStatus('idle');
      setStatusMessage('');
      try {
        sound.tap();
      } catch {}
      return;
    }

    tapTimeoutRef.current = setTimeout(() => {
      tapCounterRef.current = 0;
    }, 700);
  }, []);

  // Envío seguro y verificación contra el endpoint protegido
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = authInput.trim();
    if (!clean || authStatus === 'verifying') return;

    setAuthStatus('verifying');
    setStatusMessage('');

    try {
      const res = await fetch('/api/auth/gate-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAuthStatus('granted');
        setStatusMessage('AUTORIZADO');
        try {
          localStorage.setItem('smr2_prelaunch_bypass', 'true');
          sound.toastClink();
        } catch {}

        setTimeout(() => {
          onUnlock();
        }, 600);
      } else {
        setAuthStatus('denied');
        setStatusMessage(data.error || 'DENEGADO');
        try {
          sound.impact(0.5);
        } catch {}

        setTimeout(() => {
          setAuthStatus('idle');
          setAuthInput('');
          inputRef.current?.focus();
        }, 1200);
      }
    } catch {
      setAuthStatus('denied');
      setStatusMessage('ERROR DE CONEXIÓN');
      setTimeout(() => {
        setAuthStatus('idle');
        inputRef.current?.focus();
      }, 1200);
    }
  };

  if (!mounted) {
    return <div className="fixed inset-0 bg-black z-[9999]" />;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-between bg-black text-white p-6 sm:p-12 select-none font-mono antialiased">
      {/* Header Minimalista */}
      <header className="w-full flex items-center justify-between text-xs text-neutral-400">
        <div
          onClick={handleMonogramTap}
          className="flex items-center gap-3 cursor-default active:opacity-60 transition-opacity"
          title="SMR2 Core"
        >
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="SMR2"
              width={24}
              height={24}
              className="w-5 h-5 object-contain grayscale opacity-80"
              priority
            />
          </div>
          <div>
            <div className="font-semibold text-neutral-200 tracking-wider">PORTAL 2º SMR</div>
            <div className="text-[10px] text-neutral-400">AULA 204 · REDES Y SISTEMAS</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="tracking-widest uppercase">EN ESPERA</span>
        </div>
      </header>

      {/* Núcleo: Conteo Ultra-Minimalista Typográfico */}
      <main className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center my-auto py-12 text-center space-y-10">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400 font-medium">
            Salida Oficial Programada
          </p>
          <h1 className="text-sm sm:text-base font-normal text-neutral-300 tracking-tight">
            Apertura pública: 09 de noviembre de 2026 — 08:35 CET
          </h1>
        </div>

        {/* Cifras de Conteo Tipográficas Puras sin botones ni marcos ruidosos */}
        <div className="grid grid-cols-4 gap-4 sm:gap-8 md:gap-12 w-full max-w-2xl px-2">
          {/* DÍAS */}
          <div className="flex flex-col items-center">
            <span className="text-4xl sm:text-7xl md:text-8xl font-light text-white tracking-tighter tabular-nums">
              {String(time.days).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-[0.25em] mt-3 font-medium">
              Días
            </span>
          </div>

          {/* HORAS */}
          <div className="flex flex-col items-center">
            <span className="text-4xl sm:text-7xl md:text-8xl font-light text-neutral-200 tracking-tighter tabular-nums">
              {String(time.hours).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-[0.25em] mt-3 font-medium">
              Horas
            </span>
          </div>

          {/* MINUTOS */}
          <div className="flex flex-col items-center">
            <span className="text-4xl sm:text-7xl md:text-8xl font-light text-neutral-200 tracking-tighter tabular-nums">
              {String(time.minutes).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-[0.25em] mt-3 font-medium">
              Minutos
            </span>
          </div>

          {/* SEGUNDOS */}
          <div className="flex flex-col items-center">
            <span className="text-4xl sm:text-7xl md:text-8xl font-light text-neutral-400 tracking-tighter tabular-nums">
              {String(time.seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-[0.25em] mt-3 font-medium">
              Segundos
            </span>
          </div>
        </div>

        {/* Estado sutil del sistema */}
        <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed font-light">
          El acceso general a los servicios y la autenticación se sincronizará automáticamente al alcanzar el objetivo temporal.
        </p>
      </main>

      {/* Footer Minimalista */}
      <footer className="w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-900 pt-4 gap-2">
        <div>
          Desarrollado por <span className="text-neutral-300 font-medium">JuanFe Ospina</span> y{' '}
          <span className="text-neutral-300 font-medium">David</span>
        </div>
        <div className="text-neutral-400">
          Sistemas Microinformáticos y Redes · 2026
        </div>
      </footer>

      {/* Interfaz de Acceso Específico (Completamente sin botones visibles, manejada exclusivamente por teclado/secuencia) */}
      {isConsoleActive && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 bg-neutral-950/95 border-t border-neutral-800 backdrop-blur-md animate-in slide-in-from-bottom duration-200">
          <div className="max-w-xl mx-auto flex items-center justify-between text-xs">
            <form onSubmit={handleAuthSubmit} className="flex-1 flex items-center gap-2">
              <span className="text-neutral-500 font-mono select-none">sys://auth&gt;</span>
              <input
                ref={inputRef}
                type="password"
                value={authInput}
                onChange={(e) => setAuthInput(e.target.value)}
                placeholder="secuencia de autorización..."
                disabled={authStatus === 'verifying' || authStatus === 'granted'}
                autoComplete="off"
                spellCheck="false"
                className={`w-full bg-transparent text-white font-mono text-xs placeholder:text-neutral-600 focus:outline-none transition-colors ${
                  authStatus === 'denied'
                    ? 'text-red-400'
                    : authStatus === 'granted'
                    ? 'text-emerald-400'
                    : 'text-neutral-100'
                }`}
              />
            </form>

            <div className="flex items-center gap-3 text-[10px] text-neutral-500 font-mono shrink-0 pl-2">
              {statusMessage ? (
                <span
                  className={
                    authStatus === 'denied'
                      ? 'text-red-400 font-semibold'
                      : authStatus === 'granted'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-neutral-400'
                  }
                >
                  [{statusMessage}]
                </span>
              ) : (
                <span className="text-neutral-600">Enter: verificar · Esc: salir</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
