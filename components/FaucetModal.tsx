'use client';

import React, { useState } from 'react';
import { Coins, X, Gift, Dices, Flame, ShieldAlert, Check } from 'lucide-react';
import { sound } from '@/lib/audio';
import { UserProfile } from '@/lib/types';
import { canClaimDaily, getDailyRewardAmount } from '@/lib/economy';
import confetti from 'canvas-confetti';

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimCoins: (amount: number, newStreak?: number) => void;
  currentUser?: UserProfile | null;
}

export const FaucetModal: React.FC<FaucetModalProps> = ({
  isOpen,
  onClose,
  onClaimCoins,
  currentUser,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);

  if (!isOpen) return null;

  const currentCoins = currentUser?.coins ?? 1000;
  const streak = currentUser?.streak_count ?? 1;
  const isDailyAvailable = canClaimDaily(currentUser?.last_claim_date);
  const dailyAmount = getDailyRewardAmount(streak);
  const isLowBalance = currentCoins < 100;

  const handleClaimDaily = () => {
    if (!isDailyAvailable) return;
    const nextStreak = streak >= 5 ? 1 : streak + 1;
    onClaimCoins(dailyAmount, nextStreak);
    sound.coinWin();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
    onClose();
  };

  const handleRescueClaim = () => {
    onClaimCoins(250);
    sound.coinWin();
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });
    onClose();
  };

  const handleSpinRoulette = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSpinResult(null);
    sound.whoosh();

    const outcomes = [150, 250, 400, 600, 800, 1200];
    let counter = 0;
    const interval = setInterval(() => {
      const temp = outcomes[Math.floor(Math.random() * outcomes.length)];
      setSpinResult(temp);
      sound.tap();
      counter++;

      if (counter >= 14) {
        clearInterval(interval);
        const finalReward = outcomes[Math.floor(Math.random() * outcomes.length)];
        setSpinResult(finalReward);
        setIsSpinning(false);
        onClaimCoins(finalReward);
        sound.jackpot();

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        setTimeout(() => {
          onClose();
        }, 1400);
      }
    }, 75);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="glass-panel border border-white/10 rounded-3xl w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight font-mono">
                Economía & Fichas
              </h3>
              <p className="text-xs text-zinc-500 font-mono">
                Saldo actual: {currentCoins.toLocaleString('es-ES')} fichas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Daily Streak Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-white">
                  Racha diaria (Día {streak})
                </span>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">
                +{dailyAmount} fichas
              </span>
            </div>

            {/* Streak Step Progress */}
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {[150, 250, 400, 600, 1000].map((amt, idx) => {
                const dayNum = idx + 1;
                const isPassed = streak > dayNum;
                const isCurrent = streak === dayNum;

                return (
                  <div
                    key={dayNum}
                    className={`py-2 px-1 text-center rounded-xl border text-[10px] font-mono transition-all ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold shadow-sm'
                        : isPassed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/[0.02] border-white/[0.04] text-zinc-600'
                    }`}
                  >
                    <div>D{dayNum}</div>
                    <div className="text-[9px] opacity-80 mt-0.5">+{amt}</div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleClaimDaily}
              disabled={!isDailyAvailable}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                isDailyAvailable
                  ? 'bg-white text-black hover:bg-zinc-200 shadow-md'
                  : 'bg-white/[0.05] text-zinc-500 border border-white/[0.06] cursor-not-allowed'
              }`}
            >
              {isDailyAvailable ? (
                <span>Reclamar +{dailyAmount} fichas hoy</span>
              ) : (
                <span className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Reclamado hoy
                </span>
              )}
            </button>
          </div>

          {/* Rescue & Roulette Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Rescue fund (enabled if balance < 100) */}
            <button
              onClick={handleRescueClaim}
              disabled={!isLowBalance}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                isLowBalance
                  ? 'bg-rose-500/10 border-rose-500/30 text-white cursor-pointer hover:border-rose-500/50'
                  : 'bg-white/[0.02] border-white/[0.04] opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-rose-400">Rescate</span>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-lg font-bold font-mono text-white mb-0.5">+250</div>
              <p className="text-[10px] text-zinc-500 font-mono">
                {isLowBalance ? 'Disponible (<100 fichas)' : 'Saldo suficiente'}
              </p>
            </button>

            {/* Random Spin Roulette */}
            <button
              onClick={handleSpinRoulette}
              disabled={isSpinning}
              className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-white">Ruleta</span>
                <Dices className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-bold font-mono text-white mb-0.5">
                {isSpinning && spinResult ? `${spinResult}` : '150 — 1200'}
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">
                {isSpinning ? 'Girando...' : 'Tirada aleatoria'}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
