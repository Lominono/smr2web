import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para ejecutar ticks de actividad empresarial y oscilación orgánica.
 * Optimizado: frecuencia limitada y actualización no bloqueante.
 */
export async function GET(request: NextRequest) {
  return handleMarketTick(request);
}

export async function POST(request: NextRequest) {
  return handleMarketTick(request);
}

async function handleMarketTick(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'No autorizado para ejecutar el cron' }, { status: 401 });
      }
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ success: true, message: 'Supabase offline fallback' }, { status: 200 });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ success: false, error: 'Supabase no inicializado' }, { status: 200 });
    }

    // 1. Intentar llamar al RPC nativo si está presente en la base de datos
    const { data: rpcData, error: rpcError } = await adminClient.rpc('tick_market_price');
    if (!rpcError && rpcData) {
      return NextResponse.json({ success: true, result: rpcData });
    }

    // 2. Fallback de ciclo empresarial optimizado
    const { data: mData } = await adminClient
      .from('market_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!mData) {
      return NextResponse.json({ success: true, message: 'Mercado sin datos' });
    }

    const lastTick = mData.last_tick_at ? new Date(mData.last_tick_at).getTime() : 0;
    const now = Date.now();
    // Limitar ticks a mínimo 15 segundos entre ejecuciones para optimización extrema
    if (now - lastTick < 15000) {
      return NextResponse.json({ success: true, throttled: true, waitSeconds: Math.ceil((15000 - (now - lastTick)) / 1000) });
    }

    // Ingresos del negocio operativo (ventas de botellón/recreo): entre 20 y 80 monedas
    const businessRevenue = Math.floor(Math.random() * 60) + 20;
    const newTreasury = Number(mData.treasury_balance || 5000) + businessRevenue;
    const newRevenue = Number(mData.total_revenue_generated || 0) + businessRevenue;

    // Oscilación orgánica muy suave (±0.8%)
    const rndFactor = (Math.random() * 0.016) - 0.007; // -0.7% a +0.9%
    const curPrice = Number(mData.current_price || 10.0);
    const newPrice = Math.max(1.0, Number((curPrice * (1 + rndFactor)).toFixed(2)));
    const changePct = Number((((newPrice - curPrice) / curPrice) * 100).toFixed(2));

    await adminClient
      .from('market_state')
      .update({
        current_price: newPrice,
        treasury_balance: newTreasury,
        total_revenue_generated: newRevenue,
        last_event: `Ingreso operativo: +${businessRevenue} 🪙 facturados`,
        last_event_type: 'neutral',
        last_event_impact: changePct,
        last_tick_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    const histPoint = {
      id: `tick_${now}`,
      ticker: 'BTLN',
      price: newPrice,
      volume: businessRevenue,
      pool_balance: Number(mData.pool_balance || 10000),
      treasury_balance: newTreasury,
      total_shares: Number(mData.total_shares || 0),
      change_percent: changePct,
      trigger_type: 'revenue',
      event_description: `Rendimiento de negocio (+${businessRevenue} 🪙 a caja)`,
      created_at: new Date().toISOString(),
    };

    try {
      await adminClient.from('price_history').insert([histPoint]);
    } catch (_) {}

    try {
      const channel = adminClient.channel('botellon_market_live_stream');
      channel.send({
        type: 'broadcast',
        event: 'market_trade',
        payload: {
          ticker: 'BTLN',
          newPrice,
          pricePoint: histPoint,
          treasuryBalance: newTreasury,
        },
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      businessRevenue,
      newPrice,
      newTreasury,
      changePercent: changePct,
    });
  } catch (err: any) {
    console.warn('[Investments Tick] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Error interno' }, { status: 200 });
  }
}
