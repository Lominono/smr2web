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
    <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-lg w-auto">
      <Card className="p-4 space-y-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface-raised border border-border flex items-center justify-center text-accent shrink-0">
            <Cookie className="w-4 h-4" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-foreground">
                Cookies técnicas
              </span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Utilizamos almacenamiento local para recordar tu sesión y preferencias de sonido. Sin rastreo publicitario.
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
            <span>Ver normativa</span>
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEssentialOnly}
            >
              Solo esenciales
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAccept}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aceptar</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
