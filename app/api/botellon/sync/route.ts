import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, readJsonBody } from '@/lib/security/http';
import { isUUID } from '@/lib/uuid';
import {
  BOTELLON_ZONE_REQUIREMENTS,
  estimateMaxBotellonRatePerSecond,
} from '@/lib/botellonEconomy';

export const dynamic = 'force-dynamic';

const DEFAULT_LEVELS: Record<string, number> = {
  litronas: 0,
  hielos: 0,
  chupitos: 0,
  botellas: 0,
  altavoz: 0,
  barra_libre: 0,
  vip: 0,
};

interface BotellonRow {
  user_id: string;
  levels: Record<string, number>;
  pending_vault: number | string;
  current_run_produced: number | string;
  total_lifetime_produced: number | string;
  after_prestige_count: number | string;
  current_zone_id: string;
  purchased_perks: string[];
  total_drinks_taken: number | string;
  beer_pong_wins: number | string;
  hangover_level: number | string;
  after_suspicion_level: number | string;
  guard_active_until_ms: number | string;
  last_after_ms: number | string;
  last_subsidio_ms: number | string;
  last_tick_ms: number | string;
}

function rowToClientState(row: BotellonRow) {
  return {
    levels: { ...DEFAULT_LEVELS, ...(row.levels || {}) },
    pendingVault: Number(row.pending_vault || 0),
    currentRunProduced: Number(row.current_run_produced || 0),
    totalLifetimeProduced: Number(row.total_lifetime_produced || 0),
    afterPrestigeCount: Number(row.after_prestige_count || 0),
    rebirths: Number(row.after_prestige_count || 0),
    currentZoneId: row.current_zone_id || 'parque',
    purchasedPerks: Array.isArray(row.purchased_perks) ? row.purchased_perks : [],
    totalDrinksTaken: Number(row.total_drinks_taken || 0),
    beerPongWins: Number(row.beer_pong_wins || 0),
    hangoverLevel: Number(row.hangover_level || 0),
    afterSuspicionLevel: Number(row.after_suspicion_level || 0),
    guardActiveUntilMs: Number(row.guard_active_until_ms || 0),
    lastAfterTimestamp: Number(row.last_after_ms || 0),
    lastSubsidioClaimMs: Number(row.last_subsidio_ms || 0),
    lastTickMs: Number(row.last_tick_ms || Date.now()),
  };
}

