import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint programable para ejecutar ticks del Fondo Botellón.
 * Compatible con Vercel Cron, pg_cron y peticiones autenticadas.
 */
export async function GET(request: NextRequest) {
  return handleMarketTick(request);
}

export async function POST(request: NextRequest) {
  return handleMarketTick(request);
}

async function handleMarketTick(request: NextRequest) {
  try {
    // 1. Verificación opcional de CRON_SECRET si está configurado en Vercel
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Si no coincide la clave secreta y no proviene de un entorno local de desarrollo
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'No autorizado para ejecutar el cron' }, { status: 401 });
      }
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Supabase no está configurado en las variables de entorno del servidor.',
        },
        { status: 200 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'No se pudo inicializar el cliente de Supabase' }, { status: 500 });
    }

    // 2. Ejecutar la función RPC atómica tick_market_price()
    const { data, error } = await adminClient.rpc('tick_market_price');

    if (error) {
      console.error('[Investments Tick] Error ejecutando tick_market_price:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: data,
    });
  } catch (err: any) {
    console.error('[Investments Tick] Excepción no controlada:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Error interno' }, { status: 500 });
  }
}
