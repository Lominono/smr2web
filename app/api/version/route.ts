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
  title: 'Versión 2.6.0 disponible',
  description: 'Actualización en tiempo real y panel de administración',
  changes: [
    'Feed en tiempo real con WebSockets y soporte completo de publicaciones y código.',
    'Notificaciones push en segundo plano para avisos del aula.',
    'Panel de administración con usuarios reales y resolución técnica de incidencias.',
    'Interfaz minimalista optimizada para móvil y PC sin datos ficticios.',
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
