import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createAdminClient, createClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import { COOKIE_SESSION } from '@/lib/authSession';
import { signAdminToken, COOKIE_ADMIN_TOKEN } from '@/lib/adminAuth';
import { UserProfile } from '@/lib/types';
import { logEvent, extractClientMeta } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Registro en memoria de intentos fallidos por IP (protección contra fuerza bruta)
interface RateLimitState {
  count: number;
  lockoutUntil: number;
}
const failedAttemptsMap = new Map<string, RateLimitState>();

const MAX_ATTEMPTS = 12;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos de bloqueo

// Claves maestras autorizadas (Variables de entorno + CTF forensics + fallback de seguridad)
const BASE_ADMIN_KEYS = [
  'davidgay',
  process.env.ADMIN_PASSWORD,
  process.env.ADMIN_ACCESS_CODE,
  'SMR2#Aula35.Acceso2026!',
  'SMR2{Aula35_2026}',
  'SMR2{SMR2#Aula35.Acceso2026!}',
]
  .filter(Boolean)
  .map((k) => String(k).trim());

const VALID_ADMIN_KEYS = Array.from(
  new Set([
    ...BASE_ADMIN_KEYS,
    ...BASE_ADMIN_KEYS.map((k) => k.toLowerCase()),
    ...BASE_ADMIN_KEYS.map((k) => k.toUpperCase()),
  ])
);

export async function POST(req: NextRequest) {
  try {
    const { ip } = extractClientMeta(req);
    const now = Date.now();

    // 1. Comprobar bloqueo por fuerza bruta para la IP
    const rateLimit = failedAttemptsMap.get(ip);
    if (rateLimit && rateLimit.lockoutUntil > now) {
      const remainingMinutes = Math.ceil((rateLimit.lockoutUntil - now) / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `Acceso bloqueado por seguridad tras varios intentos erróneos. Espera ${remainingMinutes} minuto(s).`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = String(body?.code || '').trim();

    // 2. Validación estricta y segura contra ataques de temporización
    const isValid =
      rawCode.length > 0 &&
      VALID_ADMIN_KEYS.some((expected) => {
        if (rawCode.length !== expected.length) return false;
        try {
          return crypto.timingSafeEqual(Buffer.from(rawCode), Buffer.from(expected));
        } catch {
          return rawCode === expected;
        }
      });

    if (!isValid) {
      // Registrar intento fallido
      const currentAttempts = (rateLimit?.count || 0) + 1;
      const isLocked = currentAttempts >= MAX_ATTEMPTS;
      failedAttemptsMap.set(ip, {
        count: isLocked ? 0 : currentAttempts,
        lockoutUntil: isLocked ? now + LOCKOUT_MS : 0,
      });

      try {
        await logEvent({
          eventType: 'admin_action',
          ipAddress: ip,
          req,
          details: {
            action: 'admin_login_failed',
            attempt: currentAttempts,
            is_locked: isLocked,
            timestamp: new Date().toISOString(),
          },
        });
      } catch {}

      const remainingAttempts = MAX_ATTEMPTS - currentAttempts;
      const lowerTry = rawCode.toLowerCase();
      const isWarm = lowerTry.includes('2026') || lowerTry.includes('aula') || lowerTry.includes('papu') || lowerTry.includes('smr2');
      const hintText = isWarm ? ' (Pista del kernel: Algunos términos coinciden pero la sintaxis o codificación es errónea).' : '';

      const errorMessage = isLocked
        ? 'Has superado el límite de intentos. El acceso ha sido bloqueado temporalmente durante 5 minutos.'
        : `Clave de administración incorrecta${hintText}. Intentos restantes: ${remainingAttempts}.`;

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 401 }
      );
    }

    // Si la clave es correcta, reiniciar contador de fallos para esta IP
    failedAttemptsMap.delete(ip);

    const cookieStore = await cookies();
    let currentUser: UserProfile | null = null;

    // 3. Obtener usuario de la sesión activa si existe
    const sessionCookie = cookieStore.get(COOKIE_SESSION);
    if (sessionCookie?.value) {
      try {
        let raw = sessionCookie.value;
        if (raw.includes('%')) {
          try {
            raw = decodeURIComponent(raw);
          } catch {}
        }
        currentUser = JSON.parse(raw) as UserProfile;
      } catch {}
    }

    // 4. Comprobar usuario de Supabase Auth
    let supabaseUserId: string | null = null;
    if (isServerSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        if (supabase) {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();

          if (authUser) {
            supabaseUserId = authUser.id;
            if (!currentUser) {
              const defaultName = (authUser.email?.split('@')[0] || 'admin').toLowerCase();
              currentUser = {
                id: authUser.id,
                username: authUser.user_metadata?.username || defaultName,
                email: authUser.email,
                role: 'admin',
                coins: 1000,
                biggest_win: 0,
                created_at: new Date().toISOString(),
              };
            }
          }
        }
      } catch (err) {
        console.warn('[ADMIN_CLAIM] Supabase auth warning:', err);
      }
    }

    // 5. Usuario por defecto si no había sesión previa
    if (!currentUser) {
      currentUser = {
        id: 'admin_' + Math.random().toString(36).substring(2, 9),
        username: 'admin',
        email: 'admin@smr2.edu',
        role: 'admin',
        coins: 1000,
        biggest_win: 0,
        created_at: new Date().toISOString(),
        auth_provider: 'local',
      };
    }

    // 6. Seguridad estricta: NO modificar el rol en la base de datos ni promover usuarios.
    // Los permisos de administrador se gestionan exclusivamente desde la base de datos Supabase.

    // 7. Generar token de acceso al terminal CTF / Easter Egg
    const adminToken = signAdminToken({
      userId: currentUser.id,
      username: currentUser.username,
      role: 'admin',
    });

    // 8. Registrar log de intento de terminal
    try {
      await logEvent({
        eventType: 'admin_action',
        userId: currentUser.id,
        username: currentUser.username,
        ipAddress: ip,
        req,
        details: {
          action: 'terminal_easter_egg_unlocked',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    const response = NextResponse.json({
      success: true,
      user: currentUser,
      message: 'Terminal desbloqueado correctamente.',
    });

    // 9. Guardar cookie HttpOnly para el entorno de terminal / Easter Egg
    response.cookies.set(COOKIE_ADMIN_TOKEN, adminToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 60, // 2 horas
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al verificar credenciales.' },
      { status: 500 }
    );
  }
}
