/**
 * SMR2 · Reglas económicas del servidor (fuente única de verdad).
 *
 * Todas las peticiones de saldo del cliente son datos NO confiables. Este módulo
 * define los topes, cooldowns y presupuestos que el servidor aplica antes de
 * mover una sola moneda. Los valores están pensados para no romper la economía
 * hiperinflacionada del botellón (progresión exponencial) pero impedir que una
 * sola petición fabricada multiplique el saldo por billones.
 */

/** Tipos de movimiento aceptados desde el cliente. */
export type WalletClaimType =
  | 'game' // premio de minijuego con apuesta (requiere recibo firmado)
  | 'daily' // recompensa diaria (importe calculado en servidor)
  | 'spin' // ruleta diaria (importe calculado en servidor)
  | 'rescue' // fondo de rescate (importe fijo)
  | 'vault' // canje del alijo del botellón
  | 'subsidio' // subsidio social del botellón
  | 'rebirth' // sobrante al renacer
  | 'checkin' // check-in de asistencia
  | 'misc'; // cualquier otra recompensa de juego

export const WALLET_CLAIM_TYPES: readonly WalletClaimType[] = [
  'game',
  'daily',
  'spin',
  'rescue',
  'vault',
  'subsidio',
  'rebirth',
  'checkin',
  'misc',
];

export function normalizeClaimType(value: unknown): WalletClaimType {
  if (typeof value === 'string' && (WALLET_CLAIM_TYPES as readonly string[]).includes(value)) {
    return value as WalletClaimType;
  }
  return 'misc';
}

/** Delta máximo absoluto aceptado (evita desbordes numéricos). */
export const MAX_ABS_DELTA = 1_000_000_000_000_000; // 1e15

/** Apuesta mínima/máxima de un minijuego. */
export const MIN_STAKE = 5;
export const MAX_STAKE = 1_000;

/** Pago máximo por ronda de minijuego. */
export const MAX_ROUND_PAYOUT = 36_000;

/** Presupuesto de premios de casino por usuario. */
export const CASINO_WIN_PER_MINUTE = 60_000;
export const CASINO_WIN_PER_HOUR = 300_000;

/** Tiempo mínimo (ms) entre apuesta y cobro de un premio. */
export const MIN_ROUND_DURATION_MS = 400;

/** Validez del recibo de ronda (segundos). */
export const ROUND_RECEIPT_TTL_SECONDS = 900;

/** Recompensa diaria según racha (idéntica a lib/economy.ts). */
export function dailyRewardForStreak(streak: number): number {
  const rewards = [25, 45, 70, 105, 150];
  const index = Math.min(Math.max(Math.floor(streak) - 1, 0), rewards.length - 1);
  return rewards[index];
}

/** Premio de la ruleta diaria con la distribución original (30/30/20/12/6/2 %). */
export function spinReward(randomValue: number): number {
  if (randomValue < 0.3) return 15;
  if (randomValue < 0.6) return 25;
  if (randomValue < 0.8) return 40;
  if (randomValue < 0.92) return 60;
  if (randomValue < 0.98) return 80;
  return 120;
}

export const RESCUE_THRESHOLD = 50;
export const RESCUE_AMOUNT = 50;
export const RESCUE_COOLDOWN_MS = 30 * 60 * 1000;
export const SPIN_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export interface CooldownRule {
  /** Tiempo mínimo entre dos cobros del mismo tipo */
  cooldownMs: number;
  /** Presupuesto relativo al saldo actual (0.05 = 5 %) */
  relativeCap: number;
  /** Suelo del presupuesto por operación */
  floorCap: number;
}

/**
 * Reglas de las recompensas que no requieren apuesta.
 * El tope es relativo al saldo: un alumno con millones puede cobrar millones,
 * pero nadie puede pasar de 0 a billones en una petición.
 */
export const CLAIM_RULES: Record<Exclude<WalletClaimType, 'game' | 'daily' | 'spin' | 'rescue'>, CooldownRule> = {
  vault: { cooldownMs: 5_000, relativeCap: 2.0, floorCap: 500_000 },
  subsidio: { cooldownMs: 2 * 60 * 60 * 1000, relativeCap: 0.5, floorCap: 50_000 },
  rebirth: { cooldownMs: 10_000, relativeCap: 2.0, floorCap: 500_000 },
  checkin: { cooldownMs: 20 * 60 * 60 * 1000, relativeCap: 0.05, floorCap: 500 },
  misc: { cooldownMs: 2_000, relativeCap: 0.5, floorCap: 250_000 },
};

/** Presupuesto de ganancias no-casino por ventana temporal. */
export function earningsBudget(balance: number): { perMinute: number; perHour: number } {
  const safeBalance = Math.max(0, Number.isFinite(balance) ? balance : 0);
  return {
    perMinute: Math.max(1_000_000, Math.floor(safeBalance * 3)),
    perHour: Math.max(10_000_000, Math.floor(safeBalance * 10)),
  };
}

/**
 * Tope por operación para una recompensa relativa al saldo.
 * Se permite además hasta 3 veces el último cobro aceptado del mismo tipo,
 * para que un alumno que gastó sus monedas (mascotas, alijo...) no pierda el
 * progreso acumulado en el botellón.
 */
export function perClaimCap(balance: number, rule: CooldownRule, lastAcceptedAmount = 0): number {
  const safeBalance = Math.max(0, Number.isFinite(balance) ? balance : 0);
  const safeLast = Math.max(0, Number.isFinite(lastAcceptedAmount) ? lastAcceptedAmount : 0);
  return Math.max(rule.floorCap, Math.floor(safeBalance * rule.relativeCap), safeLast * 3);
}

/** Milisegundos transcurridos desde una fecha ISO (0 si no es válida). */
export function msSince(isoDate: unknown): number {
  if (typeof isoDate !== 'string') return Number.POSITIVE_INFINITY;
  const time = new Date(isoDate).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Date.now() - time);
}

/** Indica si dos fechas ISO caen en el mismo día UTC. */
export function isSameUtcDay(aIso: unknown, bIso: string = new Date().toISOString()): boolean {
  if (typeof aIso !== 'string' || !aIso) return false;
  const a = new Date(aIso);
  const b = new Date(bIso);
  if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime())) return false;
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export interface RoundValidation {
  allowed: boolean;
  reason?: string;
  stake: number;
}

/**
 * Valida el recibo de una ronda y el importe del premio solicitado.
 * `payout` debe ser ≤ MAX_ROUND_PAYOUT y ≤ apuesta × 40 (curva máxima de los
 * minijuegos actuales: ruleta 36x, crash 25x, minas con multiplicador alto).
 */
export function validateRoundPayout(stake: number, payout: number): RoundValidation {
  if (!Number.isFinite(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
    return { allowed: false, reason: 'El recibo de apuesta no es válido.', stake };
  }
  if (!Number.isFinite(payout) || payout <= 0) {
    return { allowed: false, reason: 'El premio solicitado no es válido.', stake };
  }
  if (payout > MAX_ROUND_PAYOUT) {
    return {
      allowed: false,
      reason: `El premio máximo por ronda es de ${MAX_ROUND_PAYOUT.toLocaleString()} monedas.`,
      stake,
    };
  }
  if (payout > stake * 40) {
    return { allowed: false, reason: 'El premio no es coherente con la apuesta realizada.', stake };
  }
  return { allowed: true, stake };
}
