'use client';

import React, { useState, useEffect } from 'react';

// Fecha oficial de lanzamiento: 9 de noviembre a las 8:35 AM CET
const TARGET_LAUNCH_DATE = new Date('2026-11-09T08:35:00+01:00').getTime();

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLaunched: boolean;
}

function calculateTimeRemaining(): TimeRemaining {
  const diff = TARGET_LAUNCH_DATE - Date.now();

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
  const [time, setTime] = useState<TimeRemaining>(calculateTimeRemaining);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTime(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return null;
  }

  if (time.isLaunched) {
    return (
      <div className="mx-3 sm:mx-0 rounded-xl bg-surface border border-border/70 p-3 text-center select-none font-mono text-xs text-foreground-muted">
        <span>Portal 2º SMR operativo.</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-lg bg-surface border border-border/70 px-3 py-2 flex items-center justify-between gap-2 text-xs select-none font-mono">
        <span className="text-[11px] text-foreground-subtle tracking-tight">09.11 — 08:35 CET</span>
        <div className="flex items-center gap-1 font-semibold text-[11px] text-foreground tabular-nums">
          <span>{String(time.days).padStart(2, '0')}d</span>
          <span className="text-foreground-subtle">:</span>
          <span>{String(time.hours).padStart(2, '0')}h</span>
          <span className="text-foreground-subtle">:</span>
          <span>{String(time.minutes).padStart(2, '0')}m</span>
          <span className="text-foreground-subtle">:</span>
          <span className="text-foreground-muted">{String(time.seconds).padStart(2, '0')}s</span>
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-label="Conteo de lanzamiento oficial"
      className="mx-3 sm:mx-0 rounded-xl bg-surface border border-border/80 px-4 py-3 select-none transition-all font-mono"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-foreground font-medium tracking-tight">
            Lanzamiento oficial programado: 09 de noviembre de 2026 a las 08:35 CET
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono tabular-nums text-foreground">
          <span className="px-2 py-0.5 rounded bg-surface-raised border border-border/70">
            {String(time.days).padStart(2, '0')}d
          </span>
          <span className="text-foreground-subtle">:</span>
          <span className="px-2 py-0.5 rounded bg-surface-raised border border-border/70">
            {String(time.hours).padStart(2, '0')}h
          </span>
          <span className="text-foreground-subtle">:</span>
          <span className="px-2 py-0.5 rounded bg-surface-raised border border-border/70">
            {String(time.minutes).padStart(2, '0')}m
          </span>
          <span className="text-foreground-subtle">:</span>
          <span className="px-2 py-0.5 rounded bg-surface-raised border border-border/70 text-foreground-muted">
            {String(time.seconds).padStart(2, '0')}s
          </span>
        </div>
      </div>
    </aside>
  );
};
