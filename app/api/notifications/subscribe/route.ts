import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody, unauthorized } from '@/lib/security/http';
import { isUUID } from '@/lib/uuid';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/subscribe
 *
 * Guarda la suscripción push del dispositivo. Requiere sesión: la suscripción
 * se vincula al usuario autenticado (antes cualquiera podía registrar o
 * reasignar el endpoint de otra persona).
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return unauthorized('Debes iniciar sesión para activar las notificaciones.');
    }

    const rate = enforceRateLimit(`push-sub:${session.user.id}`, { limit: 10, windowMs: 60_000 });
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Petición no válida.', 400);

    const endpoint = String(body.endpoint || '').trim();
    const p256dh = String(body.p256dh || '').trim();
    const auth = String(body.auth || '').trim();
    const userAgent = String(body.userAgent || '').slice(0, 200);

    if (!endpoint || !p256dh || !auth) {
      return fail('Endpoint, p256dh y auth son requeridos', 400);
    }

    if (endpoint.length > 600 || !/^https:\/\//i.test(endpoint)) {
      return fail('El endpoint de la suscripción no es válido.', 400);
    }

    if (p256dh.length > 200 || auth.length > 100) {
      return fail('Las claves de la suscripción no son válidas.', 400);
    }

    const supabase = createAdminClient();
    if (supabase) {
      const { error } = await supabase.from('push_subscriptions').upsert(
        [
          {
            endpoint,
            p256dh,
            auth,
            user_id: session.user.id,
            user_agent: userAgent || null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'endpoint' }
      );

      if (error) {
        console.warn('Error upserting push subscription in Supabase:', error);
      }
    }

    return json({ success: true });
  } catch (err: any) {
    return fail(err?.message || 'Error al guardar la suscripción.', 500);
  }
}
