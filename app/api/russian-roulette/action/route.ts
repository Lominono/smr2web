import { NextRequest } from 'next/server';
import { triggerActionServer } from '@/lib/russianRouletteServer';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody, unauthorized } from '@/lib/security/http';
import { RATE_LIMITS } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user?.id || !session.user.username) {
      return unauthorized('Debes iniciar sesión para realizar una acción.');
    }

    const user = session.user;

    const rate = enforceRateLimit(`rr-action:${user.id}`, RATE_LIMITS.rouletteAction);
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Petición no válida.', 400);

    const roomId = String(body.roomId || '').trim();
    if (!roomId || roomId.length > 80) {
      return fail('Identificador de sala requerido.', 400);
    }

    const result = await triggerActionServer(user, roomId, false, req);

    return json({ success: true, ...result });
  } catch (error: any) {
    return fail(error?.message || 'Error al procesar el disparo.', 400);
  }
}
