import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        const { data: game, error: gameErr } = await client
          .from('rr_games')
          .select('*, rr_rooms(*)')
          .eq('id', id)
          .single();

        if (gameErr || !game) {
          return NextResponse.json({ success: false, error: 'Partida no encontrada.' }, { status: 404 });
        }

        const { data: turns } = await client
          .from('rr_turns')
          .select('*')
          .eq('game_id', id)
          .order('created_at', { ascending: true });

        const { data: logs } = await client
          .from('event_logs')
          .select('*')
          .eq('game_id', id)
          .order('created_at', { ascending: true });

        return NextResponse.json({
          success: true,
          game,
          turns: turns || [],
          logs: logs || [],
        });
      }
    }

    return NextResponse.json({
      success: true,
      game: {
        id,
        current_chamber: 0,
        bullet_chamber: 2,
        status: 'finished',
        winner_username: 'alumno_smr2',
      },
      turns: [],
      logs: [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener detalle de la partida.' },
      { status: 500 }
    );
  }
}
