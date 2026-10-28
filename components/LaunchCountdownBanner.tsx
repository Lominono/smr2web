'use client';

import React, { useState, useEffect } from 'react';
import { Rocket, Clock, Sparkles } from 'lucide-react';

// Fecha oficial de salida: 9 de noviembre a las 8:35 AM
const TARGET_LAUNCH_DATE = new Date('2026-11-09T08:35:00+01:00').getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLaunched: boolean;
}

function calculateTimeLeft(): TimeLeft {
  const now = Date.now();
  const diff = TARGET_LAUNCH_DATE - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLaunched: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isLaunched: false };
}

interface LaunchCountdownBannerProps {
  compact?: boolean;
}

export const LaunchCountdownBanner: React.FC<LaunchCountdownBannerProps> = ({ compact = false }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return null;
  }

  if (timeLeft.isLaunched) {
    return (
      <div className="mx-3 sm:mx-0 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 sm:p-4 text-center select-none shadow-xs">
        <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-xs sm:text-sm">
          <Sparkles className="w-4 h-4 animate-bounce" />
          <span>¡La web oficial de 2º SMR ya ha salido oficialmente!</span>
        </div>
      </div>
    );
  }

  // Versión compacta para AuthGate u otros espacios reducidos
  if (compact) {
    return (
      <div className="rounded-xl bg-surface-raised border border-border/80 px-3 py-2 flex items-center justify-between gap-2 text-xs select-none">
        <div className="flex items-center gap-1.5 text-foreground-muted min-w-0">
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] font-medium truncate">Salida Oficial (9 Nov, 8:35 AM):</span>
        </div>

        <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-foreground shrink-0">
          <span className="px-1.5 py-0.5 rounded bg-surface border border-border/70 text-amber-400">
            {timeLeft.days}d
          </span>
          <span>:</span>
          <span className="px-1.5 py-0.5 rounded bg-surface border border-border/70">
            {String(timeLeft.hours).padStart(2, '0')}h
          </span>
          <span>:</span>
          <span className="px-1.5 py-0.5 rounded bg-surface border border-border/70">
            {String(timeLeft.minutes).padStart(2, '0')}m
          </span>
          <span>:</span>
          <span className="px-1.5 py-0.5 rounded bg-surface border border-border/70 text-amber-400">
            {String(timeLeft.seconds).padStart(2, '0')}s
          </span>
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-label="Cuenta regresiva para la salida oficial de la web"
      className="mx-3 sm:mx-0 rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white border border-neutral-800/80 p-3.5 sm:p-4.5 shadow-md select-none transition-all duration-300 relative overflow-hidden"
    >
      {/* Sutil resplandor de fondo */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 relative z-10">
        {/* Cabecera del anuncio */}
        <div className="flex items-center gap-3 text-center sm:text-left min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Rocket className="w-4.5 h-4.5 animate-pulse" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-white uppercase font-mono">
                Salida Oficial de la Web
              </h3>
            </div>
            <p className="text-[11px] text-neutral-400 truncate">
              Lanzamiento de 2º SMR · <strong className="text-neutral-200 font-medium">9 de Noviembre a las 8:35 AM</strong>
            </p>
          </div>
        </div>

        {/* Cajas de cuenta regresiva en vivo */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* DÍAS */}
          <div className="flex flex-col items-center justify-center min-w-[46px] sm:min-w-[52px] py-1.5 px-2 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-inner">
            <span className="font-mono text-base sm:text-lg font-extrabold text-amber-400 leading-none">
              {timeLeft.days}
            </span>
            <span className="text-[9px] font-mono tracking-wider text-neutral-400 uppercase mt-0.5">
              Días
            </span>
          </div>

          <span className="text-neutral-600 font-mono font-bold">:</span>

          {/* HORAS */}
          <div className="flex flex-col items-center justify-center min-w-[46px] sm:min-w-[52px] py-1.5 px-2 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-inner">
            <span className="font-mono text-base sm:text-lg font-extrabold text-white leading-none">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-mono tracking-wider text-neutral-400 uppercase mt-0.5">
              Horas
            </span>
          </div>

          <span className="text-neutral-600 font-mono font-bold">:</span>

          {/* MINUTOS */}
          <div className="flex flex-col items-center justify-center min-w-[46px] sm:min-w-[52px] py-1.5 px-2 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-inner">
            <span className="font-mono text-base sm:text-lg font-extrabold text-white leading-none">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-mono tracking-wider text-neutral-400 uppercase mt-0.5">
              Min
            </span>
          </div>

          <span className="text-neutral-600 font-mono font-bold">:</span>

          {/* SEGUNDOS */}
          <div className="flex flex-col items-center justify-center min-w-[46px] sm:min-w-[52px] py-1.5 px-2 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-inner">
            <span className="font-mono text-base sm:text-lg font-extrabold text-amber-400 leading-none">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-mono tracking-wider text-neutral-400 uppercase mt-0.5">
              Seg
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
