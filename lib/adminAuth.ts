import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createClient, createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import { COOKIE_SESSION } from '@/lib/authSession';
import { UserProfile } from '@/lib/types';

export const COOKIE_ADMIN_TOKEN = 'smr2_admin_token';

// Clave secreta del servidor para firmar tokens de administración
const ADMIN_SECRET =
  process.env.ADMIN_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'smr2_secure_admin_signing_pepper_v2_2026';

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
 * 
 * Reglas de seguridad:
 * 1. El token `smr2_admin_token` DEBE existir y ser criptográficamente válido.
 * 2. El `userId` del token DEBE ser un UUID real en Supabase.
 * 3. En la base de datos `public.profiles`, el rol DEBE ser estrictamente 'admin'.
 * 4. La cuenta no debe estar suspendida (`is_banned = false`).
 * 
 * NUNCA otorga privilegios administrativos si no se cumplen todas las condiciones.
 */
export async function verifyAdminSession(req?: Request): Promise<AdminAuthResult> {
  const cookieStore = await cookies();

  // 1. Verificación obligatoria del token de sesión administrativa (HttpOnly)
  const adminTokenCookie = cookieStore.get(COOKIE_ADMIN_TOKEN);
  if (!adminTokenCookie?.value) {
    return {
      authorized: false,
      user: null,
      status: 401,
      error: 'Sesión administrativa no iniciada o bloqueada por inactividad.',
    };
  }

  const verifiedPayload = verifyAdminToken(adminTokenCookie.value);
  if (!verifiedPayload) {
    return {
      authorized: false,
      user: null,
      status: 401,
      error: 'Token administrativo inválido, alterado o expirado.',
    };
  }

  // 2. El usuario debe tener un UUID válido registrado en Supabase
  if (!isUUID(verifiedPayload.userId)) {
    return {
      authorized: false,
      user: null,
      status: 403,
      error: 'Acceso denegado: La sesión no está vinculada a una cuenta de usuario verificada.',
    };
  }

  // 3. Verificación autoritativa directa contra la base de datos Supabase
  if (isServerSupabaseConfigured()) {
    try {
      const adminClient = createAdminClient();
      if (adminClient) {
        const { data: profile, error: dbError } = await adminClient
          .from('profiles')
          .select('id, username, email, full_name, student_number, role, coins, biggest_win, is_banned')
          .eq('id', verifiedPayload.userId)
          .maybeSingle();

        if (dbError || !profile) {
          return {
            authorized: false,
            user: null,
            status: 403,
            error: 'Cuenta de administrador no encontrada en la base de datos.',
          };
        }

        if (profile.is_banned) {
          return {
            authorized: false,
            user: null,
            status: 403,
            error: 'Cuenta suspendida por la administración.',
          };
        }

        // SEGURIDAD ESTRICTA: El rol en la base de datos DEBE ser 'admin'
        if (profile.role !== 'admin') {
          return {
            authorized: false,
            user: null,
            status: 403,
            error: `Acceso denegado: El usuario @${profile.username} tiene rol de '${profile.role}'. Solo los administradores oficiales pueden operar este panel.`,
          };
        }

        return {
          authorized: true,
          status: 200,
          user: {
            id: profile.id,
            username: profile.username,
            email: profile.email,
            full_name: profile.full_name,
            student_number: profile.student_number,
            coins: Number(profile.coins ?? 1000),
            biggest_win: Number(profile.biggest_win ?? 0),
            role: 'admin',
          },
        };
      }
    } catch (err) {
      console.warn('[ADMIN_AUTH_CHECK_FAIL]', err);
    }
  }

  return {
    authorized: false,
    user: null,
    status: 403,
    error: 'No se pudo verificar el rango de administrador contra la base de datos.',
  };
}

/**
 * Helper para verificar la sesión del usuario actualmente conectado en el portal (Supabase o cookie)
 */
export async function verifyUserSession(): Promise<{
  authenticated: boolean;
  user: UserProfile | null;
}> {
  const cookieStore = await cookies();

  // 1. Primero comprobar sesión activa en Supabase Auth
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
            .maybeSingle();

          if (profile) {
            return {
              authenticated: true,
              user: {
                id: profile.id,
                username: profile.username,
                email: profile.email || authUser.email,
                full_name: profile.full_name,
                student_number: profile.student_number,
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

  // 2. Comprobar sesión de portal local / cookie
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
        // Si hay Supabase disponible, asegurar que el rol no fue modificado en cliente
        if (isServerSupabaseConfigured() && isUUID(user.id)) {
          try {
            const adminClient = createAdminClient();
            if (adminClient) {
              const { data: p } = await adminClient
                .from('profiles')
                .select('id, username, email, role, full_name, student_number, is_banned')
                .eq('id', user.id)
                .maybeSingle();

              if (p) {
                return {
                  authenticated: true,
                  user: {
                    ...user,
                    role: p.role || 'student',
                    is_banned: p.is_banned,
                  },
                };
              }
            }
          } catch {}
        }

        return { authenticated: true, user };
      }
    } catch {}
  }

  return { authenticated: false, user: null };
}
