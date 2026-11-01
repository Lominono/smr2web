import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { logEvent } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Acceso restringido a administradores y delegados.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const wipeUsers = body?.wipeUsers === true;

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        // 1. Si se solicita borrado de usuarios o cuentas
        if (wipeUsers) {
          try {
            if (client.auth && client.auth.admin) {
              const { data: usersData } = await client.auth.admin.listUsers();
              if (usersData?.users) {
                for (const u of usersData.users) {
                  await client.auth.admin.deleteUser(u.id).catch(() => {});
                }
              }
            }
          } catch (authErr) {
            console.warn('Could not wipe auth users via admin API:', authErr);
          }

          try { await client.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        } else {
          // Reiniciar todos los perfiles de alumnos a 1.000 monedas y 0 victorias
          const { error: profilesError } = await client
            .from('profiles')
            .update({
              coins: 1000,
              biggest_win: 0,
              streak_count: 1,
              games_played: 0,
              games_won: 0,
              last_claim_date: null,
            })
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (profilesError) {
            console.warn('Error resetting profiles:', profilesError);
          }
        }

        // 2. Limpiar registros de partidas, inversiones y transacciones
        try { await client.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('investments').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('price_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('balance_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_turns').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_games').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_rooms').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('community_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}

        // 3. Limpiar chat
        try { await client.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}

        // 4. Reiniciar mercado a valores limpios
        try {
          await client.from('market_state').upsert({
            id: 1,
            current_price: 10.0,
            pool_balance: 0,
            total_shares: 0,
            total_volume: 0,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        await logEvent({
          eventType: 'admin_action',
          userId: authResult.user.id,
          username: authResult.user.username,
          req,
          details: {
            action: 'database_full_reset',
            performedBy: authResult.user.username,
            timestamp: new Date().toISOString(),
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Base de datos reiniciada con éxito en Supabase. Todos los alumnos tienen 1.000 monedas.',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos reiniciada en modo local.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al reiniciar la base de datos.' },
      { status: 500 }
    );
  }
}
