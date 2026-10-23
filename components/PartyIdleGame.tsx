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
  MapPin,
  Award,
  Lock,
  ChevronRight,
  Target,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface PartyIdleGameProps {
  userCoins: number;
  userId?: string;
  onUpdateCoins: (delta: number) => void;
  onNavigateGame?: (game: string) => void;
  onBroadcastWin?: (
    game: 'angry' | 'crash' | 'mines' | 'roulette',
    multiplier: number,
    winAmount: number
  ) => void;
}

export interface TierConfig {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  baseRate: number; // fichas por segundo
  icon: React.ComponentType<{ className?: string }>;
}

export const TIERS: TierConfig[] = [
  {
    id: 'litronas',
    name: 'Litronas del chino',
    desc: 'Lo básico para empezar a beber en el parque.',
    baseCost: 25,
    baseRate: 0.2, // ~1 ficha cada 5 segundos
    icon: BottleWine,
  },
  {
    id: 'hielos',
    name: 'Bolsa de hielos y vasos',
    desc: 'Para que no se caliente el trago a los 5 minutos.',
    baseCost: 95,
    baseRate: 0.8,
    icon: GlassWater,
  },
  {
    id: 'chupitos',
    name: 'Ronda de chupitos',
    desc: 'Tequila y Jäger para que la peña se anime rápido.',
    baseCost: 380,
    baseRate: 2.8,
    icon: Wine,
  },
  {
    id: 'botellas',
    name: 'Nevera con botellas y mezcla',
    desc: 'Ron-cola y ginebra sin escatimar con los hielos.',
    baseCost: 1400,
    baseRate: 9.5,
    icon: CupSoda,
  },
  {
    id: 'altavoz',
    name: 'Altavoz a toda mecha',
    desc: 'Suena el reguetón y se acerca tol mundo a la fiesta.',
    baseCost: 4800,
    baseRate: 32,
    icon: Music,
  },
  {
    id: 'barra_libre',
    name: 'Barra libre en el local',
    desc: 'Desmadre total y copas sin fin hasta el amanecer.',
    baseCost: 18000,
    baseRate: 105,
    icon: Flame,
  },
  {
    id: 'vip',
    name: 'Reservado VIP y champán',
    desc: 'Botellazas con bengalas para los reyes de la noche.',
    baseCost: 65000,
    baseRate: 320,
    icon: Sparkles,
  },
];

// Fases de la noche / Zonas de fiesta desbloqueables
export interface ZoneConfig {
  id: string;
  name: string;
  subtitle: string;
  desc: string;
  multiplier: number;
  requiredProduction: number;
  badge: string;
  icon: string;
}

export const ZONES: ZoneConfig[] = [
  {
    id: 'parque',
    name: 'El Parque y los Bancos',
    subtitle: '22:00h · Comienza la previa',
    desc: 'Bancos de madera, litronas frescas y las primeras risas entre colegas.',
    multiplier: 1.0,
    requiredProduction: 0,
    badge: 'Inicio',
    icon: '🌳',
  },
  {
    id: 'piso',
    name: 'Piso de Colegas (Pre-Fiesta)',
    subtitle: '00:00h · Calentando motores',
    desc: 'Música en altavoces, cubatas en vasos de tubo y la gente dándolo todo.',
    multiplier: 1.35,
    requiredProduction: 1000,
    badge: 'Fase 2',
    icon: '🏠',
  },
  {
    id: 'discoteca',
    name: 'La Discoteca Central',
    subtitle: '02:30h · Desmadre en pista',
    desc: 'Luces estroboscópicas, DJ en directo, barra libre y la pista a reventar.',
    multiplier: 1.8,
    requiredProduction: 6000,
    badge: 'Fase 3',
    icon: '🪩',
  },
  {
    id: 'macrofestival',
    name: 'Macro-Festival Fin de Curso SMR',
    subtitle: '05:00h · El fiestón del año',
    desc: 'Escenario masivo al aire libre, pantallas gigantes y barras por doquier.',
    multiplier: 2.5,
    requiredProduction: 30000,
    badge: 'Fase 4',
    icon: '🎪',
  },
  {
    id: 'ibiza_vip',
    name: 'Villa VIP en Ibiza (Leyenda SMR)',
    subtitle: '07:30h · El After de los elegidos',
    desc: 'Piscina infinita, champán ilimitado y los reyes indiscutibles del curso.',
    multiplier: 4.0,
    requiredProduction: 120000,
    badge: 'Leyenda',
    icon: '👑',
  },
];

