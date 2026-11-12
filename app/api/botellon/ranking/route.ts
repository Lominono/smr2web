import { NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { fail } from '@/lib/security/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isServerSupabaseConfigured()) {
      return fail('Base de datos no configurada.', 503);
    }

    const client = createAdminClient();
    if (!client) return fail('Error de conexión con la base de datos.', 500);

    const { data: rows, error } = await client
      .from('botellon_states')
      .select('user_id, after_prestige_count, total_lifetime_produced, current_zone_id, total_drinks_taken, updated_at')
      .order('after_prestige_count', { ascending: false })
      .order('total_lifetime_produced', { ascending: false })
      .limit(20);

    if (error) return fail('Error al cargar el ranking del Botellón.', 500);

    const ids = (rows || []).map((r) => r.user_id).filter(Boolean);
    const profilesMap = new Map<string, { username: string; avatar_url: string | null }>();

    if (ids.length > 0) {
      const { data: profiles } = await client
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ids);

      for (const p of profiles || []) {
        profilesMap.set(p.id, {
          username: p.username || 'Alumno SMR',
          avatar_url: p.avatar_url || null,
        });
      }
    }

    const ranking = (rows || []).map((r, index) => {
      const profile = profilesMap.get(r.user_id);
      return {
        rank: index + 1,
        user_id: r.user_id,
        username: profile?.username || 'Alumno SMR',
        avatar_url: profile?.avatar_url || null,
        after_prestige_count: Number(r.after_prestige_count || 0),
        total_lifetime_produced: Number(r.total_lifetime_produced || 0),
        current_zone_id: r.current_zone_id || 'parque',
        total_drinks_taken: Number(r.total_drinks_taken || 0),
      };
    });

    return NextResponse.json({ success: true, ranking });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
