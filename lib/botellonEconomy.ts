/**
 * SMR2 · Economía progresiva y absurda de El Botellón (fuente única de verdad).
 * Compartido entre `PartyIdleGame.tsx` (UI) y los endpoints de servidor
 * (`/api/botellon/action`, `/api/botellon/sync`, `/api/game/rebirth`).
 */

export const BOTELLON_TIER_BASE_COSTS: Record<string, number> = {
  litronas: 35,
  hielos: 120,
  chupitos: 450,
  botellas: 1_700,
  altavoz: 6_000,
  barra_libre: 22_000,
  vip: 80_000,
};

export const BOTELLON_PERK_COSTS: Record<string, number> = {
  aguante_hierro: 1_500,
  descuento_chino: 15_000,
  bafles_jbl: 120_000,
  enchufe_barra: 1_500_000,
  pase_vip: 25_000_000,
  camion_hielos: 500_000_000, // 500M
  dj_residente: 25_000_000_000, // 25B
  patrocinio_marca: 1_500_000_000_000, // 1.5T
  imperio_nocturno: 50_000_000_000_000, // 50T
};

export const BOTELLON_ZONE_REQUIREMENTS: Record<string, number> = {
  parque: 0,
  portal: 1_500,
  piso: 12_000,
  callejon: 75_000,
  discoteca: 500_000,
  macrofestival: 5_000_000,
  after_clandestino: 75_000_000,
  jet_privado: 500_000_000,
  isla_privada: 250_000_000_000,
  estacion_orbital: 50_000_000_000_000,
};

const MAX_FINITE_PRICE = 1e30;

/**
 * Calcula el coste absurdo y progresivo de subir un nivel en El Botellón.
 * - Mantiene accesibles los primeros niveles (0-10) para cuentas nuevas.
 * - Escala agresivamente por tramos (25+, 50+, 80+, 100+) y por prestigio acumulado
 *   para alcanzar cientos de millones, billones, trillones y cuatrillones.
 */
export function getTierUpgradeCost(
  baseCost: number,
  currentLevel: number,
  afterPrestigeCount: number = 0
): number {
  const lvl = Math.max(0, Math.floor(Number.isFinite(currentLevel) ? currentLevel : 0));
  const prestige = Math.max(0, Math.floor(Number.isFinite(afterPrestigeCount) ? afterPrestigeCount : 0));

  // Crecimiento base 1.32^lvl
  let mult = Math.pow(1.32, Math.min(lvl, 220));

  // Aceleración absurda por tramos de nivel
  if (lvl >= 25) mult *= Math.pow(1.08, Math.min(lvl - 25, 180));
  if (lvl >= 50) mult *= Math.pow(1.15, Math.min(lvl - 50, 140));
  if (lvl >= 80) mult *= Math.pow(1.25, Math.min(lvl - 80, 100));
  if (lvl >= 100) mult *= Math.pow(1.40, Math.min(lvl - 100, 80));

  // Impuesto inflacionario por Afters acumulados (acotado para no desbordar IEEE 754)
  const prestigeTax =
    1 +
    Math.min(prestige, 150) * 0.25 +
    Math.pow(Math.min(prestige, 2000), 1.4) * 0.05;

  const raw = baseCost * mult * prestigeTax;
  if (!Number.isFinite(raw) || raw > MAX_FINITE_PRICE) {
    return MAX_FINITE_PRICE;
  }
  return Math.max(1, Math.floor(raw));
}

/**
 * Multiplicador de prestigio inteligente sin límite de rebirths:
 * - Rebirths 1..15: crecimiento rápido y gratificante (1 -> x2.00, 10 -> x18.50, 15 -> x31.00).
 * - Rebirths > 15: rendimientos decrecientes suaves (raíz cuadrada) para poder
 *   seguir renaciendo infinitamente sin romper la economía con x100.000.
 */
export function calculatePrestigeMultiplier(count: number): number {
  const c = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  if (c <= 0) return 1.0;

  const baseSteps = Math.min(c, 15);
  let mult = 1.0 + baseSteps * 1.0;
  if (baseSteps >= 2) mult += (baseSteps - 1) * 0.5;
  if (baseSteps >= 4) mult += (baseSteps - 3) * 0.5;
  if (baseSteps >= 7) mult += (baseSteps - 6) * 0.5;

  if (c > 15) {
    mult += 12 * Math.sqrt(c - 15);
  }
  return Number(mult.toFixed(2));
}

/**
 * Producción mínima requerida en la ronda actual para irse de After (Renacimiento).
 * Sin límite de rebirths y sin bloqueo imposible:
 * - After 0..5: crecimiento x3.0 por nivel
 * - After 6..20: crecimiento x1.85 por nivel
 * - After 21+: escalado polinómico continuo (exigente pero siempre alcanzable)
 */
