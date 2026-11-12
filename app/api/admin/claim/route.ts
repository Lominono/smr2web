import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient, createClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import { signAdminToken, COOKIE_ADMIN_TOKEN, verifyUserSession } from '@/lib/adminAuth';
import { logEvent, extractClientMeta } from '@/lib/logger';
import { enforceRateLimit, guardOrigin } from '@/lib/security/http';

export const dynamic = 'force-dynamic';

// Registro en memoria de intentos fallidos por IP (protección contra fuerza bruta)
interface RateLimitState {
  count: number;
  lockoutUntil: number;
}
const failedAttemptsMap = new Map<string, RateLimitState>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueo tras 5 intentos erróneos

// Claves maestras autorizadas (Estrictamente desde variables de entorno del servidor).
// Nota de seguridad: ADMIN_SECRET_KEY es la clave de firma HMAC de las sesiones,
// no debe aceptarse como contraseña (si se filtra, permitiría además falsificar tokens).
const MASTER_ADMIN_KEYS = [
  process.env.ADMIN_PASSWORD,
  process.env.ADMIN_ACCESS_CODE,
]
  .filter(Boolean)
  .map((k) => String(k).trim());

export async function POST(req: NextRequest) {
  try {
    const originError = guardOrigin(req);
    if (originError) return originError;

    const { ip } = extractClientMeta(req);
    const now = Date.now();

    const ipRate = enforceRateLimit(`admin-claim:${ip}`, { limit: 12, windowMs: 15 * 60_000 });
    if (!ipRate.ok) return ipRate.response;

    // 1. Comprobar bloqueo por fuerza bruta para la IP
    const rateLimit = failedAttemptsMap.get(ip);
    if (rateLimit && rateLimit.lockoutUntil > now) {
      const remainingMinutes = Math.ceil((rateLimit.lockoutUntil - now) / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `Acceso bloqueado por seguridad tras varios intentos fallidos. Espera ${remainingMinutes} minuto(s).`,
        },
        { status: 429 }
      );
    }

    // 2. Comprobar que el usuario tenga una sesión real activa en la plataforma
    const sessionInfo = await verifyUserSession();
    if (!sessionInfo.authenticated || !sessionInfo.user || !isUUID(sessionInfo.user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debes iniciar sesión previamente con tu cuenta de administrador en el portal antes de acceder a este panel.',
        },
        { status: 401 }
      );
    }

    const currentUserId = sessionInfo.user.id;

    // 3. Comprobar autoritativamente en la base de datos Supabase que la cuenta tiene rol 'admin'
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Servicio de base de datos no configurado.' },
        { status: 503 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { success: false, error: 'No se pudo conectar con la base de datos.' },
        { status: 500 }
      );
    }

    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, username, email, full_name, student_number, role, is_banned')
      .eq('id', currentUserId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json(
        { success: false, error: 'Cuenta de usuario no encontrada en la base de datos.' },
        { status: 404 }
      );
    }

    if (profile.is_banned) {
      return NextResponse.json(
        { success: false, error: 'Esta cuenta ha sido suspendida por la administración.' },
        { status: 403 }
      );
    }

    // CONTROL DE ACCESO ESTRICTO:
    // Solo las cuentas que tienen role = 'admin' en la base de datos pueden desbloquear el panel
    if (profile.role !== 'admin') {
      try {
        await logEvent({
          eventType: 'admin_action',
          userId: profile.id,
          username: profile.username,
          ipAddress: ip,
          req,
          details: {
            action: 'unauthorized_admin_panel_claim_attempt',
            user_role: profile.role,
            timestamp: new Date().toISOString(),
          },
        });
      } catch {}

      return NextResponse.json(
        {
          success: false,
          error: `Acceso denegado: La cuenta @${profile.username} tiene rango '${profile.role}'. Solo el administrador oficial (@juanfe) tiene permisos para acceder a este panel.`,
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = String(body?.code || '').trim();

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: 'Por favor, introduce tu contraseña de administrador.' },
        { status: 400 }
      );
    }

    // 4. Validación de contraseña:
    // Acepta la clave maestra del servidor O la contraseña de la propia cuenta en Supabase Auth
    let isPasswordValid = false;

    // A) Comprobación contra claves maestras del servidor (timing-safe)
    for (const expectedKey of MASTER_ADMIN_KEYS) {
      if (rawCode.length === expectedKey.length) {
        try {
          if (crypto.timingSafeEqual(Buffer.from(rawCode), Buffer.from(expectedKey))) {
            isPasswordValid = true;
            break;
          }
        } catch {
          if (rawCode === expectedKey) {
            isPasswordValid = true;
            break;
          }
        }
      }
    }

    // B) Comprobación contra la contraseña real de la cuenta de Supabase Auth
    if (!isPasswordValid && profile.email) {
      try {
        const client = await createClient();
        if (client) {
          const { data: authTry, error: authTryErr } = await client.auth.signInWithPassword({
            email: profile.email,
            password: rawCode,
          });
          if (!authTryErr && authTry.user) {
            isPasswordValid = true;
          }
        }
      } catch {}
    }

    // Si la contraseña es incorrecta:
    if (!isPasswordValid) {
      const currentAttempts = (rateLimit?.count || 0) + 1;
      const isLocked = currentAttempts >= MAX_ATTEMPTS;
      failedAttemptsMap.set(ip, {
        count: isLocked ? 0 : currentAttempts,
        lockoutUntil: isLocked ? now + LOCKOUT_MS : 0,
      });

      try {
        await logEvent({
          eventType: 'admin_action',
          userId: profile.id,
          username: profile.username,
          ipAddress: ip,
          req,
          details: {
            action: 'admin_unlock_failed_password',
            attempt: currentAttempts,
            is_locked: isLocked,
            timestamp: new Date().toISOString(),
          },
        });
      } catch {}

      const remainingAttempts = Math.max(0, MAX_ATTEMPTS - currentAttempts);
      const errorMessage = isLocked
        ? 'Has superado el límite de intentos permitidos. El acceso al panel ha sido bloqueado temporalmente durante 15 minutos.'
        : `Contraseña de administrador incorrecta. Te quedan ${remainingAttempts} intento(s) antes del bloqueo de seguridad.`;

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 401 }
      );
    }

    // Si la clave es correcta: reiniciar contador de fallos
    failedAttemptsMap.delete(ip);

    // 5. Generar token criptográfico firmado HMAC-SHA256 vinculado a este administrador específico
    const adminToken = signAdminToken({
      userId: profile.id,
      username: profile.username,
      role: 'admin',
    });

    // 6. Registrar en el log de auditoría
    try {
      await logEvent({
        eventType: 'admin_action',
        userId: profile.id,
        username: profile.username,
        ipAddress: ip,
        req,
        details: {
          action: 'admin_panel_unlocked_success',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        full_name: profile.full_name,
        student_number: profile.student_number,
        role: 'admin',
      },
      message: 'Panel de administración desbloqueado correctamente.',
    });

    // 7. Establecer cookie HttpOnly con SameSite estricto
    response.cookies.set(COOKIE_ADMIN_TOKEN, adminToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 60, // 2 horas de validez
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al verificar credenciales.' },
      { status: 500 }
    );
  }
}
