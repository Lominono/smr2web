'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import {
  Wine,
  BottleWine,
  CupSoda,
  GlassWater,
  Music,
  Sparkles,
  Coins,
  Flame,
  Zap,
  RotateCcw,
  Clock,
  ArrowDownToLine,
  Check,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PartyIdleGameProps {
  userCoins: number;
  userId?: string;
  onUpdateCoins: (delta: number) => void;
  onBroadcastWin?: (
    game: 'angry' | 'crash' | 'mines' | 'roulette',
    multiplier: number,
    winAmount: number
  ) => void;
}

interface TierConfig {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  baseRate: number; // fichas por segundo
  icon: React.ComponentType<{ className?: string }>;
}

const TIERS: TierConfig[] = [
  {
    id: 'litronas',
    name: 'Litronas del chino',
    desc: 'Lo básico para empezar a beber en el parque.',
    baseCost: 25,
    baseRate: 1,
    icon: BottleWine,
  },
  {
    id: 'hielos',
    name: 'Bolsa de hielos y vasos',
    desc: 'Para que no se caliente el trago a los 5 minutos.',
    baseCost: 90,
    baseRate: 4,
    icon: GlassWater,
  },
  {
    id: 'chupitos',
    name: 'Ronda de chupitos',
    desc: 'Tequila y Jäger para que la peña se anime rápido.',
    baseCost: 320,
    baseRate: 14,
    icon: Wine,
  },
  {
    id: 'botellas',
    name: 'Nevera con botellas y mezcla',
    desc: 'Ron-cola y ginebra sin escatimar con los hielos.',
    baseCost: 1100,
    baseRate: 48,
    icon: CupSoda,
  },
  {
    id: 'altavoz',
    name: 'Altavoz a toda mecha',
    desc: 'Suena el reguetón y se acerca tol mundo a la fiesta.',
    baseCost: 3800,
    baseRate: 160,
    icon: Music,
  },
  {
    id: 'barra_libre',
    name: 'Barra libre en el local',
    desc: 'Desmadre total y copas sin fin hasta el amanecer.',
    baseCost: 14000,
    baseRate: 550,
    icon: Flame,
  },
  {
    id: 'vip',
    name: 'Reservado VIP y champán',
    desc: 'Botellazas con bengalas para los reyes de la noche.',
    baseCost: 50000,
    baseRate: 1900,
    icon: Sparkles,
  },
];

interface BotellonState {
  levels: Record<string, number>;
  pendingVault: number;
  totalLifetimeProduced: number;
  afterPrestigeCount: number;
  lastTickMs: number;
}

const STORAGE_KEY_PREFIX = 'smr2_botellon_data_';

