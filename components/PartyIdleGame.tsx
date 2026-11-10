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

  // Pestaña activa dentro del juego: 'suministros' | 'zonas' | 'habilidades' | 'beerpong' | 'inversiones'
  const [activeTab, setActiveTab] = useState<
    'suministros' | 'zonas' | 'habilidades' | 'beerpong' | 'inversiones'
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

  // Tutorial interactivo de primera visita
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
  const cloudSyncDisabledRef = useRef<boolean>(false);
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

  // Estados de dificultad, riesgo y resaca (Nerf orgánico)
  const [policeAlert, setPoliceAlert] = useState<{
    secondsLeft: number;
    penaltyResult?: string;
  } | null>(null);
  const [productionFrozenUntilMs, setProductionFrozenUntilMs] = useState<number>(0);
  const [hangoverLevel, setHangoverLevel] = useState<number>(0);
  const [waterCooldown, setWaterCooldown] = useState<number>(0);

  // Sucesos espontáneos de colegas de fiesta
  const [spontaneousEvent, setSpontaneousEvent] = useState<SpontaneousEvent | null>(null);
  const [eventCooldown, setEventCooldown] = useState<number>(35);
  const [discountActiveUntil, setDiscountActiveUntil] = useState<number>(0);

  // Minijuego 2: El Vaso Misterioso (Ruleta de Chupitos)
  const [glassCooldown, setGlassCooldown] = useState<number>(0);
  const [glassResult, setGlassResult] = useState<{ type: string; text: string } | null>(null);
  const [isSelectingGlass, setIsSelectingGlass] = useState<boolean>(false);

  // Zona actual y multiplicador de zona
  const activeZone = useMemo(() => {
    return ZONES.find((z) => z.id === currentZoneId) || ZONES[0];
  }, [currentZoneId]);

  // Rango de fiestero actual
  const currentRank = useMemo(() => {
    const sorted = [...PARTY_RANKS].reverse();
    return sorted.find((r) => totalLifetimeProduced >= r.minProd) || PARTY_RANKS[0];
  }, [totalLifetimeProduced]);

  // Multiplicador de prestigio After (con rendimientos fuertemente decrecientes para balancear el juego y evitar monopolios)
  const prestigeMultiplier = useMemo(() => {
    if (afterPrestigeCount <= 0) return 1.0;
    let mult = 1.0;
    for (let i = 1; i <= afterPrestigeCount; i++) {
      if (i === 1) mult += 0.35;
      else if (i <= 3) mult += 0.20;
      else if (i <= 6) mult += 0.12;
      else if (i <= 10) mult += 0.06;
      else mult += 0.02; // Rendimiento mínimo para Afters masivos
    }
    return Math.min(6.0, Number(mult.toFixed(2))); // Límite de seguridad de x6.0 para mantener competitiva la tabla
  }, [afterPrestigeCount]);

  // Beca SMR de Impulso para Novatos: si tienes menos de 50.000 monedas, recibes x4.0 de velocidad permanente
  const isUnderdog = userCoins < 50000;
  const underdogMultiplier = isUnderdog ? 4.0 : 1.0;

  // Multiplicadores por perks y descuentos temporales
  const hasPerk = useCallback(
    (id: string) => purchasedPerks.includes(id),
    [purchasedPerks]
  );

  const isFlashDiscount = Date.now() < discountActiveUntil;
  const costDiscount = (hasPerk('descuento_chino') ? 0.85 : 1.0) * (isFlashDiscount ? 0.70 : 1.0);
  const drinkPowerMult = hasPerk('aguante_hierro') ? 3.0 : 1.0;
  const rankBonusMult = 1 + currentRank.bonusPercent / 100;

  // Resaca y congelación de producción por patrulla
  const isHungover = hangoverLevel >= 100;
  const isProductionFrozen = productionFrozenUntilMs > Date.now();

  // Tasa de producción pasiva base (por segundo) con hitos, zona y rango
  const baseRatePerSecond = useMemo(() => {
    const rawRate = TIERS.reduce((acc, tier) => {
      const lvl = levels[tier.id] || 0;
      const milestone = getTierMilestoneMultiplier(lvl);
      return acc + lvl * tier.baseRate * milestone;
    }, 0);

    return rawRate * activeZone.multiplier * rankBonusMult;
  }, [levels, activeZone.multiplier, rankBonusMult]);

  // Tasa real con multiplicadores aplicados (Prestigio + Beca Novatos x3 + Modo Fiesta Loca x3 - Resaca - Redada)
  const effectiveRatePerSecond = useMemo(() => {
    if (isProductionFrozen) return 0;
    const frenzyMult = isCrazyParty ? 3 : 1;
    const hangoverMult = isHungover ? 0.35 : 1.0;
    return baseRatePerSecond * prestigeMultiplier * frenzyMult * hangoverMult * underdogMultiplier;
  }, [baseRatePerSecond, prestigeMultiplier, isCrazyParty, isProductionFrozen, isHungover, underdogMultiplier]);

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
    hangoverLevel,
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
      hangoverLevel,
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
    hangoverLevel,
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
      if (typeof stateToApply.hangoverLevel === 'number') {
        setHangoverLevel(Math.min(100, Math.max(0, stateToApply.hangoverLevel)));
      }
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
          const mult = 1 + (stateToApply.afterPrestigeCount || 0) * 0.5;
          const hangoverDebuff = (stateToApply.hangoverLevel || 0) >= 80 ? 0.35 : 1.0;
          const savedBaseRate = TIERS.reduce((acc, tier) => {
            const lvl = stateToApply.levels?.[tier.id] || 0;
            return acc + lvl * tier.baseRate * getTierMilestoneMultiplier(lvl);
          }, 0) * zoneObj.multiplier;

          const offlineEarned = Math.floor(elapsedSec * savedBaseRate * mult * hangoverDebuff);
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

  // 5.1 Sistema de Alerta Policial / Quejas Vecinales (Chequeo cada 12 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (policeAlert || productionFrozenUntilMs > now || pendingVault < 80) return;
      if (activeZone.policeRisk <= 0) return;

      // Probabilidad ajustada por zona, volumen del bote y sospecha policial del After
      const vaultFactor = Math.min(2.0, pendingVault / 400);
      const afterSuspicionFactor = 1 + afterSuspicionLevel * 0.2;
      const raidChance = activeZone.policeRisk * 0.28 * vaultFactor * afterSuspicionFactor;

      if (Math.random() < raidChance) {
        sound.whoosh();
        setPoliceAlert({ secondsLeft: 12 });
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [policeAlert, productionFrozenUntilMs, pendingVault, activeZone.policeRisk]);

  // 5.2 Cuenta atrás de Alerta Policial (12s para actuar o sanción AFK)
  useEffect(() => {
    if (!policeAlert || policeAlert.secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setPoliceAlert((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          // TIEMPO AGOTADO: Sanción automática por descuido
          sound.broke();
          const confiscated = Math.floor(pendingVault * 0.5);
          setPendingVault((v) => Math.max(0, v - confiscated));
          return {
            secondsLeft: 0,
            penaltyResult: `¡Tiempo agotado! La patrulla llegó sin avisar y requisó ${confiscated.toLocaleString()} fichas del bote.`,
          };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [policeAlert?.secondsLeft, pendingVault]);

  // Cierre automático del resultado de alerta policial tras 4.5 segundos
  useEffect(() => {
    if (policeAlert?.penaltyResult) {
      const t = setTimeout(() => {
        setPoliceAlert(null);
      }, 4500);
      return () => clearTimeout(t);
    }
  }, [policeAlert?.penaltyResult]);

  // 5.3 Descenso natural de resaca y cooldown de agua mineral
  useEffect(() => {
    const hangoverTimer = setInterval(() => {
      setHangoverLevel((prev) => Math.max(0, prev - 1));
    }, 4000);

    return () => clearInterval(hangoverTimer);
  }, []);

  useEffect(() => {
    if (waterCooldown <= 0) return;
    const cooldownTimer = setInterval(() => {
      setWaterCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(cooldownTimer);
  }, [waterCooldown]);

  // 5.4 Descenso natural de la sospecha policial acumulada por irse de After (se enfría 1 nivel cada 90s)
  useEffect(() => {
    if (afterSuspicionLevel <= 0) return;
    const suspicionTimer = setInterval(() => {
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
    }, 1000);

    return () => clearInterval(suspicionTimer);
  }, [afterSuspicionLevel, saveState]);

  // Cooldown del minijuego del Vaso Misterioso
  useEffect(() => {
    if (glassCooldown <= 0) return;
    const timer = setInterval(() => {
      setGlassCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [glassCooldown]);

  // Temporizador para sucesos espontáneos entre colegas
  useEffect(() => {
    const eventInterval = setInterval(() => {
      if (spontaneousEvent || policeAlert || pendingVault < 35) return;

      setEventCooldown((prev) => {
        if (prev <= 1) {
          triggerRandomSpontaneousEvent();
          return 50 + Math.floor(Math.random() * 30);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(eventInterval);
  }, [spontaneousEvent, policeAlert, pendingVault]);

  // Cuenta atrás del suceso espontáneo activo (12s para responder)
  useEffect(() => {
    if (!spontaneousEvent || spontaneousEvent.secondsLeft <= 0 || spontaneousEvent.resultText) return;

    const timer = setInterval(() => {
      setSpontaneousEvent((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          return null; // Expira el evento sin consecuencias
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [spontaneousEvent?.secondsLeft, spontaneousEvent?.resultText]);

  // Cierre automático del resultado de suceso espontáneo
  useEffect(() => {
    if (spontaneousEvent?.resultText) {
      const t = setTimeout(() => {
        setSpontaneousEvent(null);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [spontaneousEvent?.resultText]);

  // Lanzar un suceso espontáneo de fiesta aleatorio
  const triggerRandomSpontaneousEvent = () => {
    const eventTypes: Array<'altavoz' | 'chupito' | 'gasolinera'> = ['altavoz', 'chupito', 'gasolinera'];
    const choice = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    sound.whoosh();
    if (choice === 'altavoz') {
      setSpontaneousEvent({
        id: 'altavoz',
        title: '¡David saca el altavoz JBL!',
        desc: 'Aparece en el banco del parque con la batería a tope y va a poner reguetón antiguo de 2012 para motivar a la peña.',
        secondsLeft: 12,
        optionA: {
          label: '¡Que retumbe el parque!',
          sublabel: '+70 fichas y combo directo',
        },
        optionB: {
          label: 'Baja un poco los graves',
          sublabel: '+25 fichas seguras',
        },
      });
    } else if (choice === 'chupito') {
      setSpontaneousEvent({
        id: 'chupito',
        title: '¡Ronda de chupito sorpresa!',
        desc: 'Un colega saca un vaso de plástico con una mezcla misteriosa. "O te lo bebes de un trago o eres un rajado".',
        secondsLeft: 12,
        optionA: {
          label: 'De un trago (A lo loco)',
          sublabel: '60% ganar +140 fichas / 40% resaca',
        },
        optionB: {
          label: 'Paso, dame agua fresca',
          sublabel: '-20% de resaca gratis',
        },
      });
    } else {
      setSpontaneousEvent({
        id: 'gasolinera',
        title: '¡Falta hielo en la nevera!',
        desc: 'Los chavales van a la tienda 24h a pillar hielos y vasos de plástico antes de que cierren.',
        secondsLeft: 12,
        optionA: {
          label: 'Poner para el escote',
          sublabel: '30% descuento en suministros (45s)',
        },
        optionB: {
          label: 'Yo ya tengo mi vaso lleno',
          sublabel: 'Seguir farmeando tranquilo',
        },
      });
    }
  };

  const handleResolveEventOption = (option: 'A' | 'B') => {
    if (!spontaneousEvent) return;

    if (spontaneousEvent.id === 'altavoz') {
      if (option === 'A') {
        sound.toastClink();
        confetti({ particleCount: 50, spread: 60 });
        setPendingVault((v) => v + 70);
        setTotalLifetimeProduced((t) => t + 70);
        setPartyComboCount((c) => Math.min(10, c + 5));
        setSpontaneousEvent((prev) => prev ? { ...prev, resultText: '¡El parque se viene arriba! Toda la peña bailando (+70 fichas al bote).' } : null);
      } else {
        sound.tap();
        setPendingVault((v) => v + 25);
        setTotalLifetimeProduced((t) => t + 25);
        setSpontaneousEvent((prev) => prev ? { ...prev, resultText: 'Música tranquila de fondo. Ningún vecino se ha quejado (+25 fichas).' } : null);
      }
    } else if (spontaneousEvent.id === 'chupito') {
      if (option === 'A') {
        if (Math.random() < 0.6) {
          sound.coinWin();
          confetti({ particleCount: 80, spread: 70 });
          setPendingVault((v) => v + 140);
          setTotalLifetimeProduced((t) => t + 140);
          setSpontaneousEvent((prev) => prev ? { ...prev, resultText: '¡Menudo trago te has pegado! Licor del bueno (+140 fichas al bote).' } : null);
        } else {
          sound.broke();
          setHangoverLevel((h) => Math.min(100, h + 30));
          setSpontaneousEvent((prev) => prev ? { ...prev, resultText: '¡Ufff, era garrafón puro! Te ha subido 30% la resaca.' } : null);
        }
      } else {
        sound.toastClink();
        setHangoverLevel((h) => Math.max(0, h - 20));
        setSpontaneousEvent((prev) => prev ? { ...prev, resultText: 'Trago largo de agua fresca. -20% de resaca.' } : null);
      }
    } else if (spontaneousEvent.id === 'gasolinera') {
      if (option === 'A') {
        sound.coinWin();
        setDiscountActiveUntil(Date.now() + 45000);
        setSpontaneousEvent((prev) => prev ? { ...prev, resultText: '¡Hielo y vasos conseguidos! 30% de descuento activo durante 45 segundos.' } : null);
      } else {
        sound.tap();
        setSpontaneousEvent((prev) => prev ? { ...prev, resultText: 'Te quedas en el banco vigilando las mochilas de la peña.' } : null);
      }
    }
  };

  // Minijuego 2: Elección de vaso misterioso (Ruleta de chupitos)
  const handlePickMysteryGlass = (glassIdx: number) => {
    if (glassCooldown > 0 || isSelectingGlass) return;

    setIsSelectingGlass(true);
    sound.tap();

    setTimeout(() => {
      setIsSelectingGlass(false);
      setGlassCooldown(35);

      const rand = Math.random();
      if (rand < 0.50) {
        sound.coinWin();
        confetti({ particleCount: 90, spread: 60 });
        const prize = Math.min(250, Math.max(30, Math.floor(effectiveRatePerSecond * 4 + 35)));
        setPendingVault((prev) => prev + prize);
        setTotalLifetimeProduced((prev) => prev + prize);
        setGlassResult({
          type: 'gold',
          text: `¡CHUPITO DORADO! Has encontrado el vaso premium de la fiesta (+${prize.toLocaleString()} fichas al bote).`,
        });
      } else if (rand < 0.80) {
        sound.toastClink();
        setHangoverLevel((prev) => Math.max(0, prev - 40));
        setGlassResult({
          type: 'water',
          text: '¡AGUA FRESCA CON HIELO! Te has hidratado a tiempo (-40% de resaca al instante).',
        });
      } else {
        sound.crashExplode();
        setHangoverLevel((prev) => Math.min(100, prev + 25));
        setIsCrazyParty(true);
        setCrazyPartyTimeRemaining(12);
        setGlassResult({
          type: 'spicy',
          text: '¡MEZCLA PICANTE! Ufff garrafón, pero... ¡te pega un SUBIDÓN x3 de fiesta durante 12s (+25% resaca)!',
        });
      }
    }, 450);
  };

  // Acciones tácticas ante la alerta policial:
  const handlePoliceHide = () => {
    if (!policeAlert || policeAlert.secondsLeft <= 0) return;
    sound.tap();
    setProductionFrozenUntilMs(Date.now() + 40000);
    setPoliceAlert({
      secondsLeft: 0,
      penaltyResult: '¡Habéis escondido los vasos a tiempo! La patrulla pasó de largo. Producción pausada durante 40 segundos.',
    });
  };

  const handlePoliceRun = () => {
    if (!policeAlert || policeAlert.secondsLeft <= 0) return;
    sound.tap();
    const lost = Math.floor(pendingVault * 0.4);
    setPendingVault((v) => Math.max(0, v - lost));
    setPoliceAlert({
      secondsLeft: 0,
      penaltyResult: `¡Salisteis corriendo! Salvaste el 60% del bote, pero se cayeron ${lost.toLocaleString()} fichas en la huida.`,
    });
  };

  const handlePoliceBluff = () => {
    if (!policeAlert || policeAlert.secondsLeft <= 0) return;
    sound.tap();
    const isSuccess = Math.random() < 0.5;

    if (isSuccess) {
      sound.coinWin();
      setPoliceAlert({
        secondsLeft: 0,
        penaltyResult: '¡Increíble! Les dijisteis que estabais esperando el autobús y os dejaron marchar sin sanción.',
      });
    } else {
      sound.broke();
      const lost = Math.floor(pendingVault * 0.75);
      setPendingVault((v) => Math.max(0, v - lost));

      // Reducir 1 nivel del suministro más alto
      const tierKeys = Object.keys(levels).reverse();
      const highestKey = tierKeys.find((k) => (levels[k] || 0) > 0);
      if (highestKey) {
        setLevels((prev) => ({
          ...prev,
          [highestKey]: Math.max(0, (prev[highestKey] || 0) - 1),
        }));
      }

      setPoliceAlert({
        secondsLeft: 0,
        penaltyResult: `¡No coló! Multa municipal grave: requisan ${lost.toLocaleString()} fichas del bote y 1 nivel de suministros.`,
      });
    }
  };

  // Acción: Beber vaso de agua mineral para aliviar resaca
  const handleDrinkWater = () => {
    if (waterCooldown > 0 || hangoverLevel <= 0) return;
    sound.tap();
    setHangoverLevel((prev) => Math.max(0, prev - 45));
    setWaterCooldown(45);
  };

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

    // Sonido táctil de trago con apertura de chapa
    if (Math.random() < 0.35) {
      sound.bottlePop();
    } else {
      sound.tap();
    }

    const baseClick = Math.max(1, Math.floor(1 + baseRatePerSecond * 0.02));
    let clickPower = baseClick * prestigeMultiplier * drinkPowerMult;

    // Beca de ayuda a novatos: cada trago manual da +15 fichas directas extra
    if (isUnderdog) {
      clickPower += 15;
    }

    // Enchufe en barra perk: 12% probabilidad de Jackpot sorpresa
    let hasJackpotBonus = false;
    if (hasPerk('enchufe_barra') && Math.random() < 0.12) {
      clickPower = Math.min(60, clickPower * 3);
      hasJackpotBonus = true;
      sound.coinWin();
    }

    setPendingVault((prev) => prev + clickPower);
    setTotalLifetimeProduced((prev) => prev + clickPower);
    setCurrentRunProduced((prev) => prev + clickPower);
    setTotalDrinksTaken((prev) => prev + 1);
    setHangoverLevel((prev) => Math.min(100, prev + 2.5));

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
      setPongCooldown(25);

      if (isBullseye) {
        sound.coinWin();
        confetti({ particleCount: 100, spread: 70 });
        const prize = Math.min(200, Math.max(15, Math.floor(effectiveRatePerSecond * 3.5)));
        setPendingVault((prev) => prev + prize);
        setTotalLifetimeProduced((prev) => prev + prize);
        setBeerPongWins((prev) => prev + 1);
        setPongResult({
          success: true,
          reward: prize,
          text: `¡CANASTA LIMPIA! Tiro perfecto en el vaso central (+${prize.toLocaleString()} fichas al bote).`,
        });
      } else if (isNearHit) {
        sound.coinWin();
        const prize = Math.min(80, Math.max(8, Math.floor(effectiveRatePerSecond * 1.5)));
        setPendingVault((prev) => prev + prize);
        setTotalLifetimeProduced((prev) => prev + prize);
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
          text: '¡Agua! La bola rebotó en la mesa y se fue fuera. ¡Prueba en 25s!',
        });
      }
    }, 600);
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
    const startingSeedFichas = Math.max(800, nextPrestigeCount * 1500);

    setLevels(resetLevels);
    setPendingVault(startingSeedFichas);
    setHangoverLevel(0);
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

    // 1. Sincronizar inmediatamente estado en memoria y local para evitar que auto-saves capturen datos viejos
    stateRef.current = updatedState;
    saveState(updatedState, true);

    // 2. Guardar de forma autoritativa en el endpoint del servidor con Supabase Admin
    if (userId && isUUID(userId)) {
      try {
        const res = await fetch('/api/game/rebirth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            pendingVault,
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && typeof resData.afterPrestigeCount === 'number') {
            setAfterPrestigeCount(resData.afterPrestigeCount);
            stateRef.current.afterPrestigeCount = resData.afterPrestigeCount;
            if (resData.party_farm_data) {
              try {
                localStorage.setItem(storageKey, JSON.stringify({ ...stateRef.current, ...resData.party_farm_data }));
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('Error llamando a /api/game/rebirth:', err);
      }
    }

    setShowAfterModal(false);
  };

  const roundedVault = Math.floor(pendingVault);
  const coinsToClaim = Math.floor(roundedVault / 5);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Alerta de Redada Policial / Vecinos (Estilo Apple System Alert) */}
      {policeAlert && (
        <div className="p-4 sm:p-5 rounded-3xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 shadow-xs animate-in fade-in zoom-in-95 duration-200 space-y-3">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                <Siren className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 tracking-tight">
                    Control Policial / Quejas de Vecinos
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25 font-semibold">
                    {policeAlert.secondsLeft > 0 ? `${policeAlert.secondsLeft}s para actuar` : 'Resolviendo'}
                  </span>
                </div>
                <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-0.5">
                  {policeAlert.penaltyResult || 'La patrulla se acerca por la esquina. Si no reaccionas a tiempo te requisarán el 50% del bote acumulado.'}
                </p>
              </div>
            </div>
          </div>

          {!policeAlert.penaltyResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePoliceHide}
                className="rounded-xl text-xs h-10 px-3 flex items-center justify-center font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-red-200 dark:border-red-900/50 text-zinc-900 dark:text-zinc-100 cursor-pointer transition-all active:scale-[0.98] shadow-2xs"
              >
                <span>Esconder vasos (Pausa 40s)</span>
              </button>

              <button
                type="button"
                onClick={handlePoliceRun}
                className="rounded-xl text-xs h-10 px-3 flex items-center justify-center font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-red-200 dark:border-red-900/50 text-amber-700 dark:text-amber-400 cursor-pointer transition-all active:scale-[0.98] shadow-2xs"
              >
                <span>Correr y dispersarse (-40%)</span>
              </button>

              <button
                type="button"
                onClick={handlePoliceBluff}
                className="rounded-xl text-xs h-10 px-3 flex items-center justify-center font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 cursor-pointer transition-all active:scale-[0.98] shadow-2xs"
              >
                <span>Hacerse el loco (50/50)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Aviso de Producción Congelada por Redada */}
      {isProductionFrozen && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Fiesta en silencio: La policía está patrullando cerca. La música y farmeo están pausados.</span>
          </div>
          <span className="font-mono text-[11px] shrink-0 font-semibold px-2 py-0.5 rounded-full bg-amber-500/15">
            {Math.ceil((productionFrozenUntilMs - Date.now()) / 1000)}s
          </span>
        </div>
      )}

      {/* Suceso Espontáneo entre Colegas (Evento en Vivo) */}
      {spontaneousEvent && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm animate-in fade-in zoom-in-95 duration-200 space-y-3">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                    {spontaneousEvent.title}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold">
                    {spontaneousEvent.secondsLeft > 0 ? `${spontaneousEvent.secondsLeft}s` : '¡Ya!'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-sans">
                  {spontaneousEvent.resultText || spontaneousEvent.desc}
                </p>
              </div>
            </div>
          </div>

          {!spontaneousEvent.resultText && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleResolveEventOption('A')}
                className="p-3 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-[0.98] shadow-xs"
              >
                <span>{spontaneousEvent.optionA.label}</span>
                <span className="text-[10px] font-mono opacity-80 mt-0.5">{spontaneousEvent.optionA.sublabel}</span>
              </button>

              <button
                type="button"
                onClick={() => handleResolveEventOption('B')}
                className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-semibold text-xs flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-[0.98]"
              >
                <span>{spontaneousEvent.optionB.label}</span>
                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">{spontaneousEvent.optionB.sublabel}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Descuento relámpago de la gasolinera */}
      {isFlashDiscount && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Descuento de escote activo: 30% menos en todas las compras de bebidas.</span>
          </div>
          <span className="font-mono text-[11px] shrink-0 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15">
            {Math.ceil((discountActiveUntil - Date.now()) / 1000)}s
          </span>
        </div>
      )}

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

      {/* Banner de Zona Actual, Rango y Estado de Nube Supabase */}
      <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-center shrink-0 shadow-2xs">
            {renderZoneIcon(activeZone.icon)}
          </div>
          <div>
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
                  onClick={canPrestige ? handleOpenAfterModal : undefined}
                  className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-colors cursor-pointer"
                  title="Nivel de Renacimiento y Multiplicador Permanente"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Renacimiento {afterPrestigeCount} (x{prestigeMultiplier.toFixed(1)})</span>
                </button>
              )}
              {activeZone.policeRisk > 0 ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">
                  Riesgo redada: {Math.round(activeZone.policeRisk * 100)}%
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  Zona Segura
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{activeZone.desc}</p>
          </div>
        </div>

        {/* Controles de Ayuda, Reputación y Estado Supabase */}
        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200 dark:border-neutral-800 flex-wrap justify-between sm:justify-end">
          {/* Indicador Apple de Nube Supabase */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border ${
              cloudSyncStatus === 'saved'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                : cloudSyncStatus === 'saving'
                ? 'bg-blue-500/10 text-[#0071e3] dark:text-blue-300 border-blue-500/20 animate-pulse'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700/60'
            }`}
            title="Estado de guardado en base de datos Supabase"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                cloudSyncStatus === 'saved'
                  ? 'bg-emerald-500'
                  : cloudSyncStatus === 'saving'
                  ? 'bg-[#0071e3] animate-ping'
                  : 'bg-neutral-400'
              }`}
            />
            <span>
              {cloudSyncStatus === 'saved'
                ? 'Supabase en la nube'
                : cloudSyncStatus === 'saving'
                ? 'Guardando...'
                : 'Modo local'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              setTutorialStep(0);
              setShowTutorial(true);
            }}
            title="Ver guía completa de cómo jugar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700/60"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>Guía</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Rango
              </div>
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{currentRank.name}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Goteo Comunista & Custodia de Alijo (Grandes Fortunas) o Subsidio Proletario (Novatos) */}
      {userCoins >= 100000 ? (
        guardActiveUntilMs > Date.now() ? (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-950 dark:text-emerald-100">Alijo Custodiado · Seguridad Activa</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-semibold">
                    {Math.ceil((guardActiveUntilMs - Date.now()) / 3600000)}h restantes
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                  Tu fortuna está protegida temporalmente contra el Goteo Comunista. Renovar seguridad cuesta una tasa proporcional a tu alijo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGuardStash}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 hover:bg-emerald-100/50 dark:hover:bg-neutral-700 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-semibold text-xs cursor-pointer transition-colors shrink-0 shadow-2xs active:scale-[0.98]"
            >
              Renovar (+6h) {getGuardCost(userCoins) > 0 ? `· -${getGuardCost(userCoins).toLocaleString()}` : '· Gratis'}
            </button>
          </div>
        ) : (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-950 dark:text-amber-100">Goteo Comunista Inminente · Alijo Desprotegido</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold border border-red-500/25">
                    Tasa Proletaria Activa
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Las fortunas ociosas sin seguridad privada gotean automáticamente al Fondo Común para financiar a los alumnos novatos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGuardStash}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs cursor-pointer transition-colors shrink-0 shadow-xs active:scale-[0.98]"
            >
              🛡️ Contratar Seguridad (+6h) {getGuardCost(userCoins) > 0 ? `· -${getGuardCost(userCoins).toLocaleString()} monedas` : '· Gratis'}
            </button>
          </div>
        )
      ) : isUnderdog && Date.now() - (lastSubsidioClaimMs || 0) >= 2 * 3600 * 1000 ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-[#0071e3] dark:text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-950 dark:text-blue-100">Fondo Social Proletario de Clase</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                  +{Math.min(15000, Math.max(3500, Math.floor((50000 - userCoins) * 0.25))).toLocaleString()} Monedas
                </span>
              </div>
              <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 truncate">
                Subvención social para impulsar a los alumnos novatos financiada por las tasas y el Goteo Comunista.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClaimSubsidio}
            className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs cursor-pointer transition-colors shrink-0 active:scale-[0.98] shadow-xs"
          >
            Reclamar Subsidio
          </button>
        </div>
      ) : null}

      {/* DASHBOARD OPTIMIZADO PARA MÓVILES (Estilo Apple Compact Dashboard) */}
      <div className="block sm:hidden">
        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3.5">
          {/* Fila Superior: Bote y Ritmo */}
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            {/* Bote acumulado */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-500" />
                <span>En la saca</span>
              </span>
              <div className="text-xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100">
                {roundedVault.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                ≈ {coinsToClaim.toLocaleString()} 🪙 (5:1)
              </div>
              <div className="space-y-1.5 mt-1.5">
                <button
                  type="button"
                  disabled={coinsToClaim <= 0 || isClaimingVault}
                  onClick={handleClaimVault}
                  className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.97] min-h-[34px] ${
                    coinsToClaim > 0 && !isClaimingVault
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
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
                      <span>¡Canjeado!</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Canjear (+{coinsToClaim})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={userCoins < 50}
                  onClick={() => handleFundVaultWithCoins(50)}
                  className={`w-full py-1 px-1.5 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                    userCoins >= 50
                      ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                      : 'bg-neutral-100/50 dark:bg-neutral-800/40 text-neutral-400 border-neutral-200/50 cursor-not-allowed opacity-50'
                  }`}
                  title="Poner 50 monedas para +250 fichas"
                >
                  <span>+250 fichas (-50 🪙)</span>
                </button>
              </div>
            </div>

            {/* Ritmo y Resaca */}
            <div className="space-y-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span>Ritmo</span>
                </span>
                <div className="text-xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                  {isProductionFrozen ? '0.0' : `+${effectiveRatePerSecond.toFixed(1)}`}
                  <span className="text-[10px] font-normal text-neutral-500 dark:text-neutral-400 ml-1">/s</span>
                </div>
                {/* Mini barra de resaca */}
                <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-mono mt-1">
                  <span>Resaca:</span>
                  <span className={isHungover ? 'text-red-500 font-bold' : ''}>{Math.round(hangoverLevel)}%</span>
                </div>
                <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHungover ? 'bg-red-500' : hangoverLevel > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, hangoverLevel)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={waterCooldown > 0 || hangoverLevel <= 0}
                onClick={handleDrinkWater}
                className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer min-h-[36px] ${
                  waterCooldown > 0 || hangoverLevel <= 0
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                    : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 active:scale-[0.97]'
                }`}
              >
                <Droplets className="w-3 h-3" />
                <span>{waterCooldown > 0 ? `${waterCooldown}s` : 'Vaso de agua (-45%)'}</span>
              </button>
            </div>
          </div>

          {/* Botón Táctil de Trago Manual Móvil */}
          <div className="relative">
            <button
              type="button"
              onClick={handleManualDrink}
              className={`w-full py-3.5 px-4 rounded-2xl border transition-all active:scale-[0.97] cursor-pointer flex items-center justify-between touch-manipulation min-h-[48px] ${
                isCrazyParty
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-100'
                  : 'bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border-neutral-200 dark:border-neutral-700/60 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wine className={`w-5 h-5 ${isCrazyParty ? 'text-amber-500 animate-bounce' : 'text-[#0071e3]'}`} />
                <div className="text-left">
                  <div className="text-xs font-semibold leading-tight">
                    {isCrazyParty ? '¡Trago Subidón x3!' : '¡Echar un trago manual!'}
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                    +{Math.max(1, Math.floor(1 + baseRatePerSecond * 0.05)) * prestigeMultiplier * drinkPowerMult * (isCrazyParty ? 3 : 1)} al bote
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium">
                  {isCrazyParty ? `${crazyPartyTimeRemaining}s` : `${partyComboCount}/10`}
                </span>
                <span className="text-xs font-semibold text-[#0071e3]">Trago</span>
              </div>
            </button>

            {/* Partículas visuales de tragos móvil */}
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
        </div>
      </div>

      {/* DASHBOARD PARA TABLETS Y ESCRITORIO (Estilo Apple Grouped Cards 3 Columnas) */}
      <div className="hidden sm:grid sm:grid-cols-3 sm:gap-3">
        {/* Panel 1: En la saca (acumulado listo para cobrar) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
              En la saca del botellón
            </span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>

          <div>
            <div className="text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 font-mono">
              {roundedVault.toLocaleString()}{' '}
              <span className="text-xs font-sans text-neutral-500 dark:text-neutral-400 font-normal">fichas</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              <span>≈ {coinsToClaim.toLocaleString()} monedas reales</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                5:1
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={coinsToClaim <= 0 || isClaimingVault}
              onClick={handleClaimVault}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] min-h-[42px] ${
                coinsToClaim > 0 && !isClaimingVault
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700/60 cursor-not-allowed opacity-60'
              }`}
            >
              {isClaimingVault ? (
                <>
                  <Clock className="w-4 h-4 animate-spin text-[#0071e3]" />
                  <span>Canjeando fichas...</span>
                </>
              ) : justClaimed ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>¡Canjeado al monedero!</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Canjear al Monedero (+{coinsToClaim.toLocaleString()} monedas)</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={userCoins < 50}
              onClick={() => handleFundVaultWithCoins(50)}
              className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] border ${
                userCoins >= 50
                  ? 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700/60'
                  : 'bg-neutral-100/50 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-500 border-neutral-200/50 dark:border-neutral-800/50 cursor-not-allowed opacity-50'
              }`}
              title="Aportar 50 monedas voluntarias de tu cartera para recibir +250 fichas directas al bote de botellón"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>Aportar pasta al bote (-50 🪙 → +250 fichas)</span>
            </button>
          </div>
        </div>

        {/* Panel 2: Ritmo de fiesta (Fichas por segundo y Resaca) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
              Ritmo de farmeo
            </span>
            <TrendingUp className={`w-4 h-4 ${isProductionFrozen ? 'text-red-500' : isHungover ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>

          <div>
            <div className="text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 font-mono">
              {isProductionFrozen ? '0.0' : `+${effectiveRatePerSecond.toFixed(1)}`}{' '}
              <span className="text-xs font-sans text-neutral-500 dark:text-neutral-400 font-normal">fichas / seg</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isProductionFrozen ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">Pausa por presencia policial</span>
              ) : isHungover ? (
                <span className="text-red-600 dark:text-red-400 font-medium">Resaca mortal activa (-65% velocidad)</span>
              ) : afterPrestigeCount > 0 ? (
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  Multiplicador After: x{prestigeMultiplier.toFixed(1)}
                </span>
              ) : (
                `Zona: x${activeZone.multiplier.toFixed(1)} · Rango: +${currentRank.bonusPercent}%`
              )}
            </p>
          </div>

          {/* Medidor de Resaca / Fatiga y Botón de Agua */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-neutral-400" />
                <span>Nivel de Resaca:</span>
              </span>
              <span className={`font-mono font-semibold ${isHungover ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                {Math.round(hangoverLevel)}% {isHungover && '(Mortal)'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isHungover ? 'bg-red-500' : hangoverLevel > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, hangoverLevel)}%` }}
              />
            </div>

            <button
              type="button"
              disabled={waterCooldown > 0 || hangoverLevel <= 0}
              onClick={handleDrinkWater}
              className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                waterCooldown > 0 || hangoverLevel <= 0
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700/60 cursor-not-allowed opacity-60'
                  : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 active:scale-[0.98]'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>{waterCooldown > 0 ? `Agua en ${waterCooldown}s` : 'Beber Vaso de Agua (-45% resaca)'}</span>
            </button>
          </div>
        </div>

        {/* Panel 3: Clic Manual ("Echar un trago") */}
        <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
              Trago manual
            </span>
            {isCrazyParty ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                ¡SUBIDÓN x3 ({crazyPartyTimeRemaining}s)!
              </span>
            ) : (
              <Zap className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          <div className="relative w-full">
            <button
              type="button"
              onClick={handleManualDrink}
              className={`w-full py-4 rounded-2xl border transition-all active:scale-[0.97] cursor-pointer flex flex-col items-center justify-center gap-1 group shadow-2xs touch-manipulation min-h-[72px] ${
                isCrazyParty
                  ? 'bg-amber-500/10 border-amber-500/30 shadow-amber-500/10'
                  : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700/60 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-white dark:hover:bg-neutral-800'
              }`}
            >
              <Wine className={`w-6 h-6 transition-all group-hover:scale-110 ${
                isCrazyParty ? 'text-amber-500 animate-bounce' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-[#0071e3]'
              }`} />
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {isCrazyParty ? '¡Trago con Subidón x3!' : '¡Echar un trago!'}
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                +{Math.max(1, Math.floor(1 + baseRatePerSecond * 0.05)) * prestigeMultiplier * drinkPowerMult * (isCrazyParty ? 3 : 1)} al bote
              </span>
            </button>

            {/* Partículas visuales flotantes de tragos */}
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
            <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
              <span>Ritmo para el Subidón</span>
              <span className="font-mono">{isCrazyParty ? '¡Ambiente a tope!' : `${partyComboCount}/10 tragos`}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
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

      {/* Feed de Noticias de la Fiesta en Vivo y Ecualizador de Ritmo */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs shadow-xs overflow-hidden transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 truncate">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#0071e3] mr-2">
              En directo:
            </span>
            <span className="text-neutral-700 dark:text-neutral-300 font-medium transition-all duration-300">
              {PARTY_NEWS[currentNewsIndex]}
            </span>
          </div>
        </div>

        {/* Ecualizador animado */}
        <div className="flex items-end gap-0.5 h-3.5 shrink-0 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60">
          {[0, 1, 2, 3, 4].map((i) => {
            const h =
              effectiveRatePerSecond > 0
                ? (Math.sin(cycleTick / 250 + i * 1.2) * 0.5 + 0.5) * 10 + 3
                : 3;
            return (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  effectiveRatePerSecond > 0 ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
                style={{ height: `${h}px` }}
              />
            );
          })}
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
          { id: 'zonas', label: 'Fases & Zonas', icon: MapPin },
          { id: 'habilidades', label: 'Perks de la Noche', icon: Award },
          { id: 'beerpong', label: 'Juegos de Fiesta', icon: Target },
          { id: 'inversiones', label: 'Fondo Botellón', icon: TrendingUp },
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
            </button>
          );
        })}
      </div>

      {/* PESTAÑA 1: BEBIDAS & SUMINISTROS */}
      {activeTab === 'suministros' && (
        <div className="space-y-3 animate-in fade-in duration-150">
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
                onClick={handleOpenAfterModal}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 cursor-pointer ${
                  canPrestige
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white hover:opacity-90 shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60'
                }`}
                title="Abrir detalles de Renacimiento y multiplicador permanente"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${canPrestige ? 'text-purple-400' : 'text-neutral-400'}`} />
                <span>
                  {canPrestige
                    ? '¡Renacer listo! (+bonus)'
                    : isAfterOnCooldown
                    ? `Renacimiento (${Math.ceil(afterCooldownRemainingMs / 1000)}s)`
                    : `Renacimiento (${Math.floor(currentRunProduced).toLocaleString()} / ${requiredRunProd.toLocaleString()})`}
                </span>
                {afterPrestigeCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    x{prestigeMultiplier.toFixed(2)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Banner de Sospecha Policial del After con cuenta atrás y botón de reversión */}
          {afterSuspicionLevel > 0 && (() => {
            const stats = getAfterRiskStats(afterSuspicionLevel, userCoins);
            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                    <Siren className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-red-900 dark:text-red-100">
                        Sospecha Policial del After: Nivel {afterSuspicionLevel}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-700 dark:text-red-300 font-semibold">
                        {stats.raidChancePct}% Redada · {stats.confiscatePct}% Confiscación
                      </span>
                      {stats.wealthSurcharge > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/25">
                          Recargo a Gran Fortuna
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-red-800/80 dark:text-red-300/80 leading-relaxed mt-0.5">
                      La policía patrulla el After. Se enfría 1 nivel en <strong className="font-mono">{afterCooldownSeconds}s</strong> o puedes revertir la sospecha pagando una fianza.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRevertSuspicion}
                  className="self-end sm:self-center px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-neutral-700 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-900 dark:text-red-100 flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] shrink-0 shadow-2xs"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>Revertir a 0% (-{stats.bribeCost.toLocaleString()} monedas)</span>
                </button>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {TIERS.map((tier) => {
              const currentLevel = levels[tier.id] || 0;
              const quote = getBuyQuote(tier, currentLevel, buyMultiplier, pendingVault);
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

                  {/* Barra de progreso de ciclo de producción */}
                  {currentLevel > 0 && (
                    <div className="w-full space-y-1 pt-0.5">
                      <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-100 rounded-full"
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

      {/* PESTAÑA 3: PERKS & HABILIDADES DE LA NOCHE */}
      {activeTab === 'habilidades' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Habilidades y Ventajas de Fiesta</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
      )}

      {/* PESTAÑA 4: MINIJUEGO BEER PONG SMR */}
      {activeTab === 'beerpong' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Minijuegos de la Fiesta</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Desafía tu puntería o prueba suerte en la mesa para ganar botines instantáneos de fichas.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm text-center space-y-5">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-900 dark:text-white">
                <Target className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Beer Pong de Clase</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                Apunta cuando el cursor pase por la zona verde central para encestar en el vaso.
              </p>
            </div>

            {/* Barra de puntería interactiva */}
            <div className="max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
                <span>Fallo</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">ZONA DE ENCESTE (45% - 55%)</span>
                <span>Fallo</span>
              </div>

              <div className="relative w-full h-8 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-inner flex items-center">
                {/* Zona dulce verde (Sweet spot) */}
                <div className="absolute left-[40%] w-[20%] h-full bg-emerald-500/20 dark:bg-emerald-400/25 border-x border-emerald-500/30" />
                <div className="absolute left-[45%] w-[10%] h-full bg-emerald-500/40" />

                {/* Cursor móvil */}
                <div
                  className="absolute top-1 bottom-1 w-3 rounded-full bg-neutral-950 dark:bg-white shadow-md transition-none"
                  style={{ left: `calc(${pongAim}% - 6px)` }}
                />
              </div>
            </div>

            {/* Botón de disparo */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={pongShooting || pongCooldown > 0}
                onClick={handleShootBeerPong}
                className={`w-full max-w-sm mx-auto min-h-[48px] py-3 px-6 rounded-2xl text-xs font-semibold tracking-tight transition-all cursor-pointer active:scale-[0.98] shadow-xs touch-manipulation ${
                  pongCooldown > 0
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed opacity-60'
                    : 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90'
                }`}
              >
                {pongShooting
                  ? '¡Lanzando bola...!'
                  : pongCooldown > 0
                  ? `Recuperando bola (${pongCooldown}s)...`
                  : '¡Lanzar Bola de Beer Pong!'}
              </button>

              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Victorias en Beer Pong: <span className="font-mono font-bold text-neutral-900 dark:text-white">{beerPongWins}</span>
              </div>
            </div>

            {/* Resultado del tiro */}
            {pongResult && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-medium max-w-md mx-auto border animate-in fade-in duration-200 ${
                  pongResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/40'
                }`}
              >
                {pongResult.text}
              </div>
            )}
          </div>

          {/* Minijuego 2: El Vaso Misterioso (Ruleta de Chupitos) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">El Vaso Misterioso (Ruleta de Chupitos)</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Elige uno de los tres vasos: Chupito Dorado (+fichas), Agua Fresca (-resaca) o Mezcla Picante (Subidón x3).
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shrink-0 self-start sm:self-auto">
                {glassCooldown > 0 ? `Enfriando: ${glassCooldown}s` : '¡Listo para beber!'}
              </span>
            </div>

            {/* 3 Vasos boca abajo interactivos */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-1">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={glassCooldown > 0 || isSelectingGlass}
                  onClick={() => handlePickMysteryGlass(idx)}
                  className={`min-h-[84px] p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98] touch-manipulation cursor-pointer ${
                    glassCooldown > 0
                      ? 'bg-neutral-100/50 dark:bg-neutral-900/30 border-neutral-200 dark:border-neutral-800 opacity-50 cursor-not-allowed'
                      : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-xs'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400">
                    <CupSoda className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                    Vaso #{idx + 1}
                  </span>
                </button>
              ))}
            </div>

            {glassResult && (
              <div className={`p-3.5 rounded-2xl text-xs font-medium max-w-md mx-auto border text-center animate-in fade-in duration-200 ${
                glassResult.type === 'gold'
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/40'
                  : glassResult.type === 'water'
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/40'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/40'
              }`}>
                {glassResult.text}
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
                    Pulsa la litrona central para ganar fichas manuales. Compra y sube de nivel los suministros (hielos, chupitos, botellas...) para generar fichas automáticamente por segundo, incluso mientras estás en clase o desconectado.
                  </p>
                </div>
              )}

              {tutorialStep === 1 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-10 h-10 rounded-xl bg-surface-raised border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-2">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground text-center">
                    2. Medidor de Resaca y Vaso de Agua
                  </h4>
                  <p className="leading-relaxed text-center">
                    Cuidado con abusar: los tragos y la alta producción llenan tu barra de resaca. Si llega al 100% entras en <strong>Resaca Mortal</strong> y tu farmeo cae un <strong>-65%</strong>. Pulsa el botón <strong>&quot;Beber vaso de agua&quot;</strong> para bajarte la resaca y recuperar tu velocidad.
                  </p>
                </div>
              )}

              {tutorialStep === 2 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-10 h-10 rounded-xl bg-surface-raised border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-2">
                    <Siren className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground text-center">
                    3. Las 7 Fases y Batidas Policiales
                  </h4>
                  <p className="leading-relaxed text-center">
                    Avanzar de zona multiplica tu dinero, pero atrae a la policía. Si salta la sirena, tienes <strong>12 segundos</strong> para reaccionar: esconder vasos (pausa), correr (-40%) o negociar. ¡Si estás ausente (AFK), la policía te requisará el <strong>50% del bote</strong> acumulado!
                  </p>
                </div>
              )}

              {tutorialStep === 3 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-10 h-10 rounded-xl bg-surface-raised border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto mb-2">
                    <Coins className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground text-center">
                    4. Canje Oficial 5 a 1 a tu Cuenta Real
                  </h4>
                  <p className="leading-relaxed text-center">
                    Tus fichas se acumulan en <strong>&quot;En la saca&quot;</strong>. La tasa oficial es de <strong>5 fichas = 1 moneda real</strong>. Pulsa <strong>&quot;Meter a la saca&quot;</strong> cuando quieras para transferir el 100% íntegro a tu saldo de Supabase para apostar o subir en el ranking.
                  </p>
                </div>
              )}

              {tutorialStep === 4 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-10 h-10 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-emerald-400 mx-auto mb-2">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground text-center">
                    5. Estrategia y Supervivencia SMR
                  </h4>
                  <p className="leading-relaxed text-center">
                    No dejes millones en el bote sin cobrar o te desplumarán en una redada. Juega al <strong>Beer Pong</strong> para ganar botes extra y compra <strong>Perks</strong> en la tienda para potenciar tu aguante. ¡Que empiece la fiesta!
                  </p>
                </div>
              )}
            </div>

            {/* Step Indicators and Nav Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((s) => (
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

                {tutorialStep < 4 ? (
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
        const bonusPct =
          afterPrestigeCount === 0 ? 35 : afterPrestigeCount <= 2 ? 20 : afterPrestigeCount <= 5 ? 12 : afterPrestigeCount <= 9 ? 6 : 2;
        const nextMultiplier = Number((currentMultiplier + bonusPct / 100).toFixed(2));
        const coinsReward = Math.floor(pendingVault / 5);
        const progressPct = Math.min(100, Math.round((currentRunProduced / requiredRunProd) * 100));

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
                    Reinicia los suministros de esta ronda a cambio de un incremento permanente en la tasa de producción.
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
                    <span className="text-base font-bold text-neutral-900 dark:text-white">x{nextMultiplier.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 space-y-1 col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-700 dark:text-purple-300 block font-semibold">
                    Capital de Arranque Inmediato
                  </span>
                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                      +{Math.max(800, nextPrestigeCount * 1500).toLocaleString()} fichas
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
