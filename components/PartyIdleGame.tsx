'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { isUUID } from '@/lib/uuid';
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
  TrendingDown,
  MapPin,
  Award,
  Lock,
  Trees,
  Home,
  Disc,
  Tent,
  Crown,
  Shield,
  Tag,
  Volume2,
  Ticket,
  CircleDot,
  Star,
  Target,
  Trophy,
  ChevronRight,
  HelpCircle,
  X,
  Siren,
  ShieldAlert,
  AlertTriangle,
  Droplets,
  Activity,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BotellonInvestments } from '@/components/BotellonInvestments';
import { PartyLiveScene, CharacterItem } from '@/components/PartyLiveScene';

export interface PartyIdleGameProps {
  userCoins: number;
  userId?: string;
  username?: string;
  onUpdateCoins: (delta: number) => void;
  onNavigateGame?: (game: string) => void;
  onRequireAuth?: () => void;
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
    baseCost: 35,
    baseRate: 0.10, // ~1 ficha cada 10 segundos
    icon: BottleWine,
  },
  {
    id: 'hielos',
    name: 'Bolsa de hielos y vasos',
    desc: 'Para que no se caliente el trago a los 5 minutos.',
    baseCost: 120,
    baseRate: 0.40,
    icon: GlassWater,
  },
  {
    id: 'chupitos',
    name: 'Ronda de chupitos',
    desc: 'Tequila y Jäger para que la peña se anime rápido.',
    baseCost: 450,
    baseRate: 1.50,
    icon: Wine,
  },
  {
    id: 'botellas',
    name: 'Nevera con botellas y mezcla',
    desc: 'Ron-cola y ginebra sin escatimar con los hielos.',
    baseCost: 1700,
    baseRate: 5.00,
    icon: CupSoda,
  },
  {
    id: 'altavoz',
    name: 'Altavoz a toda mecha',
    desc: 'Suena el reguetón y se acerca tol mundo a la fiesta.',
    baseCost: 6000,
    baseRate: 16.00,
    icon: Music,
  },
  {
    id: 'barra_libre',
    name: 'Barra libre en el local',
    desc: 'Desmadre total y copas sin fin hasta el amanecer.',
    baseCost: 22000,
    baseRate: 50.00,
    icon: Flame,
  },
  {
    id: 'vip',
    name: 'Reservado VIP y champán',
    desc: 'Botellazas con bengalas para los reyes de la noche.',
    baseCost: 80000,
    baseRate: 160.00,
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
  policeRisk: number; // 0 a 1
}

