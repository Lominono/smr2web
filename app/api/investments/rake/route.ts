import { NextRequest } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody } from '@/lib/security/http';
import { securityEvent } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

/** Rake máximo aceptado por petición (2 % de una apuesta de 10.000). */
const MAX_RAKE_PER_REQUEST = 200;

/**
 * POST /api/investments/rake
 *
 * Aporte del casino a la tesorería de la empresa.
 *
 * IMPORTANTE: el rake de las partidas ya lo calcula y aplica el servidor al
 * registrar la apuesta (/api/user/balance/sync). Este endpoint queda reservado
 * a la administración porque antes era público y aceptaba cualquier importe,
 * permitiendo inflar la tesorería sin jugar.
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const auth = await verifyAdminSession(req);
    if (!auth.authorized || !auth.user) {
      await securityEvent({
        action: 'rake_unauthorized_attempt',
        req,
        details: { hasAdminToken: Boolean(req.cookies.get('smr2_admin_token')?.value) },
      });
      return fail('Acceso restringido: solo la administración puede registrar el rake.', 403);
    }

    const rate = enforceRateLimit(`rake:${auth.user.id}`, { limit: 10, windowMs: 60_000 });
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Petición no válida.', 400);

    const requested = Math.round(Number(body.amount));
    const game = String(body.game || 'arcade').slice(0, 40);

    if (!Number.isFinite(requested) || requested <= 0) {
      return json({ success: true, message: 'Rake cero ignorado.' });
    }

    const cleanAmount = Math.min(MAX_RAKE_PER_REQUEST, requested);

    if (!isServerSupabaseConfigured()) {
      return fail('Base de datos no disponible.', 503);
    }

    const client = createAdminClient();
    if (!client) return fail('Base de datos no disponible.', 503);

    const { data: rpcData, error: rpcError } = await client.rpc('record_arcade_rake_to_market', {
      p_amount: cleanAmount,
      p_game: game,
    });

    if (!rpcError && rpcData?.success) {
      return json({ success: true, data: rpcData });
    }

    const { data: mData } = await client
      .from('market_state')
      .select('treasury_balance, total_revenue_generated, arcade_rake_accumulated')
      .eq('id', 1)
      .maybeSingle();

    if (!mData) return json({ success: true });

    const nextTreasury = Number(mData.treasury_balance || 5000) + cleanAmount;
    const nextRevenue = Number(mData.total_revenue_generated || 0) + cleanAmount;
    const nextRake = Number(mData.arcade_rake_accumulated || 0) + cleanAmount;

    await client
      .from('market_state')
      .update({
        treasury_balance: nextTreasury,
        total_revenue_generated: nextRevenue,
        arcade_rake_accumulated: nextRake,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    return json({ success: true, treasury_balance: nextTreasury, arcade_rake_accumulated: nextRake });
  } catch (err: any) {
    console.warn('[INVESTMENTS_RAKE_API] Error registrando rake:', err);
    return fail(err?.message || 'Error registrando rake', 500);
  }
}
