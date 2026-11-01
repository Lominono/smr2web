'use client';

import { createClient } from './supabase/client';

export const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BGsdTIrfCY6LtPp6j8p1nXq-Zt3jZ_toMQo5UN-gsFQYauV6JW3f0bzkKJi3B0eDk3OVrudsjSfbCLaECHwR4Mo';

/**
 * Convierte clave base64 VAPID a Uint8Array requerido por PushManager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Comprueba si el navegador soporta Service Workers y Notificaciones Push
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Obtiene el estado actual del permiso en el dispositivo
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Registra el Service Worker de notificaciones y cache en segundo plano
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return reg;
  } catch (err) {
    console.warn('Error al registrar Service Worker:', err);
    return null;
  }
}

/**
 * Solicita permisos de notificación al usuario y registra la suscripción Web Push en Supabase
 */
export async function subscribeToWebPush(userId?: string): Promise<{
  success: boolean;
  status: NotificationPermission | 'unsupported';
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: false, status: 'unsupported', error: 'Navegador no compatible con Web Push.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, status: permission, error: 'Permiso de notificaciones denegado.' };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, status: permission, error: 'No se pudo iniciar el Service Worker.' };
    }

    // Esperar a que el service worker esté activo
    const readyRegistration = await navigator.serviceWorker.ready;

    let sub = await readyRegistration.pushManager.getSubscription();

    if (!sub) {
      const appServerKey = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
      sub = await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    }

    // Guardar la suscripción en el servidor / Supabase
    const subJson = sub.toJSON();
    const endpoint = sub.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (endpoint && p256dh && auth) {
      // 1. Enviar a la API route del portal
      try {
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            p256dh,
            auth,
            userId: userId || null,
            userAgent: navigator.userAgent,
          }),
        });
      } catch (apiErr) {
        console.warn('Error al enviar suscripción a /api/notifications/subscribe:', apiErr);
      }

      // 2. Directamente en Supabase si el cliente está conectado
      const supabase = createClient();
      if (supabase) {
        try {
          await supabase.from('push_subscriptions').upsert(
            [
              {
                endpoint,
                p256dh,
                auth,
                user_id: userId || null,
                user_agent: navigator.userAgent,
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'endpoint' }
          );
        } catch (sbErr) {
          console.warn('Error al guardar suscripción push en Supabase:', sbErr);
        }
      }
    }

    return { success: true, status: 'granted' };
  } catch (err: any) {
    console.error('Error durante suscripción a Web Push:', err);
    return {
      success: false,
      status: Notification.permission || 'default',
      error: err?.message || 'Error desconocido al suscribirse a notificaciones.',
    };
  }
}

/**
 * Dispara una notificación de prueba en el dispositivo actual
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;

  try {
    if (Notification.permission !== 'granted') {
      const res = await subscribeToWebPush();
      if (!res.success) return false;
    }

    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification('Portal 2º SMR · Notificación activa', {
        body: '¡Perfecto! Tu dispositivo recibirá avisos y anuncios aunque estés fuera de la web.',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'smr2-test',
        vibrate: [100, 50, 100],
      } as any);
      return true;
    } else {
      new Notification('Portal 2º SMR · Notificación activa', {
        body: '¡Perfecto! Tu dispositivo recibirá avisos de clase.',
        icon: '/logo.png',
      });
      return true;
    }
  } catch (err) {
    console.warn('Error enviando notificación de prueba:', err);
    return false;
  }
}
