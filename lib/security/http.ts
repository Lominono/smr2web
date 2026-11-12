import { NextResponse } from 'next/server';
import { consumeRateLimit, type RateLimitResult } from '@/lib/security/rateLimit';

/**
 * SMR2 · Utilidades HTTP defensivas compartidas por las rutas de API.
 */

/** Cabeceras de seguridad que acompañan a todas las respuestas de API. */
export const API_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

const MAX_BODY_BYTES = 16 * 1024; // 16 KB: ninguna petición legítima necesita más

/** Obtiene la IP del cliente a partir de las cabeceras del proxy. */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  const cf = headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Comprueba que una petición mutante provenga del mismo origen (mitigación CSRF).
 * Los navegadores envían `Origin`/`Sec-Fetch-Site` en peticiones cross-site.
 */
export function isSameOriginRequest(req: Request): boolean {
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return false;
  }

  const origin = req.headers.get('origin');
  if (!origin) {
    // Sin Origin (clientes nativos, curl) => no es un ataque CSRF clásico
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    const requestHost = req.headers.get('host');
    if (!requestHost) return true;
    if (originHost === requestHost) return true;

    // Dominios permitidos explícitamente (despliegues con dominio propio)
    const allowed = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    return allowed.some((value) => {
      try {
        return new URL(value).host === originHost;
      } catch {
        return value === originHost;
      }
    });
  } catch {
    return false;
  }
}

/** Respuesta JSON con cabeceras de seguridad. */
export function json(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): NextResponse {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { ...API_SECURITY_HEADERS, ...(init.headers || {}) },
  });
}

/** Respuesta de error homogénea. */
export function fail(message: string, status = 400, extra: Record<string, unknown> = {}): NextResponse {
  return json({ success: false, error: message, ...extra }, { status });
}

/** Respuesta 401. */
export function unauthorized(message = 'Debes iniciar sesión para realizar esta acción.'): NextResponse {
  return fail(message, 401);
}

/** Respuesta 403. */
export function forbidden(message = 'Acceso denegado.'): NextResponse {
  return fail(message, 403);
}

/** Respuesta 429 a partir de un resultado de rate limit. */
export function tooManyRequests(result: RateLimitResult, message?: string): NextResponse {
  return json(
    {
      success: false,
      error:
        message ||
        `Demasiadas peticiones. Espera ${result.retryAfterSeconds} segundo(s) antes de volver a intentarlo.`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

/**
 * Lee un cuerpo JSON con límite de tamaño y errores controlados.
 * Devuelve `null` si el cuerpo es inválido o demasiado grande.
 */
export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return null;

  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return null;
    if (!text) return {};
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Convierte un valor a entero seguro dentro de un rango.
 * Devuelve `null` si no es un número finito.
 */
export function toSafeInteger(value: unknown, min: number, max: number): number | null {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.trunc(num);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

/** Escapa texto para inserción segura en CSV (evita inyección de fórmulas). */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  // Mitiga inyección de fórmulas en hojas de cálculo
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Aplica un límite de frecuencia y devuelve la respuesta 429 si procede. */
export function enforceRateLimit(
  key: string,
  config: { limit: number; windowMs: number }
): { ok: true } | { ok: false; response: NextResponse } {
  const result = consumeRateLimit(key, config.limit, config.windowMs);
  if (!result.allowed) return { ok: false, response: tooManyRequests(result) };
  return { ok: true };
}

/** Comprueba origen y lanza respuesta 403 si no es válido. */
export function guardOrigin(req: Request): NextResponse | null {
  if (!isSameOriginRequest(req)) {
    return forbidden('Origen de la petición no permitido (protección CSRF).');
  }
  return null;
}
