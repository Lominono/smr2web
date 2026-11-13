import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { verifyUserSession } from '@/lib/adminAuth';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import {
  enforceRateLimit,
  fail,
  guardOrigin,
  json,
  readJsonBody,
  unauthorized,
} from '@/lib/security/http';
import { RATE_LIMITS } from '@/lib/security/rateLimit';
import { securityEvent } from '@/lib/security/audit';
import {
  consumeReceipt,
  issueRoundReceipt,
  verifyRoundReceipt,
} from '@/lib/security/tokens';
import {
  CLAIM_RULES,
  MAX_ABS_DELTA,
  MAX_STAKE,
  MAX_ROUND_PAYOUT,
  MIN_ROUND_DURATION_MS,
  MIN_STAKE,
  RESCUE_AMOUNT,
  RESCUE_COOLDOWN_MS,
  RESCUE_THRESHOLD,
  SPIN_COOLDOWN_MS,
  CASINO_WIN_PER_HOUR,
  CASINO_WIN_PER_MINUTE,
  dailyRewardForStreak,
  earningsBudget,
  isSameUtcDay,
  msSince,
  normalizeClaimType,
  perClaimCap,
  spinReward,
  validateRoundPayout,
  type WalletClaimType,
} from '@/lib/security/gameEconomy';
import {
  applyCoinDelta,
  fetchRecentCredits,
  lastCreditOfType,
  recordBalanceTransaction,
  sumCreditsSince,
  type RecentCredit,
} from '@/lib/security/wallet';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/balance/sync
 *
 * Punto único autoritativo para modificar el saldo del alumno.
 *
 * Reglas de seguridad:
 * 1. Requiere sesión verificada en el servidor (nunca se confía en el cliente).
 * 2. Los premios NO se aceptan tal cual: se recalculan o se validan contra
 *    topes, cooldowns y presupuestos persistidos en PostgreSQL.
 * 3. Los premios de minijuegos exigen un recibo firmado emitido al apostar,
 *    de un solo uso y con caducidad.
 * 4. Todos los rechazos quedan auditados en `event_logs`.
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  const session = await verifyUserSession();
  if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
    return unauthorized('Sesión no iniciada o token inválido.');
  }

  const userId = session.user.id;
  const username = session.user.username;

  const rate = enforceRateLimit(`wallet:${userId}`, RATE_LIMITS.wallet);
  if (!rate.ok) return rate.response;

  const body = await readJsonBody(req);
  if (!body) return fail('Petición no válida.', 400);

  const rawDelta = Number(body.delta);
  if (!Number.isFinite(rawDelta)) {
    return fail('Cantidad de delta inválida.', 400);
  }

  const delta = Math.trunc(rawDelta);
  if (delta === 0) {
    return fail('La cantidad debe ser distinta de cero.', 400);
  }
  if (Math.abs(delta) > MAX_ABS_DELTA) {
    await securityEvent({
      action: 'wallet_delta_out_of_range',
      userId,
      username,
      req,
      details: { delta },
    });
    return fail('Cantidad fuera del rango permitido.', 400);
  }

  const claimType: WalletClaimType = normalizeClaimType(body.claimType);

  if (!isServerSupabaseConfigured()) {
    return json({
      success: true,
      coins: Math.max(0, Number(session.user.coins || 1000) + delta),
      isLocal: true,
    });
  }

  const client = createAdminClient();
  if (!client) return fail('Base de datos no disponible.', 503);

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, username, coins, biggest_win, streak_count, is_banned, last_claim_date, last_spin_date, last_rescue_date')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return fail('Perfil de usuario no encontrado.', 404);
  }

  if (profile.is_banned) {
    return fail('Cuenta suspendida por la administración.', 403);
  }

  const balance = Number(profile.coins ?? 0);

  // ───────────────────────────────────────────────────────────────────────
  // GASTOS (apuestas, compras, fianzas...). Nunca se permite saldo negativo.
  // ───────────────────────────────────────────────────────────────────────
  if (delta < 0) {
    const spend = Math.abs(delta);
    if (spend > balance) {
      return fail(
        `Saldo insuficiente. Tienes ${balance.toLocaleString()} monedas e intentas gastar ${spend.toLocaleString()}.`,
        400
      );
    }

    const applied = await applyCoinDelta(client, userId, -spend);
    if (!applied.ok) {
      return fail('El saldo cambió mientras se procesaba la operación. Reinténtalo.', 409);
    }

    await recordBalanceTransaction(client, {
      userId,
      amount: -spend,
      balanceBefore: balance,
      balanceAfter: applied.coins,
      type: claimType === 'game' ? 'game_bet' : 'purchase',
      description:
        claimType === 'game'
          ? `Apuesta en minijuego (${spend.toLocaleString()} monedas)`
          : `Gasto en la plataforma (${spend.toLocaleString()} monedas)`,
    });

    // Rake del 2 % a la tesorería del botellón, calculado en el servidor
    if (claimType === 'game') {
      const rake = Math.min(200, Math.max(1, Math.round(spend * 0.02)));
      try {
        const { data: market } = await client
          .from('market_state')
          .select('treasury_balance, total_revenue_generated, arcade_rake_accumulated')
          .eq('id', 1)
          .maybeSingle();

        if (market) {
          await client
            .from('market_state')
            .update({
              treasury_balance: Number(market.treasury_balance || 0) + rake,
              total_revenue_generated: Number(market.total_revenue_generated || 0) + rake,
              arcade_rake_accumulated: Number(market.arcade_rake_accumulated || 0) + rake,
              updated_at: new Date().toISOString(),
            })
            .eq('id', 1);
        }
      } catch {
        /* el rake es secundario */
      }
    }

    // Recibo firmado para poder cobrar el premio de esta ronda
    const roundToken =
      claimType === 'game' && spend >= MIN_STAKE && spend <= MAX_STAKE
        ? issueRoundReceipt(userId, spend)
        : undefined;

    return json({
      success: true,
      coins: applied.coins,
      biggestWin: Number(profile.biggest_win ?? 0),
      streakCount: Number(profile.streak_count ?? 1),
      ...(roundToken ? { roundToken } : {}),
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // ABONOS (premios y recompensas). Importe validado en servidor.
  // ───────────────────────────────────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const extraUpdates: Record<string, unknown> = {};
  const recentCredits: RecentCredit[] = await fetchRecentCredits(client, userId, 60 * 60 * 1000);

  let creditAmount = 0;
  let transactionType: string = claimType;
  let description = '';
  let newStreak = Number(profile.streak_count ?? 1);

  if (claimType === 'daily') {
    if (isSameUtcDay(profile.last_claim_date, nowIso)) {
      return fail('Ya has reclamado tu recompensa diaria de hoy.', 400);
    }
    newStreak = newStreak >= 5 ? 1 : Math.max(1, newStreak + 1);
    creditAmount = dailyRewardForStreak(newStreak);
    extraUpdates.last_claim_date = nowIso;
    extraUpdates.streak_count = newStreak;
    transactionType = 'daily';
    description = `Recompensa diaria (racha ${newStreak})`;
  } else if (claimType === 'spin') {
    const sinceSpin = msSince(profile.last_spin_date);
    if (sinceSpin < SPIN_COOLDOWN_MS) {
      const remainingMinutes = Math.ceil((SPIN_COOLDOWN_MS - sinceSpin) / 60000);
      return fail(`La ruleta diaria estará disponible de nuevo en ${remainingMinutes} minuto(s).`, 429);
    }
    creditAmount = spinReward(crypto.randomInt(0, 1_000_000) / 1_000_000);
    extraUpdates.last_spin_date = nowIso;
    transactionType = 'spin';
    description = 'Premio de la ruleta diaria';
  } else if (claimType === 'rescue') {
    if (balance >= RESCUE_THRESHOLD) {
      return fail('El fondo de rescate solo está disponible si tienes menos de 50 monedas.', 400);
    }
    const sinceRescue = msSince(profile.last_rescue_date);
    if (sinceRescue < RESCUE_COOLDOWN_MS) {
      const remainingMinutes = Math.ceil((RESCUE_COOLDOWN_MS - sinceRescue) / 60000);
      return fail(`El fondo de rescate estará disponible de nuevo en ${remainingMinutes} minuto(s).`, 429);
    }
    creditAmount = RESCUE_AMOUNT;
    extraUpdates.last_rescue_date = nowIso;
    transactionType = 'rescue';
    description = 'Fondo de rescate';
  } else if (claimType === 'game') {
    const receipt = verifyRoundReceipt(body.roundToken);
    if (!receipt.ok) {
      await securityEvent({
        action: 'wallet_round_receipt_invalid',
        userId,
        username,
        req,
        details: { reason: receipt.reason, requestedPayout: delta },
      });
      return fail(
        'Premio no autorizado: no hay ninguna apuesta registrada para esta ronda. Vuelve a jugar desde el minijuego.',
        400
      );
    }

    if (receipt.payload.uid !== userId) {
      await securityEvent({
        action: 'wallet_round_receipt_foreign',
        userId,
        username,
        req,
        details: { receiptUser: receipt.payload.uid, requestedPayout: delta },
      });
      return fail('Premio no autorizado.', 403);
    }

    const validation = validateRoundPayout(Number(receipt.payload.stake), delta);
    if (!validation.allowed) {
      await securityEvent({
        action: 'wallet_round_payout_rejected',
        userId,
        username,
        req,
        details: { reason: validation.reason, stake: validation.stake, requestedPayout: delta },
      });
      return fail(validation.reason || 'Premio no permitido.', 400);
    }

    const payoutAge = Date.now() - Number(receipt.payload.iat || 0);
    if (!Number.isFinite(payoutAge) || payoutAge < MIN_ROUND_DURATION_MS) {
      return fail('La ronda ha terminado demasiado rápido como para ser válida.', 400);
    }

    const consumed = await consumeReceipt(
      client as unknown as Parameters<typeof consumeReceipt>[0],
      receipt.payload.jti,
      userId,
      { stake: receipt.payload.stake, payout: delta },
      receipt.payload.exp
    );
    if (!consumed) {
      await securityEvent({
        action: 'wallet_round_receipt_replay',
        userId,
        username,
        req,
        details: { jti: receipt.payload.jti, requestedPayout: delta },
      });
      return fail('Este premio ya ha sido cobrado.', 409);
    }

    const wonLastMinute = sumCreditsSince(recentCredits, 60_000);
    const wonLastHour = sumCreditsSince(recentCredits, 60 * 60 * 1000);
    if (wonLastMinute + delta > CASINO_WIN_PER_MINUTE || wonLastHour + delta > CASINO_WIN_PER_HOUR) {
      await securityEvent({
        action: 'wallet_casino_budget_exceeded',
        userId,
        username,
        req,
        details: { requestedPayout: delta, wonLastMinute, wonLastHour },
      });
      return fail('Has alcanzado el límite de premios de los minijuegos. Espera unos minutos.', 429);
    }

    creditAmount = Math.min(delta, MAX_ROUND_PAYOUT);
    transactionType = 'game_win';
    description = 'Premio de minijuego';
  } else {
    // El check-in de asistencia es diario: se comprueba contra el histórico
    // real (el historial reciente solo cubre una hora y no vería el de ayer).
    if (claimType === 'checkin') {
      const { data: lastCheckin } = await client
        .from('balance_transactions')
        .select('created_at')
        .eq('user_id', userId)
        .eq('type', 'checkin')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastCheckin?.created_at && isSameUtcDay(lastCheckin.created_at, nowIso)) {
        return fail('Ya has confirmado tu asistencia hoy.', 400);
      }
    }

    const rule = CLAIM_RULES[claimType as keyof typeof CLAIM_RULES] || CLAIM_RULES.misc;
    const last = lastCreditOfType(recentCredits, claimType);
    // El check-in ya está limitado a una vez al día por la consulta anterior.
    if (last && claimType !== 'checkin') {
      const elapsed = msSince(last.created_at);
      if (elapsed < rule.cooldownMs) {
        const remainingSeconds = Math.ceil((rule.cooldownMs - elapsed) / 1000);
        return fail(
          `Debes esperar ${remainingSeconds} segundo(s) antes de volver a cobrar esta recompensa.`,
          429
        );
      }
    }

    let effectiveCap = perClaimCap(balance, rule, last ? last.amount : 0);

    // Si es un canje del bote del Botellón, permitir al menos el equivalente en monedas de su alijo real en DB
    if (claimType === 'vault') {
      try {
        const { data: botellonRow } = await client
          .from('botellon_states')
          .select('pending_vault')
          .eq('user_id', userId)
          .maybeSingle();
        const serverVaultCoins = Math.floor(Number(botellonRow?.pending_vault || 0) / 5);
        if (serverVaultCoins > effectiveCap) {
          effectiveCap = serverVaultCoins;
        }
      } catch {}
    }

    if (delta > effectiveCap) {
      await securityEvent({
        action: 'wallet_claim_cap_exceeded',
        userId,
        username,
        req,
        details: { claimType, requested: delta, cap: effectiveCap, balance },
      });
      return fail(
        `El importe solicitado (${delta.toLocaleString()}) supera el máximo por operación actual (${effectiveCap.toLocaleString()}). Intenta canjear una cantidad menor.`,
        400
      );
    }

    const budget = earningsBudget(Math.max(balance, effectiveCap));
    const wonLastMinute = sumCreditsSince(recentCredits, 60_000);
    const wonLastHour = sumCreditsSince(recentCredits, 60 * 60 * 1000);
    if (wonLastMinute + delta > budget.perMinute || wonLastHour + delta > budget.perHour) {
      await securityEvent({
        action: 'wallet_earnings_budget_exceeded',
        userId,
        username,
        req,
        details: { claimType, requested: delta, budget, wonLastMinute, wonLastHour },
      });
      return fail('Has alcanzado el límite temporal de ganancias. Inténtalo más tarde.', 429);
    }

    creditAmount = delta;
    transactionType = claimType;
    description = `Recompensa (${claimType})`;
  }

  if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
    return fail('Importe de recompensa no válido.', 400);
  }

  const nextBiggestWin =
    creditAmount > Number(profile.biggest_win ?? 0) ? creditAmount : Number(profile.biggest_win ?? 0);

  const applied = await applyCoinDelta(client, userId, creditAmount, {
    ...extraUpdates,
    biggest_win: nextBiggestWin,
  });

  if (!applied.ok) {
    return fail('El saldo cambió mientras se procesaba la operación. Reinténtalo.', 409);
  }

  await recordBalanceTransaction(client, {
    userId,
    amount: creditAmount,
    balanceBefore: balance,
    balanceAfter: applied.coins,
    type: transactionType,
    description,
  });

  if (creditAmount >= 500_000) {
    await securityEvent({
      action: 'wallet_large_credit',
      userId,
      username,
      req,
      details: { claimType, amount: creditAmount, balanceBefore: balance, balanceAfter: applied.coins },
    });
  }

  return json({
    success: true,
    coins: applied.coins,
    biggestWin: nextBiggestWin,
    streakCount: extraUpdates.streak_count ?? Number(profile.streak_count ?? 1),
  });
}
