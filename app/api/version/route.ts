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
  `v0.0.1-beta-${SERVER_BOOT_TIME}`;

const DEFAULT_CHANGELOG = {
  version: '0.0.1-beta',
  title: 'Portal 2º SMR · Versión 0.0.1 Beta',
  description: 'Despliegue inicial de la plataforma del Aula 204 con arquitectura minimalista y herramientas de clase.',
  changes: [
    'Asistente ISAAC: Rediseño minimalista sin diseño de IA, atajo de teclado ⌘K, horario lectivo en vivo y efectos de teletipo sonoro.',
    'Conteo de salida oficial ultra-minimalista: Pantalla de espera sin botones con acceso seguro por secuencia (Shift+Esc / smr).',
    'Seguridad y auditoría (/admin): Terminal de hacking ético con telemetría de red, pistas criptográficas y payload clasificado.',
    'Bolsa de El Botellón: Sistema bursátil interactivo con cotizaciones y libro de órdenes en tiempo real.',
    'Tablón en vivo y horario: Avisos instantáneos sin recarga y calendario lectivo de asignaturas del curso.',
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
