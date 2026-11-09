'use client';

import React, { useState, useEffect } from 'react';
import { TARGET_LAUNCH_TIMESTAMP } from '@/components/LaunchCountdownGate';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLaunched: boolean;
}

function calculateTimeLeft(): TimeLeft {
  const now = Date.now();
  const diff = TARGET_LAUNCH_TIMESTAMP - now;

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
    return null;
  }

  // Versión compacta para AuthGate u otros espacios reducidos
  if (compact) {
    return (
      <div className="rounded-xl bg-surface/70 border border-border/50 px-3.5 py-1.5 flex items-center justify-between text-xs select-none backdrop-blur-md">
        <span className="text-[11px] text-foreground-muted font-mono tracking-tight">Apertura · 9 nov, 09:20</span>
        <div className="flex items-center gap-1 font-mono text-[11px] text-foreground tabular-nums">
          <span>{timeLeft.days}d</span>
          <span className="text-foreground-subtle">:</span>
          <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
          <span className="text-foreground-subtle">:</span>
          <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
          <span className="text-foreground-subtle">:</span>
          <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Cuenta regresiva para la apertura del portal"
      className="mx-3 sm:mx-0 rounded-xl bg-surface/60 border border-border/50 px-4 py-2 select-none flex items-center justify-between gap-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 text-xs text-foreground-muted font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
        <span>Apertura oficial · 9 de noviembre · 09:20</span>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-foreground">
        <span>{timeLeft.days}d</span>
        <span className="text-foreground-subtle">:</span>
        <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span className="text-foreground-subtle">:</span>
        <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span className="text-foreground-subtle">:</span>
        <span className="text-foreground font-semibold">{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
};
