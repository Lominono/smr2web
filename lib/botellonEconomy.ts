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
 * Producción mínima requerida en la ronda actual para irse de After (Renacimiento).
 * Sin tope artificial bajo: escala hasta trillones y cuatrillones.
 */
export function getRequiredAfterProduction(afterCount: number): number {
  const count = Math.max(0, Math.floor(Number.isFinite(afterCount) ? afterCount : 0));
  if (count <= 0) return 25_000;
  if (count <= 5) {
    return Math.floor(25_000 * Math.pow(3.0, count));
  }
  const raw = 25_000 * Math.pow(3.0, 5) * Math.pow(1.95, Math.min(count - 5, 50));
  if (!Number.isFinite(raw) || raw > MAX_FINITE_PRICE) {
    return MAX_FINITE_PRICE;
  }
  return Math.floor(raw);
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
