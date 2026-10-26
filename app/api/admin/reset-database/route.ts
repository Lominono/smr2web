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

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        // 1. Reiniciar todos los perfiles de alumnos a 1.000 monedas y 0 victorias
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
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Todos

        if (profilesError) {
          console.warn('Error resetting profiles:', profilesError);
        }

        // 2. Limpiar registros de partidas y transacciones antiguas
        try { await client.from('balance_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_turns').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_games').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('rr_rooms').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        try { await client.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}

        // 3. Limpiar chat y dejar aviso oficial
        try { await client.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
        await client.from('chat_messages').insert([
          {
            username: 'Delegado SMR2',
            text: '¡Atención a toda la clase! Se ha reiniciado la economía y el ranking para la nueva temporada. Todos los alumnos empiezan con 1.000 monedas. ¡Que empiece la competición!',
          },
        ]);

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
