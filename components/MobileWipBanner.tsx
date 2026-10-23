'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, X, Laptop } from 'lucide-react';
import { sound } from '@/lib/audio';

const STORAGE_KEY = 'smr2_mobile_wip_dismissed_session';

export const MobileWipBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY) === 'true';
      setIsDismissed(dismissed);
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    sound.tap();
    setIsDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  };

  if (isDismissed) return null;

  return (
    <div className="lg:hidden max-w-7xl mx-auto w-full px-3 sm:px-6 pt-3 pb-1">
      <div
        role="region"
        aria-label="Aviso sobre versión móvil"
        className="p-3 sm:p-3.5 rounded-xl bg-surface border border-border/80 shadow-2xs transition-all animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-surface-raised border border-border/70 flex items-center justify-center shrink-0 mt-0.5 text-accent">
              <Smartphone className="w-3.5 h-3.5" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-foreground tracking-tight">
                  Versión móvil en desarrollo
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-raised text-foreground-muted border border-border/60">
                  2º SMR
                </span>
              </div>

              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Lamentamos no tener terminada aún la web para los usuarios de móviles, estamos trabajando en ello activamente para optimizar la experiencia táctil. Para acceder a todas las funciones y utilidades de clase, te recomendamos usar un ordenador.
              </p>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Laptop className="w-3 h-3" />
                  <span>Entendido, continuar</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar aviso"
            className="w-6 h-6 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
