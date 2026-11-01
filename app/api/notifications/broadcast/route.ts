import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminSession } from '@/lib/adminAuth';

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BGsdTIrfCY6LtPp6j8p1nXq-Zt3jZ_toMQo5UN-gsFQYauV6JW3f0bzkKJi3B0eDk3OVrudsjSfbCLaECHwR4Mo';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'TFFmFbhsxjZvg_305D2Mp7PDvhgLsYGugy2m7QvzokE';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:portal2smr@alumnos.es';

// Configurar detalles VAPID en webpush
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('Error configurando VAPID en webpush:', err);
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Acceso restringido: Solo los administradores pueden emitir notificaciones push a la clase.',
        },
        { status: authResult.status }
      );
    }

    const body = await req.json();
    const { title, body: messageBody, tag = 'Aviso', url = '/', authorUsername = 'SMR2' } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Título y mensaje son obligatorios' },
        { status: 400 }
      );
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