export const PartyIdleGame: React.FC<PartyIdleGameProps> = ({
  userCoins,
  userId,
  onUpdateCoins,
}) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${userId || 'local'}`;

  // Estado del juego
  const [levels, setLevels] = useState<Record<string, number>>(() => ({
    litronas: 0,
    hielos: 0,
    chupitos: 0,
    botellas: 0,
    altavoz: 0,
    barra_libre: 0,
    vip: 0,
  }));
  const [pendingVault, setPendingVault] = useState<number>(0);
  const [totalLifetimeProduced, setTotalLifetimeProduced] = useState<number>(0);
  const [afterPrestigeCount, setAfterPrestigeCount] = useState<number>(0);

  // Estados de interfaz y feedback
  const [offlineReport, setOfflineReport] = useState<{
    seconds: number;
    earned: number;
  } | null>(null);
  const [partyComboCount, setPartyComboCount] = useState<number>(0);
  const [isCrazyParty, setIsCrazyParty] = useState<boolean>(false);
  const [crazyPartyTimeRemaining, setCrazyPartyTimeRemaining] = useState<number>(0);
  const [justClaimed, setJustClaimed] = useState<boolean>(false);

  // Multiplicador por prestigios de After
  const prestigeMultiplier = 1 + afterPrestigeCount * 0.5;

  // Tasa de producción pasiva base (por segundo)
  const baseRatePerSecond = useMemo(() => {
    return TIERS.reduce((acc, tier) => {
      const lvl = levels[tier.id] || 0;
      return acc + lvl * tier.baseRate;
    }, 0);
  }, [levels]);

  // Tasa real con multiplicadores aplicados
  const effectiveRatePerSecond = useMemo(() => {
    const frenzyMult = isCrazyParty ? 2 : 1;
    return baseRatePerSecond * prestigeMultiplier * frenzyMult;
  }, [baseRatePerSecond, prestigeMultiplier, isCrazyParty]);

  // 1. Cargar estado inicial y calcular farmeo offline
  useEffect(() => {
    let saved: BotellonState | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch {}

    const now = Date.now();

    if (saved) {
      setLevels(saved.levels || {});
      setPendingVault(saved.pendingVault || 0);
      setTotalLifetimeProduced(saved.totalLifetimeProduced || 0);
      setAfterPrestigeCount(saved.afterPrestigeCount || 0);

      // Calcular farmeo mientras no estaba
      if (saved.lastTickMs && saved.lastTickMs < now) {
        const elapsedSec = Math.min(
          Math.floor((now - saved.lastTickMs) / 1000),
          8 * 3600 // tope de 8 horas offline
        );

        if (elapsedSec > 10) {
          const mult = 1 + (saved.afterPrestigeCount || 0) * 0.5;
          const savedBaseRate = TIERS.reduce((acc, tier) => {
            const lvl = saved?.levels?.[tier.id] || 0;
            return acc + lvl * tier.baseRate;
          }, 0);

          const offlineEarned = Math.floor(elapsedSec * savedBaseRate * mult);
          if (offlineEarned > 0) {
            setPendingVault((prev) => prev + offlineEarned);
            setTotalLifetimeProduced((prev) => prev + offlineEarned);
            setOfflineReport({
              seconds: elapsedSec,
              earned: offlineEarned,
            });
          }
        }
      }
    }
  }, [storageKey]);

  // 2. Guardar periódicamente en localStorage y Supabase
  const saveState = useCallback(
    (currentState: BotellonState) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentState));
      } catch {}

      // Intentar guardar en Supabase de forma no bloqueante
      if (userId) {
        const supabase = createClient();
        if (supabase) {
          (async () => {
            try {
              await supabase
                .from('profiles')
                .update({ party_farm_data: currentState })
                .eq('id', userId);
            } catch {}
          })();
        }
      }
    },
    [storageKey, userId]
  );

  // 3. Bucle de simulación en tiempo real (ticks de 250ms)
  useEffect(() => {
    const TICK_INTERVAL = 250;
    const interval = setInterval(() => {
      if (effectiveRatePerSecond <= 0) return;

      const increment = (effectiveRatePerSecond * TICK_INTERVAL) / 1000;
      setPendingVault((prev) => prev + increment);
      setTotalLifetimeProduced((prev) => prev + increment);
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [effectiveRatePerSecond]);

  // 4. Temporizador de guardado automático cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      saveState({
        levels,
        pendingVault,
        totalLifetimeProduced,
        afterPrestigeCount,
        lastTickMs: Date.now(),
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [levels, pendingVault, totalLifetimeProduced, afterPrestigeCount, saveState]);

  // 5. Temporizador para el modo fiesta loca (doble producción temporal)
  useEffect(() => {
    if (!isCrazyParty) return;

    const timer = setInterval(() => {
      setCrazyPartyTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsCrazyParty(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCrazyParty]);

  // Acción: Clic manual ("Echar un trago")
  const handleManualDrink = () => {
    sound.tap();

    // Cada trago manual da fichas al instante al bote
    const clickPower = Math.max(1, Math.floor(1 + baseRatePerSecond * 0.05)) * prestigeMultiplier;
    setPendingVault((prev) => prev + clickPower);
    setTotalLifetimeProduced((prev) => prev + clickPower);

    // Sistema de combo rápido
    setPartyComboCount((prev) => {
      const next = prev + 1;
      if (next >= 12 && !isCrazyParty) {
        setIsCrazyParty(true);
        setCrazyPartyTimeRemaining(10);
        sound.coinWin();
        return 0;
      }
      return next;
    });
  };

  // Acción: Comprar mejora de nivel
  const handleBuyTier = (tier: TierConfig) => {
    const currentLevel = levels[tier.id] || 0;
    const cost = Math.floor(tier.baseCost * Math.pow(1.15, currentLevel));

    if (userCoins < cost) return;

    sound.coinWin();
    // Se descuenta directamente de las monedas reales del usuario
    onUpdateCoins(-cost);

    setLevels((prev) => {
      const nextLevels = {
        ...prev,
        [tier.id]: (prev[tier.id] || 0) + 1,
      };

      saveState({
        levels: nextLevels,
        pendingVault,
        totalLifetimeProduced,
        afterPrestigeCount,
        lastTickMs: Date.now(),
      });

      return nextLevels;
    });
  };

  // Acción: Meter las fichas acumuladas en la cartera real
  const handleClaimVault = () => {
    const toClaim = Math.floor(pendingVault);
    if (toClaim <= 0) return;

    sound.coinWin();
    confetti({
      particleCount: Math.min(100, 30 + Math.floor(toClaim / 5)),
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
    });

    onUpdateCoins(toClaim);
    setPendingVault(pendingVault - toClaim);
    setJustClaimed(true);
    setTimeout(() => setJustClaimed(false), 2000);

    saveState({
      levels,
      pendingVault: pendingVault - toClaim,
      totalLifetimeProduced,
      afterPrestigeCount,
      lastTickMs: Date.now(),
    });
  };

  // Acción: El After (Prestigio)
  const canPrestige = totalLifetimeProduced >= 15000;
  const handleAfterPrestige = () => {
    if (!canPrestige) return;

    const confirm = window.confirm(
      '¿Quieres irte de After? Reiniciarás las bebidas compradas a cambio de un +50% permanente de producción en toda tu fiesta.'
    );
    if (!confirm) return;

    sound.coinWin();
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

    // Guardar lo que hubiera en la saca a la cartera antes de reiniciar
    const leftover = Math.floor(pendingVault);
    if (leftover > 0) {
      onUpdateCoins(leftover);
    }

    const resetLevels = {
      litronas: 0,
      hielos: 0,
      chupitos: 0,
      botellas: 0,
      altavoz: 0,
      barra_libre: 0,
      vip: 0,
    };

    setLevels(resetLevels);
    setPendingVault(0);
    setAfterPrestigeCount((prev) => prev + 1);

    saveState({
      levels: resetLevels,
      pendingVault: 0,
      totalLifetimeProduced,
      afterPrestigeCount: afterPrestigeCount + 1,
      lastTickMs: Date.now(),
    });
  };

  const roundedVault = Math.floor(pendingVault);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Aviso de farmeo offline */}
      {offlineReport && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-border shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                La fiesta siguió mientras estabas fuera
              </p>
              <p className="text-xs text-foreground-muted">
                Has recaudado{' '}
                <span className="font-semibold text-foreground">
                  +{offlineReport.earned.toLocaleString()} fichas
                </span>{' '}
                durante tus {Math.round(offlineReport.seconds / 60)} min desconectado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOfflineReport(null)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-foreground text-background cursor-pointer active:scale-95 transition-transform"
          >
            Aceptar
          </button>
        </div>
      )}

      {/* Cabecera y Resumen de la Fiesta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Panel 1: En la saca (acumulado listo para cobrar) */}
        <div className="p-5 rounded-2xl bg-surface-raised border border-border/70 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              En la saca del botellón
            </span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>

          <div>
            <div className="text-3xl font-semibold tracking-tight text-foreground font-mono">
              {roundedVault.toLocaleString()}{' '}
              <span className="text-xs font-sans text-foreground-muted font-normal">fichas</span>
            </div>
            <p className="text-[11px] text-foreground-subtle mt-0.5">
              Se acumulan solas mientras tengas bebidas compradas.
            </p>
          </div>

          <button
            type="button"
            disabled={roundedVault <= 0}
            onClick={handleClaimVault}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] ${
              roundedVault > 0
                ? 'bg-foreground text-background shadow-xs hover:opacity-95'
                : 'bg-surface-raised text-foreground-subtle border border-border/50 cursor-not-allowed opacity-60'
            }`}
          >
            {justClaimed ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>¡Metidas a la cartera!</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-4 h-4" />
                <span>Meter a la saca (+{roundedVault.toLocaleString()})</span>
              </>
            )}
          </button>
        </div>

        {/* Panel 2: Ritmo de fiesta (Fichas por segundo) */}
        <div className="p-5 rounded-2xl bg-surface-raised border border-border/70 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Ritmo de farmeo
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>

          <div>
            <div className="text-3xl font-semibold tracking-tight text-foreground font-mono">
              +{effectiveRatePerSecond.toFixed(1)}{' '}
              <span className="text-xs font-sans text-foreground-muted font-normal">fichas / seg</span>
            </div>
            <p className="text-[11px] text-foreground-subtle mt-0.5">
              {afterPrestigeCount > 0 ? (
                <span className="text-purple-400 font-medium">
                  Multiplicador After: x{prestigeMultiplier.toFixed(1)}
                </span>
              ) : (
                'Compra más bebidas abajo para aumentar la velocidad.'
              )}
            </p>
          </div>

          {/* Saldo disponible en cartera */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-foreground-muted">Tu saldo para comprar:</span>
            <span className="font-semibold text-foreground font-mono">
              {userCoins.toLocaleString()} fichas
            </span>
          </div>
        </div>

        {/* Panel 3: Clic Manual ("Echar un trago") */}
        <div className="p-5 rounded-2xl bg-surface-raised border border-border/70 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Trago manual
            </span>
            {isCrazyParty ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                ¡FIESTA LOCA x2 ({crazyPartyTimeRemaining}s)!
              </span>
            ) : (
              <Zap className="w-4 h-4 text-foreground-muted" />
            )}
          </div>

          <button
            type="button"
            onClick={handleManualDrink}
            className="w-full py-4 rounded-xl bg-surface border border-border/80 hover:border-foreground/30 hover:bg-surface-raised transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1 group shadow-xs touch-manipulation"
          >
            <Wine className="w-6 h-6 text-foreground-muted group-hover:text-accent group-hover:scale-110 transition-all" />
            <span className="text-xs font-semibold text-foreground">
              ¡Echar un trago!
            </span>
            <span className="text-[10px] text-foreground-subtle font-mono">
              +{Math.max(1, Math.floor(1 + baseRatePerSecond * 0.05)) * prestigeMultiplier} al bote
            </span>
          </button>

          {/* Barra de combo fiesta */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-foreground-subtle">
              <span>Ambiente caldeado</span>
              <span>{isCrazyParty ? '¡A tope!' : `${partyComboCount}/12 clics`}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-border/40 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  isCrazyParty ? 'bg-amber-400 w-full animate-pulse' : 'bg-foreground w-0'
                }`}
                style={!isCrazyParty ? { width: `${(partyComboCount / 12) * 100}%` } : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Mejoras (Bebidas & Suministros) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Suministros del Botellón</h2>
            <p className="text-xs text-foreground-muted">
              Usa las fichas que tienes o las que ganes en el casino para mejorar tu farmeo.
            </p>
          </div>
          {canPrestige && (
            <button
              type="button"
              onClick={handleAfterPrestige}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Irse de After (+50% bonus)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {TIERS.map((tier) => {
            const currentLevel = levels[tier.id] || 0;
            const cost = Math.floor(tier.baseCost * Math.pow(1.15, currentLevel));
            const canAfford = userCoins >= cost;
            const currentTotalRate = currentLevel * tier.baseRate * prestigeMultiplier;
            const Icon = tier.icon;

            return (
              <div
                key={tier.id}
                className="p-4 rounded-2xl bg-surface-raised border border-border/60 hover:border-border transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border/60 flex items-center justify-center shrink-0 text-foreground-muted">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {tier.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-surface text-foreground-muted border border-border/50 shrink-0">
                        Nvl. {currentLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-subtle truncate mt-0.5">
                      {tier.desc}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                      +{tier.baseRate * prestigeMultiplier}/s cada uno{' '}
                      {currentLevel > 0 && (
                        <span className="text-foreground-subtle">
                          (total: +{currentTotalRate.toFixed(1)}/s)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => handleBuyTier(tier)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer active:scale-95 flex flex-col items-end ${
                    canAfford
                      ? 'bg-foreground text-background shadow-xs hover:opacity-95'
                      : 'bg-surface text-foreground-subtle border border-border/50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>Pillar</span>
                  <span className="text-[10px] font-mono opacity-80">
                    {cost.toLocaleString()} fichas
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
