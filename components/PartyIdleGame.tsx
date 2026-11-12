'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { isUUID } from '@/lib/uuid';
import type { CoinClaimType } from '@/lib/types';
import {
  BOTELLON_PERK_COSTS,
  BOTELLON_ZONE_REQUIREMENTS,
  calculatePrestigeMultiplier as getEconomyPrestigeMultiplier,
  getRequiredAfterProduction as getEconomyRequiredAfterProduction,
  getTierUpgradeCost,
  getVaultGuardCost as getEconomyVaultGuardCost,
} from '@/lib/botellonEconomy';
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
  HeartHandshake,
  Dice5,
  Sun,
  Moon,
  MoreHorizontal,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BotellonInvestments } from '@/components/BotellonInvestments';
import { PartyLiveScene, CharacterItem } from '@/components/PartyLiveScene';

export interface PartyIdleGameProps {
  userCoins: number;
  userId?: string;
  username?: string;
  mascotaEquipada?: string;
  onUpdateCoins: (delta: number, claimType?: CoinClaimType) => void;
  onSetCoins?: (coins: number) => void;
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
  accentColor: string;
  lightGlow: string;
  darkGlow: string;
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
    accentColor: '#10B981',
    lightGlow: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    darkGlow: 'dark:from-emerald-950/25 dark:via-emerald-950/10 dark:to-transparent',
  },
  {
    id: 'portal',
    name: 'Portal de Vecinos',
    subtitle: '23:30h · La previa se calienta',
    desc: 'Refugiados del frío bajo el portal. Los vecinos del primero vigilan por el balcón.',
    multiplier: 1.25,
    requiredProduction: BOTELLON_ZONE_REQUIREMENTS.portal,
    badge: 'Fase 2',
    icon: 'home',
    policeRisk: 0.06,
    accentColor: '#F59E0B',
    lightGlow: 'from-amber-500/10 via-amber-500/5 to-transparent',
    darkGlow: 'dark:from-amber-950/25 dark:via-amber-950/10 dark:to-transparent',
  },
  {
    id: 'piso',
    name: 'Piso de Colegas Ruidoso',
    subtitle: '01:00h · Música y vasos llenos',
    desc: 'Música en altavoces, cubatas en vasos de tubo y la gente dándolo todo.',
    multiplier: 1.6,
    requiredProduction: BOTELLON_ZONE_REQUIREMENTS.piso,
    badge: 'Fase 3',
    icon: 'speaker',
    policeRisk: 0.14,
    accentColor: '#0EA5E9',
    lightGlow: 'from-sky-500/10 via-sky-500/5 to-transparent',
    darkGlow: 'dark:from-sky-950/25 dark:via-sky-950/10 dark:to-transparent',
  },
  {
    id: 'callejon',
    name: 'Callejón de los Bares',
    subtitle: '02:30h · Rumbo a la zona',
    desc: 'Transeúntes, copas en la calle y patrullas de la municipal pasando por la esquina.',
    multiplier: 2.1,
    requiredProduction: BOTELLON_ZONE_REQUIREMENTS.callejon,
    badge: 'Fase 4',
    icon: 'map-pin',
    policeRisk: 0.24,
    accentColor: '#8B5CF6',
    lightGlow: 'from-purple-500/10 via-purple-500/5 to-transparent',
    darkGlow: 'dark:from-purple-950/25 dark:via-purple-950/10 dark:to-transparent',
  },
  {
    id: 'discoteca',
    name: 'La Discoteca Central',
    subtitle: '03:45h · Desmadre en pista',
    desc: 'Luces estroboscópicas, porteros estrictos, barra libre y la pista a reventar.',
    multiplier: 2.8,
    requiredProduction: BOTELLON_ZONE_REQUIREMENTS.discoteca,
    badge: 'Fase 5',
    icon: 'disc',
    policeRisk: 0.36,
    accentColor: '#EC4899',
    lightGlow: 'from-pink-500/10 via-pink-500/5 to-transparent',
    darkGlow: 'dark:from-pink-950/25 dark:via-pink-950/10 dark:to-transparent',
  },
  {
    id: 'macrofestival',
    name: 'Macro-Festival Fin de Curso SMR',
    subtitle: '05:30h · El fiestón masivo',
    desc: 'Escenario masivo al aire libre, pantallas gigantes y controles de seguridad en cada acceso.',
    multiplier: 3.8,
    requiredProduction: BOTELLON_ZONE_REQUIREMENTS.macrofestival,
    badge: 'Fase 6',
    icon: 'tent',
    policeRisk: 0.50,
    accentColor: '#F43F5E',
    lightGlow: 'from-rose-500/10 via-rose-500/5 to-transparent',
    darkGlow: 'dark:from-rose-950/25 dark:via-rose-950/10 dark:to-transparent',
  },
  {
    id: 'after_clandestino',
    name: 'El After Clandestino (Nivel Leyenda)',
    subtitle: '07:30h · Fiesta extrema',
    desc: 'Piscina privada, champán ilimitado y vigilancia constante para evitar que nos cierren el local.',
    multiplier: 5.0,
    requiredProduction: BOTELLON_ZONE_REQUIREMENTS.after_clandestino,
    badge: 'Leyenda',
    icon: 'crown',
    policeRisk: 0.65,
    accentColor: '#A855F7',
    lightGlow: 'from-violet-500/12 via-violet-500/5 to-transparent',
    darkGlow: 'dark:from-violet-950/30 dark:via-violet-950/10 dark:to-transparent',
  },
  {
    id: 'jet_privado',
    name: 'Jet Privado de 2º SMR',
    subtitle: '10:00h · After en las nubes',
    desc: 'Fiesta privada a 10.000 metros de altura con barra libre de champán francés.',
    multiplier: 12.0,
    requiredProduction: BOTELLON_ZONE_REQUIREMENTS.jet_privado,
    badge: 'Millonario',
    icon: 'crown',
    policeRisk: 0.72,
    accentColor: '#06B6D4',
    lightGlow: 'from-cyan-500/12 via-cyan-500/5 to-transparent',
    darkGlow: 'dark:from-cyan-950/30 dark:via-cyan-950/10 dark:to-transparent',
  },
  {
    id: 'isla_privada',
    name: 'Isla Privada del Delegado',
    subtitle: '14:00h · Festival sin fin',
    desc: 'Una isla entera alquilada para los billonarios de la clase con DJs residentes.',
    multiplier: 35.0,
    requiredProduction: BOTELLON_ZONE_REQUIREMENTS.isla_privada,
    badge: 'Billonario',
    icon: 'crown',
    policeRisk: 0.78,
    accentColor: '#F97316',
    lightGlow: 'from-orange-500/12 via-orange-500/5 to-transparent',
    darkGlow: 'dark:from-orange-950/30 dark:via-orange-950/10 dark:to-transparent',
  },
  {
    id: 'estacion_orbital',
    name: 'Estación Orbital Botellón',
    subtitle: 'Sin hora · Élite Trillonaria',
    desc: 'Botellón en gravedad cero reservado únicamente para las mayores fortunas del servidor.',
    multiplier: 100.0,
    requiredProduction: BOTELLON_ZONE_REQUIREMENTS.estacion_orbital,
    badge: 'Trillonario',
    icon: 'crown',
    policeRisk: 0.85,
    accentColor: '#EAB308',
    lightGlow: 'from-yellow-500/12 via-yellow-500/5 to-transparent',
    darkGlow: 'dark:from-yellow-950/30 dark:via-yellow-950/10 dark:to-transparent',
  },
];

// Habilidades / Perks permanentes de la noche
export interface PerkConfig {
  id: string;
  name: string;
  desc: string;
  cost: number;
  icon: string;
  effectType: 'drink_mult' | 'discount' | 'crazy_time' | 'jackpot_chance' | 'offline_hours' | 'global_mult';
  value: number;
}

