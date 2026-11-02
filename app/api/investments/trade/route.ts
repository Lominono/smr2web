import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { COOKIE_SESSION } from '@/lib/authSession';
import { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const BASE_PRICES: Record<string, number> = {
  BTLN: 10.0,
  ONION: 45.0,
  ARDI: 28.0,
  CHERR: 20.0,
  MBRON: 12.0,
  CUTI: 8.0,
  TOLED: 34.0,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { ticker = 'BTLN', action = 'buy', amount = 0, username: reqUsername, userId: reqUserId } = body;

    const cleanTicker = String(ticker).toUpperCase().trim();
    const cleanAction = action === 'sell' ? 'sell' : 'buy';
    const numAmount = Number(amount);

    if (numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'La cantidad debe ser mayor que cero.' },
        { status: 400 }
      );
    }

    // Identificar al usuario desde la cookie de sesión o el cuerpo de la petición
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_SESSION);
    let sessionUser: UserProfile | null = null;

    if (sessionCookie?.value) {
      try {
        let raw = sessionCookie.value;
        if (raw.includes('%')) {
          try { raw = decodeURIComponent(raw); } catch {}
        }
        sessionUser = JSON.parse(raw);
      } catch {}
    }

    const effectiveUsername = sessionUser?.username || reqUsername || 'Alumno';
    const effectiveUserId = sessionUser?.id || reqUserId || null;

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Supabase no está configurado en el servidor.',
        fallbackLocal: true,
      });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo inicializar la conexión con Supabase.',
        fallbackLocal: true,
      });
    }

    // 1. Obtener saldo del usuario en profiles
    let userCoins = 0;
    let dbUserFound = false;

    if (effectiveUserId) {
      const { data: profData } = await client
        .from('profiles')
        .select('coins, username')
        .eq('id', effectiveUserId)
        .maybeSingle();

      if (profData) {
        userCoins = Number(profData.coins ?? 0);
        dbUserFound = true;
      }
    }

    if (!dbUserFound && effectiveUsername) {
      const { data: profData } = await client
        .from('profiles')
        .select('id, coins, username')
        .ilike('username', effectiveUsername)
        .maybeSingle();

      if (profData) {
        userCoins = Number(profData.coins ?? 0);
        dbUserFound = true;
      }
    }

    // 2. Obtener estado del mercado y tesorería
    const { data: mData } = await client
      .from('market_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    const marketState = mData || {
      id: 1,
      current_price: 10.0,
      total_shares: 0,
      pool_balance: 10000,
      treasury_balance: 5000,
      reserve_balance: 25000,
      total_volume: 0,
      total_revenue_generated: 0,
      parody_stocks: {},
    };

    let currentPrice = cleanTicker === 'BTLN' ? Number(marketState.current_price || 10.0) : (BASE_PRICES[cleanTicker] || 10.0);
    let stocksMap: Record<string, any> = {};

    if (Array.isArray(marketState.parody_stocks)) {
      for (const item of marketState.parody_stocks) {
        if (item && item.ticker) stocksMap[item.ticker] = item;
      }
    } else if (marketState.parody_stocks && typeof marketState.parody_stocks === 'object') {
      stocksMap = { ...marketState.parody_stocks };
    }

    if (cleanTicker !== 'BTLN') {
      const stockObj = stocksMap[cleanTicker];
      currentPrice = stockObj?.price ? Number(stockObj.price) : (BASE_PRICES[cleanTicker] || 10.0);
    }

    // 3. Consultar posición previa del usuario en esta acción
    let userPositionShares = 0;
    let userPositionAvgPrice = 0;
    let userPositionTotalInvested = 0;

    if (effectiveUserId) {
      try {
        const { data: posData } = await client
          .from('investments')
          .select('*')
          .eq('user_id', effectiveUserId)
          .eq('ticker', cleanTicker)
          .maybeSingle();

        if (posData) {
          userPositionShares = Number(posData.shares || 0);
          userPositionAvgPrice = Number(posData.average_buy_price || 0);
          userPositionTotalInvested = Number(posData.total_invested_coins || 0);
        }
      } catch (_) {}
    }

    // 4. Mecánica AMM y Bonding Curve (Oferta y Demanda Realista)
    const baseLiquidity = Number(marketState.pool_balance || 10000);
    let shares = 0;
    let newPrice = currentPrice;
    let coinsDelta = 0;
    let feePaid = 0;
    let slippage = 0;
    let remainingShares = userPositionShares;

    if (cleanAction === 'buy') {
      const coinsToInvest = Math.round(numAmount);
      if (coinsToInvest < 10) {
        return NextResponse.json({ success: false, error: 'La inversión mínima es de 10 monedas.' }, { status: 400 });
      }

      if (dbUserFound && userCoins < coinsToInvest) {
        return NextResponse.json({
          success: false,
          error: `Saldo insuficiente. Tienes ${userCoins.toLocaleString()} monedas e intentas invertir ${coinsToInvest.toLocaleString()}.`,
        }, { status: 400 });
      }

      shares = Number((coinsToInvest / currentPrice).toFixed(4));

      // Curva de demanda continua: compras masivas o acumuladas suben el precio
      slippage = Math.min(0.20, (coinsToInvest / (baseLiquidity + 5000)) * 1.4);
      newPrice = Number((currentPrice * (1 + slippage)).toFixed(2));
      coinsDelta = -coinsToInvest;
      remainingShares = Number((userPositionShares + shares).toFixed(4));
    } else {
      const sharesToSell = Number(numAmount.toFixed(4));
      if (sharesToSell <= 0) {
        return NextResponse.json({ success: false, error: 'Indica una cantidad de acciones a vender.' }, { status: 400 });
      }

      if (effectiveUserId && userPositionShares > 0 && sharesToSell > (userPositionShares + 0.001)) {
        return NextResponse.json({
          success: false,
          error: `No posees suficientes acciones. Tienes ${userPositionShares.toFixed(2)} e intentas vender ${sharesToSell.toFixed(2)}.`,
        }, { status: 400 });
      }

      const gross = Math.round(sharesToSell * currentPrice);
      // Comisión de salida (2%) que ingresa a la tesorería de la empresa
      feePaid = Math.max(1, Math.round(gross * 0.02));
      const net = Math.max(0, gross - feePaid);

      // Curva de oferta continua: ventas presionan la cotización a la baja
      slippage = Math.min(0.20, (gross / (baseLiquidity + 5000)) * 1.4);
      // Suelo de cotización inquebrantable
      newPrice = Math.max(1.0, Number((currentPrice * (1 - slippage)).toFixed(2)));
      shares = sharesToSell;
      coinsDelta = net;
      remainingShares = Math.max(0, Number((userPositionShares - sharesToSell).toFixed(4)));
    }

    // 5. Actualizar la tesorería de la empresa y estado de mercado
    const currentTreasury = Number(marketState.treasury_balance || 5000);
    const newTreasury = currentTreasury + feePaid;
    const newRevenue = Number(marketState.total_revenue_generated || 0) + feePaid;
    const nextVolume = Number(marketState.total_volume || 0) + Math.abs(coinsDelta);

    if (cleanTicker === 'BTLN') {
      const nextShares = cleanAction === 'buy'
        ? Number(marketState.total_shares || 0) + shares
        : Math.max(0, Number(marketState.total_shares || 0) - shares);

      const nextPool = cleanAction === 'buy'
        ? baseLiquidity + Math.abs(coinsDelta)
        : Math.max(1000, baseLiquidity - Math.abs(coinsDelta));

      try {
        await client
          .from('market_state')
          .update({
            current_price: newPrice,
            total_shares: nextShares,
            pool_balance: nextPool,
            treasury_balance: newTreasury,
            total_volume: nextVolume,
            total_revenue_generated: newRevenue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 1);
      } catch (_) {}
    } else {
      const defaultBase = BASE_PRICES[cleanTicker] || 10.0;
      const currentStock = stocksMap[cleanTicker] || {
        ticker: cleanTicker,
        name: cleanTicker,
        price: currentPrice,
        basePrice: defaultBase,
        volume: 0,
      };

      const updatedVolume = Number(currentStock.volume || 0) + Math.abs(coinsDelta);
      const change24h = Number((((newPrice - defaultBase) / defaultBase) * 100).toFixed(2));

      stocksMap[cleanTicker] = {
        ...currentStock,
        price: newPrice,
        volume: updatedVolume,
        change24h,
      };

      try {
        await client
          .from('market_state')
          .update({
            parody_stocks: stocksMap,
            treasury_balance: newTreasury,
            total_volume: nextVolume,
            total_revenue_generated: newRevenue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 1);
      } catch (_) {}
    }

    // 6. Actualizar saldo del usuario en profiles
    if (dbUserFound) {
      const nextCoins = Math.max(0, userCoins + coinsDelta);
      try {
        if (effectiveUserId) {
          await client.from('profiles').update({ coins: nextCoins }).eq('id', effectiveUserId);
        } else {
          await client.from('profiles').update({ coins: nextCoins }).ilike('username', effectiveUsername);
        }
      } catch (_) {}
    }

    // 7. Actualizar o insertar tenencia del usuario en investments
    if (effectiveUserId) {
      try {
        if (cleanAction === 'buy') {
          const newTotalShares = userPositionShares + shares;
          const newAvgPrice = newTotalShares > 0
            ? Number((((userPositionAvgPrice * userPositionShares) + (currentPrice * shares)) / newTotalShares).toFixed(4))
            : currentPrice;

          await client
            .from('investments')
            .upsert(
              {
                user_id: effectiveUserId,
                ticker: cleanTicker,
                shares: newTotalShares,
                total_invested_coins: userPositionTotalInvested + Math.abs(coinsDelta),
                average_buy_price: newAvgPrice,
                last_transaction_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,ticker' }
            );
        } else {
          await client
            .from('investments')
            .upsert(
              {
                user_id: effectiveUserId,
                ticker: cleanTicker,
                shares: remainingShares,
                total_withdrawn_coins: (marketState.total_withdrawn_coins || 0) + coinsDelta,
                last_transaction_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,ticker' }
            );
        }
      } catch (_) {}
    }

    // 8. Registrar en public.transactions (público para todos los alumnos)
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const txRow = {
      id: txId,
      user_id: effectiveUserId,
      username: effectiveUsername,
      ticker: cleanTicker,
      type: cleanAction,
      coins_amount: Math.abs(coinsDelta),
      shares_amount: shares,
      price_per_share: currentPrice,
      fee_coins: feePaid,
      net_coins: Math.abs(coinsDelta),
      price_impact_percent: cleanAction === 'buy' ? Number((slippage * 100).toFixed(2)) : -Number((slippage * 100).toFixed(2)),
      created_at: new Date().toISOString(),
    };

    try {
      await client.from('transactions').insert([txRow]).select().maybeSingle();
    } catch (_) {}

    // 9. Registrar punto en public.price_history (sincronización idéntica para la gráfica)
    const histPoint = {
      id: `pt_${Date.now()}`,
      ticker: cleanTicker,
      price: newPrice,
      volume: Math.abs(coinsDelta),
      pool_balance: baseLiquidity,
      treasury_balance: newTreasury,
      total_shares: remainingShares,
      change_percent: cleanAction === 'buy' ? Number((slippage * 100).toFixed(2)) : -Number((slippage * 100).toFixed(2)),
      trigger_type: cleanAction,
      event_description: `@${effectiveUsername} ${cleanAction === 'buy' ? 'compró' : 'vendió'} ${cleanTicker}`,
      player_username: effectiveUsername,
      created_at: new Date().toISOString(),
    };

    try {
      await client.from('price_history').insert([histPoint]).select().maybeSingle();
    } catch (_) {}

    // 10. Emitir evento por Supabase Realtime Broadcast a todos los navegadores
    try {
      const channel = client.channel('botellon_market_live_stream');
      channel.send({
        type: 'broadcast',
        event: 'market_trade',
        payload: {
          transaction: txRow,
          ticker: cleanTicker,
          newPrice,
          pricePoint: histPoint,
          stock: stocksMap[cleanTicker],
          treasuryBalance: newTreasury,
        },
      });
    } catch (_) {}

    const impactPercentText = (slippage * 100).toFixed(1);
    const message = cleanAction === 'buy'
      ? `Has comprado ${shares.toFixed(2)} acciones de ${cleanTicker}. Precio subió a ${newPrice.toFixed(2)} 🪙 (+${impactPercentText}%)`
      : `Has vendido ${shares.toFixed(2)} acciones de ${cleanTicker} y cobrado ${coinsDelta} 🪙 (Precio ajustado a ${newPrice.toFixed(2)} 🪙, comisión 2% a tesorería)`;

    return NextResponse.json({
      success: true,
      ticker: cleanTicker,
      action: cleanAction,
      shares,
      price: currentPrice,
      newPrice,
      coinsDelta,
      feePaid,
      remainingShares,
      treasuryBalance: newTreasury,
      transaction: txRow,
      pricePoint: histPoint,
      message,
    });
  } catch (err: any) {
    console.error('[INVESTMENTS_TRADE_API] Error ejecutando orden:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error interno al procesar la orden.' },
      { status: 500 }
    );
  }
}