// Habilidades / Perks permanentes de la noche
export interface PerkConfig {
  id: string;
  name: string;
  desc: string;
  cost: number;
  icon: string;
  effectType: 'drink_mult' | 'discount' | 'crazy_time' | 'jackpot_chance' | 'offline_hours';
  value: number;
}

export const PERKS: PerkConfig[] = [
  {
    id: 'aguante_hierro',
    name: 'Hígado de Acero',
    desc: 'Tus tragos manuales dan el triple de fichas directas (x3).',
    cost: 300,
    icon: '🦾',
    effectType: 'drink_mult',
    value: 3,
  },
  {
    id: 'descuento_chino',
    name: 'Colega del Tendero',
    desc: 'El chino de confianza te hace un 15% de descuento en todas las bebidas.',
    cost: 1100,
    icon: '🏷️',
    effectType: 'discount',
    value: 0.85,
  },
  {
    id: 'bafles_jbl',
    name: 'Altavoces JBL Conectados',
    desc: 'El subidón de Fiesta Loca dura 25 segundos en vez de 10.',
    cost: 3200,
    icon: '🔊',
    effectType: 'crazy_time',
    value: 25,
  },
  {
    id: 'enchufe_barra',
    name: 'Enchufe en Barra',
    desc: 'Cada trago manual tiene un 12% de probabilidad de soltar un bonus sorpresa.',
    cost: 8500,
    icon: '🍸',
    effectType: 'jackpot_chance',
    value: 0.12,
  },
  {
    id: 'pase_vip',
    name: 'Pase VIP Permanente',
    desc: 'El límite de recaudación offline aumenta de 8 horas a 16 horas seguidas.',
    cost: 24000,
    icon: '🎟️',
    effectType: 'offline_hours',
    value: 16,
  },
];

// Rangos de Fiestero de 2º SMR
export interface PartyRank {
  name: string;
  title: string;
  minProd: number;
  badge: string;
  bonusPercent: number;
}

export const PARTY_RANKS: PartyRank[] = [
  { name: 'Novato de Parque', title: 'El que bebe Fanta de naranja', minProd: 0, badge: 'Rango 1', bonusPercent: 0 },
  { name: 'Colega Cumplidor', title: 'Pone los 5 pavos sin quejarse', minProd: 1200, badge: 'Rango 2', bonusPercent: 5 },
  { name: 'Alma del Botellón', title: 'Trae los hielos y elige la música', minProd: 8000, badge: 'Rango 3', bonusPercent: 12 },
  { name: 'Rey de la Pista', title: 'No se pierde una fiesta ni con examen', minProd: 35000, badge: 'Rango 4', bonusPercent: 25 },
  { name: 'Dueño del Reservado', title: 'Entra con bengalas y botellazas VIP', minProd: 150000, badge: 'Rango 5', bonusPercent: 50 },
  { name: 'Leyenda Inmortal SMR', title: 'El amo absoluto de las noches de 2º SMR', minProd: 500000, badge: 'Leyenda', bonusPercent: 100 },
];

export function getTierMilestoneMultiplier(level: number): number {
  let mult = 1;
  if (level >= 10) mult *= 1.3;
  if (level >= 25) mult *= 1.4;
  if (level >= 50) mult *= 1.6;
  if (level >= 100) mult *= 2.0;
  return mult;
}

export const TIER_CYCLE_MS: Record<string, number> = {
  litronas: 1200,
  hielos: 2000,
  chupitos: 3200,
  botellas: 4500,
  altavoz: 6000,
  barra_libre: 8500,
  vip: 12000,
};

const PARTY_NEWS = [
  'Un colega acaba de llegar con litronas bien frías del chino.',
  '¡Ronda de chupitos de Jäger y Tequila repartida por la pista!',
  'El DJ soltó el temazo de la noche y tol mundo está bailando.',
  'David intentó colarse en el reservado pero el portero lo pilló al vuelo.',
  'Acaban de encender las bengalas en las botellas del reservado VIP.',
  'Alguien tiró un cubata al suelo pero ya han traído una fregona.',
  'El altavoz a toda mecha retumba en todo el vecindario.',
  'La nevera con botellas y mezcla no da abasto con los hielos.',
  '¡Se ha montado un torneo improvisado de Beer Pong en la mesa!',
];

