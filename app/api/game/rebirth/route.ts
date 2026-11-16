import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin } from '@/lib/security/http';
import { securityEvent } from '@/lib/security/audit';
import {
  calculatePrestigeMultiplier,
  getRequiredAfterProduction,
} from '@/lib/botellonEconomy';
import { applyCoinDelta } from '@/lib/security/wallet';

export const dynamic = 'force-dynamic';

/** Tiempo mínimo entre renacimientos (evita farmear el bono en bucle). */
const REBIRTH_COOLDOWN_MS = 2 * 60 * 1000;

export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para realizar un renacimiento.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const rate = enforceRateLimit(`rebirth:${userId}`, { limit: 3, windowMs: 5 * 60_000 });
    if (!rate.ok) return rate.response;

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Servicio de base de datos no configurado.' },
        { status: 503 }
      );
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'No se pudo conectar a la base de datos.' },
        { status: 500 }
      );
    }

    // 1. Obtener datos actuales del perfil
    const { data: profile, error: fetchErr } = await client
      .from('profiles')
      .select('id, coins, biggest_win, party_farm_data')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !profile) {
      return NextResponse.json(
        { success: false, error: 'Perfil no encontrado en la base de datos.' },
        { status: 404 }
      );
    }

    const currentFarm = (profile.party_farm_data && typeof profile.party_farm_data === 'object')
      ? profile.party_farm_data
      : {};

    // Cooldown persistido en servidor: el registro del último renacimiento
    // (balance_transactions) no lo puede manipular el navegador.
    try {
      const { data: lastRebirth } = await client
        .from('balance_transactions')
        .select('created_at')
        .eq('user_id', userId)
        .eq('type', 'rebirth')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastRebirth?.created_at) {
        const elapsed = Date.now() - new Date(lastRebirth.created_at).getTime();
        if (elapsed < REBIRTH_COOLDOWN_MS) {
          const remaining = Math.ceil((REBIRTH_COOLDOWN_MS - elapsed) / 1000);
          return fail(`Debes esperar ${remaining} segundo(s) antes de volver a renacer.`, 429);
        }
      }
    } catch {
      /* si la tabla no está disponible se continúa */
    }

    const { data: botellonRow } = await client
      .from('botellon_states')
      .select('after_prestige_count, current_run_produced, pending_vault, total_lifetime_produced, current_zone_id, purchased_perks, total_drinks_taken, beer_pong_wins')
      .eq('user_id', userId)
      .maybeSingle();

    const currentPrestige = Number(
      botellonRow?.after_prestige_count ?? currentFarm.afterPrestigeCount ?? currentFarm.rebirths ?? 0
    );
    const currentRunProduced = Number(
      botellonRow?.current_run_produced ?? currentFarm.currentRunProduced ?? 0
    );
    const requiredProd = getRequiredAfterProduction(currentPrestige);
    if (currentRunProduced < requiredProd) {
      return fail(
        `Necesitas producir al menos ${requiredProd.toLocaleString()} fichas en esta ronda para irte de After.`,
        400
      );
    }

    // Cada renacimiento avanza estrictamente de 1 en 1 para evitar manipulaciones
    const newPrestigeCount = currentPrestige + 1;
    const now = Date.now();
    // Capital de siembra en fichas para arrancar produciendo inmediatamente tras renacer
    const startingSeedFichas = Math.min(250000, Math.max(2500, newPrestigeCount * 5000));

    // Bonus de fichas acumuladas calculado autoritativamente en servidor (sin tope artificial)
    const rawPendingVault = Number(botellonRow?.pending_vault ?? currentFarm.pendingVault ?? 0);
    const bonusCoins = Math.max(0, Math.floor(rawPendingVault / 5));

    // Estado reseteado para el nuevo renacimiento con multiplicador y capital inicial garantizados
    const updatedFarm = {
      ...currentFarm,
      levels: {
        litronas: 0,
        hielos: 0,
        chupitos: 0,
        botellas: 0,
        altavoz: 0,
        barra_libre: 0,
        vip: 0,
      },
      pendingVault: startingSeedFichas,
      currentRunProduced: 0,
      hangoverLevel: 0,
      afterSuspicionLevel: 0,
      afterPrestigeCount: newPrestigeCount,
      rebirths: newPrestigeCount,
      lastAfterTimestamp: now,
      lastTickMs: now,
    };

    // 2. Persistir en botellon_states y profiles
    await client.from('botellon_states').upsert({
      user_id: userId,
      levels: updatedFarm.levels,
      pending_vault: startingSeedFichas,
      current_run_produced: 0,
      total_lifetime_produced: Number(botellonRow?.total_lifetime_produced ?? currentFarm.totalLifetimeProduced ?? 0),
      after_prestige_count: newPrestigeCount,
      current_zone_id: botellonRow?.current_zone_id || (currentFarm.currentZoneId as string) || 'parque',
      purchased_perks: Array.isArray(botellonRow?.purchased_perks)
        ? botellonRow.purchased_perks
        : Array.isArray(currentFarm.purchasedPerks)
          ? currentFarm.purchasedPerks
          : [],
      total_drinks_taken: Number(botellonRow?.total_drinks_taken ?? currentFarm.totalDrinksTaken ?? 0),
      beer_pong_wins: Number(botellonRow?.beer_pong_wins ?? currentFarm.beerPongWins ?? 0),
      hangover_level: 0,
      after_suspicion_level: 0,
      last_after_ms: now,
      last_tick_ms: now,
    }, { onConflict: 'user_id' });

    let newCoins = Math.max(0, Number(profile.coins || 0) + bonusCoins);
    if (bonusCoins > 0) {
      const coinRes = await applyCoinDelta(client, userId, bonusCoins, {
        party_farm_data: updatedFarm,
        biggest_win: bonusCoins > Number(profile.biggest_win ?? 0) ? bonusCoins : undefined,
      });
      if (coinRes.ok) {
        newCoins = coinRes.coins;
      } else {
        await client
          .from('profiles')
          .update({
            party_farm_data: updatedFarm,
            coins: newCoins,
          })
          .eq('id', userId);
      }
    } else {
      await client
        .from('profiles')
        .update({ party_farm_data: updatedFarm })
        .eq('id', userId);
    }

    try {
      await client.from('botellon_events').insert([{
        user_id: userId,
        event_type: 'after_rebirth',
        payload: { newPrestigeCount, requiredProd, bonusCoins },
        coins_delta: bonusCoins,
      }]);
    } catch {}

    // Registro del renacimiento (sirve de cooldown server-side y de auditoría)
    try {
      await client.from('balance_transactions').insert([
        {
          user_id: userId,
          amount: bonusCoins,
          balance_before: Number(profile.coins || 0),
          balance_after: newCoins,
          type: 'rebirth',
          description: `Renacimiento #${newPrestigeCount} (bono ${bonusCoins.toLocaleString()} 🪙)`,
        },
      ]);
    } catch {}

    if (bonusCoins >= 50000) {
      await securityEvent({
        action: 'rebirth_max_bonus',
        userId,
        username: session.user.username,
        req,
        details: { newPrestigeCount, bonusCoins },
      });
    }

    const prestigeMultiplier = calculatePrestigeMultiplier(newPrestigeCount);

    return NextResponse.json({
      success: true,
      afterPrestigeCount: newPrestigeCount,
      prestigeMultiplier,
      bonusCoins,
      newCoins,
      party_farm_data: updatedFarm,
      message: `¡Renacimiento #${newPrestigeCount} completado con éxito! Multiplicador permanente: x${prestigeMultiplier.toFixed(2)}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
