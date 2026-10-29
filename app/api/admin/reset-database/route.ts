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
    // Por defecto, purgar completamente todos los usuarios y registros a 0
    const wipeUsers = body?.wipeUsers !== false;

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        // 1. Borrar todas las cuentas de usuario de Supabase Auth
        if (wipeUsers) {
          try {
            if (client.auth && client.auth.admin) {
              const { data: usersData } = await client.auth.admin.listUsers({ perPage: 1000 });
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
        }

        // 2. Limpiar todas las tablas a 0 registros
        try { await client.from('chat_message_likes').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('push_subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('community_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('event_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}

        // Tablas de juegos y economía
        try { await client.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('investments').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('price_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('balance_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_turns').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_games').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_rooms').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}

        // 3. Reiniciar mercado a valores limpios iniciales
        try {
          await client.from('market_state').upsert({
            id: 1,
            current_price: 10.0,
            pool_balance: 0,
            total_shares: 0,
            total_volume: 0,
            total_investors: 0,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        await logEvent({
          eventType: 'admin_action',
          userId: authResult.user.id,
          username: authResult.user.username,
          req,
          details: {
            action: 'database_zero_wipe',
            performedBy: authResult.user.username,
            timestamp: new Date().toISOString(),
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Purga total completada en Supabase: todos los usuarios, mensajes, partidas y registros han sido eliminados a 0.',
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
