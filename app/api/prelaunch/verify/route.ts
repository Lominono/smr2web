import { NextRequest, NextResponse } from 'next/server';
import {
  checkPrelaunchRateLimit,
  recordPrelaunchFailedAttempt,
  resetPrelaunchRateLimit,
  verifyPrelaunchPasswordTimingSafe,
  signPrelaunchToken,
  verifyPrelaunchToken,
  PRELAUNCH_COOKIE_NAME,
} from '@/lib/prelaunchAuth';

export const dynamic = 'force-dynamic';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * GET /api/prelaunch/verify
 * Verifica si la cookie o el token enviado es válido
 */
export async function GET(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get(PRELAUNCH_COOKIE_NAME)?.value;
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const token = cookieToken || bearerToken;
    const isValid = verifyPrelaunchToken(token);

    return NextResponse.json({ valid: isValid });
  } catch {
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}

/**
 * POST /api/prelaunch/verify
 * Valida la clave con mitigación de fuerza bruta y emite un token firmado
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 1. Verificar si la IP está bloqueada
  const rateLimit = checkPrelaunchRateLimit(ip);
  if (rateLimit.locked) {
    const minutes = Math.ceil(rateLimit.remainingSeconds / 60);
    return NextResponse.json(
      {
        success: false,
        error: `Acceso restringido temporalmente por seguridad. Inténtalo de nuevo en ${minutes} minuto(s).`,
        remainingSeconds: rateLimit.remainingSeconds,
      },
      { status: 429 }
    );
  }

  // Pequeña latencia intencional para amortiguar ataques de diccionario automatizados
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    const body = await req.json().catch(() => ({}));
    const candidatePassword = String(body?.password || '');

    // 2. Validación de contraseña con tiempo constante
    const isValid = verifyPrelaunchPasswordTimingSafe(candidatePassword);

    if (!isValid) {
      const result = recordPrelaunchFailedAttempt(ip);

      if (result.locked) {
        return NextResponse.json(
          {
            success: false,
            error: 'Has superado el límite de intentos. El acceso ha sido bloqueado por 15 minutos.',
            remainingSeconds: result.remainingSeconds,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Clave no autorizada. Intentos restantes antes del bloqueo temporal: ${result.attemptsLeft}.`,
          attemptsLeft: result.attemptsLeft,
        },
        { status: 401 }
      );
    }

    // 3. Éxito: limpiar historial de fallos y firmar token
    resetPrelaunchRateLimit(ip);
    const token = signPrelaunchToken(30);

    const response = NextResponse.json({
      success: true,
      token,
      message: 'Acceso anticipado autorizado.',
    });

    // Guardar cookie segura (HttpOnly, SameSite=Lax)
    response.cookies.set({
      name: PRELAUNCH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 días
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno en la verificación del acceso.',
      },
      { status: 500 }
    );
  }
}
