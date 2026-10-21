'use client';

import React, { useState, useEffect } from 'react';
import { Coins, X, Gift, Dices, Flame, ShieldAlert, Check, Clock, Sparkles } from 'lucide-react';
import { sound } from '@/lib/audio';
import { UserProfile } from '@/lib/types';
import {
  canClaimDaily,
  getDailyRewardAmount,
  getSpinCooldownRemaining,
  getRescueCooldownRemaining,
  formatCooldown,
  RESCUE_THRESHOLD,
  RESCUE_AMOUNT,
} from '@/lib/economy';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimCoins: (amount: number, newStreak?: number, claimType?: 'daily' | 'spin' | 'rescue') => void;
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
  const [now, setNow] = useState(Date.now());

  // Ticking timer for real-time cooldown countdowns
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCoins = currentUser?.coins ?? 200;
  const streak = currentUser?.streak_count ?? 1;
  const isDailyAvailable = canClaimDaily(currentUser?.last_claim_date);
  const dailyAmount = getDailyRewardAmount(streak);

  // Spin cooldown check: profile or local storage
  const storedSpin = typeof window !== 'undefined' && currentUser?.id
    ? localStorage.getItem(`smr2_last_spin_${currentUser.id}`)
    : null;
  const effectiveSpinDate = storedSpin || currentUser?.last_spin_date;
  const spinRemainingMs = getSpinCooldownRemaining(effectiveSpinDate);
  const isSpinAvailable = spinRemainingMs <= 0 && !isSpinning;

  // Rescue cooldown check
  const storedRescue = typeof window !== 'undefined' && currentUser?.id
    ? localStorage.getItem(`smr2_last_rescue_${currentUser.id}`)
    : null;
  const effectiveRescueDate = storedRescue || currentUser?.last_rescue_date;
  const rescueRemainingMs = getRescueCooldownRemaining(effectiveRescueDate);
  const isRescueEligible = currentCoins < RESCUE_THRESHOLD;
  const isRescueAvailable = isRescueEligible && rescueRemainingMs <= 0;

  const handleClaimDaily = () => {
    if (!isDailyAvailable) return;
    const nextStreak = streak >= 5 ? 1 : streak + 1;
    onClaimCoins(dailyAmount, nextStreak, 'daily');
    sound.coinWin();
    onClose();
  };

  const handleRescueClaim = () => {
    if (!isRescueAvailable) return;
    const nowIso = new Date().toISOString();
    if (typeof window !== 'undefined' && currentUser?.id) {
      localStorage.setItem(`smr2_last_rescue_${currentUser.id}`, nowIso);
    }
    onClaimCoins(RESCUE_AMOUNT, undefined, 'rescue');
    sound.coinWin();
    onClose();
  };

  const handleSpinRoulette = () => {
    if (!isSpinAvailable) return;
    setIsSpinning(true);
    setSpinResult(null);
    sound.whoosh();

    // Balanced, non-hyperinflated spin rewards
    const outcomes = [15, 25, 40, 60, 80, 120];
    let counter = 0;
    const interval = setInterval(() => {
      const temp = outcomes[Math.floor(Math.random() * outcomes.length)];
      setSpinResult(temp);
      sound.tap();
      counter++;

      if (counter >= 12) {
        clearInterval(interval);
        // Weighted outcome: 15 (30%), 25 (30%), 40 (20%), 60 (12%), 80 (6%), 120 (2%)
        const rand = Math.random();
        let finalReward = 15;
        if (rand < 0.30) finalReward = 15;
        else if (rand < 0.60) finalReward = 25;
        else if (rand < 0.80) finalReward = 40;
        else if (rand < 0.92) finalReward = 60;
        else if (rand < 0.98) finalReward = 80;
        else finalReward = 120;

        setSpinResult(finalReward);
        setIsSpinning(false);

        const nowIso = new Date().toISOString();
        if (typeof window !== 'undefined' && currentUser?.id) {
          localStorage.setItem(`smr2_last_spin_${currentUser.id}`, nowIso);
        }

        onClaimCoins(finalReward, undefined, 'spin');
        sound.coinWin();

        setTimeout(() => {
          onClose();
        }, 900);
      }
    }, 65);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <Card className="w-full max-w-md max-h-[92dvh] overflow-y-auto p-0 flex flex-col bg-[#0c0d12] border-white/[0.12] shadow-2xl rounded-3xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between sticky top-0 bg-[#0c0d12]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-mono flex items-center gap-1.5">
                Economía & Recompensas
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-normal">
                  SMR2
                </span>
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Saldo: <span className="text-amber-400 font-semibold">{currentCoins.toLocaleString('es-ES')}</span> fichas
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Daily Streak Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-semibold text-white">
                  Racha diaria (Día {streak})
                </span>
              </div>
              <Badge variant="accent" size="sm" className="font-mono">
                +{dailyAmount} fichas
              </Badge>
            </div>

            {/* Streak Step Progress */}
            <div className="grid grid-cols-5 gap-1.5">
              {[25, 45, 70, 105, 150].map((amt, idx) => {
                const dayNum = idx + 1;
                const isPassed = streak > dayNum;
                const isCurrent = streak === dayNum;

                return (
                  <div
                    key={dayNum}
                    className={`py-2 px-1 text-center rounded-xl border text-[10px] font-mono transition-colors ${
                      isCurrent
                        ? 'bg-amber-400/15 border-amber-400 text-amber-300 font-bold shadow-sm'
                        : isPassed
                        ? 'bg-white/[0.06] border-white/15 text-white'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-500'
                    }`}
                  >
                    <div>Día {dayNum}</div>
                    <div className="text-[9px] opacity-85 mt-0.5 font-semibold">+{amt}</div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full font-mono text-xs font-bold"
              onClick={handleClaimDaily}
              disabled={!isDailyAvailable}
            >
              {isDailyAvailable ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Reclamar +{dailyAmount} fichas hoy
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5 text-zinc-400">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Racha reclamada hoy
                </span>
              )}
            </Button>
          </div>

          {/* Rescue & Roulette Options with Cooldowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Rescue fund (enabled only if balance < 50 AND not in cooldown) */}
            <button
              type="button"
              onClick={handleRescueClaim}
              disabled={!isRescueAvailable}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isRescueAvailable
                  ? 'bg-rose-500/10 border-rose-500/30 text-white hover:bg-rose-500/15 cursor-pointer active:scale-98 shadow-sm'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 cursor-not-allowed opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-mono font-semibold ${isRescueAvailable ? 'text-rose-400' : 'text-zinc-500'}`}>
                  Fondo Rescate
                </span>
                <ShieldAlert className={`w-3.5 h-3.5 ${isRescueAvailable ? 'text-rose-400' : 'text-zinc-600'}`} />
              </div>
              <div className="text-base font-bold font-mono text-white mb-0.5">
                +{RESCUE_AMOUNT} <span className="text-[10px] text-zinc-400 font-normal">fichas</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                {!isRescueEligible ? (
                  <span>Solo con saldo &lt; {RESCUE_THRESHOLD}</span>
                ) : rescueRemainingMs > 0 ? (
                  <>
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Espera {formatCooldown(rescueRemainingMs)}</span>
                  </>
                ) : (
                  <span className="text-emerald-400 font-semibold">Disponible ahora</span>
                )}
              </p>
            </button>

            {/* Random Spin Roulette (Strict 12h Cooldown) */}
            <button
              type="button"
              onClick={handleSpinRoulette}
              disabled={!isSpinAvailable}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isSpinAvailable
                  ? 'bg-amber-400/[0.07] border-amber-400/30 text-white hover:bg-amber-400/[0.12] cursor-pointer active:scale-98 shadow-sm'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 cursor-not-allowed opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-mono font-semibold ${isSpinAvailable ? 'text-amber-400' : 'text-zinc-500'}`}>
                  Ruleta Diaria
                </span>
                <Dices className={`w-3.5 h-3.5 ${isSpinAvailable ? 'text-amber-400' : 'text-zinc-600'}`} />
              </div>
              <div className="text-base font-bold font-mono text-white mb-0.5">
                {isSpinning && spinResult ? `${spinResult} fichas` : '15 — 120'}
              </div>
              <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                {isSpinning ? (
                  <span className="text-amber-300 animate-pulse">Girando...</span>
                ) : spinRemainingMs > 0 ? (
                  <>
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Espera {formatCooldown(spinRemainingMs)}</span>
                  </>
                ) : (
                  <span className="text-emerald-400 font-semibold">1 giro listo</span>
                )}
              </p>
            </button>
          </div>

          {/* Fair Economy Disclaimer Notice */}
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Economía equilibrada SMR2: sin dinero real, basada en habilidad y constancia.</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
