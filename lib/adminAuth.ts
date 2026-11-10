import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createClient, createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import { COOKIE_SESSION } from '@/lib/authSession';
import { UserProfile } from '@/lib/types';

export const COOKIE_ADMIN_TOKEN = 'smr2_admin_token';
export const COOKIE_SESSION_TOKEN = 'smr2_session_token';

let _runtimeEphemeralSecret: string | null = null;

/**
 * Obtiene o deriva una clave secreta segura de 256 bits para firmas HMAC en servidor.
 * Prioriza variables de entorno oficiales del servidor.
 * Si ninguna está configurada, genera una semilla criptográfica por proceso (nunca hardcodeada estática).
 */
export function getServerSigningSecret(): string {
  if (process.env.ADMIN_SECRET_KEY && process.env.ADMIN_SECRET_KEY.trim().length >= 16) {
    return process.env.ADMIN_SECRET_KEY.trim();
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length >= 20) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  }
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length >= 8) {
    return crypto.createHash('sha256').update(`smr2_derived_signing_secret_${process.env.ADMIN_PASSWORD.trim()}`).digest('hex');
  }

  // Semilla criptográfica generada en tiempo de ejecución para el ciclo de vida del servidor
  if (!_runtimeEphemeralSecret) {
    _runtimeEphemeralSecret = crypto.randomBytes(32).toString('hex');
  }
  return _runtimeEphemeralSecret;
}

export interface AdminTokenPayload {
  userId: string;
  username: string;
  role: 'admin';
  exp: number; // Timestamp en segundos
}

export interface UserSessionPayload {
  userId: string;
  username: string;
  role: 'student' | 'delegado' | 'admin';
  exp: number; // Timestamp en segundos
}

/**
 * Genera un token HMAC-SHA256 para elevar privilegios de administrador
 */
export function signAdminToken(payload: Omit<AdminTokenPayload, 'exp'>, validHours: number = 4): string {
  const secret = getServerSigningSecret();
  const fullPayload: AdminTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + validHours * 60 * 60,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifica la firma criptográfica del token administrativo
 */
export function verifyAdminToken(token?: string | null): AdminTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  try {
    const secret = getServerSigningSecret();
    const expectedSig = crypto
      .createHmac('sha256', secret)
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

/**
 * Genera un token firmado HMAC-SHA256 para la sesión de usuario
 */
export function signUserSessionToken(payload: Omit<UserSessionPayload, 'exp'>, validDays: number = 730): string {
  const secret = getServerSigningSecret();
  const fullPayload: UserSessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + validDays * 24 * 60 * 60,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifica la firma criptográfica del token de sesión de usuario
 */
export function verifyUserSessionToken(token?: string | null): UserSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  try {
    const secret = getServerSigningSecret();
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as UserSessionPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expirado
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
 * Valida de forma estricta en el servidor si la petición proviene de un administrador legítimo.
 * 
 * Reglas de seguridad:
 * 1. El token `smr2_admin_token` DEBE existir y ser criptográficamente válido.
 * 2. El `userId` del token DEBE ser un UUID real en Supabase.
 * 3. En la base de datos `public.profiles`, el rol DEBE ser estrictamente 'admin'.
 * 4. La cuenta no debe estar suspendida (`is_banned = false`).
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
 * Helper para verificar de forma segura la sesión del usuario conectado.
 * 
 * Jerarquía de confianza estricta:
 * 1. Supabase Auth JWT verificado por el servidor (`getUser()`).
 * 2. Token de sesión firmado criptográficamente por el servidor (`smr2_session_token`).
 * 3. Las cookies no firmadas en texto plano (`smr2_user_session`) NUNCA otorgan rol ni privilegios.
 */
export async function verifyUserSession(): Promise<{
  authenticated: boolean;
  user: UserProfile | null;
}> {
  const cookieStore = await cookies();

  // 1. Comprobar sesión activa en Supabase Auth
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

          if (profile && !profile.is_banned) {
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

  // 2. Comprobar token criptográfico de sesión firmado por el servidor (smr2_session_token)
  const sessionTokenCookie = cookieStore.get(COOKIE_SESSION_TOKEN);
  if (sessionTokenCookie?.value) {
    const verified = verifyUserSessionToken(sessionTokenCookie.value);
    if (verified && isUUID(verified.userId)) {
      if (isServerSupabaseConfigured()) {
        try {
          const adminClient = createAdminClient();
          if (adminClient) {
            const { data: p } = await adminClient
              .from('profiles')
              .select('id, username, email, role, full_name, student_number, coins, biggest_win, is_banned, created_at')
              .eq('id', verified.userId)
              .maybeSingle();

            if (p && !p.is_banned) {
              return {
                authenticated: true,
                user: {
                  id: p.id,
                  username: p.username,
                  email: p.email,
                  full_name: p.full_name,
                  student_number: p.student_number,
                  coins: Number(p.coins ?? 1000),
                  biggest_win: Number(p.biggest_win ?? 0),
                  role: p.role || 'student',
                  created_at: p.created_at,
                },
              };
            }
          }
        } catch {}
      }

      // Si Supabase estuviese offline temporalmente, el token firmado garantiza identidad no adulterable
      return {
        authenticated: true,
        user: {
          id: verified.userId,
          username: verified.username,
          coins: 1000,
          biggest_win: 0,
          role: verified.role || 'student',
        },
      };
    }
  }

  // 3. SEGURIDAD ESTRICTA: Las cookies sin firma criptográfica (como smr2_user_session)
  // NUNCA son aceptadas por el servidor para verificar identidad, evitando suplantaciones o manipulación.
  return { authenticated: false, user: null };
}
