import { NextRequest } from 'next/server';
import { getRooms, createRoomServer } from '@/lib/russianRouletteServer';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody, unauthorized } from '@/lib/security/http';
import { RATE_LIMITS } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rooms = await getRooms();
    return json({ success: true, rooms });
  } catch (error: any) {
    return fail(error?.message || 'Error al obtener salas.', 500);
  }
}

export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user?.id || !session.user.username) {
      return unauthorized('Debes iniciar sesión para crear una sala.');
    }

    const user = session.user;

    const rate = enforceRateLimit(`rr-room:${user.id}`, RATE_LIMITS.rouletteRoom);
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Petición no válida.', 400);

    const room = await createRoomServer(
      user,
      String(body.name || ''),
      Number(body.betAmount),
      Number(body.maxPlayers),
      req
    );

    return json({ success: true, room });
  } catch (error: any) {
    return fail(error?.message || 'Error al crear la sala.', 400);
  }
}