export function getRequiredAfterProduction(afterCount: number): number {
  const count = Math.max(0, Math.floor(Number.isFinite(afterCount) ? afterCount : 0));
  if (count <= 0) return 25_000;
  if (count <= 5) {
    return Math.floor(25_000 * Math.pow(3.0, count));
  }
  if (count <= 20) {
    return Math.floor(25_000 * Math.pow(3.0, 5) * Math.pow(1.85, count - 5));
  }
  const base20 = 25_000 * Math.pow(3.0, 5) * Math.pow(1.85, 15);
  const extra = count - 20;
  const raw = base20 * Math.pow(1 + extra * 0.35, 2.2);
  if (!Number.isFinite(raw) || raw > MAX_FINITE_PRICE) {
    return MAX_FINITE_PRICE;
  }
  return Math.floor(raw);
}

const TIER_BASE_RATES: Record<string, number> = {
  litronas: 0.1,
  hielos: 0.4,
  chupitos: 1.5,
  botellas: 5.0,
  altavoz: 16.0,
  barra_libre: 50.0,
  vip: 160.0,
};

const ZONE_MULTIPLIERS: Record<string, number> = {
  parque: 1.0,
  portal: 1.25,
  piso: 1.6,
  callejon: 2.1,
  discoteca: 2.8,
  macrofestival: 3.8,
  after_clandestino: 5.0,
  jet_privado: 12.0,
  isla_privada: 35.0,
  estacion_orbital: 100.0,
};

const GLOBAL_PERK_MULTS: Record<string, number> = {
  camion_hielos: 2.5,
  dj_residente: 4.0,
  patrocinio_marca: 8.0,
  imperio_nocturno: 20.0,
};

/**
 * Estima en servidor la producción máxima por segundo legítima (incluyendo margen
 * amplio para Fiesta Loca x3, Beca Novatos x4, Mascota x1.5, Bóveda x1.2 y clics).
 */
export function estimateMaxBotellonRatePerSecond(params: {
  levels: Record<string, number>;
  afterPrestigeCount: number;
  currentZoneId: string;
  purchasedPerks: string[];
}): number {
  const prestige = Math.max(0, Math.floor(params.afterPrestigeCount || 0));
  const prestigeMult = calculatePrestigeMultiplier(prestige);
  const zoneMult = ZONE_MULTIPLIERS[params.currentZoneId] ?? 1.0;

  let perkMult = 1.0;
  for (const perk of params.purchasedPerks || []) {
    if (perk in GLOBAL_PERK_MULTS) {
      perkMult *= GLOBAL_PERK_MULTS[perk];
    }
  }

  let suppliesBase = 0;
  for (const [tierId, baseRate] of Object.entries(TIER_BASE_RATES)) {
    const lvl = Math.max(0, Math.floor(Number(params.levels?.[tierId] || 0)));
    let milestone = 1;
    if (lvl >= 10) milestone *= 1.3;
    if (lvl >= 25) milestone *= 1.4;
    if (lvl >= 50) milestone *= 1.6;
    if (lvl >= 100) milestone *= 2.0;
    suppliesBase += lvl * baseRate * milestone;
  }

  const permanentPrestigeRate = prestige > 0 ? prestige * 25 * prestigeMult : 0;
  // Rango máximo x2.0, Fiesta Loca x3, Novato x4, Mascota x1.5, Bóveda x1.2
  const maxBuffs = 2.0 * 3.0 * 4.0 * 1.5 * 1.2;
  const passiveRate = (suppliesBase * zoneMult * 2.0 * perkMult * prestigeMult + permanentPrestigeRate) * maxBuffs;
  return Math.max(500, passiveRate);
}

/**
 * Coste severo y proporcional para blindar el alijo frente a redadas.
 */
export function getVaultGuardCost(
  userCoins: number,
  vaultFichas: number = 0
): { costCoins: number; costFichas: number } {
  const coins = Math.max(0, Number.isFinite(userCoins) ? userCoins : 0);
  const fichas = Math.max(0, Number.isFinite(vaultFichas) ? vaultFichas : 0);

  let costCoins = 50;
  let costFichas = 250;

  if (coins >= 1_000_000_000_000) {
    // Fortunas de Trillones (>1T): 15% de la fortuna + 45% del bote
    costCoins = Math.floor(coins * 0.15);
    costFichas = Math.floor(Math.max(500_000_000_000, fichas * 0.45));
  } else if (coins >= 1_000_000_000) {
    // Fortunas de Billones (>1B): 11% de la fortuna
    costCoins = Math.floor(coins * 0.11);
    costFichas = Math.floor(Math.max(100_000_000, fichas * 0.40));
  } else if (coins >= 100_000_000) {
    costCoins = Math.floor(coins * 0.08);
    costFichas = Math.floor(Math.max(10_000_000, fichas * 0.35));
  } else if (coins >= 10_000_000) {
    costCoins = Math.floor(coins * 0.06);
    costFichas = Math.floor(Math.max(2_000_000, fichas * 0.25));
  } else if (coins >= 1_000_000) {
    costCoins = Math.floor(coins * 0.045);
    costFichas = Math.floor(Math.max(250_000, fichas * 0.18));
  } else if (coins >= 100_000) {
    costCoins = Math.floor(coins * 0.03);
    costFichas = Math.floor(Math.max(25_000, fichas * 0.12));
  } else if (coins >= 10_000) {
    costCoins = Math.floor(coins * 0.015);
    costFichas = Math.floor(Math.max(2_500, fichas * 0.08));
  }

  return { costCoins, costFichas };
}