function sanitizeFinitePositive(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export async function GET() {
  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return fail('No autorizado.', 401);
    }

    if (!isServerSupabaseConfigured()) {
      return fail('Base de datos no configurada.', 503);
    }

    const client = createAdminClient();
    if (!client) return fail('Error de conexión con la base de datos.', 500);

    const userId = session.user.id;
    const { data: stateRow, error } = await client
      .from('botellon_states')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return fail('Error al leer estado del Botellón.', 500);

    if (stateRow) {
      return NextResponse.json({
        success: true,
        state: rowToClientState(stateRow as BotellonRow),
      });
    }

    // Fallback a profiles.party_farm_data si aún no existía fila en botellon_states
    const { data: profile } = await client
      .from('profiles')
      .select('party_farm_data')
      .eq('id', userId)
      .maybeSingle();

    const legacy = (profile?.party_farm_data && typeof profile.party_farm_data === 'object')
      ? (profile.party_farm_data as Record<string, unknown>)
      : null;

    if (!legacy || Object.keys(legacy).length === 0) {
      return NextResponse.json({ success: true, state: null });
    }

    const prestige = Math.max(
      0,
      Math.trunc(sanitizeFinitePositive(legacy.afterPrestigeCount ?? legacy.rebirths, 0))
    );
    const seedRow = {
      user_id: userId,
      levels: (legacy.levels && typeof legacy.levels === 'object') ? legacy.levels : DEFAULT_LEVELS,
      pending_vault: sanitizeFinitePositive(legacy.pendingVault, 0),
      current_run_produced: sanitizeFinitePositive(legacy.currentRunProduced, 0),
      total_lifetime_produced: sanitizeFinitePositive(legacy.totalLifetimeProduced, 0),
      after_prestige_count: prestige,
      current_zone_id: typeof legacy.currentZoneId === 'string' && legacy.currentZoneId in BOTELLON_ZONE_REQUIREMENTS
        ? legacy.currentZoneId
        : 'parque',
      purchased_perks: Array.isArray(legacy.purchasedPerks)
        ? legacy.purchasedPerks.filter((p): p is string => typeof p === 'string')
        : [],
      total_drinks_taken: Math.trunc(sanitizeFinitePositive(legacy.totalDrinksTaken, 0)),
      beer_pong_wins: Math.trunc(sanitizeFinitePositive(legacy.beerPongWins, 0)),
      hangover_level: Math.trunc(sanitizeFinitePositive(legacy.hangoverLevel, 0)),
      after_suspicion_level: Math.trunc(sanitizeFinitePositive(legacy.afterSuspicionLevel, 0)),
      guard_active_until_ms: Math.trunc(sanitizeFinitePositive(legacy.guardActiveUntilMs, 0)),
      last_after_ms: Math.trunc(sanitizeFinitePositive(legacy.lastAfterTimestamp, 0)),
      last_subsidio_ms: Math.trunc(sanitizeFinitePositive(legacy.lastSubsidioClaimMs, 0)),
      last_tick_ms: Math.trunc(sanitizeFinitePositive(legacy.lastTickMs, Date.now())),
    };

    await client.from('botellon_states').upsert(seedRow, { onConflict: 'user_id' });

    return NextResponse.json({
      success: true,
      state: rowToClientState(seedRow as BotellonRow),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener estado.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return fail('No autorizado.', 401);
    }

    const userId = session.user.id;
    const rate = enforceRateLimit(`botellon-sync:${userId}`, { limit: 40, windowMs: 60_000 });
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Cuerpo JSON inválido o demasiado grande.', 400);
    const incoming = (body.state && typeof body.state === 'object' ? body.state : null) as Record<string, unknown> | null;
    if (!incoming) {
      return fail('Estado inválido.', 400);
    }

    if (!isServerSupabaseConfigured()) {
      return fail('Base de datos no configurada.', 503);
    }

    const client = createAdminClient();
    if (!client) return fail('Error de conexión con la base de datos.', 500);

    const { data: existing } = await client
      .from('botellon_states')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const now = Date.now();

    // Reglas de integridad:
    // - Si ya existe fila en servidor, `levels`, `after_prestige_count`, `purchased_perks`
    //   y `guard_active_until_ms` NO se sobrescriben desde /sync (solo desde /action y /rebirth).
    // - La producción/fichas nuevas se acotan a un máximo razonable por sincronización para evitar
    //   inyecciones directas de trillones desde DevTools.
    const existingRow = existing as BotellonRow | null;
    const currentLifetime = existingRow ? Number(existingRow.total_lifetime_produced || 0) : 0;
    const currentRun = existingRow ? Number(existingRow.current_run_produced || 0) : 0;
    const currentVault = existingRow ? Number(existingRow.pending_vault || 0) : 0;
    const currentDrinks = existingRow ? Number(existingRow.total_drinks_taken || 0) : 0;
    const currentBeerPong = existingRow ? Number(existingRow.beer_pong_wins || 0) : 0;

    const reqLifetime = sanitizeFinitePositive(incoming.totalLifetimeProduced, currentLifetime);
    const reqRun = sanitizeFinitePositive(incoming.currentRunProduced, currentRun);
    const reqVault = sanitizeFinitePositive(incoming.pendingVault, currentVault);
    const reqDrinks = Math.trunc(sanitizeFinitePositive(incoming.totalDrinksTaken, currentDrinks));
    const reqBeerPong = Math.trunc(sanitizeFinitePositive(incoming.beerPongWins, currentBeerPong));

    // Límite inteligente por sincronización: calcula la tasa máxima teórica del jugador
    // según sus niveles, prestigio, zona y perks + tiempo transcurrido (acotado a 8h offline).
    const lastTick = existingRow ? Number(existingRow.last_tick_ms || now) : now;
    const elapsedSec = Math.max(5, Math.min(8 * 3600, Math.floor((now - lastTick) / 1000)));
    const maxRate = existingRow
      ? estimateMaxBotellonRatePerSecond({
          levels: existingRow.levels || DEFAULT_LEVELS,
          afterPrestigeCount: Number(existingRow.after_prestige_count || 0),
          currentZoneId: existingRow.current_zone_id || 'parque',
          purchasedPerks: Array.isArray(existingRow.purchased_perks) ? existingRow.purchased_perks : [],
        })
      : 500;
    const maxDelta = Math.max(
      250_000,
      Math.floor(maxRate * elapsedSec * 1.5),
      Math.floor(Math.max(currentLifetime, currentVault, 1) * 0.25)
    );
    const safeLifetime = existingRow
      ? Math.max(currentLifetime, Math.min(reqLifetime, currentLifetime + maxDelta))
      : Math.min(reqLifetime, 250_000);
    const safeRun = existingRow
      ? Math.max(0, Math.min(reqRun, currentRun + maxDelta))
      : Math.min(reqRun, 250_000);
    const safeVault = existingRow
      ? Math.max(0, Math.min(reqVault, currentVault + maxDelta))
      : Math.min(reqVault, 250_000);

    const safeDrinks = existingRow
      ? Math.max(currentDrinks, Math.min(reqDrinks, currentDrinks + 500))
      : Math.min(reqDrinks, 500);
    const safeBeerPong = existingRow
      ? Math.max(currentBeerPong, Math.min(reqBeerPong, currentBeerPong + 10))
      : Math.min(reqBeerPong, 10);

    const requestedZone = typeof incoming.currentZoneId === 'string' ? incoming.currentZoneId : 'parque';
    const zoneReq = BOTELLON_ZONE_REQUIREMENTS[requestedZone];
    const safeZone =
      typeof zoneReq === 'number' && safeLifetime >= zoneReq
        ? requestedZone
        : existingRow?.current_zone_id || 'parque';

    const nextRow = {
      user_id: userId,
      levels: existingRow ? existingRow.levels : DEFAULT_LEVELS,
      pending_vault: safeVault,
      current_run_produced: safeRun,
      total_lifetime_produced: safeLifetime,
      after_prestige_count: existingRow ? Number(existingRow.after_prestige_count || 0) : 0,
      current_zone_id: safeZone,
      purchased_perks: existingRow ? existingRow.purchased_perks : [],
      total_drinks_taken: safeDrinks,
      beer_pong_wins: safeBeerPong,
      hangover_level: Math.min(20, Math.trunc(sanitizeFinitePositive(incoming.hangoverLevel, existingRow ? Number(existingRow.hangover_level || 0) : 0))),
      after_suspicion_level: Math.min(10, Math.trunc(sanitizeFinitePositive(incoming.afterSuspicionLevel, existingRow ? Number(existingRow.after_suspicion_level || 0) : 0))),
      guard_active_until_ms: existingRow ? Number(existingRow.guard_active_until_ms || 0) : 0,
      last_after_ms: existingRow ? Number(existingRow.last_after_ms || 0) : 0,
      last_subsidio_ms: existingRow ? Number(existingRow.last_subsidio_ms || 0) : 0,
      last_tick_ms: now,
    };

    const { error: upsertErr } = await client
      .from('botellon_states')
      .upsert(nextRow, { onConflict: 'user_id' });

    if (upsertErr) return fail('Error al guardar estado en botellon_states.', 500);

    const clientState = rowToClientState(nextRow as BotellonRow);
    // Mantener profiles.party_farm_data sincronizado por compatibilidad
    await client
      .from('profiles')
      .update({ party_farm_data: clientState })
      .eq('id', userId);

    return NextResponse.json({ success: true, state: clientState });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al sincronizar el Botellón.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
