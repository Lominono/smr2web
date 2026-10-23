'use client';

import React, { useState, useEffect } from 'react';
import { Cookie, FileText, Check } from 'lucide-react';
import { setCookie, getCookie } from '@/lib/cookies';
import { sound } from '@/lib/audio';
import { Card } from '@/components/ui/Card';
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
      aria-label="Aviso de privacidad y cookies"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-md w-auto animate-in slide-in-from-bottom-4 duration-250 select-none"
    >
      <Card className="p-4 space-y-3 shadow-2xl bg-surface/95 backdrop-blur-md border border-border">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-accent shrink-0">
            <Cookie className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-foreground">
                Cookies de clase (No son las del recreo)
              </span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed font-sans">
              Usamos almacenamiento local para que no pierdas tus monedas, tus litros del botellón ni tus ajustes si cierras la pestaña de golpe cuando el profesor de Redes o Sistemas se levanta a mirar tu pantalla. Cero rastreadores publicitarios: ni nos patrocina Google ni sabemos qué haces en tus ratos libres.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenTerms();
              sound.tap();
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ver normativa & chistes</span>
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEssentialOnly}
            >
              Lo justo
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAccept}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aceptar (Confianza ciega)</span>
            </Button>
          </div>
        </div>
      </Card>
    </aside>
  );
};
