import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient, createClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
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

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueo

// Clave maestra configurada (variable de entorno prioritaria, o clave segura del servidor)
const MASTER_ADMIN_PASS = (
  process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_ACCESS_CODE ||
  'Smr2_Admin#2026_MasterKey!'
).trim();

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

    // 2. Validación estricta de la clave maestra de administrador
    const isValid =
      rawCode.length > 0 &&
      (rawCode === MASTER_ADMIN_PASS ||
        (process.env.ADMIN_PASSWORD && rawCode === process.env.ADMIN_PASSWORD.trim()) ||
        (process.env.ADMIN_ACCESS_CODE && rawCode === process.env.ADMIN_ACCESS_CODE.trim()));

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
      const errorMessage = isLocked
        ? 'Has superado el límite de intentos. El acceso de administración ha sido bloqueado temporalmente durante 15 minutos.'
        : `Clave de administración incorrecta. Intentos restantes antes del bloqueo: ${remainingAttempts}.`;

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
    } else {
      currentUser.role = 'admin';
    }

    // 6. Actualizar rol en la base de datos si está en Supabase
    if (isServerSupabaseConfigured()) {
      try {
        const adminClient = createAdminClient();
        if (adminClient) {
          const targetId = supabaseUserId || currentUser.id;
          if (targetId && !targetId.startsWith('local_') && !targetId.startsWith('admin_')) {
            await adminClient.from('profiles').update({ role: 'admin' }).eq('id', targetId);
          } else if (currentUser.username) {
            await adminClient.from('profiles').update({ role: 'admin' }).eq('username', currentUser.username);
          }
        }
      } catch (err) {
        console.warn('[ADMIN_CLAIM] Role update warning:', err);
      }
    }

    // 7. Generar token de administración firmado criptográficamente
    const adminToken = signAdminToken({
      userId: currentUser.id,
      username: currentUser.username,
      role: 'admin',
    });

    // 8. Registrar log de éxito
    try {
      await logEvent({
        eventType: 'admin_action',
        userId: currentUser.id,
        username: currentUser.username,
        ipAddress: ip,
        req,
        details: {
          action: 'admin_login_success',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    const response = NextResponse.json({
      success: true,
      user: currentUser,
      message: 'Acceso de administración verificado correctamente.',
    });

    // 9. Guardar cookie HttpOnly firmada (inmune a manipulación o robo desde JavaScript)
    response.cookies.set(COOKIE_ADMIN_TOKEN, adminToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 días
    });

    // Actualizar también la cookie normal de usuario
    response.cookies.set(COOKIE_SESSION, JSON.stringify(currentUser), {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al verificar credenciales.' },
      { status: 500 }
    );
  }
}
