import { NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Unique timestamp of this server deployment instance
const SERVER_BOOT_TIME = Date.now();
const CURRENT_APP_VERSION = '2.9.0';

const COMMIT_SHA =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  `v${CURRENT_APP_VERSION}-${SERVER_BOOT_TIME}`;

interface ChangelogEntry {
  version: string;
  title: string;
  description: string;
  badge?: string;
  date: string;
  changes: string[];
}

const APP_CHANGELOG_HISTORY: ChangelogEntry[] = [
  {
    version: '2.9.0',
    title: 'SMR2 v2.9.0: Corrección del Feed, Propinas Fluidas, Tour sin Solapamientos y Nueva Física',
    badge: 'VERSIÓN ACTUAL',
    date: '1 de Noviembre, 2026',
    description:
      'Actualización enfocada en la autenticidad del feed escolar, nuevo sistema de propinas de fichas, orquestación fluida de avisos sin solapamientos y animaciones físicas orgánicas para PUTOISAAC.',
    changes: [
      '💬 Identidad Real en el Feed: Resuelto el fallo que provocaba que algunos alumnos apareciesen erróneamente como BANCA_SISTEMA al comentar. Sincronización fidedigna del autor original con base de datos.',
      '🪙 Sistema de Propinas Renovado: Envío ágil de 50 fichas con confirmación táctil en directo, sin alertas intrusivas y con notificación comunitaria en el tablón de clase.',
      '🧭 Tour Secuencial no Invasivo: El asistente PUTOISAAC guía el aula sin solaparse con ningún elemento. Las advertencias de cookies y avisos de versión se muestran ordenadamente tras finalizar el recorrido.',
      '👁️ Expresividad Orgánica de PUTOISAAC: Seguimiento ocular dinámico con el cursor, modulación fonética bucal en tiempo real y física elástica (squish & stretch) al interactuar.',
      '⚡ Terminal CTF y Blindaje de Sesión: Transición completa de antiguos paneles administrativos hacia la experiencia secreta del terminal CTF, con identificadores canónicos UUID v4 para todos los usuarios.',
    ],
  },
  {
    version: '2.8.0',
    title: 'SMR2 v2.8.0: Revolución Ruleta Rusa, Avisos Veraces y PUTOISAAC Pro',
    badge: 'ÚLTIMA NOVEDAD',
    date: '28 de Octubre, 2026',
    description:
      'Actualización mayor centrada en la experiencia de juego táctico de la Ruleta Rusa, sistema de avisos de novedades fidedigno e IA de aula potenciada.',
    changes: [
      '🎮 Ruleta Rusa Táctica Inmersiva: Nuevo visor visual de cargador con cartuchos reales (rojo) y salvas (cian), indicador dinámico de probabilidades estilo Buckshot, recámara animada y efectos de tensión con sonido metálico.',
      '🤖 IA de Rivales Inteligente: Los oponentes de clase (David, Dani, Álex y Marcos) ahora usan tácticamente los objetos de redes (Multímetro, Crimpadora, Inversor, Monster y Cable RJ45) con cálculo real de probabilidades.',
      '📢 Centro de Avisos y Novedades Veraces: Notificador de despliegues en directo y modal completo de versiones que detalla fielmente lo que hay de verdad en cada actualización.',
      '🧠 Asistente PUTOISAAC Potenciado: Conocimiento de temario de 2º SMR ampliado (DNS BIND9, DHCP, Apache2, SSH, permisos Linux, Windows Server, subnetting rápido y comandos directos con un clic).',
      '🏆 Racha y Estadísticas en Ruleta: Seguimiento de victorias, derrotas y racha ganadora con sincronización de monedas inmediata.',
    ],
  },
  {
    version: '2.7.0',
    title: 'SMR2 v2.7.0: Mercado de Cotizaciones y Feed en Directo',
    date: '24 de Octubre, 2026',
    description:
      'Lanzamiento del mercado bursátil de clase y tablón de anuncios en tiempo real.',
    changes: [
      '📈 Bolsa de El Botellón: Gráfica interactiva de cotizaciones que reacciona a compras y ventas de los alumnos.',
      '💬 Tablón de clase en vivo: Notificaciones de mensajes instantáneos entre compañeros sin recargar.',
      '💰 Transferencias y propinas de fichas entre perfiles autenticados.',
    ],
  },
  {
    version: '2.6.0',
    title: 'SMR2 v2.6.0: Horario de Aula 204 y Salas Multijugador',
    date: '18 de Octubre, 2026',
    description:
      'Integración del gestor lectivo oficial y primeras salas multijugador.',
    changes: [
      '📅 Gestor lectivo oficial con cuenta atrás de recreo, próxima clase y aula actualizada.',
      '👥 Salas de juego multijugador con código de 6 caracteres para retar a compañeros.',
      '🔐 Acceso con credenciales de alumno y panel administrativo.',
    ],
  },
];

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

        if (data && data.version && data.version.localeCompare(CURRENT_APP_VERSION, undefined, { numeric: true }) >= 0) {
          latestUpdate = data;
        }
      }
    } catch {}
  }

  if (!latestUpdate) {
    const cur = APP_CHANGELOG_HISTORY[0];
    latestUpdate = {
      version: cur.version,
      title: cur.title,
      description: cur.description,
      changes: cur.changes,
      created_at: new Date(SERVER_BOOT_TIME).toISOString(),
    };
  }

  const effectiveVersion = latestUpdate?.version
    ? `${COMMIT_SHA}_${latestUpdate.version}`
    : COMMIT_SHA;

  return NextResponse.json(
    {
      appVersion: CURRENT_APP_VERSION,
      version: effectiveVersion,
      commitSha: COMMIT_SHA,
      serverBootTime: SERVER_BOOT_TIME,
      latestUpdate,
      history: APP_CHANGELOG_HISTORY,
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
