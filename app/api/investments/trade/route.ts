import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { COOKIE_SESSION } from '@/lib/authSession';
import { UserProfile, InvestmentTransaction, PriceHistoryPoint, ParodyStock } from '@/lib/types';

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

    // 1. Obtener datos actuales del usuario en profiles
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

    // 2. Obtener estado del mercado
    const { data: mData } = await client
      .from('market_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    const marketState = mData || {
      id: 1,
      current_price: 10.0,
      total_shares: 0,
      pool_balance: 0,
      total_volume: 0,
      parody_stocks: {},
    };

    let currentPrice = cleanTicker === 'BTLN' ? Number(marketState.current_price || 10.0) : 10.0;
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

    // 3. Ejecutar Lógica de Compra o Venta
    let shares = 0;
    let newPrice = currentPrice;
    let coinsDelta = 0;
    let feePaid = 0;
    let slippage = 0;
    let remainingShares = 0;

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
      // Ley de oferta y demanda real (comprar empuja el precio al alza)
      slippage = Math.min(0.12, coinsToInvest / 25000.0);
      newPrice = Number((currentPrice * (1 + slippage)).toFixed(2));
      coinsDelta = -coinsToInvest;
    } else {
      const sharesToSell = Number(numAmount.toFixed(4));
      if (sharesToSell <= 0) {
        return NextResponse.json({ success: false, error: 'Indica una cantidad de acciones a vender.' }, { status: 400 });
      }

      const gross = Math.round(sharesToSell * currentPrice);
      feePaid = Math.max(1, Math.round(gross * 0.02));
      const net = Math.max(0, gross - feePaid);

      // Ley de oferta y demanda real (vender presiona la cotización a la baja)
      slippage = Math.min(0.15, gross / 20000.0);
      newPrice = Math.max(0.5, Number((currentPrice * (1 - slippage)).toFixed(2)));
      shares = sharesToSell;
      coinsDelta = net;
    }

    // 4. Actualizar estado del mercado en Supabase
    if (cleanTicker === 'BTLN') {
      const nextVolume = Number(marketState.total_volume || 0) + Math.abs(coinsDelta);
      const nextShares = cleanAction === 'buy'
        ? Number(marketState.total_shares || 0) + shares
        : Math.max(0, Number(marketState.total_shares || 0) - shares);

      await client
        .from('market_state')
        .update({
          current_price: newPrice,
          total_shares: nextShares,
          total_volume: nextVolume,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    } else {
      const defaultBase = BASE_PRICES[cleanTicker] || 10.0;
      const currentStock = stocksMap[cleanTicker] || {
        ticker: cleanTicker,
        name: cleanTicker,
        price: currentPrice,
        basePrice: defaultBase,
        volume: 0,
      };

      const updatedVolume = Number(currentStock.volume || 0) + (cleanAction === 'buy' ? Math.abs(coinsDelta) : Math.round(shares * currentPrice));
      const change24h = Number((((newPrice - defaultBase) / defaultBase) * 100).toFixed(2));

      stocksMap[cleanTicker] = {
        ...currentStock,
        price: newPrice,
        volume: updatedVolume,
        change24h,
      };

      await client
        .from('market_state')
        .update({
          parody_stocks: stocksMap,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    }

    // 5. Actualizar saldo del usuario en profiles
    if (dbUserFound) {
      const nextCoins = Math.max(0, userCoins + coinsDelta);
      if (effectiveUserId) {
        await client.from('profiles').update({ coins: nextCoins }).eq('id', effectiveUserId);
      } else {
        await client.from('profiles').update({ coins: nextCoins }).ilike('username', effectiveUsername);
      }
    }

    // 6. Registrar en public.transactions
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
      created_at: new Date().toISOString(),
    };

    await client.from('transactions').insert([txRow]).select().maybeSingle();

    // 7. Registrar punto histórico en public.price_history
    const histPoint = {
      id: `pt_${Date.now()}`,
      ticker: cleanTicker,
      price: newPrice,
      pool_balance: Math.abs(coinsDelta),
      total_shares: shares,
      change_percent: cleanAction === 'buy' ? Number((slippage * 100).toFixed(2)) : -Number((slippage * 100).toFixed(2)),
      trigger_type: cleanAction,
      event_description: `@${effectiveUsername} ${cleanAction === 'buy' ? 'compró' : 'vendió'} ${cleanTicker}`,
      created_at: new Date().toISOString(),
    };

    await client.from('price_history').insert([histPoint]).select().maybeSingle();

    // 8. Emitir evento por Supabase Realtime Broadcast a todos los navegadores
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
        },
      });
    } catch (_) {}

    const message = cleanAction === 'buy'
      ? `Has comprado ${shares.toFixed(2)} acciones de ${cleanTicker}. Precio ajustado a ${newPrice.toFixed(2)} 🪙 (+${(slippage * 100).toFixed(1)}%)`
      : `Has vendido ${shares.toFixed(2)} acciones de ${cleanTicker} y cobrado ${coinsDelta} 🪙 (Precio ajustado a ${newPrice.toFixed(2)} 🪙)`;

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
