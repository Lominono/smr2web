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

  const storedSpin = typeof window !== 'undefined' && currentUser?.id
    ? localStorage.getItem(`smr2_last_spin_${currentUser.id}`)
    : null;
  const effectiveSpinDate = storedSpin || currentUser?.last_spin_date;
  const spinRemainingMs = getSpinCooldownRemaining(effectiveSpinDate);
  const isSpinAvailable = spinRemainingMs <= 0 && !isSpinning;

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

    const outcomes = [15, 25, 40, 60, 80, 120];
    let counter = 0;
    const interval = setInterval(() => {
      const temp = outcomes[Math.floor(Math.random() * outcomes.length)];
      setSpinResult(temp);
      sound.tap();
      counter++;

      if (counter >= 12) {
        clearInterval(interval);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-200">
      <Card className="w-full max-w-md max-h-[92dvh] overflow-y-auto p-0 flex flex-col bg-surface border border-border shadow-2xl rounded-t-2xl sm:rounded-2xl overscroll-contain">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border/70 text-foreground flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Fondo diario y racha
              </h3>
              <p className="text-xs text-foreground-muted">
                Saldo: <span className="text-foreground font-mono font-semibold">{currentCoins.toLocaleString('es-ES')}</span> fichas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised border border-border/50 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Daily Streak Card */}
          <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">
                  Racha diaria (Día {streak})
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-accent">
                +{dailyAmount} fichas
              </span>
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
                    className={`py-2 px-1 text-center rounded-lg border text-[11px] font-mono transition-colors ${
                      isCurrent
                        ? 'bg-surface border-accent text-accent font-semibold shadow-2xs'
                        : isPassed
                        ? 'bg-surface border-border text-foreground'
                        : 'bg-surface-raised/40 border-border-subtle text-foreground-subtle'
                    }`}
                  >
                    <div>Día {dayNum}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">+{amt}</div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full text-xs font-medium h-9 rounded-lg"
              onClick={handleClaimDaily}
              disabled={!isDailyAvailable}
            >
              {isDailyAvailable ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Reclamar +{dailyAmount} fichas hoy
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5 text-foreground-muted">
                  <Check className="w-3.5 h-3.5 text-success" /> Racha reclamada hoy
                </span>
              )}
            </Button>
          </div>

          {/* Rescue & Roulette Options with Cooldowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Rescue fund */}
            <button
              type="button"
              onClick={handleRescueClaim}
              disabled={!isRescueAvailable}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden active:scale-95 touch-manipulation ${
                isRescueAvailable
                  ? 'bg-surface-raised border-border text-foreground hover:bg-surface-hover cursor-pointer shadow-2xs'
                  : 'bg-surface-raised/50 border-border/50 text-foreground-subtle cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">
                  Fondo de rescate
                </span>
                <ShieldAlert className="w-3.5 h-3.5 text-foreground-subtle" />
              </div>
              <div className="text-sm font-semibold font-mono text-foreground mb-0.5">
                +{RESCUE_AMOUNT} <span className="text-[10px] text-foreground-muted font-normal">fichas</span>
              </div>
              <p className="text-[10px] text-foreground-muted font-mono flex items-center gap-1">
                {!isRescueEligible ? (
                  <span>Solo con saldo &lt; {RESCUE_THRESHOLD}</span>
                ) : rescueRemainingMs > 0 ? (
                  <>
                    <Clock className="w-3 h-3 text-foreground-subtle" />
                    <span>Espera {formatCooldown(rescueRemainingMs)}</span>
                  </>
                ) : (
                  <span className="text-success font-medium">Disponible ahora</span>
                )}
              </p>
            </button>

            {/* Random Spin Roulette */}
            <button
              type="button"
              onClick={handleSpinRoulette}
              disabled={!isSpinAvailable}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden active:scale-95 touch-manipulation ${
                isSpinAvailable
                  ? 'bg-surface-raised border-border text-foreground hover:bg-surface-hover cursor-pointer shadow-2xs'
                  : 'bg-surface-raised/50 border-border/50 text-foreground-subtle cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">
                  Giro diario
                </span>
                <Dices className="w-3.5 h-3.5 text-foreground-subtle" />
              </div>
              <div className="text-sm font-semibold font-mono text-foreground mb-0.5">
                {isSpinning && spinResult ? `${spinResult} fichas` : '15 — 120 fichas'}
              </div>
              <p className="text-[10px] text-foreground-muted font-mono flex items-center gap-1">
                {isSpinning ? (
                  <span className="text-accent animate-pulse">Girando...</span>
                ) : spinRemainingMs > 0 ? (
                  <>
                    <Clock className="w-3 h-3 text-foreground-subtle" />
                    <span>Espera {formatCooldown(spinRemainingMs)}</span>
                  </>
                ) : (
                  <span className="text-success font-medium">1 giro listo</span>
                )}
              </p>
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-raised border border-border/50 text-[11px] text-foreground-muted font-mono text-center">
            Economía cerrada para 2º SMR · Basada en participación lectiva
          </div>
        </div>
      </Card>
    </div>
  );
};
