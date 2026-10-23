import { NextResponse } from 'next/server';

// Versión del despliegue actual de la plataforma SMR2
const CURRENT_VERSION = '2.4.0-tactical-roulette';
const BUILD_TIMESTAMP = 1792745800000;

export async function GET() {
  return NextResponse.json(
    {
      version: CURRENT_VERSION,
      buildTimestamp: BUILD_TIMESTAMP,
      message: 'Plataforma SMR2 activa. Última actualización desplegada.',
      time: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
