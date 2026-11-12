import { NextRequest } from 'next/server';
import { logEvent } from '@/lib/logger';
import { EventType } from '@/lib/russianRoulette';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody } from '@/lib/security/http';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: EventType[] = [
  'user_register',
  'user_login_success',
  'user_login_failed',
  'user_logout',
];

/**
 * POST /api/auth/log
 *
 * Registro de eventos de autenticación. La identidad SIEMPRE se toma de la
 * sesión verificada cuando existe; el cliente solo puede registrar eventos de
 * autenticación y con detalles acotados (antes se podía inyectar cualquier
 * evento con cualquier userId/username).
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rate = enforceRateLimit(`auth-log:${ip}`, { limit: 30, windowMs: 60_000 });
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Petición no válida.', 400);

    const eventType = body.eventType as EventType;
    if (!ALLOWED_TYPES.includes(eventType)) {
      return fail('Tipo de evento de autenticación no admitido.', 400);
    }

    const session = await verifyUserSession();

    // Solo se permite registrar fallos de acceso anónimos; el resto requiere sesión
    if (!session.authenticated || !session.user) {
      if (eventType !== 'user_login_failed') {
        return json({ success: true, ignored: true });
      }
      await logEvent({
        eventType,
        userId: null,
        username: null,
        req,
        details: { anonymous: true },
      });
      return json({ success: true });
    }

    await logEvent({
      eventType,
      userId: session.user.id,
      username: session.user.username,
      req,
      details: {},
    });

    return json({ success: true });
  } catch (err: any) {
    return fail(err?.message || 'Error al registrar log de autenticación.', 500);
  }
}
