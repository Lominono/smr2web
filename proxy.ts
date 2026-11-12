import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SMR2 · Proxy (antiguo middleware en Next.js 15).
 *
 * Capa de seguridad común para todas las peticiones a la API:
 * 1. Bloquea peticiones mutantes con origen cruzado (protección CSRF).
 * 2. Impide que los endpoints se usen desde iframes de terceros.
 * 3. Añade cabeceras de seguridad específicas de API.
 *
 * Las comprobaciones de identidad, permisos, topes económicos y auditoría se
 * hacen en cada route handler (aquí solo se filtra lo evidente).
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isSameOrigin(request: NextRequest): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return false;
  }

  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    if (originHost === request.headers.get('host')) return true;

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method) && !isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, error: 'Origen de la petición no permitido (protección CSRF).' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }

  return response;
}

export default proxy;

export const config = {
  matcher: ['/api/:path*'],
};
