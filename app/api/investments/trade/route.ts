import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody, unauthorized } from '@/lib/security/http';
import { RATE_LIMITS } from '@/lib/security/rateLimit';
import { securityEvent } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

/** Activos admitidos en el mercado del botellón. */
const ALLOWED_TICKERS = new Set(['BTLN', 'ONION', 'ARDI', 'CHERR', 'MBRON', 'CUTI', 'TOLED']);

const BASE_PRICES: Record<string, number> = {
  BTLN: 10.0,
  ONION: 45.0,
  ARDI: 28.0,
  CHERR: 20.0,
  MBRON: 12.0,
  CUTI: 8.0,
  TOLED: 34.0,
};

/** Tamaño máximo de una orden (monedas para compra, acciones para venta). */
const MAX_BUY_COINS = 100_000_000;
const MAX_SELL_SHARES = 1_000_000_000;

function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * POST /api/investments/trade
 *
 * Compra/venta de acciones del botellón. Toda la lógica económica vive en el
 * servidor:
 * - El usuario se resuelve SIEMPRE desde la sesión verificada (no del cuerpo).
 * - No se pueden vender acciones que no se poseen (antes una posición vacía
 *   permitía "vender" infinitas acciones y acuñar monedas).
 * - Cooldown por usuario y activo, límites de orden y tickers en lista blanca.
 * - La operación es atómica en PostgreSQL (RPC `execute_market_trade`) para que
 *   dos peticiones simultáneas no dupliquen saldo ni alteren el precio dos veces.
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return unauthorized('Debes iniciar sesión con tu cuenta para comprar o vender acciones.');
    }

    const user = session.user;

    const rate = enforceRateLimit(`market:${user.id}`, RATE_LIMITS.marketTrade);
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Petición no válida.', 400);

    const ticker = String(body.ticker || 'BTLN').toUpperCase().trim();
    const action = body.action === 'sell' ? 'sell' : 'buy';
    const amount = Number(body.amount);

    if (!ALLOWED_TICKERS.has(ticker)) {
      return fail('Ese activo no cotiza en el mercado del botellón.', 400);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return fail('La cantidad debe ser mayor que cero.', 400);
    }

    if (action === 'buy') {
      if (amount < 10) return fail('La inversión mínima es de 10 monedas.', 400);
      if (amount > MAX_BUY_COINS) {
        return fail(`La inversión máxima por orden es de ${MAX_BUY_COINS.toLocaleString()} monedas.`, 400);
      }
    } else if (amount > MAX_SELL_SHARES) {
      return fail('La cantidad de acciones supera el máximo por orden.', 400);
    }

    if (!isServerSupabaseConfigured()) {
      return fail('El mercado no está disponible en este momento.', 503);
    }

    const client = createAdminClient();
    if (!client) return fail('No se pudo conectar con el mercado.', 503);

    // ── Vía autoritativa: función transaccional en PostgreSQL ──────────────
    const rpc = await client.rpc('execute_market_trade', {
      p_user_id: user.id,
      p_ticker: ticker,
      p_action: action,
      p_amount: action === 'buy' ? Math.round(amount) : Number(amount.toFixed(4)),
    });

    if (!rpc.error && rpc.data) {
      const result = rpc.data as Record<string, unknown>;

      if (!result.success) {
        if (result.code === 'COOLDOWN') {
          return json(
            { success: false, error: result.error, waitSeconds: result.wait_seconds },
            { status: 429 }
          );
        }
        if (result.code === 'FORBIDDEN' || result.code === 'POSITION') {
          await securityEvent({
            action: 'market_trade_rejected',
            userId: user.id,
            username: user.username,
            req,
            details: { ticker, action, amount, code: result.code, reason: result.error },
          });
        }
        return fail(String(result.error || 'No se pudo completar la orden.'), 400);
      }

      const transaction = {
        id: result.transaction_id || randomUUID(),
        user_id: user.id,
        username: user.username,
        ticker,
        type: action,
        coins_amount: Math.abs(Number(result.coins_delta || 0)),
        shares_amount: Number(result.shares || 0),
        price_per_share: Number(result.price || 0),
        fee_coins: Number(result.fee_paid || 0),
        net_coins: Math.abs(Number(result.coins_delta || 0)),
        price_impact_percent: Number(result.price_impact_percent || 0),
        created_at: new Date().toISOString(),
      };

      const pricePoint = {
        id: result.price_history_id || randomUUID(),
        ticker,
        price: Number(result.new_price || 0),
        volume: Math.abs(Number(result.coins_delta || 0)),
        pool_balance: Number(result.pool_balance || 0),
        treasury_balance: Number(result.treasury_balance || 0),
        total_shares: Number(result.total_shares || 0),
        change_percent: Number(result.price_impact_percent || 0),
        trigger_type: action,
        event_description: `@${user.username} ${action === 'buy' ? 'compró' : 'vendió'} ${ticker}`,
        player_username: user.username,
        created_at: new Date().toISOString(),
      };

      await broadcastTrade(client, {
        transaction,
        ticker,
        newPrice: pricePoint.price,
        pricePoint,
        treasuryBalance: pricePoint.treasury_balance,
      });

      return json({
        success: true,
        ticker,
        action,
        shares: transaction.shares_amount,
        price: transaction.price_per_share,
        newPrice: pricePoint.price,
        coinsDelta: Number(result.coins_delta || 0),
        feePaid: transaction.fee_coins,
        remainingShares: Number(result.remaining_shares || 0),
        newBalance: Number(result.new_balance || 0),
        treasuryBalance: pricePoint.treasury_balance,
        transaction,
        pricePoint,
        message:
          action === 'buy'
            ? `Has comprado ${transaction.shares_amount.toFixed(2)} acciones de ${ticker} a ${transaction.price_per_share.toFixed(2)} 🪙.`
            : `Has vendido ${transaction.shares_amount.toFixed(2)} acciones de ${ticker} y cobrado ${Number(result.coins_delta || 0)} 🪙 (comisión del 2 %).`,
      });
    }

    // ── Respaldo si la migración SQL aún no está aplicada ──────────────────
    return legacyTrade(client, user, ticker, action, amount, req);
  } catch (err) {
    console.error('[INVESTMENTS_TRADE_API] Error ejecutando orden:', err);
    return fail('Error interno al procesar la orden.', 500);
  }
}

