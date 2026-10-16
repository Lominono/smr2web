'use client';

import React, { useState } from 'react';
import { Coins, Sparkles, X, Gift, RefreshCw, Zap } from 'lucide-react';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimCoins: (amount: number) => void;
}

export const FaucetModal: React.FC<FaucetModalProps> = ({
  isOpen,
  onClose,
  onClaimCoins,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleStandardClaim = () => {
    onClaimCoins(500);
    sound.coinWin();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
    onClose();
  };

  const handleSpinRoulette = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSpinResult(null);
    sound.whoosh();

    const outcomes = [200, 350, 500, 750, 1000, 1500, 2000];
    let counter = 0;
    const interval = setInterval(() => {
      const temp = outcomes[Math.floor(Math.random() * outcomes.length)];
      setSpinResult(temp);
      sound.tap();
      counter++;

      if (counter >= 15) {
        clearInterval(interval);
        const finalReward = outcomes[Math.floor(Math.random() * outcomes.length)];
        setSpinResult(finalReward);
        setIsSpinning(false);
        onClaimCoins(finalReward);
        sound.jackpot();

        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });

        setTimeout(() => {
          onClose();
        }, 1800);
      }
    }, 80);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e0f15] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight font-sans">
                LA BECA DEL RECREO
              </h3>
              <p className="text-xs text-zinc-400">
                Rescate de emergencia para que sigas apostando
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            ¿Te has quedado a dos velas por apostar al rojo o por un tiro fallido? El fondo de rescate del aula te cubre.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Standard 500 Claim */}
            <button
              onClick={handleStandardClaim}
              className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-emerald-400">FIJO SEGURO</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold font-mono text-white mb-1">+500 🪙</div>
              <p className="text-[11px] text-zinc-400">Sin sorteos. Directo a tu bolsillo.</p>
            </button>

            {/* Lucky Roulette 200 - 2000 */}
            <button
              onClick={handleSpinRoulette}
              disabled={isSpinning}
              className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 border border-purple-500/30 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-purple-400">RULETA DE LA SUERTE</span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold font-mono text-purple-300 mb-1">
                {isSpinning && spinResult ? `${spinResult} 🪙` : 'Hasta 2.000 🪙'}
              </div>
              <p className="text-[11px] text-zinc-400">
                {isSpinning ? '¡Girando...' : 'Arriésgate a sacar el bote gordo.'}
              </p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/40 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
