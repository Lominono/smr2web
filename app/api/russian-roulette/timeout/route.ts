import { NextRequest } from 'next/server';
import { triggerActionServer, getRoomById } from '@/lib/russianRouletteServer';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody, unauthorized } from '@/lib/security/http';
import { RATE_LIMITS } from '@/lib/security/rateLimit';
import { securityEvent } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/russian-roulette/timeout
 *
 * Cierra un turno agotado. Reglas de seguridad:
 * - Solo un jugador de la sala puede reclamar el tiempo agotado.
 * - El plazo del turno debe haber vencido realmente (no se puede forzar antes).
 * - Un tiempo agotado ya NO dispara el arma: pasa el turno y gira el cilindro.
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user) {
      return unauthorized('Debes iniciar sesión para participar en la partida.');
    }

    const user = session.user;
    const rate = enforceRateLimit(`rr-timeout:${user.id}`, RATE_LIMITS.rouletteAction);
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Petición no válida.', 400);

    const roomId = String(body.roomId || '').trim();
    if (!roomId || roomId.length > 80) {
      return fail('Identificador de sala requerido.', 400);
    }

    const room = await getRoomById(roomId);
    if (!room) return fail('Sala no encontrada.', 404);
    if (room.status !== 'in_progress' || !room.active_game) {
      return fail('No hay ninguna partida activa en esta sala.', 400);
    }

    const isParticipant = (room.players || []).some((player) => player.user_id === user.id);
    if (!isParticipant) {
      await securityEvent({
        action: 'rr_timeout_unauthorized',
        userId: user.id,
        username: user.username,
        req,
        details: { roomId },
      });
      return fail('No participas en esta partida.', 403);
    }

    const deadline = room.active_game.turn_deadline
      ? new Date(room.active_game.turn_deadline).getTime()
      : 0;

    if (!Number.isFinite(deadline) || deadline === 0) {
      return fail('La partida aún no está lista.', 400);
    }

    // Margen de cortesía para desfases de reloj
    if (Date.now() < deadline - 1_500) {
      return fail('El turno todavía no ha expirado.', 400);
    }

    const result = await triggerActionServer(user, roomId, true, req);

    return json({ success: true, timeoutTriggered: true, ...result });
  } catch (error: any) {
    return fail(error?.message || 'Error al procesar el timeout.', 400);
  }
}