async function broadcastTrade(
  client: NonNullable<ReturnType<typeof createAdminClient>>,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const channel = client.channel('botellon_market_live_stream');
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        try {
          client.removeChannel(channel);
        } catch {}
        resolve();
      };

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.send({ type: 'broadcast', event: 'market_trade', payload });
          } catch {}
          finish();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          finish();
        }
      });
      setTimeout(finish, 800);
    });
  } catch {
    /* el tiempo real es secundario */
  }
}

/**
 * Implementación de respaldo (sin RPC) con comprobaciones estrictas:
 * nunca permite vender más acciones de las poseídas ni operar con tickers
 * desconocidos, y valida el saldo contra la base de datos.
 */
async function legacyTrade(
  client: NonNullable<ReturnType<typeof createAdminClient>>,
  user: { id: string; username: string },
  ticker: string,
  action: 'buy' | 'sell',
  amount: number,
  req: NextRequest
) {
  const { data: profile } = await client
    .from('profiles')
    .select('id, coins')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return fail('Perfil de usuario no encontrado.', 404);

  const { data: market } = await client.from('market_state').select('*').eq('id', 1).maybeSingle();
  const marketState = market || {};
  const baseLiquidity = Number(marketState.pool_balance || 10000);
  const currentPrice =
    ticker === 'BTLN'
      ? Number(marketState.current_price || 10)
      : Number(
          (Array.isArray(marketState.parody_stocks)
            ? (marketState.parody_stocks as Array<Record<string, unknown>>).find((s) => s?.ticker === ticker)?.price
            : marketState.parody_stocks?.[ticker]?.price) ?? BASE_PRICES[ticker] ?? 10
        );

  const { data: position } = await client
    .from('investments')
    .select('id, shares, average_buy_price, total_invested_coins, last_transaction_at')
    .eq('user_id', user.id)
    .eq('ticker', ticker)
    .maybeSingle();

  const positionShares = Number(position?.shares || 0);
  const currentCoins = Number(profile.coins || 0);

  const cooldownSeconds = Math.max(0, Number(marketState.cooldown_seconds || 30));
  if (position?.last_transaction_at && cooldownSeconds > 0) {
    const elapsed = Date.now() - new Date(position.last_transaction_at).getTime();
    const remaining = Math.ceil((cooldownSeconds * 1000 - elapsed) / 1000);
    if (remaining > 0) {
      return json(
        { success: false, error: `Espera ${remaining}s antes de volver a operar con ${ticker}.`, waitSeconds: remaining },
        { status: 429 }
      );
    }
  }

  let shares: number;
  let coinsDelta: number;
  let feePaid = 0;
  let slippage: number;
  let newPrice: number;
  let remainingShares: number;
  let newAvgPrice = Number(position?.average_buy_price || 0);
  let newInvested = Number(position?.total_invested_coins || 0);
  let nextBalance: number;

  if (action === 'buy') {
    const coinsToInvest = Math.round(amount);
    if (coinsToInvest > currentCoins) {
      return fail(
        `Saldo insuficiente. Tienes ${currentCoins.toLocaleString()} monedas e intentas invertir ${coinsToInvest.toLocaleString()}.`,
        400
      );
    }
    shares = Number((coinsToInvest / currentPrice).toFixed(4));
    slippage = Math.min(0.2, (coinsToInvest / (baseLiquidity + 5000)) * 1.4);
    newPrice = Number((currentPrice * (1 + slippage)).toFixed(2));
    coinsDelta = -coinsToInvest;
    remainingShares = Number((positionShares + shares).toFixed(4));
    const totalShares = positionShares + shares;
    newAvgPrice =
      totalShares > 0
        ? Number((((newAvgPrice * positionShares) + currentPrice * shares) / totalShares).toFixed(4))
        : currentPrice;
    newInvested += coinsToInvest;
    nextBalance = currentCoins - coinsToInvest;
  } else {
    const sharesToSell = Number(amount.toFixed(4));
    if (sharesToSell <= 0) return fail('Indica una cantidad de acciones a vender.', 400);
    if (!position || positionShares <= 0) {
      await securityEvent({
        action: 'market_sell_without_position',
        userId: user.id,
        username: user.username,
        req,
        details: { ticker, requestedShares: sharesToSell, heldShares: positionShares },
      });
      return fail(`No posees acciones de ${ticker} para vender.`, 400);
    }
    if (sharesToSell > positionShares + 0.0001) {
      return fail(
        `No posees suficientes acciones. Tienes ${positionShares.toFixed(2)} e intentas vender ${sharesToSell.toFixed(2)}.`,
        400
      );
    }

    const gross = Math.round(sharesToSell * currentPrice);
    feePaid = Math.max(1, Math.round(gross * 0.02));
    coinsDelta = Math.max(0, gross - feePaid);
    slippage = Math.min(0.2, (gross / (baseLiquidity + 5000)) * 1.4);
    newPrice = Math.max(1, Number((currentPrice * (1 - slippage)).toFixed(2)));
    shares = sharesToSell;
    remainingShares = Math.max(0, Number((positionShares - sharesToSell).toFixed(4)));
    if (positionShares > 0) {
      newInvested = Math.max(0, Math.round(newInvested * (remainingShares / positionShares)));
    }
    nextBalance = currentCoins + coinsDelta;
  }

  const nextTreasury = Number(marketState.treasury_balance || 5000) + feePaid;
  const nextVolume = Number(marketState.total_volume || 0) + Math.abs(coinsDelta);
  const nextRevenue = Number(marketState.total_revenue_generated || 0) + feePaid;

  const stamp = new Date().toISOString();

  // SEGURIDAD (TOCTOU en venta): antes de pagar, las acciones se reclaman con
  // bloqueo optimista sobre la posición. Si dos ventas simultáneas leen la
  // misma posición, la segunda falla aquí y NO cobra dos veces.
  if (action === 'sell') {
    if (!position) {
      return fail('No posees acciones de este activo.', 400);
    }

    const claim = await client
      .from('investments')
      .update({
        shares: remainingShares,
        total_invested_coins: newInvested,
        average_buy_price: newAvgPrice,
        last_transaction_at: stamp,
        updated_at: stamp,
      })
      .eq('user_id', user.id)
      .eq('ticker', ticker)
      .eq('shares', positionShares)
      .select('id');

    if (!claim.data || claim.data.length === 0) {
      return fail('Tus posiciones cambiaron mientras se procesaba la venta. Vuelve a intentarlo.', 409);
    }
  }

  if (ticker === 'BTLN') {
    const nextTotalShares =
      action === 'buy'
        ? Number(marketState.total_shares || 0) + shares
        : Math.max(0, Number(marketState.total_shares || 0) - shares);
    const nextPool =
      action === 'buy'
        ? baseLiquidity + Math.abs(coinsDelta)
        : Math.max(1000, baseLiquidity - Math.abs(coinsDelta));

    const { error: marketError } = await client
      .from('market_state')
      .update({
        current_price: newPrice,
        total_shares: nextTotalShares,
        pool_balance: nextPool,
        treasury_balance: nextTreasury,
        total_volume: nextVolume,
        total_revenue_generated: nextRevenue,
        updated_at: stamp,
      })
      .eq('id', 1);

    if (marketError) return fail('No se pudo actualizar el mercado.', 500);
  } else {
    const stocks: Record<string, Record<string, unknown>> =
      marketState.parody_stocks && typeof marketState.parody_stocks === 'object' && !Array.isArray(marketState.parody_stocks)
        ? { ...marketState.parody_stocks }
        : {};
    const base = BASE_PRICES[ticker] || 10;
    stocks[ticker] = {
      ...(stocks[ticker] || { ticker, name: ticker }),
      ticker,
      price: newPrice,
      volume: Number(stocks[ticker]?.volume || 0) + Math.abs(coinsDelta),
      change24h: Number((((newPrice - base) / base) * 100).toFixed(2)),
    };

    const { error: marketError } = await client
      .from('market_state')
      .update({
        parody_stocks: stocks,
        treasury_balance: nextTreasury,
        total_volume: nextVolume,
        total_revenue_generated: nextRevenue,
        updated_at: stamp,
      })
      .eq('id', 1);

    if (marketError) return fail('No se pudo actualizar el mercado.', 500);
  }

  // Saldo: actualización condicional para no pisar cambios concurrentes
  const { data: balanceRows, error: balanceError } = await client
    .from('profiles')
    .update({ coins: nextBalance })
    .eq('id', user.id)
    .eq('coins', currentCoins)
    .select('coins');

  if (balanceError || !balanceRows || balanceRows.length === 0) {
    return fail('Tu saldo cambió mientras se procesaba la orden. Vuelve a intentarlo.', 409);
  }

  // La posición solo se escribe de forma final en compras: en ventas ya se
  // reclamó condicionalmente arriba (evita reprocesar shares).
  if (action === 'buy') {
    const positionPayload = {
      user_id: user.id,
      ticker,
      shares: remainingShares,
      total_invested_coins: newInvested,
      average_buy_price: newAvgPrice,
      last_transaction_at: stamp,
      updated_at: stamp,
    };

    const { error: positionError } = await client
      .from('investments')
      .upsert(positionPayload, { onConflict: 'user_id,ticker' });

    if (positionError) {
      console.warn('[INVESTMENTS] No se pudo guardar la posición:', positionError.message);
    }
  }

  const transaction = {
    id: randomUUID(),
    user_id: user.id,
    username: user.username,
    ticker,
    type: action,
    coins_amount: Math.abs(coinsDelta),
    shares_amount: shares,
    price_per_share: currentPrice,
    fee_coins: feePaid,
    net_coins: Math.abs(coinsDelta),
    price_impact_percent:
      action === 'buy' ? Number((slippage * 100).toFixed(2)) : -Number((slippage * 100).toFixed(2)),
    created_at: stamp,
  };

  const pricePoint = {
    id: randomUUID(),
    ticker,
    price: newPrice,
    volume: Math.abs(coinsDelta),
    pool_balance: baseLiquidity,
    treasury_balance: nextTreasury,
    total_shares: remainingShares,
    change_percent: transaction.price_impact_percent,
    trigger_type: action,
    event_description: `@${user.username} ${action === 'buy' ? 'compró' : 'vendió'} ${ticker}`,
    player_username: user.username,
    created_at: stamp,
  };

  await Promise.allSettled([
    client.from('transactions').insert([transaction]),
    client.from('price_history').insert([pricePoint]),
  ]);

  await broadcastTrade(client, {
    transaction,
    ticker,
    newPrice,
    pricePoint,
    treasuryBalance: nextTreasury,
  });

  return json({
    success: true,
    ticker,
    action,
    shares,
    price: currentPrice,
    newPrice,
    coinsDelta,
    feePaid,
    remainingShares,
    newBalance: nextBalance,
    treasuryBalance: nextTreasury,
    transaction,
    pricePoint,
    message:
      action === 'buy'
        ? `Has comprado ${shares.toFixed(2)} acciones de ${ticker}. Precio ajustado a ${newPrice.toFixed(2)} 🪙.`
        : `Has vendido ${shares.toFixed(2)} acciones de ${ticker} y cobrado ${coinsDelta} 🪙 (comisión del 2 %).`,
  });
}
