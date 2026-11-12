import { NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { LeaderboardEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const viewer = await verifyUserSession();
    const viewerIsLoggedIn = viewer.authenticated && Boolean(viewer.user);

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        let data: any[] | null = null;
        let error: any = null;

        // Intento 1: Incluyendo mascota_equipada directa y party_farm_data
        const primaryRes = await client
          .from('profiles')
          .select('id, username, full_name, coins, biggest_win, streak_count, avatar_color, role, is_banned, mascota_equipada, party_farm_data')
          .order('coins', { ascending: false });

        if (!primaryRes.error) {
          data = primaryRes.data;
        } else {
          // Fallback resiliente: Si la columna mascota_equipada aún no se ha creado físicamente en Supabase
          const fallbackRes = await client
            .from('profiles')
            .select('id, username, full_name, coins, biggest_win, streak_count, avatar_color, role, is_banned, party_farm_data')
            .order('coins', { ascending: false });

          if (!fallbackRes.error) {
            data = fallbackRes.data;
          } else {
            error = fallbackRes.error;
          }
        }

        if (!error && data) {
          const entries: LeaderboardEntry[] = data
            .filter((p: any) => !p.is_banned)
            .map((p: any) => ({
            id: p.id,
            username: p.username,
            full_name: viewerIsLoggedIn ? (p.full_name || undefined) : undefined,
            coins: Math.max(0, Number(p.coins ?? 1000)),
            biggest_win: Math.max(0, Number(p.biggest_win ?? 0)),
            streak_count: p.streak_count ? Number(p.streak_count) : 1,
            avatar_color: p.avatar_color || undefined,
            role: p.role || undefined,
            mascota_equipada: p.mascota_equipada || p.party_farm_data?.mascota_equipada || undefined,
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
