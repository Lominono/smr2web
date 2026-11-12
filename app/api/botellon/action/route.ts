import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, readJsonBody } from '@/lib/security/http';
import { applyCoinDelta, recordBalanceTransaction } from '@/lib/security/wallet';
import { isUUID } from '@/lib/uuid';
import {
  BOTELLON_PERK_COSTS,
  BOTELLON_TIER_BASE_COSTS,
  BOTELLON_ZONE_REQUIREMENTS,
  getTierUpgradeCost,
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

interface ActionPayload {
  action?: 'buy_tier' | 'buy_perk' | 'select_zone' | 'fund_vault';
  tierId?: string;
  multiplier?: 1 | 5 | 10 | 'max';
  perkId?: string;
  zoneId?: string;
  coinAmount?: number;
  clientVault?: number;
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
    const rate = enforceRateLimit(`botellon-action:${userId}`, { limit: 60, windowMs: 60_000 });
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Cuerpo JSON inválido o demasiado grande.', 400);
    const payload = body as ActionPayload;

    if (!isServerSupabaseConfigured()) {
      return fail('Base de datos no configurada.', 503);
    }

    const client = createAdminClient();
    if (!client) return fail('Error de conexión con la base de datos.', 500);

    // Asegurar que existe fila en botellon_states
    const { data: existing, error: fetchErr } = await client
      .from('botellon_states')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) return fail('Error al leer estado del Botellón.', 500);

    const row = existing || {
      user_id: userId,
      levels: { ...DEFAULT_LEVELS },
      pending_vault: 0,
      current_run_produced: 0,
      total_lifetime_produced: 0,
      after_prestige_count: 0,
      current_zone_id: 'parque',
      purchased_perks: [] as string[],
      total_drinks_taken: 0,
      beer_pong_wins: 0,
      hangover_level: 0,
      after_suspicion_level: 0,
      guard_active_until_ms: 0,
      last_after_ms: 0,
      last_subsidio_ms: 0,
      last_tick_ms: Date.now(),
    };

    const levels: Record<string, number> = { ...DEFAULT_LEVELS, ...(row.levels || {}) };
    const perks: string[] = Array.isArray(row.purchased_perks) ? [...row.purchased_perks] : [];
    const prestige = Number(row.after_prestige_count || 0);
    let vault = Number(row.pending_vault || 0);

    // Permitir reconciliar ganancias recientes de ticks del cliente dentro de margen seguro
    if (typeof payload.clientVault === 'number' && Number.isFinite(payload.clientVault) && payload.clientVault > vault) {
      const maxBump = Math.max(250_000, Math.floor(Math.max(vault, 1) * 0.35));
      vault = Math.min(payload.clientVault, vault + maxBump);
    }

    if (payload.action === 'buy_tier') {
      const tierId = payload.tierId;
      if (!tierId || !(tierId in BOTELLON_TIER_BASE_COSTS)) {
        return fail('Mejora no válida.', 400);
      }

      const baseCost = BOTELLON_TIER_BASE_COSTS[tierId];
      const currentLevel = Math.max(0, Math.floor(levels[tierId] || 0));
      const discount = perks.includes('descuento_chino') ? 0.85 : 1.0;
      const mult = payload.multiplier === 5 || payload.multiplier === 10 || payload.multiplier === 'max'
        ? payload.multiplier
        : 1;
      const targetCount = mult === 'max' ? 100 : mult;

      let count = 0;
      let totalCost = 0;
      for (let i = 0; i < targetCount; i++) {
        const rawCost = getTierUpgradeCost(baseCost, currentLevel + i, prestige);
        const finalCost = Math.max(1, Math.floor(rawCost * discount));
        if (mult === 'max') {
          if (totalCost + finalCost > vault) break;
          totalCost += finalCost;
          count++;
        } else {
          totalCost += finalCost;
          count++;
        }
      }

      if (count <= 0 || vault < totalCost) {
        return fail('Fichas insuficientes en el bote para subir de nivel.', 400);
      }

      vault -= totalCost;
      levels[tierId] = currentLevel + count;

      const { error: upErr } = await client
        .from('botellon_states')
        .upsert({
          ...row,
          user_id: userId,
          levels,
          pending_vault: vault,
          last_tick_ms: Date.now(),
        }, { onConflict: 'user_id' });

      if (upErr) return fail('No se pudo guardar la mejora.', 500);

      await client.from('botellon_events').insert([{
        user_id: userId,
        event_type: 'tier_upgrade',
        payload: { tierId, count, newLevel: levels[tierId], totalCost },
        fichas_delta: -totalCost,
      }]);

      return NextResponse.json({
        success: true,
        levels,
        pendingVault: vault,
        purchasedCount: count,
        totalCost,
      });
    }

    if (payload.action === 'buy_perk') {
      const perkId = payload.perkId;
      if (!perkId || !(perkId in BOTELLON_PERK_COSTS)) {
        return fail('Ventaja no válida.', 400);
      }
      if (perks.includes(perkId)) {
        return fail('Ya tienes esta ventaja desbloqueada.', 400);
      }

      const cost = BOTELLON_PERK_COSTS[perkId];
      const { data: profile } = await client
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .maybeSingle();

      const balance = Number(profile?.coins || 0);
      if (balance < cost) {
        return fail(`Saldo insuficiente. Necesitas ${cost.toLocaleString()} monedas.`, 400);
      }

      const coinRes = await applyCoinDelta(client, userId, -cost);
      if (!coinRes.ok) return fail('Conflicto al descontar monedas. Inténtalo de nuevo.', 409);

      const nextPerks = [...perks, perkId];
      await client
        .from('botellon_states')
        .upsert({
          ...row,
          user_id: userId,
          purchased_perks: nextPerks,
          last_tick_ms: Date.now(),
        }, { onConflict: 'user_id' });

      await recordBalanceTransaction(client, {
        userId,
        amount: -cost,
        balanceBefore: balance,
        balanceAfter: coinRes.coins,
        type: 'botellon_perk',
        referenceId: perkId,
        description: `Ventaja Botellón: ${perkId}`,
      });

      await client.from('botellon_events').insert([{
        user_id: userId,
        event_type: 'perk_purchase',
        payload: { perkId, cost },
        coins_delta: -cost,
      }]);

      return NextResponse.json({
        success: true,
        purchasedPerks: nextPerks,
        coins: coinRes.coins,
      });
    }

    if (payload.action === 'select_zone') {
      const zoneId = payload.zoneId;
      if (!zoneId || !(zoneId in BOTELLON_ZONE_REQUIREMENTS)) {
        return fail('Zona no válida.', 400);
      }
      const required = BOTELLON_ZONE_REQUIREMENTS[zoneId];
      if (Number(row.total_lifetime_produced || 0) < required) {
        return fail('Aún no tienes suficiente producción histórica para esta zona.', 400);
      }

      await client
        .from('botellon_states')
        .upsert({
          ...row,
          user_id: userId,
          current_zone_id: zoneId,
          last_tick_ms: Date.now(),
        }, { onConflict: 'user_id' });

      return NextResponse.json({ success: true, currentZoneId: zoneId });
    }

    if (payload.action === 'fund_vault') {
      const coinAmount = Math.trunc(Number(payload.coinAmount || 0));
      if (!Number.isFinite(coinAmount) || coinAmount <= 0 || coinAmount > 1_000_000_000_000) {
        return fail('Cantidad de monedas inválida.', 400);
      }

      const { data: profile } = await client
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .maybeSingle();

      const balance = Number(profile?.coins || 0);
      if (balance < coinAmount) {
        return fail('Saldo insuficiente en cartera.', 400);
      }

      const coinRes = await applyCoinDelta(client, userId, -coinAmount);
      if (!coinRes.ok) return fail('Error al descontar monedas.', 409);

      const fichasAdded = coinAmount * 5;
      vault += fichasAdded;

      await client
        .from('botellon_states')
        .upsert({
          ...row,
          user_id: userId,
          pending_vault: vault,
          last_tick_ms: Date.now(),
        }, { onConflict: 'user_id' });

      await recordBalanceTransaction(client, {
        userId,
        amount: -coinAmount,
        balanceBefore: balance,
        balanceAfter: coinRes.coins,
        type: 'botellon_fund',
        description: `Inyección al bote del Botellón (+${fichasAdded.toLocaleString()} fichas)`,
      });

      return NextResponse.json({
        success: true,
        pendingVault: vault,
        coins: coinRes.coins,
      });
    }

    return fail('Acción no reconocida.', 400);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error en acción del Botellón.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
