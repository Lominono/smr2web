'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, X } from 'lucide-react';

export const MobileNotice: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const dismissed = sessionStorage.getItem('smr2_mobile_notice_dismissed');
      if (!dismissed && typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsOpen(true);
      }
    } catch {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsOpen(true);
      }
    }

    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem('smr2_mobile_notice_dismissed', 'true');
    } catch {}
  };

  // No renderizar en servidor ni si la pantalla no es móvil ni si fue descartado
  if (!mounted || !isOpen) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="md:hidden fixed bottom-4 inset-x-3.5 z-[9990] animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto select-none"
    >
      <div className="rounded-2xl border border-neutral-800 bg-[#09090b]/95 backdrop-blur-xl p-4 shadow-2xl text-neutral-200 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="p-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-center">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
            <span>Aviso para dispositivos móviles</span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar aviso para móviles"
            className="text-neutral-500 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
          Pedimos disculpas: esta web está diseñada y optimizada principalmente para ordenadores y
          pantallas grandes. Aún no se encuentra del todo optimizada para teléfonos móviles :(, por
          lo que podrías experimentar desajustes visuales. Te recomendamos acceder desde tu PC o
          portátil para disfrutar de la experiencia completa.
        </p>

        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-medium text-neutral-200 hover:text-white px-3.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </aside>
  );
};

export default MobileNotice;