export const PERKS: PerkConfig[] = [
  {
    id: 'aguante_hierro',
    name: 'Hígado de Acero',
    desc: 'Tus tragos manuales dan el triple de fichas directas (x3).',
    cost: BOTELLON_PERK_COSTS.aguante_hierro,
    icon: 'shield',
    effectType: 'drink_mult',
    value: 3,
  },
  {
    id: 'descuento_chino',
    name: 'Colega del Tendero',
    desc: 'El chino de confianza te hace un 15% de descuento en todas las bebidas.',
    cost: BOTELLON_PERK_COSTS.descuento_chino,
    icon: 'tag',
    effectType: 'discount',
    value: 0.85,
  },
  {
    id: 'bafles_jbl',
    name: 'Altavoces JBL Conectados',
    desc: 'El subidón de Fiesta Loca dura 25 segundos en vez de 10.',
    cost: BOTELLON_PERK_COSTS.bafles_jbl,
    icon: 'speaker',
    effectType: 'crazy_time',
    value: 25,
  },
  {
    id: 'enchufe_barra',
    name: 'Enchufe en Barra',
    desc: 'Cada trago manual tiene un 12% de probabilidad de soltar un bonus sorpresa.',
    cost: BOTELLON_PERK_COSTS.enchufe_barra,
    icon: 'sparkles',
    effectType: 'jackpot_chance',
    value: 0.12,
  },
  {
    id: 'pase_vip',
    name: 'Pase VIP Permanente',
    desc: 'El límite de recaudación offline aumenta de 4 horas a 8 horas seguidas.',
    cost: BOTELLON_PERK_COSTS.pase_vip,
    icon: 'ticket',
    effectType: 'offline_hours',
    value: 8,
  },
  {
    id: 'camion_hielos',
    name: 'Flota de Camiones de Hielo',
    desc: 'Multiplica x2.5 toda la producción pasiva del Botellón.',
    cost: BOTELLON_PERK_COSTS.camion_hielos,
    icon: 'sparkles',
    effectType: 'global_mult',
    value: 2.5,
  },
  {
    id: 'dj_residente',
    name: 'DJ Residente Internacional',
    desc: 'Multiplica x4 toda la producción pasiva del Botellón.',
    cost: BOTELLON_PERK_COSTS.dj_residente,
    icon: 'speaker',
    effectType: 'global_mult',
    value: 4,
  },
  {
    id: 'patrocinio_marca',
    name: 'Patrocinio Oficial de Licores',
    desc: 'Multiplica x8 toda la producción pasiva del Botellón.',
    cost: BOTELLON_PERK_COSTS.patrocinio_marca,
    icon: 'ticket',
    effectType: 'global_mult',
    value: 8,
  },
  {
    id: 'imperio_nocturno',
    name: 'Imperio Nocturno Trillonario',
    desc: 'Multiplica x20 toda la producción pasiva. Reservado para élites de trillones.',
    cost: BOTELLON_PERK_COSTS.imperio_nocturno,
    icon: 'shield',
    effectType: 'global_mult',
    value: 20,
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
  return getEconomyPrestigeMultiplier(count);
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

// Producción mínima requerida en la ronda actual para irse de After (escala progresiva real sin tope bajo)
export function getRequiredAfterProduction(afterCount: number): number {
  return getEconomyRequiredAfterProduction(afterCount);
}

// Coste proporcional y severo para blindar el alijo (escala masiva para que a las grandes fortunas les cueste de verdad)
export function getVaultGuardCost(userCoins: number, vaultFichas: number = 0): { costCoins: number; costFichas: number } {
  return getEconomyVaultGuardCost(userCoins, vaultFichas);
}

export function getGuardCost(userCoins: number): number {
  return getVaultGuardCost(userCoins, 0).costCoins;
}

export function getAfterRiskStats(suspicionLevel: number, userCoins: number = 0, mascotaEquipada?: string): AfterRiskStats {
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
  let bribeCost = Math.max(baseCost, wealthSurcharge);
  if (mascotaEquipada === 'peter_kirby') {
    bribeCost = Math.floor(bribeCost * 0.5); // 50% de rebaja en fianza con Peter Kirby
  }

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

export const renderZoneIcon = (iconName: string, customColor?: string) => {
  const style = customColor ? { color: customColor } : undefined;
  switch (iconName) {
    case 'trees':
      return <Trees className="w-5 h-5 text-emerald-600 dark:text-emerald-400" style={style} />;
    case 'home':
      return <Home className="w-5 h-5 text-amber-600 dark:text-amber-400" style={style} />;
    case 'speaker':
      return <Volume2 className="w-5 h-5 text-sky-600 dark:text-sky-400" style={style} />;
    case 'map-pin':
      return <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" style={style} />;
    case 'disc':
      return <Disc className="w-5 h-5 text-pink-600 dark:text-pink-400" style={style} />;
    case 'tent':
      return <Tent className="w-5 h-5 text-rose-600 dark:text-rose-400" style={style} />;
    case 'crown':
      return <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" style={style} />;
    default:
      return <MapPin className="w-5 h-5 text-foreground-muted" style={style} />;
  }
};

export const renderPerkIcon = (iconName: string) => {
  switch (iconName) {
    case 'shield':
      return <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    case 'tag':
      return <Tag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    case 'speaker':
      return <Volume2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    case 'sparkles':
      return <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    case 'ticket':
      return <Ticket className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
    default:
      return <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
  }
};

export const PartyIdleGame: React.FC<PartyIdleGameProps> = ({
  userCoins,
  userId,
  username,
  mascotaEquipada,
  onUpdateCoins,
  onSetCoins,
  onNavigateGame,
  onRequireAuth,
}) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${userId || 'local'}`;

  // Pestaña activa dentro del juego: inicio + 4 secciones principales + "Más"
  const [activeTab, setActiveTab] = useState<
    'inicio' | 'suministros' | 'zonas' | 'after' | 'mecenazgo' | 'inversiones' | 'mas'
  >('inicio');

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

  // Estados de Bóveda Blindada (Alijo Custodiado) y Riesgo
  const [guardActiveUntilMs, setGuardActiveUntilMs] = useState<number>(0);
  const [lastSubsidioClaimMs, setLastSubsidioClaimMs] = useState<number>(0);
  const [policeRaidReport, setPoliceRaidReport] = useState<{
    fichasLost: number;
    coinsLost: number;
    hours: number;
  } | null>(null);

  // Estado de riesgo activo: Doble o Nada en el trago
  const [gambleResult, setGambleResult] = useState<{
    won: boolean;
    amount: number;
  } | null>(null);

  // Estados de la Zona de Mecenazgo y Donaciones de Clase
  const [donationsPool, setDonationsPool] = useState<number>(150000);
  const [donorsList, setDonorsList] = useState<any[]>([]);
  const [isDonating, setIsDonating] = useState<boolean>(false);
  const [donationAmountInput, setDonationAmountInput] = useState<number>(50000);
  const [myTotalDonated, setMyTotalDonated] = useState<number>(0);

  // Estado para la burbuja de habla de personajes interactivos
  const [activeCharacterSpeech, setActiveCharacterSpeech] = useState<{
    id: string;
    name: string;
    quote: string;
    tierName: string;
  } | null>(null);

  // Detección y alternancia reactiva de modo claro / modo oscuro
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const updateThemeState = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    updateThemeState();
    const observer = new MutationObserver(updateThemeState);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleToggleTheme = () => {
    sound.tap();
    const d = document.documentElement;
    d.classList.add('theme-transitioning');
    setTimeout(() => {
      d.classList.remove('theme-transitioning');
    }, 300);

    const metaScheme = document.querySelector('meta[name="color-scheme"]');
    if (isDarkMode) {
      d.classList.remove('dark');
      d.classList.add('light');
      try {
        localStorage.setItem('smr2_theme', 'light');
      } catch {}
      if (metaScheme) metaScheme.setAttribute('content', 'light');
      setIsDarkMode(false);
    } else {
      d.classList.remove('light');
      d.classList.add('dark');
      try {
        localStorage.setItem('smr2_theme', 'dark');
      } catch {}
      if (metaScheme) metaScheme.setAttribute('content', 'dark');
      setIsDarkMode(true);
    }
  };

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
  const globalPerkProdMult = useMemo(() => {
    return PERKS.reduce((acc, perk) => {
      if (perk.effectType === 'global_mult' && purchasedPerks.includes(perk.id)) {
        return acc * perk.value;
      }
      return acc;
    }, 1);
  }, [purchasedPerks]);
  const rankBonusMult = 1 + currentRank.bonusPercent / 100;

  // Tasa de producción pasiva base (por segundo) con hitos, zona y rango
  const baseRatePerSecond = useMemo(() => {
    const rawRate = TIERS.reduce((acc, tier) => {
      const lvl = levels[tier.id] || 0;
      const milestone = getTierMilestoneMultiplier(lvl);
      return acc + lvl * tier.baseRate * milestone;
    }, 0);

    return rawRate * activeZone.multiplier * rankBonusMult * globalPerkProdMult;
  }, [levels, activeZone.multiplier, rankBonusMult, globalPerkProdMult]);

  // Tasa real con multiplicadores aplicados (Prestigio + Bóveda Blindada +20% + Beca Novatos x4 + Modo Fiesta Loca x3)
  const isStashGuarded = guardActiveUntilMs > Date.now();
  const stashBonusMult = isStashGuarded ? 1.20 : 1.0;

  const effectiveRatePerSecond = useMemo(() => {
    const frenzyMult = isCrazyParty ? 3 : 1;
    const stashMult = guardActiveUntilMs > Date.now() ? 1.20 : 1.0;
    const petProdMult =
      mascotaEquipada === 'chococrispi' ? 1.65 :
      mascotaEquipada === 'androide_18' ? 1.50 :
      mascotaEquipada === 'toy_chica' ? 1.20 :
      mascotaEquipada === 'baldi' ? 1.10 : 1.0;
    const suppliesRate = baseRatePerSecond * prestigeMultiplier * frenzyMult * underdogMultiplier * stashMult * petProdMult;
    const prestigeBaseRate = permanentPrestigeRate * frenzyMult * stashMult * petProdMult;
    return suppliesRate + prestigeBaseRate;
  }, [baseRatePerSecond, prestigeMultiplier, isCrazyParty, underdogMultiplier, permanentPrestigeRate, guardActiveUntilMs, mascotaEquipada]);

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

      // Inspección policial y riesgo de requisa por Alijo Desprotegido
      if (stateToApply.lastTickMs && stateToApply.lastTickMs < now) {
        const guardUntil = stateToApply.guardActiveUntilMs || 0;
        const isCurrentlyGuarded = guardUntil > now;

        if (!isCurrentlyGuarded) {
          const hoursUnguarded = Math.min(48, (now - Math.max(stateToApply.lastTickMs, guardUntil)) / 3600000);
          if (hoursUnguarded >= 1) {
            const vaultAtRisk = stateToApply.pendingVault || 0;
            if (vaultAtRisk > 500) {
              const raidPct = Math.min(0.40, 0.15 + Math.floor(hoursUnguarded) * 0.05);
              let confiscatedFichas = Math.floor(vaultAtRisk * raidPct);
              if (mascotaEquipada === 'link') {
                confiscatedFichas = Math.floor(confiscatedFichas * 0.4); // Escudo Hyliano: -60% pérdidas
              } else if (mascotaEquipada === 'tung_tung') {
                confiscatedFichas = Math.floor(confiscatedFichas * 0.5); // Batazo Tung Tung: -50% pérdidas
              }
              stateToApply.pendingVault = Math.max(50, vaultAtRisk - confiscatedFichas);

              // El botellón offline confisca únicamente fichas desprotegidas del alijo (fichas del juego)
              // NUNCA confisca ni quita monedas de la cartera del usuario
              if (allowOfflineReport) {
                setPoliceRaidReport({
                  fichasLost: confiscatedFichas,
                  coinsLost: 0,
                  hours: Math.round(hoursUnguarded),
                });
              }
            }
          }
        }
      }

      // Farmeo offline: si el alijo estaba custodiado, hasta 12h de farmeo a pleno rendimiento (+20% bonus)
      const isOfflineGuarded = (stateToApply.guardActiveUntilMs || 0) > stateToApply.lastTickMs;
      const baseOfflineHours = (stateToApply.purchasedPerks || []).includes('pase_vip') ? 8 : 4;
      const maxOfflineHours = isOfflineGuarded ? Math.max(12, baseOfflineHours + 4) : baseOfflineHours;
      const offlineMultiplier = isOfflineGuarded ? 1.20 : 1.0;

      if (stateToApply.lastTickMs && stateToApply.lastTickMs < now) {
        const elapsedSec = Math.min(
          Math.floor((now - stateToApply.lastTickMs) / 1000),
          maxOfflineHours * 3600
        );

        if (elapsedSec > 10) {
          const zoneObj = ZONES.find((z) => z.id === stateToApply.currentZoneId) || ZONES[0];
          const prestigeCount = Number(stateToApply.afterPrestigeCount || (stateToApply as any).rebirths || 0);
          const mult = calculatePrestigeMultiplier(prestigeCount);
          const savedBaseRate = TIERS.reduce((acc, tier) => {
            const lvl = stateToApply.levels?.[tier.id] || 0;
            return acc + lvl * tier.baseRate * getTierMilestoneMultiplier(lvl);
          }, 0) * zoneObj.multiplier;
          const permanentOfflineRate = prestigeCount > 0 ? (prestigeCount * 25) * mult : 0;

          const offlineEarned = Math.floor(elapsedSec * (savedBaseRate * mult + permanentOfflineRate) * offlineMultiplier);
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

    // Comprobar y sincronizar con la base de datos dedicada del Botellón (`botellon_states`)
    if (userId && isUUID(userId)) {
      (async () => {
        try {
          const res = await fetch('/api/botellon/sync', { method: 'GET' });
          if (!res.ok) return;
          const payload = await res.json();
          const cloudState = payload?.state as BotellonState | null;

          if (cloudState && typeof cloudState === 'object' && Object.keys(cloudState).length > 0) {
            // La base de datos `botellon_states` es la fuente autoritativa (evita rebirths o saldos manipulados en localStorage)
            applyState(cloudState, false);
            try {
              localStorage.setItem(storageKey, JSON.stringify(cloudState));
            } catch {}
          } else if (saved) {
            await fetch('/api/botellon/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state: saved }),
            });
          }
        } catch (syncErr) {
          console.warn('Error sincronizando progreso con botellon_states:', syncErr);
        }
      })();
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

      // Sincronizar en botellon_states si el usuario tiene UUID válido (control de frecuencia: máx 1 cada 3.5s salvo urgencia)
      if (userId && isUUID(userId)) {
        const now = Date.now();
        if (isUrgent || now - lastCloudSyncRef.current >= 3500) {
          lastCloudSyncRef.current = now;
          setCloudSyncStatus('saving');
          (async () => {
            try {
              const res = await fetch('/api/botellon/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: fullState }),
              });
              if (!res.ok) {
                setCloudSyncStatus('offline');
              } else {
                setCloudSyncStatus('saved');
              }
            } catch (err) {
              console.warn('Error al guardar estado en botellon_states:', err);
              setCloudSyncStatus('offline');
            }
          })();
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

    if (mascotaEquipada === 'spongegar') {
      clickPower = Math.round(clickPower * 1.05); // +5% de fichas con Spongegar Primitivo
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
        let crazyDuration = hasPerk('bafles_jbl') ? 25 : 15;
        if (mascotaEquipada === 'austin') {
          crazyDuration = Math.round(crazyDuration * 1.50); // +50% de duración con Austin Hawaiano
        } else if (mascotaEquipada === 'kirby') {
          crazyDuration = Math.round(crazyDuration * 1.35); // +35% de duración con Kirby Fachero
        }
        setIsCrazyParty(true);
        setCrazyPartyTimeRemaining(crazyDuration);
        sound.toastClink();
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
        return 0;
      }
      return next;
    });
  };

  // Cálculo de costes absurdos y escalonados con compras múltiples y descuento de tendero
  const getBuyQuote = useCallback(
    (tier: TierConfig, currentLevel: number, multiplier: 1 | 5 | 10 | 'max', availableFichas: number) => {
      let count = 0;
      let totalCost = 0;
      const targetCount = multiplier === 'max' ? 100 : multiplier;

      for (let i = 0; i < targetCount; i++) {
        const rawCost = getTierUpgradeCost(tier.baseCost, currentLevel + i, afterPrestigeCount);
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
        const rawCost = getTierUpgradeCost(tier.baseCost, currentLevel, afterPrestigeCount);
        totalCost = Math.max(1, Math.floor(rawCost * costDiscount));
      }

      return {
        count,
        totalCost,
        canAfford: availableFichas >= totalCost && count > 0,
      };
    },
    [costDiscount, afterPrestigeCount]
  );

  // Acción: Comprar mejora de nivel exclusivamente con FICHAS del bote (persistida en botellon_states)
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

    if (userId && isUUID(userId)) {
      fetch('/api/botellon/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy_tier',
          tierId: tier.id,
          multiplier: buyMultiplier,
          clientVault: pendingVault,
        }),
      }).catch(() => {});
    }
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
  const handleBuyPerk = async (perk: PerkConfig) => {
    if (userCoins < perk.cost || hasPerk(perk.id)) return;

    if (userId && isUUID(userId)) {
      try {
        const res = await fetch('/api/botellon/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'buy_perk', perkId: perk.id }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          sound.broke();
          alert(data?.error || 'No se pudo desbloquear esta ventaja.');
          return;
        }
        sound.coinWin();
        confetti({ particleCount: 70, spread: 60 });
        const nextPerks = Array.isArray(data.purchasedPerks) ? data.purchasedPerks : [...purchasedPerks, perk.id];
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
        return;
      } catch {
        sound.broke();
        return;
      }
    }

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

    if (userId && isUUID(userId)) {
      fetch('/api/botellon/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select_zone', zoneId: zone.id }),
      }).catch(() => {});
    }
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

  // Acción: Blindar el alijo (servicio de seguridad privada de 8h con coste proporcional severo)
  const handleGuardStash = (mode: 'fichas' | 'coins' = 'coins') => {
    let { costCoins, costFichas } = getVaultGuardCost(userCoins, pendingVault);
    if (mascotaEquipada === 'link') {
      costCoins = Math.max(1, Math.floor(costCoins * 0.5)); // Escudo Hyliano: -50% de coste
      costFichas = Math.max(1, Math.floor(costFichas * 0.5));
    }

    if (mode === 'fichas') {
      if (pendingVault < costFichas) {
        sound.broke();
        alert(`Fichas insuficientes en el bote. Necesitas ${costFichas.toLocaleString()} fichas (o puedes pagar ${costCoins.toLocaleString()} monedas).`);
        return;
      }
      sound.toastClink();
      setPendingVault((prev) => Math.max(0, prev - costFichas));
    } else {
      if (userCoins < costCoins) {
        sound.broke();
        alert(`Saldo insuficiente. Necesitas al menos ${costCoins.toLocaleString()} monedas en tu cartera.`);
        return;
      }
      sound.toastClink();
      if (costCoins > 0) {
        onUpdateCoins(-costCoins);
      }
    }

    const newGuard = Date.now() + 8 * 3600 * 1000; // 8 horas de protección completa
    setGuardActiveUntilMs(newGuard);
    saveState({
      guardActiveUntilMs: newGuard,
      pendingVault: mode === 'fichas' ? Math.max(0, pendingVault - costFichas) : pendingVault,
    }, true);

    confetti({
      particleCount: 55,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#8B5CF6'],
    });
  };

  // Acción: Trago Doble o Nada (Riesgo voluntario del 20% del bote)
  const handleGambleVault = () => {
    if (pendingVault < 100) {
      alert('Necesitas al menos 100 fichas en el bote para jugar al Doble o Nada.');
      return;
    }
    const wager = Math.floor(pendingVault * 0.20);
    const win = Math.random() >= 0.50;

    if (win) {
      sound.coinWin();
      confetti({ particleCount: 80, spread: 70 });
      setPendingVault((prev) => prev + wager);
      setTotalLifetimeProduced((prev) => prev + wager);
      setGambleResult({ won: true, amount: wager });
    } else {
      sound.broke();
      setPendingVault((prev) => Math.max(0, prev - wager));
      setGambleResult({ won: false, amount: wager });
    }

    setTimeout(() => {
      setGambleResult(null);
    }, 4000);
  };

  // Acción: Cargar donaciones y donar al Fondo Social (Zona de Mecenazgo)
  const loadDonationsData = useCallback(async () => {
    try {
      const res = await fetch('/api/donations');
      const data = await res.json();
      if (data.success) {
        setDonationsPool(data.poolTotal || 150000);
        setDonorsList(data.donors || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadDonationsData();
  }, [loadDonationsData]);

  const handleDonateToClass = async (amountToDonate: number) => {
    if (userCoins < amountToDonate) {
      sound.broke();
      alert(`Saldo insuficiente. Tienes ${userCoins.toLocaleString()} monedas.`);
      return;
    }

    setIsDonating(true);
    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username: username || 'Estudiante SMR',
          amount: amountToDonate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar la donación');
      }

      sound.jackpot();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      if (onSetCoins && typeof data.newCoins === 'number') {
        onSetCoins(data.newCoins);
      } else {
        onUpdateCoins(-amountToDonate);
      }
      setDonationsPool(data.poolTotal);
      setMyTotalDonated(data.totalDonated);
      loadDonationsData();
    } catch (err: any) {
      alert(err.message || 'Error al donar');
    } finally {
      setIsDonating(false);
    }
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
    onUpdateCoins(bonus, 'subsidio');
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
    let coinsToClaim = Math.floor(rawFichas / 5);
    if (mascotaEquipada === 'kirby') {
      coinsToClaim = Math.floor(coinsToClaim * 1.12); // +12% bonus permanente al recaudar con Kirby
    }
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

      onUpdateCoins(coinsToClaim, 'vault');

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
    const { bribeCost } = getAfterRiskStats(afterSuspicionLevel, userCoins, mascotaEquipada);
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
    const nextPrestigeCount = afterPrestigeCount + 1;
    const isGuardedAtAfter = guardActiveUntilMs > Date.now();

    // Si el alijo estaba custodiado, inmunidad total y doble capital de siembra
    let startingSeedFichas = Math.max(2500, nextPrestigeCount * 5000);
    if (isGuardedAtAfter) {
      startingSeedFichas = Math.max(5000, nextPrestigeCount * 10000);
      if (leftoverCoins > 0) {
        onUpdateCoins(leftoverCoins, 'rebirth');
      }
      setAfterRaidResult({
        type: 'success',
        raidChancePct: 0,
        confiscatePct: 0,
        coinsLost: 0,
        vaultLost: 0,
        nextLevel: nextPrestigeCount,
      });
    } else {
      // Riesgo real de redada policial si el alijo estaba desprotegido
      const raidChance = Math.min(75, 35 + afterSuspicionLevel * 10);
      const isRaidTriggered = Math.random() * 100 < raidChance;

      if (isRaidTriggered) {
        const confiscatedPct = 30;
        const confiscatedCoins = Math.floor(leftoverCoins * 0.30);
        const netCoins = leftoverCoins - confiscatedCoins;
        if (netCoins > 0) {
          onUpdateCoins(netCoins, 'rebirth');
        }
        sound.broke();
        setAfterRaidResult({
          type: 'raid',
          raidChancePct: raidChance,
          confiscatePct: confiscatedPct,
          coinsLost: confiscatedCoins,
          vaultLost: Math.floor(pendingVault * 0.30),
          nextLevel: nextPrestigeCount,
        });
      } else {
        if (leftoverCoins > 0) {
          onUpdateCoins(leftoverCoins, 'rebirth');
        }
        setAfterRaidResult({
          type: 'success',
          raidChancePct: raidChance,
          confiscatePct: 0,
          coinsLost: 0,
          vaultLost: 0,
          nextLevel: nextPrestigeCount,
        });
      }
    }

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
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-accent dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                La fiesta siguió mientras estabas fuera
              </p>
              <p className="text-xs text-foreground-muted">
                Has recaudado{' '}
                <span className="font-semibold text-foreground font-mono">
                  +{offlineReport.earned.toLocaleString()} fichas
                </span>{' '}
                durante tus {Math.round(offlineReport.seconds / 60)} min desconectado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOfflineReport(null)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground cursor-pointer active:scale-95 transition-transform shadow-2xs"
          >
            Aceptar
          </button>
        </div>
      )}

      {/* Banner de Zona Actual, Rango y Estado de Nube Supabase con ticker en vivo integrado */}
      <div className="p-4 rounded-2xl sm:rounded-3xl bg-surface border border-border shadow-sm space-y-2.5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl bg-surface-raised border border-border/60 flex items-center justify-center shrink-0 shadow-2xs transition-colors"
              style={{ color: activeZone.accentColor }}
            >
              {renderZoneIcon(activeZone.icon, activeZone.accentColor)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground tracking-tight">
                  {activeZone.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-semibold border border-accent/20">
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
              <p className="text-xs text-foreground-muted mt-0.5 truncate">{activeZone.desc}</p>
            </div>
          </div>

          {/* Controles compactos: nube, rango, tema y guía */}
          <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full border bg-surface-raised border-border/60"
              title={cloudSyncStatus === 'saved' ? 'Guardado en Supabase' : 'Guardando en Supabase...'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cloudSyncStatus === 'saved' ? 'bg-emerald-500' : 'bg-accent animate-ping'
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border bg-surface-raised text-foreground-muted border-border/60">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>{currentRank.name}</span>
            </div>

            <button
              type="button"
              onClick={handleToggleTheme}
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-raised hover:bg-surface-hover text-foreground-muted transition-colors cursor-pointer border border-border/60 active:scale-95 touch-manipulation"
            >
              {isDarkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-sky-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                setTutorialStep(0);
                setShowTutorial(true);
              }}
              title="Ver guía completa"
              aria-label="Ver guía completa"
              className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-raised hover:bg-surface-hover text-foreground-muted transition-colors cursor-pointer border border-border/60 active:scale-95 touch-manipulation"
            >
              <HelpCircle className="w-3.5 h-3.5 text-accent" />
            </button>
          </div>
        </div>

        {/* Noticia en directo sutil (reemplaza el ecualizador invasivo) */}
        <div className="pt-2 border-t border-border/60 flex items-center gap-2 text-xs text-foreground-muted truncate">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-accent shrink-0">
            En vivo:
          </span>
          <span className="truncate transition-all duration-300 font-sans">
            {PARTY_NEWS[currentNewsIndex]}
          </span>
        </div>
      </div>

      {/* Navegación principal: cinco destinos, sin amontonar */}
      <div className="flex items-center p-1 rounded-2xl bg-surface-raised border border-border/70 gap-1">
        {[
          { id: 'inicio', label: 'Inicio', icon: Home },
          { id: 'suministros', label: 'Mejoras', icon: Wine },
          { id: 'zonas', label: 'Zonas', icon: MapPin },
          { id: 'after', label: 'After', icon: RotateCcw },
          { id: 'mas', label: 'Más', icon: MoreHorizontal },
        ].map((tab) => {
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'mas' && (activeTab === 'mecenazgo' || activeTab === 'inversiones'));
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                sound.tap();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 sm:px-2 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-[0.97] touch-manipulation min-h-[44px] sm:min-h-[40px] ${
                isActive
                  ? 'bg-surface text-foreground font-semibold shadow-xs border border-border/60'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>{tab.label}</span>
              {tab.id === 'after' && canPrestige && (
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* PANTALLA: INICIO */}
      {activeTab === 'inicio' && (
        <>
          {/* Bóveda del alijo */}
          {(() => {
            const { costCoins, costFichas } = getVaultGuardCost(userCoins, pendingVault);
            const isGuarded = guardActiveUntilMs > Date.now();
            const hoursRemaining = isGuarded ? Math.ceil((guardActiveUntilMs - Date.now()) / 3600000) : 0;
            const minutesRemaining = isGuarded ? Math.ceil((guardActiveUntilMs - Date.now()) / 60000) % 60 : 0;

            return isGuarded ? (
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-emerald-950 dark:text-emerald-100 text-sm">
                        Bóveda blindada activa
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/25 font-medium">
                        {hoursRemaining} h {minutesRemaining} m
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/20">
                        +20% producción
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-900/70 dark:text-emerald-300/80 mt-1 leading-relaxed">
                      Tu bote está protegido frente a inspecciones. El farmeo offline llega a 12 horas.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleGuardStash('fichas')}
                    className="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 border border-emerald-300/80 dark:border-emerald-700/70 text-emerald-950 dark:text-emerald-100 font-medium text-xs cursor-pointer transition-colors active:scale-[0.98]"
                    title="Extiende 8 horas la protección usando fichas del botellón"
                  >
                    +8 h · {costFichas.toLocaleString()} fichas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGuardStash('coins')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer transition-colors active:scale-[0.98]"
                    title="Extiende 8 horas la protección usando monedas de tu cartera"
                  >
                    +8 h · {costCoins.toLocaleString()} monedas
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-amber-950 dark:text-amber-100 text-sm">
                        Alijo sin custodia
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 font-medium border border-red-500/20">
                        Riesgo alto
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/70 dark:text-amber-300/80 mt-1 leading-relaxed">
                      Las ausencias sin custodia pueden acabar en redada. El After corre un 45% de riesgo de requisa.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleGuardStash('fichas')}
                    className="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border border-amber-300/80 dark:border-amber-700/70 text-amber-950 dark:text-amber-100 font-medium text-xs cursor-pointer transition-colors active:scale-[0.98]"
                    title="Blindar el alijo durante 8 horas usando fichas del botellón"
                  >
                    Blindar · {costFichas.toLocaleString()} fichas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGuardStash('coins')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs cursor-pointer transition-colors active:scale-[0.98]"
                    title="Blindar el alijo durante 8 horas usando monedas de tu cartera"
                  >
                    Blindar · {costCoins.toLocaleString()} monedas
                  </button>
                </div>
              </div>
            );
          })()}

      {/* DASHBOARD DE INICIO: el bote manda, el resto se reparte en dos tarjetas */}
      <div className="space-y-3">
        {/* Bote acumulado */}
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-5 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-mono font-medium text-foreground-muted uppercase tracking-wider">
                Bote acumulado
              </span>
              <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-mono leading-none">
                  {roundedVault.toLocaleString()}
                </span>
                <span className="text-sm font-sans text-foreground-muted">fichas</span>
              </div>
              <p className="text-xs text-foreground-muted font-mono mt-2">
                ≈ {coinsToClaim.toLocaleString()} monedas reales · canje 5:1
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={coinsToClaim <= 0 || isClaimingVault}
            onClick={handleClaimVault}
            className={`w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] min-h-[48px] ${
              coinsToClaim > 0 && !isClaimingVault
                ? 'bg-accent text-accent-foreground hover:opacity-90 shadow-xs'
                : 'bg-surface-raised text-foreground-subtle border border-border/60 cursor-not-allowed opacity-60'
            }`}
          >
            {isClaimingVault ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Canjeando...</span>
              </>
            ) : justClaimed ? (
              <>
                <Check className="w-4 h-4" />
                <span>Canjeado al monedero</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-4 h-4" />
                <span>Canjear al monedero · +{coinsToClaim.toLocaleString()}</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={userCoins < 50}
              onClick={() => handleFundVaultWithCoins(50)}
              className={`py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] border ${
                userCoins >= 50
                  ? 'bg-surface-raised hover:bg-surface-hover text-foreground-muted border-border/60'
                  : 'bg-surface-raised/50 text-foreground-subtle border-border/50 cursor-not-allowed opacity-50'
              }`}
              title="Aportar 50 monedas de tu cartera para recibir +250 fichas al bote"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>Aportar 50</span>
            </button>

            <button
              type="button"
              disabled={roundedVault < 50}
              onClick={handleGambleVault}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] border ${
                roundedVault >= 50
                  ? 'bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/60'
                  : 'bg-surface-raised/50 text-foreground-subtle border-border/50 cursor-not-allowed opacity-50'
              }`}
              title="Arriesga el 20% del bote en un trago a cara o cruz"
            >
              <Dice5 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Doble o nada</span>
            </button>
          </div>

          {gambleResult && (
            <div
              className={`p-2 rounded-lg text-center text-[11px] font-medium animate-in fade-in duration-150 border ${
                gambleResult.won
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800'
              }`}
            >
              {gambleResult.won
                ? `Ganaste +${gambleResult.amount.toLocaleString()} fichas`
                : `Perdiste -${gambleResult.amount.toLocaleString()} fichas`}
            </div>
          )}
        </div>

        {/* Producción y trago manual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Producción pasiva */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface border border-border shadow-sm flex flex-col justify-between gap-4 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Producción pasiva</span>
              </span>
              {afterPrestigeCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                  x{prestigeMultiplier.toFixed(2)}
                </span>
              )}
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                +{effectiveRatePerSecond.toFixed(1)}{' '}
                <span className="text-xs font-sans text-foreground-muted font-normal">fichas / seg</span>
              </div>
              <p className="text-[11px] text-foreground-muted mt-1 font-mono">
                Base +{baseRatePerSecond.toFixed(1)}/s · Zona x{activeZone.multiplier.toFixed(1)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isUnderdog && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                    Beca Novatos x4.0
                  </span>
                )}
                {isCrazyParty && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                    Fiesta Loca x3 ({crazyPartyTimeRemaining}s)
                  </span>
                )}
                {afterPrestigeCount > 0 && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                    +{permanentPrestigeRate.toFixed(0)}/s garantizado
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('after')}
                className="w-full py-2 px-3 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[34px] border bg-surface-raised hover:bg-surface-hover text-foreground-muted border-border/60"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
                <span>Ver After y prestigio</span>
              </button>
            </div>
          </div>

          {/* Trago manual */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface border border-border shadow-sm flex flex-col justify-between gap-4 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
                <Wine className="w-3.5 h-3.5 text-accent" />
                <span>Trago manual</span>
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface-raised text-foreground-muted border border-border/60">
                {isCrazyParty ? `Subidón ${crazyPartyTimeRemaining}s` : `Combo ${partyComboCount}/10`}
              </span>
            </div>

            <div className="relative w-full">
              <button
                type="button"
                onClick={handleManualDrink}
                className={`w-full py-3 px-4 rounded-xl border transition-all active:scale-[0.97] cursor-pointer flex items-center justify-between touch-manipulation min-h-[56px] ${
                  isCrazyParty
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
                    : 'bg-surface-raised border-border/60 hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-raised flex items-center justify-center shrink-0 border border-border/60">
                    <Wine className={`w-4 h-4 ${isCrazyParty ? 'text-amber-500' : 'text-accent'}`} />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-semibold text-foreground leading-tight">
                      {isCrazyParty ? 'Trago con subidón x3' : 'Echar un trago'}
                    </div>
                    <div className="text-[10px] text-foreground-muted font-mono truncate">
                      +{Math.max(1, Math.floor(1 + baseRatePerSecond * 0.05)) * prestigeMultiplier * drinkPowerMult * (isCrazyParty ? 3 : 1)} al bote
                    </div>
                  </div>
                </div>

                <span className="text-xs font-semibold text-accent shrink-0">Beber</span>
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
            <div className="w-full h-1 rounded-full bg-surface-raised overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  isCrazyParty ? 'bg-amber-500 w-full' : 'bg-accent w-0'
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
        zoneColor={activeZone.accentColor}
        onCharacterClick={handleCharacterClick}
        activeSpeech={activeCharacterSpeech}
        onCloseSpeech={() => setActiveCharacterSpeech(null)}
      />
        </>
      )}

      {/* PESTAÑA 1: BEBIDAS & SUMINISTROS */}
      {activeTab === 'suministros' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Mejoras del botellón</h2>
              <p className="text-xs text-foreground-muted">
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
              <div className="flex items-center p-0.5 rounded-xl bg-surface border border-border shadow-2xs">
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
                        ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                        : 'text-foreground-muted hover:text-foreground'
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
                    ? 'bg-accent text-accent-foreground border-transparent hover:opacity-90 shadow-xs'
                    : 'bg-surface-raised text-foreground-muted border-border/60 hover:bg-surface-hover'
                }`}
                title="Ir al After y consultar el multiplicador de prestigio"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${canPrestige ? 'text-purple-400' : 'text-foreground-subtle'}`} />
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
                  className="p-4 rounded-2xl bg-surface border border-border hover:border-foreground/25 transition-all flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-raised border border-border/60 flex items-center justify-center shrink-0 text-foreground">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate">
                            {tier.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-surface-raised text-foreground-muted border border-border shrink-0 font-medium">
                            Nvl. {currentLevel}
                          </span>
                          {milestone > 1 && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              x{milestone}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground-muted truncate mt-0.5">
                          {tier.desc}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                            +{(tier.baseRate * milestone * activeZone.multiplier * prestigeMultiplier).toFixed(1)}/s c/u{' '}
                            {currentLevel > 0 && (
                              <span className="text-foreground-subtle font-normal">
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
                          ? 'bg-accent text-accent-foreground shadow-xs hover:opacity-90'
                          : 'bg-surface-raised text-foreground-subtle border border-border/60 cursor-not-allowed opacity-60'
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
          <div className="pt-4 border-t border-border space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-semibold text-foreground">Ventajas de la Noche (Perks)</h3>
              <p className="text-xs text-foreground-muted">
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
                        ? 'bg-surface border-emerald-500/40 dark:border-emerald-500/30 shadow-xs'
                        : 'bg-surface border border-border shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-raised border border-border flex items-center justify-center shrink-0 text-foreground">
                        {renderPerkIcon(perk.icon)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">
                          {perk.name}
                        </div>
                        <p className="text-[11px] text-foreground-muted mt-0.5 leading-snug">
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
                              ? 'bg-accent text-accent-foreground shadow-xs hover:opacity-90'
                              : 'bg-surface-raised text-foreground-subtle border border-border/60 cursor-not-allowed opacity-50'
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
                      ? 'bg-surface border-accent/60 shadow-xs ring-1 ring-accent/15'
                      : isUnlocked
                      ? 'bg-surface border border-border hover:border-foreground/25 shadow-xs'
                      : 'bg-surface-raised/50 border border-dashed border-border opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center shrink-0 text-foreground">
                      {renderZoneIcon(zone.icon)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{zone.name}</span>
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
                      <p className="text-xs text-foreground-muted mt-0.5">{zone.subtitle}</p>
                      <p className="text-[11px] text-foreground-subtle mt-0.5">{zone.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                    {isSelected ? (
                      <span className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent text-accent-foreground flex items-center gap-1.5 shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                        <span>Fase Activa</span>
                      </span>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleSelectZone(zone)}
                        className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-surface-raised hover:bg-surface-hover text-foreground border border-border transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
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
        const riskStats = getAfterRiskStats(afterSuspicionLevel, userCoins, mascotaEquipada);

        return (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted">
                      Sistema de Prestigio
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/20">
                      Nivel {afterPrestigeCount}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    El After Clandestino (Renacimiento)
                  </h2>
                  <p className="text-xs text-foreground-muted max-w-xl">
                    Reinicia los suministros de esta ronda a cambio de un multiplicador global permanente para toda la noche, producción base garantizada y capital de arranque inmediato.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-2xl bg-surface-raised border border-border font-mono text-center">
                    <div className="text-[10px] text-foreground-muted uppercase">Multiplicador</div>
                    <div className="text-base font-bold text-purple-600 dark:text-purple-400">x{currentMultiplier.toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-foreground-subtle">→</div>
                  <div className="px-3 py-1.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 font-mono text-center">
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 uppercase">Siguiente</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">x{nextMultiplier.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Barra de Progreso de la Ronda Actual */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-surface-raised/60 border border-border/60">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-foreground-muted">Recaudación de esta ronda:</span>
                  <span className="font-bold text-foreground">
                    {Math.floor(currentRunProduced).toLocaleString()} / {requiredRunProd.toLocaleString()} fichas
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-foreground-muted pt-0.5">
                  <span>{progressPct >= 100 ? '✅ Requisito de producción alcanzado' : `Faltan ${(requiredRunProd - Math.floor(currentRunProduced)).toLocaleString()} fichas`}</span>
                  <span>{progressPct}% completado</span>
                </div>
              </div>

              {/* Tarjetas de Beneficios al Renacer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-surface-raised/60 border border-border/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted block">
                    Producción Base
                  </span>
                  <div className="font-mono text-sm font-bold text-foreground">
                    +{nextPermanentRate}/s <span className="text-[10px] text-foreground-subtle font-normal">garantizado</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-raised/60 border border-border/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted block">
                    Potencia de Clic
                  </span>
                  <div className="font-mono text-sm font-bold text-foreground">
                    +{nextBaseClick}/clic <span className="text-[10px] text-foreground-subtle font-normal">por trago</span>
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
                      className="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-900 dark:text-red-100 flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] shrink-0 shadow-2xs"
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
                      ? 'bg-accent text-accent-foreground hover:opacity-90'
                      : 'bg-surface-raised text-foreground-subtle border border-border cursor-not-allowed opacity-60'
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

      {/* PANTALLA: MÁS (accesos secundarios sin amontonar la pantalla principal) */}
      {activeTab === 'mas' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-foreground">Más</h2>
            <p className="text-xs text-foreground-muted">Otras formas de hacer crecer el botellón.</p>
          </div>

          <div className="rounded-2xl bg-surface border border-border overflow-hidden divide-y divide-border/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('mecenazgo');
                sound.tap();
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground">Mecenazgo y donaciones</div>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  Aporta al fondo común y entra en el ranking de la clase.
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-subtle shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('inversiones');
                sound.tap();
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground">Bolsa de valores</div>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  Invierte monedas y sigue el mercado junto al resto de la clase.
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-subtle shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA: ZONA DE MECENAZGO & FONDO SOCIAL DE LA CLASE (DISEÑO APPLE MINIMALISTA) */}
      {activeTab === 'mecenazgo' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => {
              setActiveTab('mas');
              sound.tap();
            }}
            className="flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors cursor-pointer min-h-[36px]"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            <span>Más</span>
          </button>

          {/* Header Minimalista del Fondo */}
          <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border/70 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                    <span>Fondo de Mecenazgo</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Solidaridad
                    </span>
                  </h2>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    Aportaciones voluntarias de las fortunas del aula para impulsar el bote común.
                  </p>
                </div>
              </div>

              <div className="p-3.5 px-4 rounded-xl bg-surface-raised border border-border/60 sm:text-right shrink-0">
                <span className="text-[10px] font-mono text-foreground-muted block uppercase tracking-wider">
                  Bote Común Acumulado
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {donationsPool >= 1000000
                    ? `${(donationsPool / (donationsPool >= 1000000000 ? 1000000000 : 1000000)).toFixed(2)}${donationsPool >= 1000000000 ? 'B' : 'M'}`
                    : donationsPool.toLocaleString()}
                </span>
                <span className="block text-[10px] font-mono text-foreground-subtle">
                  {donationsPool.toLocaleString()} monedas en total
                </span>
              </div>
            </div>

            {/* Panel de Donación Progresiva */}
            <div className="p-4 rounded-xl bg-surface-raised/60 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                  <span>Realizar una donación</span>
                </span>
                <span className="text-xs font-mono text-foreground-muted">
                  Tu saldo: <span className="font-semibold text-foreground">{userCoins.toLocaleString()}</span>
                </span>
              </div>

              {/* Botones de Selección Rápida Calibrados por Fortuna */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(userCoins >= 1000000000
                  ? [
                      { label: '50M', val: 50000000 },
                      { label: '250M', val: 250000000 },
                      { label: '1B', val: 1000000000 },
                      { label: '5B', val: 5000000000 },
                      { label: '25%', val: Math.floor(userCoins * 0.25) },
                      { label: '50%', val: Math.floor(userCoins * 0.50) },
                    ]
                  : userCoins >= 10000000
                  ? [
                      { label: '1M', val: 1000000 },
                      { label: '5M', val: 5000000 },
                      { label: '10M', val: 10000000 },
                      { label: '25M', val: 25000000 },
                      { label: '25%', val: Math.floor(userCoins * 0.25) },
                    ]
                  : [
                      { label: '10k', val: 10000 },
                      { label: '50k', val: 50000 },
                      { label: '250k', val: 250000 },
                      { label: '1M', val: 1000000 },
                      { label: 'Max', val: userCoins },
                    ]
                ).map(({ label, val }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={userCoins < val || val <= 0}
                    onClick={() => setDonationAmountInput(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                      donationAmountInput === val
                        ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-xs'
                        : userCoins >= val
                        ? 'bg-surface-raised text-foreground-muted border-border hover:border-foreground/25'
                        : 'opacity-40 cursor-not-allowed bg-surface-raised/50 text-foreground-subtle border-transparent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Input Numérico y Botón de Confirmación */}
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={donationAmountInput || ''}
                    onChange={(e) => setDonationAmountInput(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-surface border border-border text-foreground outline-none focus:border-amber-500/50 transition-colors"
                    placeholder="Cantidad a donar..."
                  />
                </div>
                <button
                  type="button"
                  disabled={isDonating || userCoins < donationAmountInput || donationAmountInput < 1000}
                  onClick={() => handleDonateToClass(donationAmountInput)}
                  className="px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-medium shrink-0 cursor-pointer hover:opacity-90 active:scale-98 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDonating ? 'Procesando...' : 'Confirmar Donación'}
                </button>
              </div>

              {myTotalDonated > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[11px] text-foreground-muted font-mono">
                    Aportación histórica personal: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{myTotalDonated.toLocaleString()}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Muro de Honor de Mecenas (Diseño Limpio Apple) */}
          <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  Muro de Honor de Mecenas
                </h3>
              </div>
              <span className="text-[11px] font-mono text-foreground-subtle">
                {donorsList.length} donante{donorsList.length === 1 ? '' : 's'}
              </span>
            </div>

            {donorsList.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <HeartHandshake className="w-8 h-8 text-foreground-subtle/60 mx-auto" />
                <p className="text-xs font-medium text-foreground-muted">
                  Aún no hay aportaciones registradas.
                </p>
                <p className="text-[11px] text-foreground-subtle">
                  Sé el primer mecenas en apoyar a la clase y grabar tu nombre en el podio.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {donorsList.map((donor, idx) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  const badgeInfo =
                    donor.badge === 'gran_mecenas' || donor.badge === ('magnate' as any)
                      ? { label: 'Gran Mecenas', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' }
                      : donor.badge === 'padrino'
                      ? { label: 'Padrino SMR', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
                      : donor.badge === 'protector' || donor.badge === ('mecenas' as any)
                      ? { label: 'Protector', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
                      : { label: 'Colaborador', color: 'text-foreground-subtle bg-surface-hover/60 border-border/60' };

                  return (
                    <div
                      key={donor.userId || idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isTop1
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : isTop2
                          ? 'bg-surface-raised border-border/60'
                          : isTop3
                          ? 'bg-amber-800/5 dark:bg-amber-700/5 border-amber-700/30'
                          : 'bg-surface/50 dark:bg-surface-raised/40 border-border/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                            isTop1
                              ? 'bg-amber-500 text-black shadow-xs'
                              : isTop2
                              ? 'bg-accent-subtle text-accent'
                              : isTop3
                              ? 'bg-amber-700/80 text-white'
                              : 'bg-surface-raised text-foreground-muted'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">
                            @{donor.username}
                          </div>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border inline-flex items-center gap-1 mt-0.5 ${badgeInfo.color}`}>
                            <span>{badgeInfo.label}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                          {donor.totalDonated >= 1000000000
                            ? `${(donor.totalDonated / 1000000000).toFixed(2)}B`
                            : donor.totalDonated >= 1000000
                            ? `${(donor.totalDonated / 1000000).toFixed(1)}M`
                            : donor.totalDonated.toLocaleString()}
                        </div>
                        <span className="text-[9px] text-foreground-subtle font-mono">donadas</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 5: FONDO BOTELLÓN (SISTEMA DE INVERSIONES COMPARTIDO) */}
      {activeTab === 'inversiones' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => {
              setActiveTab('mas');
              sound.tap();
            }}
            className="flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors cursor-pointer min-h-[36px]"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            <span>Más</span>
          </button>

          <BotellonInvestments
            userCoins={userCoins}
            userId={userId}
            username={username}
            mascotaEquipada={mascotaEquipada}
            onUpdateCoins={onUpdateCoins}
            onRequireAuth={onRequireAuth}
          />
        </div>
      )}

      {/* Mini-tutorial interactivo (primera visita y bajo demanda) */}
      {showTutorial && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="fixed inset-0" onClick={handleCloseTutorial} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Wine className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  Guía de El Botellón · Paso {tutorialStep + 1} de 3
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseTutorial}
                className="p-1.5 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-hover cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Content */}
            <div className="py-2 space-y-3">
              {tutorialStep === 0 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-accent mx-auto mb-2">
                    <Wine className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground text-center">
                    1. Bebidas y Generación Continua
                  </h4>
                  <p className="leading-relaxed text-center">
                    Haz clic en el trago manual para acumular fichas directas. En <strong>Mejoras</strong> puedes comprar y subir de nivel tus suministros (litronas, hielos, chupitos, botellas) y activar Perks para producir fichas por segundo de forma continua, incluso cuando cierres la ventana.
                  </p>
                </div>
              )}

              {tutorialStep === 1 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500 mx-auto mb-2">
                    <Coins className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground text-center">
                    2. Canje Oficial 5 a 1 a tu Cartera
                  </h4>
                  <p className="leading-relaxed text-center">
                    Tus fichas se acumulan en la pantalla de Inicio. La tasa de cambio oficial es fija: <strong>5 fichas = 1 moneda real</strong>. Pulsa <strong>&quot;Canjear al monedero&quot;</strong> cuando quieras para ingresar el saldo directamente a tu cuenta y usarlo en el Casino o subir en el Ranking.
                  </p>
                </div>
              )}

              {tutorialStep === 2 && (
                <div className="space-y-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 mx-auto mb-2">
                    <RotateCcw className="w-6 h-6" />
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
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((s) => (
                  <span
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      tutorialStep === s ? 'w-5 bg-accent' : 'w-2 bg-border'
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
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground bg-surface-raised hover:bg-surface-hover border border-border cursor-pointer transition-colors"
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
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 cursor-pointer active:scale-95 transition-all shadow-xs"
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
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 cursor-pointer active:scale-95 shadow-xs transition-all"
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
            <div className="relative z-10 w-full max-w-md rounded-3xl bg-surface border border-border shadow-2xl p-6 sm:p-7 space-y-5 text-foreground select-none">
              {/* Encabezado */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted">
                      Sistema de Prestigio
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-raised text-foreground-muted border border-border">
                      Nivel {afterPrestigeCount}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground font-sans">
                    Renacimiento
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed font-sans">
                    Reinicia los suministros de esta ronda a cambio de un incremento permanente en la tasa de producción, farmeo base pasivo y potencia de clic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAfterModal(false)}
                  className="w-8 h-8 rounded-xl text-foreground-subtle hover:text-foreground hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Estadísticas de Renacimiento */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-surface-raised border border-border/60/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted block">
                    Nivel de Renacimiento
                  </span>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-base font-bold text-foreground-muted">#{afterPrestigeCount}</span>
                    <span className="text-xs text-foreground-subtle">→</span>
                    <span className="text-base font-bold text-foreground">#{nextPrestigeCount}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-raised border border-border/60/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted block">
                    Multiplicador Global
                  </span>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-base font-bold text-foreground-muted">x{currentMultiplier.toFixed(2)}</span>
                    <span className="text-xs text-foreground-subtle">→</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">x{nextMultiplier.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-raised border border-border/60/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted block">
                    Producción Base
                  </span>
                  <div className="font-mono text-sm font-bold text-foreground">
                    +{nextPermanentRate}/s <span className="text-[10px] text-foreground-subtle font-normal">garantizado</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-raised border border-border/60/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted block">
                    Potencia de Clic
                  </span>
                  <div className="font-mono text-sm font-bold text-foreground">
                    +{nextBaseClick}/clic <span className="text-[10px] text-foreground-subtle font-normal">por trago</span>
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
                <div className="p-3 rounded-2xl bg-surface-raised/60 border border-border/60 flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">Conversión de bote a cartera:</span>
                  <span className="font-mono font-bold text-foreground">
                    +{coinsReward.toLocaleString()} monedas
                  </span>
                </div>
              )}

              {/* Barra de progreso de la ronda actual */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-surface-raised border border-border/60/60">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-foreground-muted">Fichas de esta ronda:</span>
                  <span className="font-bold text-foreground">
                    {Math.floor(currentRunProduced).toLocaleString()} / {requiredRunProd.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-hover overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Reglas claras y concisas */}
              <div className="space-y-1.5 text-xs text-foreground-muted font-sans border-t border-border pt-3">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-foreground shrink-0">Suministros:</span>
                  <span>Se compran exclusivamente con fichas del botellón. ¡Tus monedas reales de la cartera nunca se descuentan al mejorar!</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-foreground shrink-0">Al Renacer:</span>
                  <span>Consigues el multiplicador permanente acumulativo y capital de arranque para comprar suministros de inmediato.</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAfterModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-medium text-foreground-muted bg-surface-raised hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={!canPrestige}
                  onClick={handleConfirmAfter}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5 ${
                    canPrestige
                      ? 'text-accent-foreground bg-accent hover:opacity-90'
                      : 'bg-surface-raised text-foreground-subtle cursor-not-allowed opacity-60'
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
          <div className={`relative z-10 w-full max-w-md rounded-3xl bg-surface border shadow-2xl overflow-hidden p-6 sm:p-7 space-y-4 ${
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

              <p className="text-xs text-foreground-muted leading-relaxed">
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
                    <strong>Golpe fiscal a la gran fortuna.</strong> La policía ha requisado más de 1 millón de monedas de tu fortuna acumulada.
                  </div>
                )}
                {afterRaidResult.vaultLost > 0 && (
                  <div className="flex items-center justify-between text-red-700 dark:text-red-300">
                    <span>Fichas requisadas del bote:</span>
                    <span className="font-bold">-{afterRaidResult.vaultLost.toLocaleString()} fichas</span>
                  </div>
                )}
                <div className="pt-2 border-t border-red-200 dark:border-red-900/40 flex items-center justify-between text-foreground-muted text-[11px] font-sans">
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
                  <span className="font-bold text-foreground">x{prestigeMultiplier.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Aviso de sospecha para el siguiente After */}
            <div className="p-3 rounded-xl bg-surface-raised border border-border text-[11px] text-foreground-muted flex items-center justify-between gap-2">
              <span>Sospecha actual: <strong>Nivel {afterRaidResult.nextLevel}</strong></span>
              <span className="font-mono text-red-700 dark:text-red-300 font-semibold">
                {getAfterRiskStats(afterRaidResult.nextLevel, userCoins).raidChancePct}% riesgo próximo
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAfterRaidResult(null)}
              className="w-full min-h-[44px] py-2.5 rounded-xl font-semibold text-xs bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer active:scale-[0.98] shadow-sm touch-manipulation"
            >
              {afterRaidResult.type === 'raid' ? 'Asumir sanción y continuar' : '¡Seguir la fiesta!'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Reporte de Inspección Policial Nocturna (Alijo Desprotegido) */}
      {policeRaidReport && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in select-none"
        >
          <div className="w-full max-w-sm rounded-3xl bg-surface border border-red-200 dark:border-red-900/50 p-6 space-y-4 shadow-2xl text-xs text-foreground">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Inspección Policial Nocturna
              </h3>
              <p className="text-xs text-foreground-muted">
                Estuviste ausente {policeRaidReport.hours}h con el <strong>alijo desprotegido</strong>. La patrulla municipal intervino el botellón:
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-center space-y-2">
              <div className="space-y-0.5">
                <span className="text-[11px] font-mono text-foreground-muted">Fichas requisadas del bote:</span>
                <div className="text-xl font-bold font-mono text-red-700 dark:text-red-400">
                  -{policeRaidReport.fichasLost.toLocaleString()} fichas
                </div>
              </div>

              {policeRaidReport.coinsLost > 0 && (
                <div className="pt-2 border-t border-red-200/60 dark:border-red-900/40 space-y-0.5">
                  <span className="text-[11px] font-mono text-foreground-muted">Tasa por abandono sin seguridad:</span>
                  <div className="text-sm font-bold font-mono text-red-600 dark:text-red-400">
                    -{policeRaidReport.coinsLost.toLocaleString()} monedas
                  </div>
                </div>
              )}

              <p className="text-[10px] text-foreground-muted pt-1">
                Para evitar requisas futuras y obtener +20% de producción, mantén blindada la bóveda con el servicio de seguridad.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPoliceRaidReport(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-hover text-foreground-muted font-medium text-xs cursor-pointer transition-all"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setPoliceRaidReport(null);
                  handleGuardStash('fichas');
                }}
                className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-xs cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all shadow-sm touch-manipulation"
              >
                Blindar Alijo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
