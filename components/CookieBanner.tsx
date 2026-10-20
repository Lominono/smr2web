'use client';

import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, FileText, Check, X } from 'lucide-react';
import { setCookie, getCookie } from '@/lib/cookies';
import { sound } from '@/lib/audio';

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
    <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-lg w-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c14]/95 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.8)] space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Cookie className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white">
                Cookies y Almacenamiento SMR2
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                365 Días
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-300 font-sans leading-relaxed">
              Guardamos tu sesión, saldo de monedas y preferencias de sonido en cookies locales para que no tengas que loguearte cada día. Cero rastreadores de publicidad ni espías del instituto.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              onOpenTerms();
              sound.tap();
            }}
            className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Términos y Normas</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 text-[11px] font-mono transition-all cursor-pointer active:scale-95"
            >
              Solo esenciales
            </button>

            <button
              type="button"
              onClick={handleAccept}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-[11px] font-mono font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aceptar todo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
