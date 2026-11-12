import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json } from '@/lib/security/http';

// SEGURIDAD: las claves VAPID ya NO tienen valores por defecto en el código.
// Deben configurarse en el servidor (VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY).
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:portal2smr@alumnos.es';

const VAPID_CONFIGURED = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (VAPID_CONFIGURED) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn('Error configurando VAPID en webpush:', err);
  }
}

export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized || !authResult.user) {
      return fail(
        authResult.error || 'Acceso restringido: Solo los administradores pueden emitir notificaciones push a la clase.',
        authResult.status || 403
      );
    }

    const rate = enforceRateLimit(`push-broadcast:${authResult.user.id}`, {
      limit: 6,
      windowMs: 60_000,
    });
    if (!rate.ok) return rate.response;

    const body = await req.json().catch(() => ({}));
    const rawTitle = String(body.title || '').trim();
    const rawMessage = String(body.body || '').trim();
    const tag = String(body.tag || 'Aviso').slice(0, 40);
    const url = String(body.url || '/').slice(0, 300);

    if (!rawTitle || !rawMessage) {
      return fail('Título y mensaje son obligatorios', 400);
    }

    // Límites de longitud: evita payloads gigantes y abuso del servicio push
    const title = rawTitle.slice(0, 120);
    const messageBody = rawMessage.slice(0, 500);
    const authorUsername = String(authResult.user.username || 'SMR2').slice(0, 40);

    if (!VAPID_CONFIGURED) {
      return fail('Las notificaciones push no están configuradas en el servidor.', 503);
    }

    const payload = JSON.stringify({
      title: title.startsWith('📢') ? title : `📢 ${title}`,
      body: messageBody,
      tag: `smr2-${tag.toLowerCase()}`,
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url },
    });

    const supabase = createAdminClient();
    let sentCount = 0;
    let failedCount = 0;

    // 1. Guardar en tabla announcements para el historial y realtime
    if (supabase) {
      try {
        await supabase.from('announcements').insert([
          {
            title,
            body: messageBody,
            tag,
            url,
            author_username: authorUsername,
            sent_to_push: true,
          },
        ]);
      } catch (dbErr) {
        console.warn('No se pudo guardar el anuncio en la tabla announcements:', dbErr);
      }

      // 2. Obtener todas las suscripciones push de los dispositivos de los alumnos
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*');

      if (!error && subscriptions && subscriptions.length > 0) {
        const staleEndpoints: string[] = [];

        await Promise.all(
          subscriptions.map(async (sub) => {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            };

            try {
              await webpush.sendNotification(pushSubscription, payload, {
                TTL: 60 * 60 * 24, // 24 horas
                urgency: 'high',
              });
              sentCount++;
            } catch (pushErr: any) {
              failedCount++;
              // Si el endpoint ya no existe (410 o 404), marcar para limpiar
              if (pushErr?.statusCode === 410 || pushErr?.statusCode === 404) {
                staleEndpoints.push(sub.endpoint);
              }
            }
          })
        );

        // Limpiar suscripciones expiradas
        if (staleEndpoints.length > 0) {
          try {
            await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
          } catch {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      message: `Anuncio emitido a ${sentCount} dispositivo(s).`,
    });
  } catch (err: any) {
    console.error('Error broadcasting push notification:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
