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
    title: 'SMR2 v2.9.0: Corrección de Identidad, Motor Crash 0.5x y Asistente Guiado',
    badge: 'ACTUAL',
    date: '1 de Noviembre, 2026',
    description:
      'Actualización técnica de estabilidad: autenticidad de autoría en el tablón, rediseño del minijuego Crash con inicio en 0.50x, sincronización secuencial del asistente de clase y optimizaciones de rendimiento.',
    changes: [
      'Identidad verídica en el tablón: Corrección definitiva del fallo que mostraba a los alumnos bajo el alias BANCA_SISTEMA. La autoría se extrae directamente del perfil registrado y se preserva en tiempo real.',
      'Minijuego Crash optimizado: El multiplicador arranca ahora en 0.50x con aceleración polinómica suave, retícula técnica de osciloscopio de alta resolución y retiro táctil inmediato.',
      'Secuencia de inducción ordenada: El recorrido guiado de PUTOISAAC inicia estrictamente tras la verificación de nombre real y puesto en el aula, manteniendo el orden de las notificaciones.',
      'Rendimiento y sincronización: Mejoras en la reactividad de saldos, velocidad de carga en el tablón de anuncios y optimización en dispositivos táctiles.',
    ],
  },
  {
    version: '2.8.0',
    title: 'SMR2 v2.8.0: Ruleta Rusa Táctica, Visor de Cartuchos e IA de Aula',
    badge: 'ESTABLE',
    date: '28 de Octubre, 2026',
    description:
      'Actualización mayor centrada en la experiencia de juego táctico de la Ruleta Rusa, sistema de avisos de novedades fidedigno e IA de aula optimizada.',
    changes: [
      'Ruleta Rusa Táctica: Nuevo visor de cargador con cartuchos reales y salvas, indicador dinámico de probabilidades estilo Buckshot y efectos de tensión sonora.',
      'Lógica de rivales de clase: Los oponentes emplean tácticamente los objetos de redes (Multímetro, Crimpadora, Inversor, Monster y Cable RJ45) con cálculo probabilístico.',
      'Centro de novedades y versiones: Registro fidedigno de cambios en tiempo real y modal con histórico de versiones.',
      'Asistente PUTOISAAC: Ampliación de temario de 2º SMR (DNS BIND9, DHCP, Apache2, SSH, permisos Linux, Windows Server y comandos directos).',
      'Estadísticas de partida: Registro de victorias, derrotas y racha con sincronización inmediata de saldo.',
    ],
  },
  {
    version: '2.7.0',
    title: 'SMR2 v2.7.0: Mercado de Cotizaciones y Feed en Directo',
    date: '24 de Octubre, 2026',
    description:
      'Lanzamiento del mercado bursátil de clase y tablón de anuncios en tiempo real.',
    changes: [
      'Bolsa de El Botellón: Gráfica interactiva de cotizaciones sensible a operaciones de compra y venta de los alumnos.',
      'Tablón de clase en vivo: Notificaciones de mensajes instantáneos entre compañeros sin recargar.',
      'Transferencias y propinas de fichas entre perfiles autenticados.',
    ],
  },
  {
    version: '2.6.0',
    title: 'SMR2 v2.6.0: Horario de Aula 35 y Salas Multijugador',
    date: '18 de Octubre, 2026',
    description:
      'Integración del gestor lectivo oficial y primeras salas multijugador.',
    changes: [
      'Gestor lectivo oficial con cuenta atrás de recreo, próxima clase y aula actualizada.',
      'Salas de juego multijugador con código de 6 caracteres para retar a compañeros.',
      'Acceso seguro con credenciales de alumno y sincronización de aula.',
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
