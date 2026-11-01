'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { setCookie, getCookie } from '@/lib/cookies';
import { sound } from '@/lib/audio';
import { Button } from '@/components/ui/Button';

interface CookieBannerProps {
  onOpenTerms: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenTerms }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = getCookie('smr2_cookie_consent');
      if (!consent) {
        setIsVisible(true);
      }
    } catch {}
  }, []);

  const handleAccept = () => {
    setCookie('smr2_cookie_consent', 'accepted', { days: 365 });
    sound.tap();
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    setCookie('smr2_cookie_consent', 'essential', { days: 365 });
    sound.tap();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Aviso de privacidad y almacenamiento"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-md w-auto animate-in fade-in slide-in-from-bottom-2 duration-200 select-none"
    >
      <div className="p-4 rounded-2xl bg-surface/95 backdrop-blur-md border border-border shadow-lg space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-foreground shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
          </div>

          <div className="space-y-1 min-w-0">
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Almacenamiento y privacidad
            </h3>
            <p className="text-xs text-foreground-muted leading-relaxed font-sans">
              Conservamos tu sesión y preferencias de aula en el almacenamiento local de tu navegador. Sin rastreo publicitario ni servicios de terceros.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => {
              onOpenTerms();
              sound.tap();
            }}
            className="text-xs text-foreground-muted hover:text-foreground font-medium underline underline-offset-2 transition-colors cursor-pointer"
          >
            Normas de uso
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEssentialOnly}
              className="text-xs h-7 px-2.5 rounded-lg"
            >
              Solo necesarias
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAccept}
              className="text-xs h-7 px-3 rounded-lg"
            >
              Aceptar
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};
