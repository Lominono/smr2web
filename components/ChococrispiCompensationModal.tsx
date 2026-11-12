'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';

interface ChococrispiCompensationModalProps {
  currentUser: UserProfile | null;
  isBlocked?: boolean;
  onUpdateUser: (updated: UserProfile) => void;
}

export const ChococrispiCompensationModal: React.FC<ChococrispiCompensationModalProps> = ({
  currentUser,
  isBlocked = false,
  onUpdateUser,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);

  useEffect(() => {
    if (!currentUser || isBlocked) return;
    const unlocked = Array.isArray(currentUser.mascotas_desbloqueadas)
      ? currentUser.mascotas_desbloqueadas
      : [];
    if (!unlocked.includes('chococrispi')) return;

    const seenKey = `smr2_chococrispi_notice_seen_${currentUser.id}`;
    try {
      if (localStorage.getItem(seenKey) === '1') return;
    } catch {}

    const timer = setTimeout(() => {
      setIsOpen(true);
      sound.coinWin();
      try {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      } catch {}
    }, 350);

    return () => clearTimeout(timer);
  }, [currentUser, isBlocked]);

  if (!isOpen || !currentUser || isBlocked) return null;

  const markSeen = () => {
    try {
      localStorage.setItem(`smr2_chococrispi_notice_seen_${currentUser.id}`, '1');
    } catch {}
    setIsOpen(false);
  };

  const handleEquipNow = async () => {
    if (isEquipping) return;
    setIsEquipping(true);
    try {
      const res = await fetch('/api/pets/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: 'chococrispi' }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        sound.coinWin();
        onUpdateUser({
          ...currentUser,
          mascota_equipada: 'chococrispi',
        });
      }
    } catch {
      /* si falla la red, igualmente ya la tiene desbloqueada en cuenta */
    } finally {
      setIsEquipping(false);
      markSeen();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-neutral-950 border border-purple-500/40 shadow-2xl shadow-purple-500/20 overflow-hidden text-white">
        <button
          type="button"
          onClick={markSeen}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 transition-colors cursor-pointer"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-purple-500/20 text-purple-200 border border-purple-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            Compensación automática recibida
          </span>

          <div className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-b from-purple-500/20 to-neutral-900 border border-purple-400/30 p-3 flex items-center justify-center shadow-xl">
            <img
              src="/mascotas/chococrispi.png"
              alt="Chococrispi"
              className="w-full h-full object-contain drop-shadow-[0_10px_25px_rgba(168,85,247,0.45)]"
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              ¡Te han dado a Chococrispi!
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Tus <strong>Afters/Rebirths</strong> de El Botellón se han reajustado a{' '}
              <strong className="text-purple-300">20</strong> para equilibrar la economía. Como compensación, esta mascota exclusiva ya se ha añadido gratis a tu cuenta.
            </p>
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-xs text-purple-200 leading-relaxed">
              <strong>+65% de producción permanente</strong> en El Botellón · Exclusiva de compensación (no se puede comprar en tienda).
            </div>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-1">
            {currentUser.mascota_equipada !== 'chococrispi' && (
              <button
                type="button"
                onClick={handleEquipNow}
                disabled={isEquipping}
                className="flex-1 py-3 px-4 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isEquipping ? 'Equipando...' : 'Equipar ahora'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={markSeen}
              className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>¡Genial, entendido!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
