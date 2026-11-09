import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SERVER_BOOT_TIME = Date.now();
const CURRENT_APP_VERSION = '1.0.1';

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
    version: '1.0.1',
    title: 'SMR2 v1.0.1 · Actualización del Asistente PUTOISAAC',
    badge: 'NOVEDAD',
    date: 'Lunes, 9 de Noviembre, 2026',
    description:
      'Mejora integral del sistema del asistente interactivo PUTOISAAC en toda la web: respuestas instantáneas más claras, chips de acceso rápido optimizados, mejor rendimiento visual y confirmación oficial de que Isaac es gay y el icono de 2º SMR.',
    changes: [
      'PUTOISAAC Mejorado: Sistema interactivo más claro con navegación rápida por chips de acceso directo (horario, recreo, exámenes y minijuegos).',
      'Actualización del lore oficial: Confirmado en el registro de la clase que Isaac es gay, orgulloso y el asistente más estiloso del Aula 35.',
      'Rendimiento y física: Animaciones de habla más suaves, docking responsivo para móvil y menor latencia en las respuestas.',
      'Soporte completo en modo claro y oscuro: Máximo contraste y legibilidad en el bocadillo de diálogo y controles de audio.',
    ],
  },
  {
    version: '1.0.0',
    title: 'SMR2 v1.0.0 · Lanzamiento Oficial: Aquí Empieza',
    badge: 'LANZAMIENTO',
    date: 'Lunes, 9 de Noviembre, 2026',
    description:
      'Lanzamiento oficial de la plataforma 2º SMR para el curso lectivo 2026/2027. Aquí empieza el portal oficial de clase: tablón académico en tiempo real, horario lectivo, credencial digital de estudiante y utilidades de aula.',
    changes: [
      'Aquí empieza: Lanzamiento oficial y apertura formal del portal para todos los alumnos de 2º SMR.',
      'Diseño Minimalista Apple: Interfaz serena y limpia con deferencia absoluta al contenido, sin artificios ni distracciones.',
      'Tablón de clase en directo: Publicación ágil de avisos, dudas técnicas, comandos de consola y recursos de aula.',
      'Ficha Oficial de Estudiante: Credencial digital con NIA único, asignación de puesto en Aula 35 y registro de asistencia diaria.',
      'Horario lectivo en tiempo real: Clases del día, cuenta atrás de recreo y seguimiento de asignaturas minuto a minuto.',
      'Minijuegos de recreo: Ruleta Rusa táctica y juegos de recreo de aula con saldo inicial de 1.000 fichas.',
    ],
  },
];

export async function GET() {
  const latestUpdate = APP_CHANGELOG_HISTORY[0];

  return NextResponse.json({
    version: CURRENT_APP_VERSION,
    commitSha: COMMIT_SHA,
    appVersion: CURRENT_APP_VERSION,
    serverBootTime: SERVER_BOOT_TIME,
    timestamp: new Date().toISOString(),
    latestUpdate,
    changelog: APP_CHANGELOG_HISTORY,
  });
}
