import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Rate limiting en memoria para el acceso al portal
interface GateAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil: number;
}

const attemptsMap = new Map<string, GateAttempt>();

// Claves maestras autorizadas para JuanFe Ospina y David
const VALID_PASSKEYS = new Set([
  '2026papu',
  'admin2026',
  'smr2admin',
  'smr2-master-key',
  'root@smr2',
]);

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'local_client';
    const now = Date.now();

    const record = attemptsMap.get(ip) || { count: 0, lastAttempt: now, blockedUntil: 0 };

    // Si la IP está bloqueada por exceso de intentos
    if (record.blockedUntil > now) {
      const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Terminal bloqueada por seguridad. Espera ${remainingSeconds}s.`,
          blocked: true,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = String(body.code || '').trim();

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: 'Secuencia de autenticación requerida.' },
        { status: 400 }
      );
    }

    // Verificar si la clave es válida
    if (VALID_PASSKEYS.has(rawCode.toLowerCase()) || VALID_PASSKEYS.has(rawCode)) {
      // Reiniciar contador de intentos para esta IP
      attemptsMap.delete(ip);

      const response = NextResponse.json({
        success: true,
        message: 'Acceso autorizado al portal.',
        timestamp: now,
      });

      // Cookie de acceso seguro de pre-lanzamiento
      response.cookies.set('smr2_prelaunch_bypass', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 días
        path: '/',
      });

      return response;
    }

    // Incrementar intentos fallidos
    record.count += 1;
    record.lastAttempt = now;

    if (record.count >= 5) {
      record.blockedUntil = now + 30 * 1000; // 30 segundos de penalización
      record.count = 0;
      attemptsMap.set(ip, record);

      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos fallidos. Bloqueo temporal activado (30s).',
          blocked: true,
        },
        { status: 429 }
      );
    }

    attemptsMap.set(ip, record);

    return NextResponse.json(
      {
        success: false,
        error: 'Secuencia no autorizada.',
        attemptsRemaining: 5 - record.count,
      },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Fallo en la verificación de seguridad.' },
      { status: 500 }
    );
  }
}
