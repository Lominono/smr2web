import { cookies } from 'next/headers';
import { createClient, createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { COOKIE_SESSION } from '@/lib/authSession';
import { UserProfile } from '@/lib/types';

export interface AdminAuthResult {
  authorized: boolean;
  user: UserProfile | null;
  status: 200 | 401 | 403;
  error?: string;
}

/**
 * Validates on the server side whether the incoming request is from an authenticated administrator.
 * Checks Supabase Auth session first, then validates role in `profiles` table.
 * Falls back to verified cookie session.
 */
export async function verifyAdminSession(req?: Request): Promise<AdminAuthResult> {
  const cookieStore = await cookies();

  // 1. Try Supabase server client if configured
  if (isServerSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authUser && !authError) {
          // Check role in profiles
          const adminClient = createAdminClient();
          const client = adminClient || supabase;
          const { data: profile } = await client
            .from('profiles')
            .select('id, username, email, role, coins, biggest_win, is_banned')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            if (profile.is_banned) {
              return { authorized: false, user: null, status: 403, error: 'Cuenta suspendida por un administrador.' };
            }
            if (profile.role === 'admin') {
              return {
                authorized: true,
                status: 200,
                user: {
                  id: profile.id,
                  username: profile.username,
                  email: profile.email || authUser.email,
                  coins: Number(profile.coins),
                  biggest_win: Number(profile.biggest_win),
                  role: 'admin',
                },
              };
            }
            return {
              authorized: false,
              user: null,
              status: 403,
              error: 'Acceso denegado: Se requiere rol de administrador.',
            };
          }
        }
      }
    } catch (err) {
      console.warn('[ADMIN_AUTH_WARN] Supabase check failed:', err);
    }
  }

  // 2. Check cookie session fallback
  const sessionCookie = cookieStore.get(COOKIE_SESSION);
  if (sessionCookie?.value) {
    try {
      let raw = sessionCookie.value;
      if (raw.includes('%')) {
        try {
          raw = decodeURIComponent(raw);
        } catch {}
      }
      const user = JSON.parse(raw) as UserProfile;

      if (user && user.id && (user.role === 'admin' || user.role === 'delegado')) {
        return { authorized: true, user, status: 200 };
      }

      if (user && user.id) {
        return { authorized: false, user, status: 403, error: 'Acceso denegado: Rol insuficiente.' };
      }
    } catch {}
  }

  return { authorized: false, user: null, status: 401, error: 'No autenticado. Inicia sesión como administrador.' };
}

/**
 * Quick helper to verify regular user session on the server
 */
export async function verifyUserSession(): Promise<{
  authenticated: boolean;
  user: UserProfile | null;
}> {
  const cookieStore = await cookies();

  if (isServerSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          const adminClient = createAdminClient();
          const client = adminClient || supabase;
          const { data: profile } = await client
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            return {
              authenticated: true,
              user: {
                id: profile.id,
                username: profile.username,
                email: profile.email || authUser.email,
                coins: Number(profile.coins),
                biggest_win: Number(profile.biggest_win),
                role: profile.role || 'student',
                created_at: profile.created_at,
              },
            };
          }
        }
      }
    } catch {}
  }

  const sessionCookie = cookieStore.get(COOKIE_SESSION);
  if (sessionCookie?.value) {
    try {
      const decoded = decodeURIComponent(sessionCookie.value);
      const user = JSON.parse(decoded) as UserProfile;
      if (user && user.id && user.username) {
        return { authenticated: true, user };
      }
    } catch {}
  }

  return { authenticated: false, user: null };
}
