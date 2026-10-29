import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createClient, createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { COOKIE_SESSION } from '@/lib/authSession';
import { UserProfile } from '@/lib/types';

export const COOKIE_ADMIN_TOKEN = 'smr2_admin_token';
export const COOKIE_EARLY_ACCESS_TOKEN = 'smr2_early_access_token';

// Clave secreta del servidor para firmar tokens de administración y acceso anticipado
const ADMIN_SECRET =
  process.env.ADMIN_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'smr2_secure_admin_signing_pepper_v2_2026';

export interface EarlyAccessTokenPayload {
  authorized: boolean;
  role: 'developer' | 'admin' | 'tester';
  keyName?: string;
  grantedAt: number;
  exp: number; // Timestamp en segundos
}

/**
 * Genera un token HMAC-SHA256 firmado por el servidor para acceso anticipado (Early Access / Desarrollo)
 */
export function signEarlyAccessToken(
  payload: Omit<EarlyAccessTokenPayload, 'exp'>,
  validDays: number = 30
): string {
  const fullPayload: EarlyAccessTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + validDays * 24 * 60 * 60,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifica la firma criptográfica del token de acceso anticipado
 */
export function verifyEarlyAccessToken(token?: string | null): EarlyAccessTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  try {
    const expectedSig = crypto
      .createHmac('sha256', ADMIN_SECRET)
      .update(data)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as EarlyAccessTokenPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expirado
    }

    if (!payload.authorized) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Comprueba de forma estricta en el servidor si la sesión cuenta con acceso anticipado legítimo
 */
export async function verifyEarlyAccessSession(req?: Request): Promise<{
  authorized: boolean;
  role?: string;
  keyName?: string;
}> {
  const cookieStore = await cookies();

  // 1. Verificar token específico de acceso anticipado
  const earlyTokenCookie = cookieStore.get(COOKIE_EARLY_ACCESS_TOKEN);
  if (earlyTokenCookie?.value) {
    const payload = verifyEarlyAccessToken(earlyTokenCookie.value);
    if (payload && payload.authorized) {
      return { authorized: true, role: payload.role, keyName: payload.keyName };
    }
  }

  // 2. Un token de administración firmado otorga automáticamente acceso anticipado
  const adminTokenCookie = cookieStore.get(COOKIE_ADMIN_TOKEN);
  if (adminTokenCookie?.value) {
    const adminPayload = verifyAdminToken(adminTokenCookie.value);
    if (adminPayload) {
      return { authorized: true, role: 'admin', keyName: 'admin_session' };
    }
  }

  // 3. Comprobar sesión de Supabase Auth si el usuario tiene rol admin o delegado
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
            .select('role, is_banned')
            .eq('id', authUser.id)
            .maybeSingle();

          if (profile && !profile.is_banned && (profile.role === 'admin' || profile.role === 'delegado')) {
            return { authorized: true, role: profile.role, keyName: 'supabase_role' };
          }
        }
      }
    } catch {}
  }

  return { authorized: false };
}

export interface AdminTokenPayload {
  userId: string;
  username: string;
  role: 'admin';
  exp: number; // Timestamp en segundos
}

/**
 * Genera un token HMAC-SHA256 firmado exclusivamente por el servidor
 */
export function signAdminToken(payload: Omit<AdminTokenPayload, 'exp'>, validDays: number = 7): string {
  const fullPayload: AdminTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + validDays * 24 * 60 * 60,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifica la firma criptográfica del token y su fecha de expiración
 */
export function verifyAdminToken(token?: string | null): AdminTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  try {
    const expectedSig = crypto
      .createHmac('sha256', ADMIN_SECRET)
      .update(data)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as AdminTokenPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expirado
    }

    if (payload.role !== 'admin') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export interface AdminAuthResult {
  authorized: boolean;
  user: UserProfile | null;
  status: 200 | 401 | 403;
  error?: string;
}

/**
 * Valida de forma estricta en el lado del servidor si la petición proviene de un administrador legítimo.
 * 1. Comprueba el token firmado HttpOnly `smr2_admin_token`.
 * 2. Comprueba la sesión autenticada en Supabase y verifica el rol en la tabla `profiles`.
 * NUNCA confía en cookies de cliente no firmadas para otorgar permisos administrativos.
 */
export async function verifyAdminSession(req?: Request): Promise<AdminAuthResult> {
  const cookieStore = await cookies();

  // 1. Verificación del token de administrador firmado (HttpOnly)
  const adminTokenCookie = cookieStore.get(COOKIE_ADMIN_TOKEN);
  if (adminTokenCookie?.value) {
    const verifiedPayload = verifyAdminToken(adminTokenCookie.value);
    if (verifiedPayload) {
      // Si Supabase está disponible, verificar que el usuario no esté baneado
      if (isServerSupabaseConfigured()) {
        try {
          const adminClient = createAdminClient();
          if (adminClient) {
            const { data: profile } = await adminClient
              .from('profiles')
              .select('id, username, email, role, coins, biggest_win, is_banned')
              .eq('id', verifiedPayload.userId)
              .maybeSingle();

            if (profile?.is_banned) {
              return {
                authorized: false,
                user: null,
                status: 403,
                error: 'Cuenta suspendida por la administración.',
              };
            }
          }
        } catch {}
      }

      return {
        authorized: true,
        status: 200,
        user: {
          id: verifiedPayload.userId,
          username: verifiedPayload.username,
          role: 'admin',
          coins: 1000,
          biggest_win: 0,
        },
      };
    }
  }

  // 2. Verificación de la sesión de Supabase Auth
  if (isServerSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authUser && !authError) {
          const adminClient = createAdminClient();
          const client = adminClient || supabase;
          const { data: profile } = await client
            .from('profiles')
            .select('id, username, email, role, coins, biggest_win, is_banned')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            if (profile.is_banned) {
              return {
                authorized: false,
                user: null,
                status: 403,
                error: 'Cuenta suspendida por un administrador.',
              };
            }
            if (profile.role === 'admin' || profile.role === 'delegado') {
              return {
                authorized: true,
                status: 200,
                user: {
                  id: profile.id,
                  username: profile.username,
                  email: profile.email || authUser.email,
                  coins: Number(profile.coins),
                  biggest_win: Number(profile.biggest_win),
                  role: profile.role,
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

  return {
    authorized: false,
    user: null,
    status: 401,
    error: 'Acceso restringido: Inicia sesión con la clave de administrador.',
  };
}

/**
 * Helper para verificar la sesión de un usuario normal en el servidor
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
      let raw = sessionCookie.value;
      if (raw.includes('%')) {
        try {
          raw = decodeURIComponent(raw);
        } catch {}
      }
      const user = JSON.parse(raw) as UserProfile;
      if (user && user.id && user.username) {
        return { authenticated: true, user };
      }
    } catch {}
  }

  return { authenticated: false, user: null };
}