export const ZONES: ZoneConfig[] = [
  {
    id: 'parque',
    name: 'El Parque Escondido',
    subtitle: '22:00h · Comienza la previa',
    desc: 'Bancos apartados, litronas frescas y las primeras risas entre colegas.',
    multiplier: 1.0,
    requiredProduction: 0,
    badge: 'Inicio',
    icon: 'trees',
    policeRisk: 0,
  },
  {
    id: 'portal',
    name: 'Portal de Vecinos',
    subtitle: '23:30h · La previa se calienta',
    desc: 'Refugiados del frío bajo el portal. Los vecinos del primero vigilan por el balcón.',
    multiplier: 1.25,
    requiredProduction: 1500,
    badge: 'Fase 2',
    icon: 'home',
    policeRisk: 0.06,
  },
  {
    id: 'piso',
    name: 'Piso de Colegas Ruidoso',
    subtitle: '01:00h · Música y vasos llenos',
    desc: 'Música en altavoces, cubatas en vasos de tubo y la gente dándolo todo.',
    multiplier: 1.6,
    requiredProduction: 8000,
    badge: 'Fase 3',
    icon: 'speaker',
    policeRisk: 0.14,
  },
  {
    id: 'callejon',
    name: 'Callejón de los Bares',
    subtitle: '02:30h · Rumbo a la zona',
    desc: 'Transeúntes, copas en la calle y patrullas de la municipal pasando por la esquina.',
    multiplier: 2.1,
    requiredProduction: 35000,
    badge: 'Fase 4',
    icon: 'map-pin',
    policeRisk: 0.24,
  },
  {
    id: 'discoteca',
    name: 'La Discoteca Central',
    subtitle: '03:45h · Desmadre en pista',
    desc: 'Luces estroboscópicas, porteros estrictos, barra libre y la pista a reventar.',
    multiplier: 2.8,
    requiredProduction: 120000,
    badge: 'Fase 5',
    icon: 'disc',
    policeRisk: 0.36,
  },
  {
    id: 'macrofestival',
    name: 'Macro-Festival Fin de Curso SMR',
    subtitle: '05:30h · El fiestón masivo',
    desc: 'Escenario masivo al aire libre, pantallas gigantes y controles de seguridad en cada acceso.',
    multiplier: 3.8,
    requiredProduction: 400000,
    badge: 'Fase 6',
    icon: 'tent',
    policeRisk: 0.50,
  },
  {
    id: 'after_clandestino',
    name: 'El After Clandestino (Nivel Leyenda)',
    subtitle: '07:30h · Fiesta extrema',
    desc: 'Piscina privada, champán ilimitado y vigilancia constante para evitar que nos cierren el local.',
    multiplier: 5.0,
    requiredProduction: 1200000,
    badge: 'Leyenda',
    icon: 'crown',
    policeRisk: 0.65,
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
    icon: 'shield',
    effectType: 'drink_mult',
    value: 3,
  },
  {
    id: 'descuento_chino',
    name: 'Colega del Tendero',
    desc: 'El chino de confianza te hace un 15% de descuento en todas las bebidas.',
    cost: 1100,
    icon: 'tag',
    effectType: 'discount',
    value: 0.85,
  },
  {
    id: 'bafles_jbl',
    name: 'Altavoces JBL Conectados',
    desc: 'El subidón de Fiesta Loca dura 25 segundos en vez de 10.',
    cost: 3200,
    icon: 'speaker',
    effectType: 'crazy_time',
    value: 25,
  },
  {
    id: 'enchufe_barra',
    name: 'Enchufe en Barra',
    desc: 'Cada trago manual tiene un 12% de probabilidad de soltar un bonus sorpresa.',
    cost: 8500,
    icon: 'sparkles',
    effectType: 'jackpot_chance',
    value: 0.12,
  },
  {
    id: 'pase_vip',
    name: 'Pase VIP Permanente',
    desc: 'El límite de recaudación offline aumenta de 4 horas a 8 horas seguidas.',
    cost: 24000,
    icon: 'ticket',
    effectType: 'offline_hours',
    value: 8,
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

export function calculatePrestigeMultiplier(count: number): number {
  if (count <= 0) return 1.0;
  // Escalado gratificante y progresivo para Idle Game:
  // Rebirth 1: x2.00 (+100% producción total)
  // Rebirth 2: x3.50 (+150%)
  // Rebirth 3: x5.00 (+150%)
  // Rebirth 4: x6.50 (+150%)
  // Rebirth 5: x8.50 (+200%)
  // Rebirth 10: x18.50
  let mult = 1.0 + count * 1.0;
  if (count >= 2) mult += (count - 1) * 0.5;
  if (count >= 4) mult += (count - 3) * 0.5;
  if (count >= 7) mult += (count - 6) * 0.5;
  return Number(mult.toFixed(2));
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
  currentRunProduced?: number;
  afterPrestigeCount: number;
  rebirths?: number;
  afterSuspicionLevel?: number;
  lastAfterTimestamp?: number;
  lastTickMs: number;
  currentZoneId?: string;
  purchasedPerks?: string[];
  totalDrinksTaken?: number;
  beerPongWins?: number;
  hangoverLevel?: number;
  guardActiveUntilMs?: number;
  lastCommunistDripMs?: number;
  lastSubsidioClaimMs?: number;
}

export interface AfterRiskStats {
  level: number;
  raidChancePct: number;
  confiscatePct: number;
  bribeCost: number;
  wealthSurcharge: number;
}

// Producción mínima requerida en la ronda actual para irse de After (escala progresiva real para evitar abusos de ballenas)
export function getRequiredAfterProduction(afterCount: number): number {
  if (afterCount <= 0) return 15000;
  if (afterCount <= 4) {
    return Math.floor(15000 * Math.pow(2.5, afterCount));
  }
  // Escala continua para Afters altos (hasta >200M requeridos en Afters avanzados)
  return Math.floor(15000 * Math.pow(2.5, 4) * Math.pow(1.75, Math.min(10, afterCount - 4)));
}

// Coste progresivo para contratar seguridad privada y custodiar el alijo (evita acumulación gratuita infinita)
export function getGuardCost(userCoins: number): number {
  if (userCoins < 50000) return 0; // Novatos gratis
  if (userCoins < 500000) return Math.floor(userCoins * 0.015); // 1.5%
  if (userCoins < 5000000) return Math.floor(userCoins * 0.025); // 2.5%
  if (userCoins < 50000000) return Math.floor(userCoins * 0.04); // 4.0%
  return Math.floor(userCoins * 0.06); // 6.0% para las mega fortunas (>50M)
}

export function getAfterRiskStats(suspicionLevel: number, userCoins: number = 0): AfterRiskStats {
  const level = Math.max(0, Math.min(10, suspicionLevel || 0));
  // Nivel 0 (Limpio): 20% probabilidad de redada, 25% confiscación
  // Cada nivel subsiguiente aumenta la probabilidad en +15% y la multa en +15% (máx 95% y 90%)
  const raidChancePct = Math.min(95, 20 + level * 15);
  const confiscatePct = Math.min(90, 25 + level * 15);

  // Escala de fianza / soborno:
  // Base fija accesible para novatos (100 a 400 monedas)
  const baseCost = 100 + level * 150;

  // Impuesto progresivo a grandes fortunas para evitar que los ricos abusen de la fianza:
  // Si tienes más de 20.000 monedas, la fianza cuesta entre el 6% y el 35% de tu saldo total
  let wealthSurcharge = 0;
  if (userCoins > 20000) {
    const taxRate = Math.min(0.35, 0.06 + level * 0.045); // del 6% al 35% de su fortuna
    wealthSurcharge = Math.floor(userCoins * taxRate);
  }
  const bribeCost = Math.max(baseCost, wealthSurcharge);

  return { level, raidChancePct, confiscatePct, bribeCost, wealthSurcharge };
}

export const STORAGE_KEY_PREFIX = 'smr2_botellon_s2_';

export interface SpontaneousEvent {
  id: 'altavoz' | 'chupito' | 'gasolinera';
  title: string;
  desc: string;
  secondsLeft: number;
  optionA: {
    label: string;
    sublabel: string;
  };
  optionB: {
    label: string;
    sublabel: string;
  };
  resultText?: string;
}

export const renderZoneIcon = (iconName: string) => {
  switch (iconName) {
    case 'trees':
      return <Trees className="w-5 h-5 text-emerald-400" />;
    case 'home':
      return <Home className="w-5 h-5 text-blue-400" />;
    case 'speaker':
      return <Volume2 className="w-5 h-5 text-cyan-400" />;
    case 'map-pin':
      return <MapPin className="w-5 h-5 text-amber-400" />;
    case 'disc':
      return <Disc className="w-5 h-5 text-purple-400" />;
    case 'tent':
      return <Tent className="w-5 h-5 text-rose-400" />;
    case 'crown':
      return <Crown className="w-5 h-5 text-amber-500" />;
    default:
      return <MapPin className="w-5 h-5 text-foreground-muted" />;
  }
};

export const renderPerkIcon = (iconName: string) => {
  switch (iconName) {
    case 'shield':
      return <Shield className="w-5 h-5 text-blue-400" />;
    case 'tag':
      return <Tag className="w-5 h-5 text-emerald-400" />;
    case 'speaker':
      return <Volume2 className="w-5 h-5 text-amber-400" />;
    case 'sparkles':
      return <Sparkles className="w-5 h-5 text-purple-400" />;
    case 'ticket':
      return <Ticket className="w-5 h-5 text-rose-400" />;
    default:
      return <Zap className="w-5 h-5 text-foreground-muted" />;
  }
};

export const PartyIdleGame: React.FC<PartyIdleGameProps> = ({
  userCoins,
  userId,
  username,
  onUpdateCoins,
  onNavigateGame,
  onRequireAuth,
}) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${userId || 'local'}`;

  // Pestaña activa dentro del juego: 4 secciones limpias y directas
  const [activeTab, setActiveTab] = useState<
    'suministros' | 'zonas' | 'after' | 'inversiones'
  >('suministros');

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
  const [currentRunProduced, setCurrentRunProduced] = useState<number>(0);
  const [lastAfterTimestamp, setLastAfterTimestamp] = useState<number>(0);
  const [afterPrestigeCount, setAfterPrestigeCount] = useState<number>(0);
  const [afterSuspicionLevel, setAfterSuspicionLevel] = useState<number>(0);
  const [afterCooldownSeconds, setAfterCooldownSeconds] = useState<number>(90);
  const [showAfterModal, setShowAfterModal] = useState<boolean>(false);
  const [afterRaidResult, setAfterRaidResult] = useState<{
    type: 'success' | 'raid';
    raidChancePct: number;
    confiscatePct: number;
    coinsLost: number;
    vaultLost: number;
    nextLevel: number;
  } | null>(null);
  const [currentZoneId, setCurrentZoneId] = useState<string>('parque');
  const [purchasedPerks, setPurchasedPerks] = useState<string[]>([]);
  const [totalDrinksTaken, setTotalDrinksTaken] = useState<number>(0);
  const [beerPongWins, setBeerPongWins] = useState<number>(0);

  // Estado de sincronización en la nube Supabase
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'saved' | 'saving' | 'offline'>('saved');

  // Estados de Goteo Comunista y Custodia del Alijo
  const [guardActiveUntilMs, setGuardActiveUntilMs] = useState<number>(0);
  const [lastSubsidioClaimMs, setLastSubsidioClaimMs] = useState<number>(0);
  const [communistDripReport, setCommunistDripReport] = useState<{
    coinsLost: number;
    hours: number;
  } | null>(null);

  // Estado para la burbuja de habla de personajes interactivos
  const [activeCharacterSpeech, setActiveCharacterSpeech] = useState<{
    id: string;
    name: string;
    quote: string;
    tierName: string;
  } | null>(null);

  // Tutorial interactivo de primera visita (3 pasos simples)
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem('smr2_botellon_tutorial_seen');
      if (!seen) {
        setShowTutorial(true);
      }
    } catch {}
  }, []);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    try {
      localStorage.setItem('smr2_botellon_tutorial_seen', 'true');
    } catch {}
  };

  // Estados de interfaz y feedback
  const [offlineReport, setOfflineReport] = useState<{
    seconds: number;
    earned: number;
  } | null>(null);
  const [partyComboCount, setPartyComboCount] = useState<number>(0);
  const [isCrazyParty, setIsCrazyParty] = useState<boolean>(false);
  const [crazyPartyTimeRemaining, setCrazyPartyTimeRemaining] = useState<number>(0);
  const [justClaimed, setJustClaimed] = useState<boolean>(false);
  const [isClaimingVault, setIsClaimingVault] = useState<boolean>(false);
  const isClaimingRef = useRef<boolean>(false);
  const lastCloudSyncRef = useRef<number>(0);
  const [buyMultiplier, setBuyMultiplier] = useState<1 | 5 | 10 | 'max'>(1);
  const [currentNewsIndex, setCurrentNewsIndex] = useState<number>(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const lastClickTimeRef = useRef<number>(0);

  // Estados de minijuegos y ciclo
  const [cycleTick, setCycleTick] = useState<number>(Date.now());
  const [hangoverLevel, setHangoverLevel] = useState<number>(0);
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

  // Multiplicador de prestigio After escalado y gratificante
  const prestigeMultiplier = useMemo(() => {
    return calculatePrestigeMultiplier(afterPrestigeCount);
  }, [afterPrestigeCount]);

  // Producción pasiva base permanente de Renacimiento: los jugadores NUNCA vuelven a 0/s al renacer
  const permanentPrestigeRate = afterPrestigeCount > 0 ? (afterPrestigeCount * 25) * prestigeMultiplier : 0;

  // Beca SMR de Impulso para Novatos: si tienes menos de 50.000 monedas, recibes x4.0 de velocidad permanente
  const isUnderdog = userCoins < 50000;
  const underdogMultiplier = isUnderdog ? 4.0 : 1.0;

  // Multiplicadores por perks permanentes
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

  // Tasa real con multiplicadores aplicados (Prestigio + Producción Base Permanente + Beca Novatos x4 + Modo Fiesta Loca x3)
  const effectiveRatePerSecond = useMemo(() => {
    const frenzyMult = isCrazyParty ? 3 : 1;
    const suppliesRate = baseRatePerSecond * prestigeMultiplier * frenzyMult * underdogMultiplier;
    const prestigeBaseRate = permanentPrestigeRate * frenzyMult;
    return suppliesRate + prestigeBaseRate;
  }, [baseRatePerSecond, prestigeMultiplier, isCrazyParty, underdogMultiplier, permanentPrestigeRate]);

  // Referencia actualizada del estado completo para evitar pérdida de propiedades al guardar
  const stateRef = useRef<BotellonState>({
    levels,
    pendingVault,
    totalLifetimeProduced,
    currentRunProduced,
    afterPrestigeCount,
    afterSuspicionLevel,
    lastAfterTimestamp,
    lastTickMs: Date.now(),
    currentZoneId,
    purchasedPerks,
    totalDrinksTaken,
    beerPongWins,
    guardActiveUntilMs,
    lastSubsidioClaimMs,
  });

  useEffect(() => {
    stateRef.current = {
      levels,
      pendingVault,
      totalLifetimeProduced,
      currentRunProduced,
      afterPrestigeCount,
      afterSuspicionLevel,
      lastAfterTimestamp,
      lastTickMs: Date.now(),
      currentZoneId,
      purchasedPerks,
      totalDrinksTaken,
      beerPongWins,
      guardActiveUntilMs,
      lastSubsidioClaimMs,
    };
  }, [
    levels,
    pendingVault,
    totalLifetimeProduced,
    currentRunProduced,
    afterPrestigeCount,
    afterSuspicionLevel,
    lastAfterTimestamp,
    currentZoneId,
    purchasedPerks,
    totalDrinksTaken,
    beerPongWins,
    guardActiveUntilMs,
    lastSubsidioClaimMs,
  ]);

  // 1. Cargar estado inicial (localStorage primero para carga instantánea, luego Supabase Cloud)
  useEffect(() => {
    let saved: BotellonState | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch {}

    const now = Date.now();

    const applyState = (stateToApply: BotellonState, allowOfflineReport: boolean = true) => {
      setLevels(stateToApply.levels || {});
      const hasAnySupply = stateToApply.levels && Object.values(stateToApply.levels).some((lvl) => (lvl || 0) > 0);
      const rawVault = typeof stateToApply.pendingVault === 'number' ? stateToApply.pendingVault : 0;
      const initialVault = !hasAnySupply && rawVault <= 0 ? 50 : rawVault;
      setPendingVault(initialVault);
      setTotalLifetimeProduced(stateToApply.totalLifetimeProduced || 0);
      setCurrentRunProduced(stateToApply.currentRunProduced ?? (stateToApply.totalLifetimeProduced || 0));
      const prestige = stateToApply.afterPrestigeCount ?? (stateToApply as any).rebirths ?? 0;
      setAfterPrestigeCount(prestige);
      stateRef.current.afterPrestigeCount = prestige;
      setAfterSuspicionLevel(stateToApply.afterSuspicionLevel || 0);
      setLastAfterTimestamp(stateToApply.lastAfterTimestamp || 0);
      setCurrentZoneId(stateToApply.currentZoneId || 'parque');
      setPurchasedPerks(stateToApply.purchasedPerks || []);
      setTotalDrinksTaken(stateToApply.totalDrinksTaken || 0);
      setBeerPongWins(stateToApply.beerPongWins || 0);
      if (typeof stateToApply.guardActiveUntilMs === 'number') {
        setGuardActiveUntilMs(stateToApply.guardActiveUntilMs);
      }
      if (typeof stateToApply.lastSubsidioClaimMs === 'number') {
        setLastSubsidioClaimMs(stateToApply.lastSubsidioClaimMs);
      }

      // Comprobar Goteo Comunista para fortunas >= 100.000 monedas si el alijo no estaba custodiado
      if (userCoins >= 100000 && stateToApply.lastTickMs && stateToApply.lastTickMs < now) {
        const guardUntil = stateToApply.guardActiveUntilMs || 0;
        if (guardUntil < now) {
          const hoursUnguarded = Math.min(48, (now - Math.max(stateToApply.lastTickMs, guardUntil)) / 3600000);
          if (hoursUnguarded >= 0.5) {
            let hourlyRate = 0.01; // 1% por hora para fortunas >100k
            if (userCoins >= 50000000) hourlyRate = 0.07; // 7% por hora para megafortunas (>50M)
            else if (userCoins >= 10000000) hourlyRate = 0.045; // 4.5% por hora (>10M)
            else if (userCoins >= 1000000) hourlyRate = 0.025; // 2.5% por hora (>1M)

            const decayRate = 1 - Math.pow(1 - hourlyRate, hoursUnguarded);
            const decayedCoins = Math.max(500, Math.floor(userCoins * decayRate));
            if (decayedCoins > 0 && allowOfflineReport) {
              onUpdateCoins(-decayedCoins);
              setCommunistDripReport({
                coinsLost: decayedCoins,
                hours: Math.round(hoursUnguarded),
              });
            }
          }
        }
      }

      // Calcular farmeo offline con límite de horas del perk
      const maxOfflineHours = (stateToApply.purchasedPerks || []).includes('pase_vip') ? 8 : 4;
      if (stateToApply.lastTickMs && stateToApply.lastTickMs < now) {
        const elapsedSec = Math.min(
          Math.floor((now - stateToApply.lastTickMs) / 1000),
          maxOfflineHours * 3600
        );

        if (elapsedSec > 10) {
          const zoneObj = ZONES.find((z) => z.id === stateToApply.currentZoneId) || ZONES[0];
          const prestigeCount = Number(stateToApply.afterPrestigeCount || (stateToApply as any).rebirths || 0);
          const mult = calculatePrestigeMultiplier(prestigeCount);
          const hangoverDebuff = (stateToApply.hangoverLevel || 0) >= 80 ? 0.35 : 1.0;
          const savedBaseRate = TIERS.reduce((acc, tier) => {
            const lvl = stateToApply.levels?.[tier.id] || 0;
            return acc + lvl * tier.baseRate * getTierMilestoneMultiplier(lvl);
          }, 0) * zoneObj.multiplier;
          const permanentOfflineRate = prestigeCount > 0 ? (prestigeCount * 25) * mult : 0;

          const offlineEarned = Math.floor(elapsedSec * (savedBaseRate * mult + permanentOfflineRate) * hangoverDebuff);
          if (offlineEarned > 0 && isFinite(offlineEarned)) {
            setPendingVault((prev) => prev + offlineEarned);
            setTotalLifetimeProduced((prev) => prev + offlineEarned);
            if (allowOfflineReport) {
              setOfflineReport({
                seconds: elapsedSec,
                earned: offlineEarned,
              });
            }
          }
        }
      }
    };

    if (saved) {
      applyState(saved, true);
    }

    // Comprobar y sincronizar con la nube de Supabase solo si es cuenta con UUID real
    if (userId && isUUID(userId)) {
      const supabase = createClient();
      if (supabase) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('party_farm_data')
              .eq('id', userId)
              .maybeSingle();

            if (error) {
              console.warn('Nota al consultar party_farm_data en Supabase:', error.message);
              return;
            }

            if (data?.party_farm_data && typeof data.party_farm_data === 'object' && Object.keys(data.party_farm_data).length > 0) {
              const cloudState = data.party_farm_data as BotellonState;
              const localProd = saved?.totalLifetimeProduced || 0;
              const cloudProd = cloudState.totalLifetimeProduced || 0;
              const localPrestige = saved?.afterPrestigeCount || (saved as any)?.rebirths || 0;
              const cloudPrestige = cloudState.afterPrestigeCount || (cloudState as any).rebirths || 0;

              // Reconciliación: dar prioridad al mayor número de renacimientos o mayor producción acumulada
              if (cloudPrestige > localPrestige || (cloudPrestige === localPrestige && cloudProd > localProd) || !saved) {
                applyState(cloudState, false);
                try {
                  localStorage.setItem(storageKey, JSON.stringify(cloudState));
                } catch {}
              } else if ((localPrestige > cloudPrestige || (localPrestige === cloudPrestige && localProd > cloudProd)) && saved) {
                // Si el dispositivo actual tiene más avance, actualizar la base de datos
                await supabase
                  .from('profiles')
                  .update({ party_farm_data: saved })
                  .eq('id', userId);
              }
            } else if (saved && isUUID(userId)) {
              // Si la nube estaba vacía ({}) pero hay progreso local guardado, sincronizarlo a la nube
              await supabase
                .from('profiles')
                .update({ party_farm_data: saved })
                .eq('id', userId);
            }
          } catch (syncErr) {
            console.warn('Error sincronizando progreso con Supabase:', syncErr);
          }
        })();
      }
    }
  }, [storageKey, userId]);

  // 2. Guardar con protección de integridad: nunca omite campos y controla peticiones a Supabase
  const saveState = useCallback(
    (overrides?: Partial<BotellonState>, isUrgent: boolean = false) => {
      const fullState: BotellonState = {
        ...stateRef.current,
        ...(overrides || {}),
        lastTickMs: Date.now(),
      };
      stateRef.current = fullState;

      // Guardar siempre en local de forma inmediata
      try {
        localStorage.setItem(storageKey, JSON.stringify(fullState));
      } catch {}

      // Sincronizar en Supabase si el usuario tiene UUID válido (control de frecuencia: máx 1 cada 3.5s salvo urgencia)
      if (userId && isUUID(userId)) {
        const now = Date.now();
        if (isUrgent || now - lastCloudSyncRef.current >= 3500) {
          lastCloudSyncRef.current = now;
          setCloudSyncStatus('saving');
          const supabase = createClient();
          if (supabase) {
            (async () => {
              try {
                const { error } = await supabase
                  .from('profiles')
                  .update({ party_farm_data: fullState })
                  .eq('id', userId);
                if (error) {
                  console.warn('Nota al guardar en Supabase:', error.message);
                  setCloudSyncStatus('offline');
                } else {
                  setCloudSyncStatus('saved');
                }
              } catch (err) {
                console.warn('Error al guardar party_farm_data en Supabase:', err);
                setCloudSyncStatus('offline');
              }
            })();
          }
        }
      }
    },
    [storageKey, userId]
  );

  // 2.1 Suscripción Realtime a Supabase para sincronización instantánea entre dispositivos
  useEffect(() => {
    if (!userId || !isUUID(userId)) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`realtime_party_farm_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          const remoteData = payload?.new?.party_farm_data as BotellonState | undefined;
          if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
            const currentTotal = stateRef.current.totalLifetimeProduced || 0;
            const remoteTotal = remoteData.totalLifetimeProduced || 0;
            const currentPrestige = stateRef.current.afterPrestigeCount || 0;
            const remotePrestige = remoteData.afterPrestigeCount ?? (remoteData as any).rebirths ?? 0;

            if (remotePrestige > currentPrestige || remoteTotal > currentTotal + 50) {
              if (remotePrestige > currentPrestige) {
                setAfterPrestigeCount(remotePrestige);
                stateRef.current.afterPrestigeCount = remotePrestige;
              }
              if (remoteData.levels) setLevels(remoteData.levels);
              if (typeof remoteData.pendingVault === 'number') setPendingVault(remoteData.pendingVault);
              if (typeof remoteData.totalLifetimeProduced === 'number') setTotalLifetimeProduced(remoteData.totalLifetimeProduced);
              if (remoteData.currentZoneId) setCurrentZoneId(remoteData.currentZoneId);
              if (remoteData.purchasedPerks) setPurchasedPerks(remoteData.purchasedPerks);
              setCloudSyncStatus('saved');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 3. Bucle de simulación en tiempo real (ticks de 250ms)
  useEffect(() => {
    const TICK_INTERVAL = 250;
    const interval = setInterval(() => {
      if (effectiveRatePerSecond <= 0) return;

      const increment = (effectiveRatePerSecond * TICK_INTERVAL) / 1000;
      setPendingVault((prev) => prev + increment);
      setTotalLifetimeProduced((prev) => prev + increment);
      setCurrentRunProduced((prev) => prev + increment);
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [effectiveRatePerSecond]);

  // 4. Temporizador de guardado automático cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      saveState();
    }, 5000);

    return () => clearInterval(interval);
  }, [saveState]);

  // Guardado urgente al cambiar de pestaña o salir del navegador
  useEffect(() => {
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        saveState(undefined, true);
      }
    };
    const handleBeforeUnload = () => {
      saveState(undefined, true);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveState]);

  // 5. Motor de Juego Unificado (1 tick por segundo): Fiesta Loca, enfriamiento de After, noticias y autosave
  useEffect(() => {
    let autosaveCounter = 0;
    let newsCounter = 0;

    const gameInterval = setInterval(() => {
      // 1. Contador de Fiesta Loca
      setCrazyPartyTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsCrazyParty(false);
          return 0;
        }
        return prev - 1;
      });

      // 2. Enfriamiento de sospecha policial del After (1 nivel cada 90s)
      if (afterSuspicionLevel > 0) {
        setAfterCooldownSeconds((sec) => {
          if (sec <= 1) {
            setAfterSuspicionLevel((lvl) => {
              const nextLvl = Math.max(0, lvl - 1);
              saveState({ afterSuspicionLevel: nextLvl });
              return nextLvl;
            });
            return 90;
          }
          return sec - 1;
        });
      }

      // 3. Ticker de noticias ambientales (cada 5.5s)
      newsCounter++;
      if (newsCounter >= 5) {
        newsCounter = 0;
        setCurrentNewsIndex((prev) => (prev + 1) % PARTY_NEWS.length);
      }

      // 4. Autosave cada 5s
      autosaveCounter++;
      if (autosaveCounter >= 5) {
        autosaveCounter = 0;
        saveState();
      }
    }, 1000);

    return () => clearInterval(gameInterval);
  }, [afterSuspicionLevel, saveState]);

  // Acción: Clic manual ("Echar un trago")
  const handleManualDrink = () => {
    const now = Date.now();
    // Anti-Autoclicker: máximo ~12 clics por segundo
    if (now - lastClickTimeRef.current < 75) return;
    lastClickTimeRef.current = now;

    // Sonido táctil de trago con apertura de chapa
    if (Math.random() < 0.35) {
      sound.bottlePop();
    } else {
      sound.tap();
    }

    const baseClick = 1 + (afterPrestigeCount * 5) + Math.floor(baseRatePerSecond * 0.04);
    let clickPower = Math.max(1, Math.round(baseClick * prestigeMultiplier * drinkPowerMult));

    // Beca de ayuda a novatos: cada trago manual da +15 fichas directas extra
    if (isUnderdog) {
      clickPower += 15;
    }

    // Enchufe en barra perk: 12% probabilidad de Jackpot sorpresa
    let hasJackpotBonus = false;
    if (hasPerk('enchufe_barra') && Math.random() < 0.12) {
      clickPower = Math.round(clickPower * 3);
      hasJackpotBonus = true;
      sound.coinWin();
    }

    setPendingVault((prev) => prev + clickPower);
    setTotalLifetimeProduced((prev) => prev + clickPower);
    setCurrentRunProduced((prev) => prev + clickPower);
    setTotalDrinksTaken((prev) => prev + 1);

    // Partícula visual flotante
    const pId = Date.now() + Math.random();
    const newParticle = {
      id: pId,
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 30,
      text: hasJackpotBonus ? `+${Math.floor(clickPower)} BONUS` : `+${Math.floor(clickPower)}`,
    };
    setParticles((prev) => [...prev.slice(-8), newParticle]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== pId));
    }, 750);

    // Sistema de combo rápido: ¡SUBIDÓN DE LA FIESTA!
    setPartyComboCount((prev) => {
      const next = prev + 1;
      if (next >= 10 && !isCrazyParty) {
        const crazyDuration = hasPerk('bafles_jbl') ? 25 : 15;
        setIsCrazyParty(true);
        setCrazyPartyTimeRemaining(crazyDuration);
        sound.toastClink();
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
        return 0;
      }
      return next;
    });
  };

  // Cálculo de costes escalonados e308 con compras múltiples y descuento de tendero
  const getBuyQuote = useCallback(
    (tier: TierConfig, currentLevel: number, multiplier: 1 | 5 | 10 | 'max', availableFichas: number) => {
      let count = 0;
      let totalCost = 0;
      const targetCount = multiplier === 'max' ? 100 : multiplier;

      for (let i = 0; i < targetCount; i++) {
        const rawCost = Math.floor(tier.baseCost * Math.pow(1.22, currentLevel + i));
        const finalCost = Math.max(1, Math.floor(rawCost * costDiscount));

        if (multiplier === 'max') {
          if (totalCost + finalCost > availableFichas) break;
          totalCost += finalCost;
          count++;
        } else {
          totalCost += finalCost;
          count++;
        }
      }

      if (multiplier === 'max' && count === 0) {
        count = 1;
        const rawCost = Math.floor(tier.baseCost * Math.pow(1.22, currentLevel));
        totalCost = Math.max(1, Math.floor(rawCost * costDiscount));
      }

      return {
        count,
        totalCost,
        canAfford: availableFichas >= totalCost && count > 0,
      };
    },
    [costDiscount]
  );

  // Acción: Comprar mejora de nivel exclusivamente con FICHAS del bote (nunca descuenta monedas reales de la cartera)
  const handleBuyTier = (tier: TierConfig) => {
    const currentLevel = levels[tier.id] || 0;
    const { count, totalCost, canAfford } = getBuyQuote(
      tier,
      currentLevel,
      buyMultiplier,
      pendingVault
    );

    if (!canAfford || count <= 0) return;

    sound.coinWin();
    const nextVault = Math.max(0, pendingVault - totalCost);
    setPendingVault(nextVault);

    setLevels((prev) => {
      const nextLevels = {
        ...prev,
        [tier.id]: (prev[tier.id] || 0) + count,
      };

      const updated: BotellonState = {
        ...stateRef.current,
        levels: nextLevels,
        pendingVault: nextVault,
        totalLifetimeProduced,
        currentRunProduced,
        afterPrestigeCount,
        lastTickMs: Date.now(),
        currentZoneId,
        purchasedPerks,
        totalDrinksTaken,
        beerPongWins,
      };
      stateRef.current = updated;
      saveState(updated);

      return nextLevels;
    });
  };

  // Acción voluntaria: Inyectar pasta al bote desde la cartera (1 moneda = 5 fichas)
  const handleFundVaultWithCoins = (coinAmount: number = 50) => {
    if (userCoins < coinAmount) {
      sound.broke();
      alert(`Saldo insuficiente. Necesitas al menos ${coinAmount.toLocaleString()} monedas en tu cartera.`);
      return;
    }
    const fichasToAdd = coinAmount * 5;
    sound.coinWin();
    onUpdateCoins(-coinAmount);
    setPendingVault((prev) => {
      const nextVault = prev + fichasToAdd;
      const updated: BotellonState = {
        ...stateRef.current,
        pendingVault: nextVault,
        lastTickMs: Date.now(),
      };
      stateRef.current = updated;
      saveState(updated, true);
      return nextVault;
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

  // Acción: Interacción con personajes en vivo en la escena
  const handleCharacterClick = (char: CharacterItem) => {
    sound.toastClink();
    const randomQuote = char.quotes[Math.floor(Math.random() * char.quotes.length)];
    setActiveCharacterSpeech({
      id: char.id,
      name: char.name,
      quote: randomQuote,
      tierName: char.role,
    });

    const bonusFichas = 10;
    setPendingVault((prev) => prev + bonusFichas);
    setParticles((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        text: `+${bonusFichas} fichas`,
        x: (Math.random() - 0.5) * 60,
        y: -30,
      },
    ]);
  };

  // Acción: Custodiar el alijo para grandes fortunas (servicio de seguridad privada de 6h con tasa progresiva)
  const handleGuardStash = () => {
    const cost = getGuardCost(userCoins);
    if (userCoins < cost) return;

    sound.toastClink();
    if (cost > 0) {
      onUpdateCoins(-cost);
    }
    const newGuard = Date.now() + 6 * 3600 * 1000;
    setGuardActiveUntilMs(newGuard);
    saveState({ guardActiveUntilMs: newGuard }, true);
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B'],
    });
  };

  // Acción: Reclamar subsidio social de la clase (para novatos <50.000 monedas financiado por tasas a ballenas)
  const handleClaimSubsidio = () => {
    if (userCoins >= 50000) return;
    const now = Date.now();
    const canClaim = now - (lastSubsidioClaimMs || 0) >= 2 * 3600 * 1000;
    if (!canClaim) return;

    sound.jackpot();
    // Subsidio dinámico: escala según lo necesitado que esté el alumno (de 3.500 a 15.000 monedas)
    const bonus = Math.min(15000, Math.max(3500, Math.floor((50000 - userCoins) * 0.25)));
    setLastSubsidioClaimMs(now);
    onUpdateCoins(bonus);
    saveState({ lastSubsidioClaimMs: now }, true);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#F59E0B'],
    });
  };

  // Acción: Meter las fichas acumuladas en la cartera real (Canje oficial: 5 fichas = 1 moneda real)
  const handleClaimVault = () => {
    if (isClaimingRef.current) return;

    const safeVault = Math.max(0, isNaN(pendingVault) || !isFinite(pendingVault) ? 0 : pendingVault);
    const rawFichas = Math.floor(safeVault);
    const coinsToClaim = Math.floor(rawFichas / 5);
    if (coinsToClaim <= 0) {
      alert('Necesitas acumular al menos 5 fichas de botellón para canjear 1 moneda real.');
      return;
    }

    isClaimingRef.current = true;
    setIsClaimingVault(true);

    try {
      sound.coinWin();
      confetti({
        particleCount: Math.min(100, 30 + Math.floor(coinsToClaim / 3)),
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      });

      const fichasDeducted = coinsToClaim * 5;
      const remainingFichas = Math.max(0, safeVault - fichasDeducted);
      setPendingVault(remainingFichas);
      setJustClaimed(true);
      setTimeout(() => setJustClaimed(false), 2000);

      onUpdateCoins(coinsToClaim);

      saveState({ pendingVault: remainingFichas }, true);
    } finally {
      setTimeout(() => {
        isClaimingRef.current = false;
        setIsClaimingVault(false);
      }, 400);
    }
  };

  // Acción: Revertir sospecha policial pagando fianza (escala proporcionalmente para las grandes fortunas)
  const handleRevertSuspicion = () => {
    if (afterSuspicionLevel <= 0) return;
    const { bribeCost } = getAfterRiskStats(afterSuspicionLevel, userCoins);
    if (userCoins < bribeCost) {
      sound.broke();
      alert(`Saldo insuficiente. Necesitas al menos ${bribeCost.toLocaleString()} monedas para pagar la fianza y limpiar tu historial policial.`);
      return;
    }
    sound.coinWin();
    onUpdateCoins(-bribeCost);
    setAfterSuspicionLevel(0);
    setAfterCooldownSeconds(90);
    saveState({ afterSuspicionLevel: 0 }, true);
  };

  // Requisitos escalonados para irse de After:
  // 1. Debe haber alcanzado la producción requerida EN LA RONDA ACTUAL (o global en primer renacimiento)
  // 2. Debe tener suministros activos comprados
  // 3. Debe respetar el tiempo de descanso de 2 minutos entre Afters
  const requiredRunProd = getRequiredAfterProduction(afterPrestigeCount);
  const afterCooldownRemainingMs = Math.max(0, 120000 - (Date.now() - (lastAfterTimestamp || 0)));
  const isAfterOnCooldown = afterCooldownRemainingMs > 0;
  const hasSupplies = Object.values(levels).some((lvl) => (lvl || 0) > 0);
  const hasMetProduction = currentRunProduced >= requiredRunProd || (afterPrestigeCount === 0 && totalLifetimeProduced >= requiredRunProd);
  const canPrestige = hasMetProduction && hasSupplies && !isAfterOnCooldown;

  const handleOpenAfterModal = () => {
    sound.tap();
    setShowAfterModal(true);
  };

  const handleConfirmAfter = async () => {
    if (!canPrestige) return;

    sound.coinWin();
    confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 } });

    const resetLevels = {
      litronas: 0,
      hielos: 0,
      chupitos: 0,
      botellas: 0,
      altavoz: 0,
      barra_libre: 0,
      vip: 0,
    };

    const afterTimestamp = Date.now();
    const leftoverCoins = Math.floor(pendingVault / 5);
    if (leftoverCoins > 0) {
      onUpdateCoins(leftoverCoins);
    }

    const nextPrestigeCount = afterPrestigeCount + 1;
    // Capital de siembra en fichas para arrancar produciendo inmediatamente tras renacer
    const startingSeedFichas = Math.max(2500, nextPrestigeCount * 5000);

    setLevels(resetLevels);
    setPendingVault(startingSeedFichas);
    setCurrentRunProduced(0);
    setLastAfterTimestamp(afterTimestamp);
    setAfterPrestigeCount(nextPrestigeCount);
    setAfterSuspicionLevel(0);
    setAfterCooldownSeconds(60);

    const updatedState: BotellonState = {
      ...stateRef.current,
      levels: resetLevels,
      pendingVault: startingSeedFichas,
      hangoverLevel: 0,
      currentRunProduced: 0,
      lastAfterTimestamp: afterTimestamp,
      afterPrestigeCount: nextPrestigeCount,
      rebirths: nextPrestigeCount,
      afterSuspicionLevel: 0,
      lastTickMs: afterTimestamp,
    };

    // 1. Actualizar estado en memoria y caché local
    stateRef.current = updatedState;
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedState));
    } catch {}

    // 2. Guardar de forma autoritativa en el endpoint del servidor con Supabase Admin (sin condición de carrera)
    if (userId && isUUID(userId)) {
      try {
        const res = await fetch('/api/game/rebirth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            pendingVault,
            targetPrestige: nextPrestigeCount,
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && typeof resData.afterPrestigeCount === 'number') {
            setAfterPrestigeCount(resData.afterPrestigeCount);
            stateRef.current.afterPrestigeCount = resData.afterPrestigeCount;
            if (resData.party_farm_data) {
              const merged = { ...stateRef.current, ...resData.party_farm_data };
              stateRef.current = merged;
              try {
                localStorage.setItem(storageKey, JSON.stringify(merged));
              } catch {}
            }
          }
        } else {
          // Fallback seguro si la API devuelve error
          saveState(updatedState, true);
        }
      } catch (err) {
        console.warn('Error llamando a /api/game/rebirth:', err);
        saveState(updatedState, true);
      }
    } else {
      saveState(updatedState, true);
    }

    setShowAfterModal(false);
  };

  const roundedVault = Math.floor(pendingVault);
  const coinsToClaim = Math.floor(roundedVault / 5);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Aviso de farmeo offline */}
      {offlineReport && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                La fiesta siguió mientras estabas fuera
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Has recaudado{' '}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                  +{offlineReport.earned.toLocaleString()} fichas
                </span>{' '}
                durante tus {Math.round(offlineReport.seconds / 60)} min desconectado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOfflineReport(null)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 cursor-pointer active:scale-95 transition-transform shadow-2xs"
          >
            Aceptar
          </button>
        </div>
      )}

      {/* Banner de Zona Actual, Rango y Estado de Nube Supabase con ticker en vivo integrado */}
      <div className="p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2.5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-center shrink-0">
              {renderZoneIcon(activeZone.icon)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  {activeZone.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-[#0071e3] dark:text-blue-400 font-semibold border border-blue-500/20">
                  x{activeZone.multiplier.toFixed(1)} Zona
                </span>
                {afterPrestigeCount > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenAfterModal}
                    className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-colors cursor-pointer"
                    title="Nivel de Renacimiento y Multiplicador Permanente"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Renacimiento {afterPrestigeCount} (x{prestigeMultiplier.toFixed(1)})</span>
                  </button>
                )}
                {activeZone.policeRisk > 0 ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">
                    Riesgo {Math.round(activeZone.policeRisk * 100)}%
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    Zona Segura
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{activeZone.desc}</p>
            </div>
          </div>

          {/* Controles: Nube, Rango y Guía */}
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200 dark:border-neutral-800 flex-wrap justify-between sm:justify-end">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700/60"
              title="Estado de guardado en base de datos Supabase"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cloudSyncStatus === 'saved' ? 'bg-emerald-500' : 'bg-[#0071e3] animate-ping'}`} />
              <span>{cloudSyncStatus === 'saved' ? 'Supabase en nube' : 'Guardando...'}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700/60">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>{currentRank.name}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                setTutorialStep(0);
                setShowTutorial(true);
              }}
              title="Ver guía completa"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-medium transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700/60"
            >
              <HelpCircle className="w-3 h-3 text-[#0071e3]" />
              <span>Guía</span>
            </button>
          </div>
        </div>

        {/* Noticia en directo sutil (reemplaza el ecualizador invasivo) */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 truncate">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#0071e3] shrink-0">
            En vivo:
          </span>
          <span className="truncate transition-all duration-300 font-sans">
            {PARTY_NEWS[currentNewsIndex]}
          </span>
        </div>
      </div>

      {/* Banner de Goteo Comunista (Grandes Fortunas) o Subsidio Proletario (Novatos) */}
      {userCoins >= 100000 ? (
        guardActiveUntilMs > Date.now() ? (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-950 dark:text-emerald-100">Alijo Custodiado</span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-semibold">
                    {Math.ceil((guardActiveUntilMs - Date.now()) / 3600000)}h restantes
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 truncate">
                  Tu fortuna está protegida contra el Goteo Comunista.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGuardStash}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 hover:bg-emerald-100/50 dark:hover:bg-neutral-700 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-semibold text-xs cursor-pointer transition-colors shrink-0 shadow-2xs active:scale-[0.98]"
            >
              Renovar (+6h) {getGuardCost(userCoins) > 0 ? `· -${getGuardCost(userCoins).toLocaleString()} 🪙` : '· Gratis'}
            </button>
          </div>
        ) : (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-950 dark:text-amber-100">Goteo Comunista Activo</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold border border-red-500/25">
                    Alijo desprotegido
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 truncate">
                  Las fortunas ociosas gotean al Fondo Social para alumnos novatos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGuardStash}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs cursor-pointer transition-colors shrink-0 shadow-xs active:scale-[0.98]"
            >
              🛡️ Custodiar (+6h) {getGuardCost(userCoins) > 0 ? `· -${getGuardCost(userCoins).toLocaleString()} 🪙` : '· Gratis'}
            </button>
          </div>
        )
      ) : isUnderdog && Date.now() - (lastSubsidioClaimMs || 0) >= 2 * 3600 * 1000 ? (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-2.5 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-[#0071e3] dark:text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-950 dark:text-blue-100">Fondo Social Proletario</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                  +{Math.min(15000, Math.max(3500, Math.floor((50000 - userCoins) * 0.25))).toLocaleString()} 🪙
                </span>
              </div>
              <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 truncate">
                Subvención social de impulso para alumnos novatos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClaimSubsidio}
            className="px-3.5 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs cursor-pointer transition-colors shrink-0 active:scale-[0.98] shadow-xs"
          >
            Reclamar Subsidio
          </button>
        </div>
      ) : null}

      {/* DASHBOARD RESPONSIVO UNIFICADO (Estilo Apple Grouped Cards 3 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Panel 1: Bote acumulado */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-3 sm:space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>Bote acumulado</span>
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Canje 5:1
            </span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 font-mono">
              {roundedVault.toLocaleString()}{' '}
              <span className="text-xs font-sans text-neutral-500 dark:text-neutral-400 font-normal">fichas</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
              ≈ {coinsToClaim.toLocaleString()} monedas reales
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              disabled={coinsToClaim <= 0 || isClaimingVault}
              onClick={handleClaimVault}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] min-h-[40px] ${
                coinsToClaim > 0 && !isClaimingVault
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700/60 cursor-not-allowed opacity-60'
              }`}
            >
              {isClaimingVault ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin text-[#0071e3]" />
                  <span>Canjeando...</span>
                </>
              ) : justClaimed ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>¡Canjeado al monedero!</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Canjear al Monedero (+{coinsToClaim.toLocaleString()} 🪙)</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={userCoins < 50}
              onClick={() => handleFundVaultWithCoins(50)}
              className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] border ${
                userCoins >= 50
                  ? 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700/60'
                  : 'bg-neutral-100/50 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-500 border-neutral-200/50 dark:border-neutral-800/50 cursor-not-allowed opacity-50'
              }`}
              title="Aportar 50 monedas de tu cartera para recibir +250 fichas al bote"
            >
              <span>Aportar al bote (-50 🪙 → +250 fichas)</span>
            </button>
          </div>
        </div>

        {/* Panel 2: Ritmo de Producción Pasiva */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-3 sm:space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Producción pasiva</span>
            </span>
            {afterPrestigeCount > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                x{prestigeMultiplier.toFixed(2)} After
              </span>
            )}
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 font-mono">
              +{effectiveRatePerSecond.toFixed(1)}{' '}
              <span className="text-xs font-sans text-neutral-500 dark:text-neutral-400 font-normal">fichas / seg</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
              Base: +{baseRatePerSecond.toFixed(1)}/s · Zona: x{activeZone.multiplier.toFixed(1)}
            </p>
          </div>

          {/* Desglose de Bonificaciones Activas (Estilo Apple System Badges) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isUnderdog && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  Beca Novatos x4.0
                </span>
              )}
              {isCrazyParty && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 animate-pulse">
                  Fiesta Loca x3 ({crazyPartyTimeRemaining}s)
                </span>
              )}
              {afterPrestigeCount > 0 && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                  +{permanentPrestigeRate.toFixed(0)}/s Base Garantizada
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('after')}
              className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[32px] border bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700/60"
            >
              <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
              <span>Ver Progresión del After (Prestigio)</span>
            </button>
          </div>
        </div>

        {/* Panel 3: Trago Manual */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-3 sm:space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wine className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Trago manual</span>
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              {isCrazyParty ? `¡Subidón ${crazyPartyTimeRemaining}s!` : `Ritmo ${partyComboCount}/10`}
            </span>
          </div>

          <div className="relative w-full">
            <button
              type="button"
              onClick={handleManualDrink}
              className={`w-full py-3 sm:py-4 px-4 rounded-xl sm:rounded-2xl border transition-all active:scale-[0.97] cursor-pointer flex items-center justify-between touch-manipulation min-h-[56px] sm:min-h-[64px] ${
                isCrazyParty
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100 shadow-amber-500/10'
                  : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-100/80 dark:hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-700 flex items-center justify-center text-[#0071e3] shrink-0 border border-neutral-200/80 dark:border-neutral-600/80 shadow-2xs">
                  <Wine className={`w-4 h-4 ${isCrazyParty ? 'text-amber-500 animate-bounce' : 'text-[#0071e3]'}`} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                    {isCrazyParty ? '¡Trago con Subidón x3!' : '¡Echar un trago!'}
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                    +{Math.max(1, Math.floor(1 + baseRatePerSecond * 0.05)) * prestigeMultiplier * drinkPowerMult * (isCrazyParty ? 3 : 1)} al bote
                  </div>
                </div>
              </div>

              <span className="text-xs font-semibold text-[#0071e3] px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                Beber
              </span>
            </button>

            {/* Partículas visuales */}
            {particles.map((p) => (
              <span
                key={p.id}
                className="pointer-events-none absolute left-1/2 top-1/2 font-mono font-bold text-xs text-amber-500 select-none animate-in fade-in slide-in-from-bottom-2 duration-300"
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
            <div className="w-full h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  isCrazyParty ? 'bg-amber-500 w-full' : 'bg-neutral-900 dark:bg-neutral-100 w-0'
                }`}
                style={!isCrazyParty ? { width: `${(partyComboCount / 10) * 100}%` } : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Escena Viva de El Botellón: Personajes Interactivos Desbloqueables */}
      <PartyLiveScene
        levels={levels}
        zoneName={activeZone.name}
        onCharacterClick={handleCharacterClick}
        activeSpeech={activeCharacterSpeech}
        onCloseSpeech={() => setActiveCharacterSpeech(null)}
      />

      {/* Pestañas de Progresión y Mecánicas del Botellón (Apple Segmented Control) */}
      <div className="flex items-center p-1.5 rounded-2xl bg-neutral-200/70 dark:bg-neutral-800/70 border border-neutral-300/80 dark:border-neutral-700/60 overflow-x-auto scrollbar-none gap-1 touch-pan-x">
        {[
          { id: 'suministros', label: 'Bebidas & Suministros', icon: Wine },
          { id: 'zonas', label: 'Fases de la Noche', icon: MapPin },
          { id: 'after', label: 'El After (Prestigio)', icon: RotateCcw },
          { id: 'inversiones', label: 'Bolsa de Valores', icon: TrendingUp },
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
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-[0.97] touch-manipulation min-h-[38px] ${
                isActive
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white font-semibold shadow-xs border border-neutral-200/80 dark:border-neutral-700'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === 'after' && canPrestige && (
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* PESTAÑA 1: BEBIDAS & SUMINISTROS */}
      {activeTab === 'suministros' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Suministros del Botellón</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {costDiscount < 1 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 mr-1.5">
                    <Tag className="w-3 h-3" />
                    <span>15% descuento aplicado</span>
                  </span>
                )}
                Multiplica tu producción pasiva en tiempo real.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Selector de cantidad estilo e308 (x1, x5, x10, Máx) */}
              <div className="flex items-center p-0.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
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
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-semibold shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    {m === 'max' ? 'Máx' : `x${m}`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('after')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 cursor-pointer ${
                  canPrestige
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white hover:opacity-90 shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60'
                }`}
                title="Ir al After y consultar el multiplicador de prestigio"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${canPrestige ? 'text-purple-400' : 'text-neutral-400'}`} />
                <span>
                  {canPrestige
                    ? '¡Renacer listo! (+bonus)'
                    : isAfterOnCooldown
                    ? `After (${Math.ceil(afterCooldownRemainingMs / 1000)}s)`
                    : `After (${Math.floor(currentRunProduced).toLocaleString()} / ${requiredRunProd.toLocaleString()})`}
                </span>
                {afterPrestigeCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    x{prestigeMultiplier.toFixed(2)}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {TIERS.map((tier) => {
              const currentLevel = levels[tier.id] || 0;
              const quote = getBuyQuote(tier, currentLevel, buyMultiplier, pendingVault);
              const milestone = getTierMilestoneMultiplier(currentLevel);
              const currentTotalRate =
                currentLevel * tier.baseRate * milestone * activeZone.multiplier * prestigeMultiplier;
              const Icon = tier.icon;

              return (
                <div
                  key={tier.id}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center shrink-0 text-neutral-800 dark:text-neutral-200">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50 truncate">
                            {tier.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shrink-0 font-medium">
                            Nvl. {currentLevel}
                          </span>
                          {milestone > 1 && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              x{milestone}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {tier.desc}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                            +{(tier.baseRate * milestone * activeZone.multiplier * prestigeMultiplier).toFixed(1)}/s c/u{' '}
                            {currentLevel > 0 && (
                              <span className="text-neutral-400 dark:text-neutral-500 font-normal">
                                (total: +{currentTotalRate.toFixed(1)}/s)
                              </span>
                            )}
                          </p>
                          {prestigeMultiplier > 1 && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/25">
                              x{prestigeMultiplier.toFixed(2)} After
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!quote.canAfford}
                      onClick={() => handleBuyTier(tier)}
                      className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer active:scale-[0.96] flex flex-col items-end min-h-[44px] justify-center ${
                        quote.canAfford
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs hover:opacity-90'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700/60 cursor-not-allowed opacity-60'
                      }`}
                      title={
                        quote.canAfford
                          ? `Comprar con ${quote.totalCost.toLocaleString()} fichas del bote`
                          : `Necesitas ${quote.totalCost.toLocaleString()} fichas en el bote (tienes ${roundedVault.toLocaleString()})`
                      }
                    >
                      <span>Pillar {quote.count > 1 ? `x${quote.count}` : ''}</span>
                      <span className="text-[10px] font-mono opacity-80">
                        {quote.totalCost.toLocaleString()} fichas
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ventajas y Perks Permanentes de Fiesta */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Ventajas de la Noche (Perks)</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Mejoras permanentes para toda la noche. Se adquieren una sola vez con fichas del botellón.
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
                        ? 'bg-white dark:bg-neutral-900 border-emerald-500/40 dark:border-emerald-500/30 shadow-xs'
                        : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 text-neutral-800 dark:text-neutral-200">
                        {renderPerkIcon(perk.icon)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {perk.name}
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                          {perk.desc}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {bought ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => handleBuyPerk(perk)}
                          className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] flex flex-col items-end justify-center touch-manipulation ${
                            canAfford
                              ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs hover:opacity-90'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700/60 cursor-not-allowed opacity-50'
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
        </div>
      )}

      {/* PESTAÑA 2: FASES & ZONAS DE LA NOCHE */}
      {activeTab === 'zonas' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Etapas de la Noche</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
                      ? 'bg-white dark:bg-neutral-900 border-neutral-950 dark:border-white shadow-sm ring-1 ring-neutral-950/10 dark:ring-white/20'
                      : isUnlocked
                      ? 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs'
                      : 'bg-neutral-100/60 dark:bg-neutral-900/40 border border-dashed border-neutral-200 dark:border-neutral-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 text-neutral-800 dark:text-neutral-200">
                      {renderZoneIcon(zone.icon)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">{zone.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/40">
                          x{zone.multiplier.toFixed(1)} Producción
                        </span>
                        {zone.policeRisk > 0 ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold border border-red-200 dark:border-red-800/40">
                            Riesgo redada: {Math.round(zone.policeRisk * 100)}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800/40">
                            Zona Segura (0% riesgo)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{zone.subtitle}</p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">{zone.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200/80 dark:border-neutral-800">
                    {isSelected ? (
                      <span className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 flex items-center gap-1.5 shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                        <span>Fase Activa</span>
                      </span>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleSelectZone(zone)}
                        className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
                      >
                        Mudar la fiesta
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 font-mono">
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

      {/* PESTAÑA 3: EL AFTER (SISTEMA DE PRESTIGIO Y RENACIMIENTO) */}
      {activeTab === 'after' && (() => {
        const nextPrestigeCount = afterPrestigeCount + 1;
        const currentMultiplier = prestigeMultiplier;
        const nextMultiplier = calculatePrestigeMultiplier(nextPrestigeCount);
        const coinsReward = Math.floor(pendingVault / 5);
        const progressPct = Math.min(100, Math.round((currentRunProduced / requiredRunProd) * 100));
        const nextPermanentRate = Math.round(nextPrestigeCount * 25 * nextMultiplier);
        const nextBaseClick = Math.round((1 + nextPrestigeCount * 5) * nextMultiplier);
        const startingSeedFichas = Math.max(2500, nextPrestigeCount * 5000);
        const riskStats = getAfterRiskStats(afterSuspicionLevel, userCoins);

        return (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      Sistema de Prestigio
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/20">
                      Nivel {afterPrestigeCount}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
                    El After Clandestino (Renacimiento)
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xl">
                    Reinicia los suministros de esta ronda a cambio de un multiplicador global permanente para toda la noche, producción base garantizada y capital de arranque inmediato.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-center">
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase">Multiplicador</div>
                    <div className="text-base font-bold text-purple-600 dark:text-purple-400">x{currentMultiplier.toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-neutral-400">→</div>
                  <div className="px-3 py-1.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 font-mono text-center">
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 uppercase">Siguiente</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">x{nextMultiplier.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Barra de Progreso de la Ronda Actual */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-500 dark:text-neutral-400">Recaudación de esta ronda:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {Math.floor(currentRunProduced).toLocaleString()} / {requiredRunProd.toLocaleString()} fichas
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-0.5">
                  <span>{progressPct >= 100 ? '✅ Requisito de producción alcanzado' : `Faltan ${(requiredRunProd - Math.floor(currentRunProduced)).toLocaleString()} fichas`}</span>
                  <span>{progressPct}% completado</span>
                </div>
              </div>

              {/* Tarjetas de Beneficios al Renacer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                    Producción Base
                  </span>
                  <div className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                    +{nextPermanentRate}/s <span className="text-[10px] text-neutral-400 font-normal">garantizado</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                    Potencia de Clic
                  </span>
                  <div className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                    +{nextBaseClick}/clic <span className="text-[10px] text-neutral-400 font-normal">por trago</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-700 dark:text-purple-300 block font-semibold">
                    Capital de Arranque
                  </span>
                  <div className="font-mono text-sm font-bold text-purple-700 dark:text-purple-300">
                    +{startingSeedFichas.toLocaleString()} fichas
                  </div>
                </div>
              </div>

              {/* Panel de Riesgo Policial y Fianza */}
              <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                      <Siren className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-900 dark:text-red-100">
                          Vigilancia Policial del After: {afterSuspicionLevel > 0 ? `Nivel ${afterSuspicionLevel}` : 'Zona Despejada (Nivel 0)'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold border border-red-500/25">
                          {riskStats.raidChancePct}% Riesgo · {riskStats.confiscatePct}% Confiscación
                        </span>
                      </div>
                      <p className="text-[11px] text-red-800/80 dark:text-red-300/80 mt-0.5">
                        {afterSuspicionLevel > 0
                          ? `La patrulla ronda el local. Se enfría 1 nivel en ${afterCooldownSeconds}s o puedes pagar la fianza para dejar el riesgo a 0%.`
                          : 'El After no tiene sospechas acumuladas. Riesgo base mínimo.'}
                      </p>
                    </div>
                  </div>

                  {afterSuspicionLevel > 0 && (
                    <button
                      type="button"
                      onClick={handleRevertSuspicion}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-neutral-700 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-900 dark:text-red-100 flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] shrink-0 shadow-2xs"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span>Limpiar a 0% (-{riskStats.bribeCost.toLocaleString()} monedas)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Botón Principal de Confirmación */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!canPrestige}
                  onClick={handleConfirmAfter}
                  className={`w-full py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 ${
                    canPrestige
                      ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>
                    {canPrestige
                      ? `Confirmar Renacimiento #${nextPrestigeCount} (+${nextMultiplier.toFixed(2)}x multiplicador)`
                      : isAfterOnCooldown
                      ? `En descanso del After (${Math.ceil(afterCooldownRemainingMs / 1000)}s)...`
                      : `Faltan ${Math.max(0, Math.ceil(requiredRunProd - currentRunProduced)).toLocaleString()} fichas recaudadas en esta ronda`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* PESTAÑA 5: FONDO BOTELLÓN (SISTEMA DE INVERSIONES COMPARTIDO) */}
      {activeTab === 'inversiones' && (
        <BotellonInvestments
          userCoins={userCoins}
          userId={userId}
          username={username}
          onUpdateCoins={onUpdateCoins}
          onRequireAuth={onRequireAuth}
        />
      )}

      {/* Mini-tutorial interactivo (primera visita y bajo demanda) */}
      {showTutorial && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="fixed inset-0" onClick={handleCloseTutorial} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-surface border border-border/80 shadow-2xl overflow-hidden p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Wine className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  Guía de El Botellón · Paso {tutorialStep + 1} de 3
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseTutorial}
                className="p-1 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Content */}
            <div className="py-2 space-y-3">
              {tutorialStep === 0 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-10 h-10 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-accent mx-auto mb-2">
                    <Wine className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground text-center">
                    1. Bebidas y Generación Continua
                  </h4>
                  <p className="leading-relaxed text-center">
                    Haz clic en la litrona central para acumular fichas manuales. Compra y sube de nivel tus suministros (hielos, kalimotxo, botellas) y desbloquea Perks para producir fichas por segundo de forma continua, incluso cuando cierres la ventana.
                  </p>
                </div>
              )}

              {tutorialStep === 1 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-10 h-10 rounded-xl bg-surface-raised border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto mb-2">
                    <Coins className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground text-center">
                    2. Canje Oficial 5 a 1 a tu Cartera
                  </h4>
                  <p className="leading-relaxed text-center">
                    Tus fichas se acumulan en el panel principal. La tasa de cambio oficial es fija: <strong>5 fichas = 1 moneda real</strong>. Pulsa <strong>&quot;Meter a la saca&quot;</strong> cuando quieras para ingresar el saldo directamente a tu cuenta y usarlo en el Casino o subir en el Ranking.
                  </p>
                </div>
              )}

              {tutorialStep === 2 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-10 h-10 rounded-xl bg-surface-raised border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-2">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground text-center">
                    3. El After (Rebirth) y Solidaridad
                  </h4>
                  <p className="leading-relaxed text-center">
                    Cuando alcances el coste del After, renace para multiplicar de por vida toda tu producción y clics, recibiendo capital semilla al empezar. Además, para mantener la economía justa, las fortunas inactivas aportan al fondo común para que los nuevos crezcan.
                  </p>
                </div>
              )}
            </div>

            {/* Step Indicators and Nav Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((s) => (
                  <span
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      tutorialStep === s ? 'w-5 bg-foreground' : 'w-2 bg-border'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {tutorialStep > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setTutorialStep((prev) => prev - 1);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-muted hover:text-foreground bg-surface-raised border border-border/70 cursor-pointer"
                  >
                    Anterior
                  </button>
                )}

                {tutorialStep < 2 ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setTutorialStep((prev) => prev + 1);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-foreground text-background cursor-pointer active:scale-95"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      handleCloseTutorial();
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-foreground text-background cursor-pointer active:scale-95 shadow-xs"
                  >
                    ¡Comenzar fiesta!
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Minimalista de Renacimiento (Rebirth) */}
      {showAfterModal && (() => {
        const nextPrestigeCount = afterPrestigeCount + 1;
        const currentMultiplier = prestigeMultiplier;
        const nextMultiplier = calculatePrestigeMultiplier(nextPrestigeCount);
        const coinsReward = Math.floor(pendingVault / 5);
        const progressPct = Math.min(100, Math.round((currentRunProduced / requiredRunProd) * 100));
        const nextPermanentRate = Math.round(nextPrestigeCount * 25 * nextMultiplier);
        const nextBaseClick = Math.round((1 + nextPrestigeCount * 5) * nextMultiplier);
        const startingSeedFichas = Math.max(2500, nextPrestigeCount * 5000);

        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div className="fixed inset-0" onClick={() => setShowAfterModal(false)} />
            <div className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5 text-neutral-900 dark:text-neutral-100 select-none">
              {/* Encabezado */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      Sistema de Prestigio
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      Nivel {afterPrestigeCount}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white font-sans">
                    Renacimiento
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-sans">
                    Reinicia los suministros de esta ronda a cambio de un incremento permanente en la tasa de producción, farmeo base pasivo y potencia de clic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAfterModal(false)}
                  className="w-8 h-8 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Estadísticas de Renacimiento */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                    Nivel de Renacimiento
                  </span>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-base font-bold text-neutral-500 dark:text-neutral-400">#{afterPrestigeCount}</span>
                    <span className="text-xs text-neutral-400">→</span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white">#{nextPrestigeCount}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                    Multiplicador Global
                  </span>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-base font-bold text-neutral-500 dark:text-neutral-400">x{currentMultiplier.toFixed(2)}</span>
                    <span className="text-xs text-neutral-400">→</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">x{nextMultiplier.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                    Producción Base
                  </span>
                  <div className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                    +{nextPermanentRate}/s <span className="text-[10px] text-neutral-400 font-normal">garantizado</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                    Potencia de Clic
                  </span>
                  <div className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                    +{nextBaseClick}/clic <span className="text-[10px] text-neutral-400 font-normal">por trago</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 space-y-1 col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-700 dark:text-purple-300 block font-semibold">
                    Capital de Arranque Inmediato
                  </span>
                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                      +{startingSeedFichas.toLocaleString()} fichas
                    </span>
                    <span className="text-[10px] text-purple-600/90 dark:text-purple-400/90">
                      en el bote al renacer
                    </span>
                  </div>
                </div>
              </div>

              {/* Recompensa en monedas de la ronda actual */}
              {coinsReward > 0 && (
                <div className="p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/50 flex items-center justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400">Conversión de bote a cartera:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    +{coinsReward.toLocaleString()} monedas
                  </span>
                </div>
              )}

              {/* Barra de progreso de la ronda actual */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-500 dark:text-neutral-400">Fichas de esta ronda:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {Math.floor(currentRunProduced).toLocaleString()} / {requiredRunProd.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Reglas claras y concisas */}
              <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-sans border-t border-neutral-200 dark:border-neutral-800 pt-3">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-200 shrink-0">Suministros:</span>
                  <span>Se compran exclusivamente con fichas del botellón. ¡Tus monedas reales de la cartera nunca se descuentan al mejorar!</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-200 shrink-0">Al Renacer:</span>
                  <span>Consigues el multiplicador permanente acumulativo y capital de arranque para comprar suministros de inmediato.</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAfterModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={!canPrestige}
                  onClick={handleConfirmAfter}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5 ${
                    canPrestige
                      ? 'text-white bg-neutral-900 hover:bg-black dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {canPrestige
                      ? 'Confirmar Renacimiento'
                      : isAfterOnCooldown
                      ? `En descanso (${Math.ceil(afterCooldownRemainingMs / 1000)}s)`
                      : `Faltan ${Math.max(0, Math.ceil(requiredRunProd - currentRunProduced)).toLocaleString()} fichas`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Resultado: Redada Policial o After Exitoso */}
      {afterRaidResult && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="fixed inset-0" onClick={() => setAfterRaidResult(null)} />
          <div className={`relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border shadow-2xl overflow-hidden p-6 sm:p-7 space-y-4 ${
            afterRaidResult.type === 'raid'
              ? 'border-red-200 dark:border-red-900/50'
              : 'border-purple-200 dark:border-purple-900/50'
          }`}>
            <div className="text-center space-y-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                afterRaidResult.type === 'raid'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40'
              }`}>
                {afterRaidResult.type === 'raid' ? (
                  <Siren className="w-6 h-6" />
                ) : (
                  <Sparkles className="w-6 h-6" />
                )}
              </div>

              <h3 className={`text-base font-bold tracking-tight ${
                afterRaidResult.type === 'raid' ? 'text-red-900 dark:text-red-200' : 'text-purple-900 dark:text-purple-200'
              }`}>
                {afterRaidResult.type === 'raid'
                  ? '¡Redada Policial en el After!'
                  : '¡After Clandestino Completado!'}
              </h3>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {afterRaidResult.type === 'raid'
                  ? `La patrulla intervino el local ilegalmente. Te aplicaron una sanción severa del ${afterRaidResult.confiscatePct}% sobre todos tus fondos disponibles.`
                  : '¡Habéis despistado a la policía! La fiesta continuó sin incidentes y recibes tu bonus de producción.'}
              </p>
            </div>

            {/* Desglose de Pérdidas / Ganancias */}
            {afterRaidResult.type === 'raid' ? (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 space-y-2 font-mono text-xs text-red-900 dark:text-red-200">
                <div className="flex items-center justify-between font-bold">
                  <span>Multa confiscada:</span>
                  <span>-{afterRaidResult.confiscatePct}%</span>
                </div>
                {afterRaidResult.coinsLost > 0 && (
                  <div className="flex items-center justify-between text-red-700 dark:text-red-300">
                    <span>Monedas requisadas:</span>
                    <span className="font-bold">-{afterRaidResult.coinsLost.toLocaleString()} monedas</span>
                  </div>
                )}
                {afterRaidResult.coinsLost >= 1000000 && (
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 text-[11px] text-red-900 dark:text-red-200 font-sans">
                    💥 <strong>¡GOLPE FISCAL A LA GRAN FORTUNA!</strong> La policía ha requisado más de 1 millón de monedas de tu fortuna acumulada.
                  </div>
                )}
                {afterRaidResult.vaultLost > 0 && (
                  <div className="flex items-center justify-between text-red-700 dark:text-red-300">
                    <span>Fichas requisadas del bote:</span>
                    <span className="font-bold">-{afterRaidResult.vaultLost.toLocaleString()} fichas</span>
                  </div>
                )}
                <div className="pt-2 border-t border-red-200 dark:border-red-900/40 flex items-center justify-between text-neutral-700 dark:text-neutral-300 text-[11px] font-sans">
                  <span>Bonus de producción:</span>
                  <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">Activo</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-1.5 font-mono text-xs text-purple-900 dark:text-purple-200">
                <div className="flex items-center justify-between">
                  <span>Bonus permanente sumado:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">Farmeo mejorado</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Nuevo multiplicador total:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">x{prestigeMultiplier.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Aviso de sospecha para el siguiente After */}
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center justify-between gap-2">
              <span>Sospecha actual: <strong>Nivel {afterRaidResult.nextLevel}</strong></span>
              <span className="font-mono text-red-700 dark:text-red-300 font-semibold">
                {getAfterRiskStats(afterRaidResult.nextLevel, userCoins).raidChancePct}% riesgo próximo
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAfterRaidResult(null)}
              className="w-full min-h-[44px] py-2.5 rounded-xl font-semibold text-xs text-white bg-neutral-950 dark:bg-white dark:text-neutral-950 hover:opacity-90 transition-opacity cursor-pointer active:scale-[0.98] shadow-sm touch-manipulation"
            >
              {afterRaidResult.type === 'raid' ? 'Asumir sanción y continuar' : '¡Seguir la fiesta!'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Reporte de Goteo Comunista (Desgaste por Inactividad) */}
      {communistDripReport && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in select-none"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/50 p-6 space-y-4 shadow-2xl text-xs text-neutral-900 dark:text-neutral-100">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 flex items-center justify-center mx-auto">
              <TrendingDown className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Tasa de Solidaridad · Goteo Comunista
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Has estado {communistDripReport.hours}h desconectado con una gran fortuna (&gt;100k) sin custodiar tu alijo.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-center space-y-1.5">
              <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">Aportación al Fondo Común:</span>
              <div className="text-xl font-bold font-mono text-red-700 dark:text-red-400">
                -{communistDripReport.coinsLost.toLocaleString()} monedas
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                Estas monedas se han repartido entre los alumnos con menos de 25k monedas para equilibrar la clase.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCommunistDripReport(null);
                handleGuardStash();
              }}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-semibold text-xs cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all shadow-sm touch-manipulation"
            >
              Entendido · Custodiar Alijo Ahora (8h)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
