import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession, verifyAdminSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json } from '@/lib/security/http';
import { securityEvent } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

/** Segundos mínimos entre ticks del mercado (protección contra spam). */
const MIN_TICK_INTERVAL_MS = 15_000;

/**
 * Tick del mercado del botellón (ingresos del negocio + oscilación de precio).
 *
 * Autorización:
 * - Cron/administración: cabecera `Authorization: Bearer <CRON_SECRET>`.
 * - Alumnos: solo con sesión verificada y con un límite de frecuencia.
 * Antes, si `CRON_SECRET` no estaba configurado, CUALQUIERA podía ejecutar el
 * tick en bucle e inflar la tesorería y el precio a voluntad.
 */
export async function GET(request: NextRequest) {
  return handleMarketTick(request);
}

export async function POST(request: NextRequest) {
  return handleMarketTick(request);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function handleMarketTick(request: NextRequest) {
  try {
    const originError = guardOrigin(request);
    if (originError) return originError;

    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    const isCron = Boolean(cronSecret && bearer && safeEqual(bearer, cronSecret));

    let actorId: string | null = null;
    let actorName: string | null = null;

    if (!isCron) {
      const admin = await verifyAdminSession(request);
      if (admin.authorized && admin.user) {
        actorId = admin.user.id;
        actorName = admin.user.username;
      } else {
        const session = await verifyUserSession();
        if (!session.authenticated || !session.user) {
          await securityEvent({
            action: 'market_tick_unauthorized',
            req: request,
            details: { hasCronSecret: Boolean(cronSecret) },
          });
          return fail('No autorizado para ejecutar el tick del mercado.', 401);
        }
        actorId = session.user.id;
        actorName = session.user.username;

        const rate = enforceRateLimit(`market-tick:${actorId}`, { limit: 6, windowMs: 60_000 });
        if (!rate.ok) return rate.response;
      }
    }

    if (!isServerSupabaseConfigured()) {
      return json({ success: true, message: 'Supabase offline fallback' });
    }

    const adminClient = createAdminClient();
    if (!adminClient) return fail('Supabase no inicializado', 503);

    // 1. RPC nativo (atómicamente bloquea la fila del mercado)
    const { data: rpcData, error: rpcError } = await adminClient.rpc('tick_market_price');
    if (!rpcError && rpcData) {
      return json({ success: true, result: rpcData });
    }

    // 2. Respaldo transaccional en aplicación
    const { data: mData } = await adminClient
      .from('market_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!mData) return json({ success: true, message: 'Mercado sin datos' });

    const lastTick = mData.last_tick_at ? new Date(mData.last_tick_at).getTime() : 0;
    const now = Date.now();
    if (now - lastTick < MIN_TICK_INTERVAL_MS) {
      return json({
        success: true,
        throttled: true,
        waitSeconds: Math.ceil((MIN_TICK_INTERVAL_MS - (now - lastTick)) / 1000),
      });
    }

    const businessRevenue = Math.floor(Math.random() * 60) + 20;
    const newTreasury = Number(mData.treasury_balance || 5000) + businessRevenue;
    const newRevenue = Number(mData.total_revenue_generated || 0) + businessRevenue;

    const rndFactor = Math.random() * 0.016 - 0.007;
    const curPrice = Number(mData.current_price || 10.0);
    const newPrice = Math.max(1.0, Number((curPrice * (1 + rndFactor)).toFixed(2)));
    const changePct = Number((((newPrice - curPrice) / curPrice) * 100).toFixed(2));

    // Actualización condicional: solo aplica si nadie ha ejecutado otro tick
    const { data: updatedRows, error: updateError } = await adminClient
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
      .eq('id', 1)
      .eq('last_tick_at', mData.last_tick_at)
      .select('id');

    if (updateError || !updatedRows || updatedRows.length === 0) {
      return json({ success: true, throttled: true, waitSeconds: 5 });
    }

    const histPoint = {
      id: crypto.randomUUID(),
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
    } catch {
      /* histórico secundario */
    }

    try {
      const channel = adminClient.channel('botellon_market_live_stream');
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          try {
            adminClient.removeChannel(channel);
          } catch {}
          resolve();
        };
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await channel.send({
                type: 'broadcast',
                event: 'market_trade',
                payload: { ticker: 'BTLN', newPrice, pricePoint: histPoint, treasuryBalance: newTreasury },
              });
            } catch {}
            finish();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            finish();
          }
        });
        setTimeout(finish, 800);
      });
    } catch {
      /* tiempo real secundario */
    }

    return json({
      success: true,
      businessRevenue,
      newPrice,
      newTreasury,
      changePercent: changePct,
      triggeredBy: actorName || (isCron ? 'cron' : null),
    });
  } catch (err: any) {
    console.warn('[Investments Tick] Error:', err);
    return fail(err?.message || 'Error interno', 500);
  }
}
