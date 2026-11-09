import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let SERVER_BOOT_TIME = Date.now();
let CURRENT_APP_VERSION = '1.2.0';
let LAST_BROADCAST_TIME = Date.now();

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
    version: '1.2.0',
    title: 'SMR2 v1.2.0 · Escena Viva del Botellón, Goteo Comunista y Panel Admin',
    badge: 'GRAN ACTUALIZACIÓN',
    date: 'Lunes, 9 de Noviembre, 2026',
    description:
      'La fiesta de El Botellón cobra vida con personajes animados e interactivos que acuden a tu plaza conforme mejoras tus suministros. Llega el Goteo Comunista para obligar a las grandes fortunas a custodiar su alijo o financiar la caja de resistencia, panel de administración con control total y sistema de actualizaciones instantáneo.',
    changes: [
      'Escena Viva del Botellón: 7 personajes ilustrados interactivos (El Litronero, El Barman, Los Chupiteros, La Mesa de Mezclas, DJ Aula 35, La Pandilla y El Portero VIP) que se unen a la fiesta al mejorar cada nivel. ¡Haz clic en ellos para ver sus frases y conseguir bonus!',
      'Goteo Comunista y Custodia del Alijo: Las fortunas mayores a 100.000 monedas sufren una tasa de solidaridad si no cuidan su dinero. ¡Pulsa "Custodiar Alijo" para blindar tu patrimonio durante 8 horas!',
      'Subsidio Proletario de Clase: Los alumnos con menos de 25.000 monedas pueden reclamar periódicamente el subsidio social financiado por el goteo de los más ricos.',
      'Panel de Administración Completo: Gestión integral de alumnos (fichas, roles, suspensión, borrado seguro, exportación CSV y reseteos) accesible desde /admin.',
      'Sistema de Actualizaciones Renovado: Detección periódica en segundo plano, recarga forzada limpia de caché y aviso inmediato de nuevos despliegues.',
    ],
  },
  {
    version: '1.1.0',
    title: 'SMR2 v1.1.0 · Balanceo del After, Tienda VIP y Feed Mejorado',
    badge: 'ECONOMÍA',
    date: 'Lunes, 9 de Noviembre, 2026',
    description:
      'Rediseño de la mecánica del After con fianzas escaladas a la riqueza, tienda minimalista con personalización de banner VIP y feed de clase con soporte completo de comentarios en tiempo real.',
    changes: [
      'Nerfeo de Prestige: Fianzas y multas proporcionales a las grandes fortunas para evitar bucles infinitos de rebirthear.',
      'Beca SMR: Impulso de velocidad x3.0 para alumnos principiantes (<25.000 monedas).',
      'Tienda VIP: Personalización de banner para perfiles con diseño anti-AI y estética minimalista.',
      'Comentarios en vivo en el Feed: Respuestas anidadas, contador en tiempo real y notificaciones en navegador.',
    ],
  },
  {
    version: '1.0.1',
    title: 'SMR2 v1.0.1 · Actualización del Asistente PUTOISAAC',
    badge: 'NOVEDAD',
    date: 'Lunes, 9 de Noviembre, 2026',
    description:
      'Mejora integral del sistema del asistente interactivo PUTOISAAC en toda la web: respuestas instantáneas más claras, chips de acceso rápido optimizados y confirmación del lore de clase.',
    changes: [
      'PUTOISAAC Mejorado: Sistema interactivo más claro con navegación rápida por chips de acceso directo.',
      'Lore oficial: Confirmado en el registro que Isaac es gay, orgulloso y el asistente más estiloso del Aula 35.',
      'Rendimiento y física: Animaciones de habla más suaves y menor latencia en las respuestas.',
    ],
  },
  {
    version: '1.0.0',
    title: 'SMR2 v1.0.0 · Lanzamiento Oficial: Aquí Empieza',
    badge: 'LANZAMIENTO',
    date: 'Lunes, 9 de Noviembre, 2026',
    description:
      'Lanzamiento oficial de la plataforma 2º SMR para el curso lectivo 2026/2027: tablón de clase en tiempo real, horario lectivo, credencial digital y minijuegos.',
    changes: [
      'Aquí empieza: Lanzamiento oficial y apertura formal del portal para todos los alumnos de 2º SMR.',
      'Diseño Minimalista: Interfaz serena y limpia con deferencia absoluta al contenido.',
      'Tablón y Minijuegos: Chat en tiempo real, Ruleta Rusa táctica y saldo inicial de 1.000 fichas.',
    ],
  },
];

export async function GET() {
  const latestUpdate = APP_CHANGELOG_HISTORY[0];
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    `v${CURRENT_APP_VERSION}-${LAST_BROADCAST_TIME}`;

  return NextResponse.json({
    version: CURRENT_APP_VERSION,
    commitSha,
    appVersion: CURRENT_APP_VERSION,
    serverBootTime: SERVER_BOOT_TIME,
    lastBroadcastTime: LAST_BROADCAST_TIME,
    timestamp: new Date().toISOString(),
    latestUpdate,
    changelog: APP_CHANGELOG_HISTORY,
  });
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado para difundir actualizaciones.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (body.newVersion) {
      CURRENT_APP_VERSION = String(body.newVersion).trim();
    }
    LAST_BROADCAST_TIME = Date.now();
    SERVER_BOOT_TIME = Date.now();

    return NextResponse.json({
      success: true,
      message: 'Señal de actualización emitida a todos los clientes.',
      version: CURRENT_APP_VERSION,
      lastBroadcastTime: LAST_BROADCAST_TIME,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al emitir actualización.' },
      { status: 500 }
    );
  }
}
