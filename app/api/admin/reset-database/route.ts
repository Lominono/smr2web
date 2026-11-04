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

        // 2. Limpiar registros de partidas, inversiones, transacciones y chat
        try { await client.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('investments').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('price_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('balance_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('chat_message_likes').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('feedback_votes').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('community_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_turns').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_room_players').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_games').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_rooms').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('event_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}

        // 3. Reiniciar mercado y tesorería a valores limpios oficiales
        try {
          await client.from('market_state').upsert({
            id: 1,
            current_price: 10.0,
            pool_balance: 0,
            total_shares: 0,
            total_volume: 0,
            total_investors: 0,
            treasury_balance: 5000.0,
            total_revenue_generated: 0.0,
            arcade_rake_accumulated: 0.0,
            updated_at: new Date().toISOString(),
          });

          // Insertar punto base oficial
          await client.from('price_history').insert([
            {
              ticker: 'BTLN',
              price: 10.0,
              volume: 0,
              pool_balance: 0,
              treasury_balance: 5000.0,
              total_shares: 0,
              change_percent: 0.0,
              trigger_type: 'SYSTEM_INIT',
              event_description: 'Punto base oficial de lanzamiento Botellón SMR2',
              player_username: 'Sistema',
              created_at: new Date().toISOString(),
            },
          ]);
        } catch (mErr) {
          console.warn('Error resetting market state:', mErr);
        }

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
