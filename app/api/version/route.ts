import { NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Unique timestamp of this server deployment instance
const SERVER_BOOT_TIME = Date.now();
const COMMIT_SHA =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  `v2.6.0-${SERVER_BOOT_TIME}`;

const DEFAULT_CHANGELOG = {
  version: '2.6.0',
  title: 'SMR2 v2.6.0 en Directo',
  description: 'Feed de publicaciones en tiempo real y mercado de cotizaciones interactivo',
  changes: [
    'Feed en tiempo real: los mensajes que publicas se ven al instante para todos los compañeros.',
    'Gráfica de cotizaciones en directo: cotización real por oferta y demanda de la clase.',
    'Acceso unificado al panel de administración para delegados y profesores.',
    'Eliminación de datos ficticios y optimización móvil ligera sin diseños innecesarios.',
  ],
  created_at: new Date(SERVER_BOOT_TIME).toISOString(),
};

export async function GET() {
  let latestUpdate: any = null;

  if (isServerSupabaseConfigured()) {
    try {
      const client = createAdminClient();
      if (client) {
        const { data } = await client
          .from('app_updates')
          .select('id, version, title, description, changes, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          latestUpdate = data;
        }
      }
    } catch {}
  }

  if (!latestUpdate) {
    latestUpdate = DEFAULT_CHANGELOG;
  }

  const effectiveVersion = latestUpdate?.version
    ? `${COMMIT_SHA}_${latestUpdate.version}`
    : COMMIT_SHA;

  return NextResponse.json(
    {
      version: effectiveVersion,
      commitSha: COMMIT_SHA,
      serverBootTime: SERVER_BOOT_TIME,
      latestUpdate,
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