export interface BotellonState {
  levels: Record<string, number>;
  pendingVault: number;
  totalLifetimeProduced: number;
  afterPrestigeCount: number;
  lastTickMs: number;
  currentZoneId?: string;
  purchasedPerks?: string[];
  totalDrinksTaken?: number;
  beerPongWins?: number;
}

export const STORAGE_KEY_PREFIX = 'smr2_botellon_data_';

export const PartyIdleGame: React.FC<PartyIdleGameProps> = ({
  userCoins,
  userId,
  onUpdateCoins,
  onNavigateGame,
}) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${userId || 'local'}`;

  // Pestaña activa dentro del juego: 'suministros' | 'zonas' | 'habilidades' | 'beerpong'
  const [activeTab, setActiveTab] = useState<'suministros' | 'zonas' | 'habilidades' | 'beerpong'>(
    'suministros'
  );

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
  const [currentZoneId, setCurrentZoneId] = useState<string>('parque');
  const [purchasedPerks, setPurchasedPerks] = useState<string[]>([]);
  const [totalDrinksTaken, setTotalDrinksTaken] = useState<number>(0);
  const [beerPongWins, setBeerPongWins] = useState<number>(0);

  // Estados de interfaz y feedback
  const [offlineReport, setOfflineReport] = useState<{
    seconds: number;
    earned: number;
  } | null>(null);
  const [partyComboCount, setPartyComboCount] = useState<number>(0);
  const [isCrazyParty, setIsCrazyParty] = useState<boolean>(false);
  const [crazyPartyTimeRemaining, setCrazyPartyTimeRemaining] = useState<number>(0);
  const [justClaimed, setJustClaimed] = useState<boolean>(false);
  const [buyMultiplier, setBuyMultiplier] = useState<1 | 5 | 10 | 'max'>(1);
  const [currentNewsIndex, setCurrentNewsIndex] = useState<number>(0);
  const [cycleTick, setCycleTick] = useState<number>(Date.now());
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const lastClickTimeRef = useRef<number>(0);

  // Beer pong mini-game state
  const [pongAim, setPongAim] = useState<number>(50);
  const [pongDirection, setPongDirection] = useState<'right' | 'left'>('right');
  const [pongShooting, setPongShooting] = useState<boolean>(false);
  const [pongResult, setPongResult] = useState<{ success: boolean; reward: number; text: string } | null>(null);
  const [pongCooldown, setPongCooldown] = useState<number>(0);

  // Zona actual y multiplicador de zona
  const activeZone = useMemo(() => {
    return ZONES.find((z) => z.id === currentZoneId) || ZONES[0];
  }, [currentZoneId]);

  // Rango de fiestero actual
  const currentRank = useMemo(() => {
    const sorted = [...PARTY_RANKS].reverse();
    return sorted.find((r) => totalLifetimeProduced >= r.minProd) || PARTY_RANKS[0];
  }, [totalLifetimeProduced]);

  // Multiplicador de prestigio After
  const prestigeMultiplier = 1 + afterPrestigeCount * 0.5;

  // Multiplicadores por perks
  const hasPerk = useCallback(
    (id: string) => purchasedPerks.includes(id),
    [purchasedPerks]
  );

  const costDiscount = hasPerk('descuento_chino') ? 0.85 : 1.0;
  const drinkPowerMult = hasPerk('aguante_hierro') ? 3.0 : 1.0;
  const rankBonusMult = 1 + currentRank.bonusPercent / 100;

  // Tasa de producción pasiva base (por segundo) con hitos, zona y rango
  const baseRatePerSecond = useMemo(() => {
    const rawRate = TIERS.reduce((acc, tier) => {
      const lvl = levels[tier.id] || 0;
      const milestone = getTierMilestoneMultiplier(lvl);
      return acc + lvl * tier.baseRate * milestone;
    }, 0);

    return rawRate * activeZone.multiplier * rankBonusMult;
  }, [levels, activeZone.multiplier, rankBonusMult]);

  // Tasa real con multiplicadores aplicados (Prestigio + Modo Fiesta Loca)
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
      setCurrentZoneId(saved.currentZoneId || 'parque');
      setPurchasedPerks(saved.purchasedPerks || []);
      setTotalDrinksTaken(saved.totalDrinksTaken || 0);
      setBeerPongWins(saved.beerPongWins || 0);

      // Calcular farmeo mientras no estaba con límite de horas del perk
      const maxOfflineHours = (saved.purchasedPerks || []).includes('pase_vip') ? 16 : 8;
      if (saved.lastTickMs && saved.lastTickMs < now) {
        const elapsedSec = Math.min(
          Math.floor((now - saved.lastTickMs) / 1000),
          maxOfflineHours * 3600
        );

        if (elapsedSec > 10) {
          const zoneObj = ZONES.find((z) => z.id === saved?.currentZoneId) || ZONES[0];
          const mult = 1 + (saved.afterPrestigeCount || 0) * 0.5;
          const savedBaseRate = TIERS.reduce((acc, tier) => {
            const lvl = saved?.levels?.[tier.id] || 0;
            return acc + lvl * tier.baseRate * getTierMilestoneMultiplier(lvl);
          }, 0) * zoneObj.multiplier;

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
        currentZoneId,
        purchasedPerks,
        totalDrinksTaken,
        beerPongWins,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [
    levels,
    pendingVault,
    totalLifetimeProduced,
    afterPrestigeCount,
    currentZoneId,
    purchasedPerks,
    totalDrinksTaken,
    beerPongWins,
    saveState,
  ]);

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

  // 6. Ticker de noticias y oscilador de ciclo visual
  useEffect(() => {
    const newsTimer = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % PARTY_NEWS.length);
    }, 4500);

    const tickTimer = setInterval(() => {
      setCycleTick(Date.now());
    }, 80);

    return () => {
      clearInterval(newsTimer);
      clearInterval(tickTimer);
    };
  }, []);

  // 7. Beer pong oscilador de mira
  useEffect(() => {
    const pongInterval = setInterval(() => {
      setPongAim((prev) => {
        if (pongDirection === 'right') {
          if (prev >= 95) {
            setPongDirection('left');
            return 95;
          }
          return prev + 3;
        } else {
          if (prev <= 5) {
            setPongDirection('right');
            return 5;
          }
          return prev - 3;
        }
      });
    }, 35);

    return () => clearInterval(pongInterval);
  }, [pongDirection]);

  // Cooldown de Beer Pong
  useEffect(() => {
    if (pongCooldown <= 0) return;
    const t = setInterval(() => {
      setPongCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [pongCooldown]);

  // Acción: Clic manual ("Echar un trago")
  const handleManualDrink = () => {
    const now = Date.now();
    // Anti-Autoclicker: máximo ~12 clics por segundo
    if (now - lastClickTimeRef.current < 75) return;
    lastClickTimeRef.current = now;

    sound.tap();

    const baseClick = Math.max(1, Math.floor(1 + baseRatePerSecond * 0.02));
    let clickPower = baseClick * prestigeMultiplier * drinkPowerMult;

    // Enchufe en barra perk: 12% probabilidad de Jackpot sorpresa
    let hasJackpotBonus = false;
    if (hasPerk('enchufe_barra') && Math.random() < 0.12) {
      clickPower = Math.min(60, clickPower * 3);
      hasJackpotBonus = true;
      sound.coinWin();
    }

    setPendingVault((prev) => prev + clickPower);
    setTotalLifetimeProduced((prev) => prev + clickPower);
    setTotalDrinksTaken((prev) => prev + 1);

    // Partícula visual flotante
    const pId = Date.now() + Math.random();
    const emojis = hasJackpotBonus ? ['🍸', '💥', '💰'] : ['🍺', '⚡', '🥂', '🍹', '🍷'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const newParticle = {
      id: pId,
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 30,
      text: `+${Math.floor(clickPower)} ${randomEmoji}`,
    };
    setParticles((prev) => [...prev.slice(-8), newParticle]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== pId));
    }, 750);

    // Sistema de combo rápido
    setPartyComboCount((prev) => {
      const next = prev + 1;
      if (next >= 12 && !isCrazyParty) {
        const crazyDuration = hasPerk('bafles_jbl') ? 25 : 10;
        setIsCrazyParty(true);
        setCrazyPartyTimeRemaining(crazyDuration);
        sound.coinWin();
        return 0;
      }
      return next;
    });
  };

  // Cálculo de costes escalonados e308 con compras múltiples y descuento de tendero
  const getBuyQuote = useCallback(
    (tier: TierConfig, currentLevel: number, multiplier: 1 | 5 | 10 | 'max', availableCoins: number) => {
      let count = 0;
      let totalCost = 0;
      const targetCount = multiplier === 'max' ? 100 : multiplier;

      for (let i = 0; i < targetCount; i++) {
        const rawCost = Math.floor(tier.baseCost * Math.pow(1.15, currentLevel + i));
        const finalCost = Math.max(1, Math.floor(rawCost * costDiscount));

        if (multiplier === 'max') {
          if (totalCost + finalCost > availableCoins) break;
          totalCost += finalCost;
          count++;
        } else {
          totalCost += finalCost;
          count++;
        }
      }

      if (multiplier === 'max' && count === 0) {
        count = 1;
        const rawCost = Math.floor(tier.baseCost * Math.pow(1.15, currentLevel));
        totalCost = Math.max(1, Math.floor(rawCost * costDiscount));
      }

      return {
        count,
        totalCost,
        canAfford: availableCoins >= totalCost && count > 0,
      };
    },
    [costDiscount]
  );

  // Acción: Comprar mejora de nivel
  const handleBuyTier = (tier: TierConfig) => {
    const currentLevel = levels[tier.id] || 0;
    const { count, totalCost, canAfford } = getBuyQuote(
      tier,
      currentLevel,
      buyMultiplier,
      userCoins
    );

    if (!canAfford || count <= 0) return;

    sound.coinWin();
    onUpdateCoins(-totalCost);

    setLevels((prev) => {
      const nextLevels = {
        ...prev,
        [tier.id]: (prev[tier.id] || 0) + count,
      };

      saveState({
        levels: nextLevels,
        pendingVault,
        totalLifetimeProduced,
        afterPrestigeCount,
        lastTickMs: Date.now(),
        currentZoneId,
        purchasedPerks,
        totalDrinksTaken,
        beerPongWins,
      });

      return nextLevels;
    });
  };

  // Acción: Comprar Perk / Habilidad permanente
  const handleBuyPerk = (perk: PerkConfig) => {
    if (userCoins < perk.cost || hasPerk(perk.id)) return;

    sound.coinWin();
    confetti({ particleCount: 70, spread: 60 });
    onUpdateCoins(-perk.cost);

    const nextPerks = [...purchasedPerks, perk.id];
    setPurchasedPerks(nextPerks);

    saveState({
      levels,
      pendingVault,
      totalLifetimeProduced,
      afterPrestigeCount,
      lastTickMs: Date.now(),
      currentZoneId,
      purchasedPerks: nextPerks,
      totalDrinksTaken,
      beerPongWins,
    });
  };

  // Acción: Cambiar de Zona / Fase de la Noche
  const handleSelectZone = (zone: ZoneConfig) => {
    if (totalLifetimeProduced < zone.requiredProduction) return;

    sound.coinWin();
    setCurrentZoneId(zone.id);

    saveState({
      levels,
      pendingVault,
      totalLifetimeProduced,
      afterPrestigeCount,
      lastTickMs: Date.now(),
      currentZoneId: zone.id,
      purchasedPerks,
      totalDrinksTaken,
      beerPongWins,
    });
  };

  // Acción: Lanzar bola de Beer Pong
  const handleShootBeerPong = () => {
    if (pongShooting || pongCooldown > 0) return;

    setPongShooting(true);
    sound.tap();

    // Sweet spot entre 42% y 58%
    const isBullseye = pongAim >= 45 && pongAim <= 55;
    const isNearHit = (pongAim >= 38 && pongAim < 45) || (pongAim > 55 && pongAim <= 62);

    setTimeout(() => {
      setPongShooting(false);
      setPongCooldown(15);

      if (isBullseye) {
        sound.coinWin();
        confetti({ particleCount: 100, spread: 70 });
        const prize = Math.min(400, Math.max(25, Math.floor(effectiveRatePerSecond * 6)));
        setPendingVault((prev) => prev + prize);
        setBeerPongWins((prev) => prev + 1);
        setPongResult({
          success: true,
          reward: prize,
          text: `¡CANASTA LIMPIA! Tiro perfecto en el vaso central (+${prize.toLocaleString()} fichas al bote).`,
        });
      } else if (isNearHit) {
        sound.coinWin();
        const prize = Math.min(150, Math.max(10, Math.floor(effectiveRatePerSecond * 2)));
        setPendingVault((prev) => prev + prize);
        setPongResult({
          success: true,
          reward: prize,
          text: `¡Rebote y adentro! Entró rozando el borde (+${prize.toLocaleString()} fichas).`,
        });
      } else {
        sound.tap();
        setPongResult({
          success: false,
          reward: 0,
          text: '¡Agua! La bola rebotó en la mesa y se fue fuera. ¡Prueba en 15s!',
        });
      }
    }, 600);
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
      currentZoneId,
      purchasedPerks,
      totalDrinksTaken,
      beerPongWins,
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
      currentZoneId,
      purchasedPerks,
      totalDrinksTaken,
      beerPongWins,
    });
  };

  const roundedVault = Math.floor(pendingVault);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
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

      {/* Banner de Zona Actual y Rango de Fiestero */}
      <div className="p-4 rounded-3xl bg-surface-raised border border-border/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-surface border border-border/60 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
            {activeZone.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground tracking-tight">
                {activeZone.name}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold border border-accent/20">
                x{activeZone.multiplier.toFixed(1)} Zona
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">{activeZone.desc}</p>
          </div>
        </div>

        {/* Rango de Fiestero */}
        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <div className="text-right">
            <div className="text-[10px] font-mono text-foreground-subtle uppercase tracking-wider">
              Tu reputación
            </div>
            <div className="text-xs font-semibold text-foreground">{currentRank.name}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Cabecera y Resumen de la Fiesta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Panel 1: En la saca (acumulado listo para cobrar) */}
        <div className="p-5 rounded-3xl bg-surface-raised border border-border/70 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider font-mono">
              En la saca del botellón
            </span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>

          <div>
            <div className="text-3xl font-bold tracking-tight text-foreground font-mono">
              {roundedVault.toLocaleString()}{' '}
              <span className="text-xs font-sans text-foreground-muted font-normal">fichas</span>
            </div>
            <p className="text-[11px] text-foreground-subtle mt-0.5">
              Acumulación automática activa en tu zona actual.
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
        <div className="p-5 rounded-3xl bg-surface-raised border border-border/70 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider font-mono">
              Ritmo de farmeo
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>

          <div>
            <div className="text-3xl font-bold tracking-tight text-foreground font-mono">
              +{effectiveRatePerSecond.toFixed(1)}{' '}
              <span className="text-xs font-sans text-foreground-muted font-normal">fichas / seg</span>
            </div>
            <p className="text-[11px] text-foreground-subtle mt-0.5">
              {afterPrestigeCount > 0 ? (
                <span className="text-purple-400 font-medium">
                  Multiplicador After: x{prestigeMultiplier.toFixed(1)}
                </span>
              ) : (
                `Zona: x${activeZone.multiplier.toFixed(1)} · Rango: +${currentRank.bonusPercent}%`
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
        <div className="p-5 rounded-3xl bg-surface-raised border border-border/70 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider font-mono">
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

          <div className="relative w-full">
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
                +{Math.max(1, Math.floor(1 + baseRatePerSecond * 0.05)) * prestigeMultiplier * drinkPowerMult} al bote
              </span>
            </button>

            {/* Partículas visuales flotantes de tragos */}
            {particles.map((p) => (
              <span
                key={p.id}
                className="pointer-events-none absolute left-1/2 top-1/2 font-mono font-black text-xs text-amber-400 select-none animate-in fade-in slide-in-from-bottom-2 duration-300 drop-shadow-xs"
                style={{
                  transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
                }}
              >
                {p.text}
              </span>
            ))}
          </div>

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

      {/* Feed de Noticias de la Fiesta en Vivo y Ecualizador de Ritmo */}
      <div className="p-3.5 rounded-2xl bg-surface-raised border border-border/60 flex items-center justify-between gap-3 text-xs shadow-2xs overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 truncate">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-accent mr-2">
              En directo:
            </span>
            <span className="text-foreground-muted font-medium transition-all duration-300">
              {PARTY_NEWS[currentNewsIndex]}
            </span>
          </div>
        </div>

        {/* Ecualizador animado */}
        <div className="flex items-end gap-0.5 h-3.5 shrink-0 px-2 py-0.5 rounded-md bg-surface border border-border/50">
          {[0, 1, 2, 3, 4].map((i) => {
            const h =
              effectiveRatePerSecond > 0
                ? (Math.sin(cycleTick / 250 + i * 1.2) * 0.5 + 0.5) * 10 + 3
                : 3;
            return (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  effectiveRatePerSecond > 0 ? 'bg-emerald-400' : 'bg-foreground-subtle'
                }`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* Pestañas de Progresión y Mecánicas del Botellón */}
      <div className="flex items-center p-1 rounded-2xl bg-surface-raised border border-border/70 overflow-x-auto scrollbar-none gap-1">
        {[
          { id: 'suministros', label: 'Bebidas & Suministros', icon: Wine },
          { id: 'zonas', label: 'Fases & Zonas', icon: MapPin },
          { id: 'habilidades', label: 'Perks de la Noche', icon: Award },
          { id: 'beerpong', label: 'Minijuego Beer Pong', icon: Target },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                sound.tap();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-95 touch-manipulation ${
                isActive
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* PESTAÑA 1: BEBIDAS & SUMINISTROS */}
      {activeTab === 'suministros' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Suministros del Botellón</h2>
              <p className="text-xs text-foreground-muted">
                {costDiscount < 1 && (
                  <span className="text-emerald-400 font-medium mr-1.5">
                    🏷️ 15% descuento aplicado
                  </span>
                )}
                Multiplica tu producción pasiva en tiempo real.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Selector de cantidad estilo e308 (x1, x5, x10, Máx) */}
              <div className="flex items-center p-0.5 rounded-xl bg-surface border border-border/70 shadow-2xs">
                {([1, 5, 10, 'max'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setBuyMultiplier(m);
                      sound.tap();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      buyMultiplier === m
                        ? 'bg-foreground text-background font-semibold shadow-xs'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {m === 'max' ? 'Máx' : `x${m}`}
                  </button>
                ))}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {TIERS.map((tier) => {
              const currentLevel = levels[tier.id] || 0;
              const quote = getBuyQuote(tier, currentLevel, buyMultiplier, userCoins);
              const milestone = getTierMilestoneMultiplier(currentLevel);
              const currentTotalRate =
                currentLevel * tier.baseRate * milestone * activeZone.multiplier * prestigeMultiplier;
              const cycleMs = TIER_CYCLE_MS[tier.id] || 3000;
              const progressPercent =
                currentLevel > 0 ? ((cycleTick % cycleMs) / cycleMs) * 100 : 0;
              const Icon = tier.icon;

              return (
                <div
                  key={tier.id}
                  className="p-4 rounded-2xl bg-surface-raised border border-border/60 hover:border-border transition-all flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
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
                          {milestone > 1 && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              ★ x{milestone}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground-subtle truncate mt-0.5">
                          {tier.desc}
                        </p>
                        <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          +{(tier.baseRate * milestone * activeZone.multiplier * prestigeMultiplier).toFixed(1)}/s cada uno{' '}
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
                      disabled={!quote.canAfford}
                      onClick={() => handleBuyTier(tier)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer active:scale-95 flex flex-col items-end ${
                        quote.canAfford
                          ? 'bg-foreground text-background shadow-xs hover:opacity-95'
                          : 'bg-surface text-foreground-subtle border border-border/50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span>Pillar {quote.count > 1 ? `x${quote.count}` : ''}</span>
                      <span className="text-[10px] font-mono opacity-80">
                        {quote.totalCost.toLocaleString()} fichas
                      </span>
                    </button>
                  </div>

                  {/* Barra de progreso de producción continua en tiempo real */}
                  {currentLevel > 0 && (
                    <div className="w-full space-y-1 pt-1">
                      <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-100 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: FASES & ZONAS DE LA NOCHE */}
      {activeTab === 'zonas' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-foreground">Etapas de la Noche</h2>
            <p className="text-xs text-foreground-muted">
              Avanza de localización a medida que aumentas tu recaudación total. Cada fase multiplica toda tu producción.
            </p>
          </div>

          <div className="space-y-2.5">
            {ZONES.map((zone) => {
              const isUnlocked = totalLifetimeProduced >= zone.requiredProduction;
              const isSelected = currentZoneId === zone.id;

              return (
                <div
                  key={zone.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-surface border-foreground shadow-xs'
                      : isUnlocked
                      ? 'bg-surface-raised border-border/70 hover:border-border'
                      : 'bg-surface/50 border-border/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-border/60 flex items-center justify-center text-2xl shrink-0">
                      {zone.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{zone.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                          x{zone.multiplier.toFixed(1)} Producción
                        </span>
                      </div>
                      <p className="text-xs text-foreground-subtle mt-0.5">{zone.subtitle}</p>
                      <p className="text-[11px] text-foreground-muted mt-0.5">{zone.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    {isSelected ? (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-foreground text-background flex items-center gap-1.5 shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                        <span>Fase Activa</span>
                      </span>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleSelectZone(zone)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface border border-border hover:bg-surface-raised transition-all cursor-pointer active:scale-95 text-foreground"
                      >
                        Mudar la fiesta
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-foreground-subtle font-mono">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Req. {zone.requiredProduction.toLocaleString()} fichas</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: PERKS & HABILIDADES DE LA NOCHE */}
      {activeTab === 'habilidades' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-foreground">Habilidades y Ventajas de Fiesta</h2>
            <p className="text-xs text-foreground-muted">
              Compradas una sola vez. Otorgan ventajas permanentes para toda la noche.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {PERKS.map((perk) => {
              const bought = hasPerk(perk.id);
              const canAfford = userCoins >= perk.cost;

              return (
                <div
                  key={perk.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    bought
                      ? 'bg-surface border-emerald-500/30'
                      : 'bg-surface-raised border-border/70 hover:border-border shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-border/60 flex items-center justify-center text-xl shrink-0">
                      {perk.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">
                        {perk.name}
                      </div>
                      <p className="text-[11px] text-foreground-subtle mt-0.5 leading-snug">
                        {perk.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {bought ? (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Activo</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => handleBuyPerk(perk)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 flex flex-col items-end ${
                          canAfford
                            ? 'bg-foreground text-background shadow-xs hover:opacity-95'
                            : 'bg-surface text-foreground-subtle border border-border/50 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span>Aprender</span>
                        <span className="text-[10px] font-mono opacity-80">
                          {perk.cost.toLocaleString()} fichas
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: MINIJUEGO BEER PONG SMR */}
      {activeTab === 'beerpong' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-foreground">Minijuego: Beer Pong de Clase</h2>
            <p className="text-xs text-foreground-muted">
              Apunta en el momento justo cuando el cursor pase por el centro para encestar en el vaso y ganar botines directos de fichas.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-raised border border-border/70 shadow-xs text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">🏓</span>
              <div className="text-4xl">🥤</div>
              <span className="text-3xl">🏓</span>
            </div>

            {/* Barra de puntería interactiva */}
            <div className="max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs text-foreground-subtle font-mono">
                <span>Fallo</span>
                <span className="text-emerald-400 font-bold">ZONA DE ENCESTE (45% - 55%)</span>
                <span>Fallo</span>
              </div>

              <div className="relative w-full h-8 rounded-2xl bg-surface border border-border/80 overflow-hidden shadow-inner flex items-center">
                {/* Zona dulce verde (Sweet spot) */}
                <div className="absolute left-[40%] w-[20%] h-full bg-emerald-500/20 border-x border-emerald-500/40" />
                <div className="absolute left-[45%] w-[10%] h-full bg-emerald-500/40" />

                {/* Cursor móvil */}
                <div
                  className="absolute top-1 bottom-1 w-2.5 rounded-full bg-foreground shadow-md transition-none"
                  style={{ left: `calc(${pongAim}% - 5px)` }}
                />
              </div>
            </div>

            {/* Botón de disparo */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={pongShooting || pongCooldown > 0}
                onClick={handleShootBeerPong}
                className={`py-3.5 px-8 rounded-2xl text-sm font-bold tracking-tight transition-all cursor-pointer active:scale-95 shadow-md ${
                  pongCooldown > 0
                    ? 'bg-surface text-foreground-subtle border border-border cursor-not-allowed opacity-60'
                    : 'bg-foreground text-background hover:opacity-90'
                }`}
              >
                {pongShooting
                  ? '¡Lanzando bola...!'
                  : pongCooldown > 0
                  ? `Recuperando bola (${pongCooldown}s)...`
                  : '¡Lanzar Bola de Beer Pong!'}
              </button>

              <div className="text-xs text-foreground-subtle">
                Victorias en Beer Pong: <span className="font-mono font-bold text-foreground">{beerPongWins}</span>
              </div>
            </div>

            {/* Resultado del tiro */}
            {pongResult && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-medium max-w-md mx-auto border animate-in fade-in duration-200 ${
                  pongResult.success
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : 'bg-danger-subtle text-danger border-danger/20'
                }`}
              >
                {pongResult.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Puente con el Casino: Farmea y Apuesta */}
      {onNavigateGame && (
        <div className="p-4 rounded-2xl bg-surface-raised border border-border/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>¿Necesitas fichas para comprar más rápido?</span>
            </h3>
            <p className="text-[11px] text-foreground-muted">
              Apuesta en el casino y usa tus ganancias para comprar suministros y acelerar tu farmeo.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigateGame('crash')}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface hover:bg-surface-hover border border-border/70 text-foreground transition-all cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Jugar Crash</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateGame('russian_roulette')}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface hover:bg-surface-hover border border-border/70 text-foreground transition-all cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Ruleta Rusa</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateGame('mines')}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface hover:bg-surface-hover border border-border/70 text-foreground transition-all cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <span>Minas</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
