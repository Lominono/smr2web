import { NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { LeaderboardEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        const { data, error } = await client
          .from('profiles')
          .select('id, username, full_name, coins, biggest_win, streak_count, avatar_color, role, is_banned')
          .order('coins', { ascending: false });

        if (!error && data) {
          const entries: LeaderboardEntry[] = data.map((p: any) => ({
            id: p.id,
            username: p.username,
            full_name: p.full_name || undefined,
            coins: Math.max(0, Number(p.coins ?? 1000)),
            biggest_win: Math.max(0, Number(p.biggest_win ?? 0)),
            streak_count: p.streak_count ? Number(p.streak_count) : 1,
            avatar_color: p.avatar_color || undefined,
            role: p.role || undefined,
          }));

          return NextResponse.json(
            { success: true, leaderboard: entries, count: entries.length },
            {
              headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              },
            }
          );
        }
      }
    }

    return NextResponse.json({ success: true, leaderboard: [], count: 0 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener clasificación.' },
      { status: 500 }
    );
  }
}
