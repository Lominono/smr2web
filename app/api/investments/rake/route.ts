import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para ingresar el rake de pérdidas del casino/arcade a la tesorería de la empresa.
 * Cuando los alumnos juegan en el casino, el 1-2% alimenta la caja fuerte de la empresa.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { amount = 0, game = 'arcade' } = body;
    const cleanAmount = Math.max(0, Math.round(Number(amount)));

    if (cleanAmount <= 0) {
      return NextResponse.json({ success: true, message: 'Rake cero ignorado.' });
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ success: false, fallbackLocal: true });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ success: false, fallbackLocal: true });
    }

    // 1. Intentar llamar al RPC record_arcade_rake_to_market
    const { data: rpcData, error: rpcError } = await client.rpc('record_arcade_rake_to_market', {
      p_amount: cleanAmount,
      p_game: String(game),
    });

    if (!rpcError && rpcData?.success) {
      return NextResponse.json({ success: true, data: rpcData });
    }

    // 2. Fallback de actualización directa en market_state
    const { data: mData } = await client
      .from('market_state')
      .select('treasury_balance, total_revenue_generated, arcade_rake_accumulated')
      .eq('id', 1)
      .maybeSingle();

    if (mData) {
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

      return NextResponse.json({
        success: true,
        treasury_balance: nextTreasury,
        arcade_rake_accumulated: nextRake,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.warn('[INVESTMENTS_RAKE_API] Error registrando rake:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Error registrando rake' }, { status: 500 });
  }
}
