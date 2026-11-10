import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let SERVER_BOOT_TIME = Date.now();
let CURRENT_APP_VERSION = '1.6.0';
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
    version: '1.6.0',
    title: 'SMR2 v1.6.0 · Tienda de Mascotas Exclusivas, Desbloqueo de 28B y Habilidades Pasivas',
    badge: 'ACTUALIZACIÓN',
    date: 'Martes, 10 de Noviembre, 2026',
    description:
      'Llega la Tienda de Mascotas Oficial con compañeros coleccionables de precios exclusivos acordes a la economía del aula. Desbloqueo total del guardado de saldos multimillonarios (>28B) y habilidades pasivas reales en Botellón, Bolsa y dropeo de monedas.',
    changes: [
      'Tienda de Mascotas Exclusivas: Adopta y equipa a 5 compañeros únicos: Spongegar Primitivo (50M), Pensador Descarado (500M), Kirby Fachero (2.5B), Link del Alijo (10B) y Toy Chica "Let\'s Party!" (25B).',
      'Presencia en Perfil y Feed: Tu mascota equipada aparece con orgullo junto a tu nombre de usuario en publicaciones del Feed, respuestas, carnet de estudiante, podio y clasificación.',
      'Habilidades Pasivas Reales: Spongegar encuentra fajos de monedas en la plaza y potencia el trago; Pensador reduce 50% las comisiones de la Bolsa; Kirby alarga Fiesta Loca y bonus de bote; Link te defiende con escudo hyliano contra redadas policiales; y Toy Chica otorga halo cosmético animado y aguinaldos millonarios sorpresa.',
      'Desbloqueo de Sincronización >28.000.000.000: Se corrigen las restricciones heredadas en la API de balance, permitiendo que los líderes de la clasificación guarden y avancen sus miles de millones sin resetearse al reiniciar la página.',
    ],
  },
  {
    version: '1.5.1',
    title: 'SMR2 v1.5.1 · Bóveda Blindada Proporcional, Zona de Mecenazgo y Sistema de Riesgo Dinámico',
    badge: 'ACTUALIZACIÓN',
    date: 'Martes, 10 de Noviembre, 2026',
    description:
      'Llega la Bóveda Blindada (Alijo Custodiado) con coste proporcional severo para grandes fortunas, Zona de Mecenazgo con Muro de Honor de Donantes, y riesgo real dinámico de inspección policial y Doble o Nada.',
    changes: [
      'Bóveda Blindada Proporcional: Ahora puedes blindar tu alijo con fichas o monedas. El coste escala drásticamente con la fortuna del jugador (¡hasta decenas de millones para los más ricos!), otorgando +20% de producción, farmeo nocturno de 12 horas e inmunidad total.',
      'Riesgo Real de Pérdida si está Desprotegido: Si dejas el alijo sin custodia y pasas tiempo ausente o entras al After, la policía puede requisar parte del bote y aplicar sanciones por desorden público.',
      'Trago Doble o Nada: Nueva acción en el panel principal que te permite arriesgar voluntariamente el 20% de tu bote a cara o cruz.',
      'Zona de Mecenazgo y Muro de Honor: Nueva pestaña en El Botellón donde las grandes fortunas donan voluntariamente al Fondo Social de la clase a cambio de títulos legendarios (Magnate Filántropo, Padrino SMR2, Mecenas de la Clase).',
      'Fondo Social para Alumnos: Los alumnos con menos de 25k monedas pueden reclamar subsidios periódicos financiados por los donantes de la clase.',
    ],
  },
  {
    version: '1.5.0',
    title: 'SMR2 v1.5.0 · El Botellón Definitivo: Claridad Total, Balance Económico y Motor Unificado',
    badge: 'ACTUALIZACIÓN OBLIGATORIA',
    date: 'Martes, 10 de Noviembre, 2026',
    description:
      'Actualización obligatoria para toda la clase. Se simplifica radicalmente El Botellón eliminando mecánicas frustrantes (resacas y redadas aleatorias a jugadores ausentes), se unifica el motor de juego en tiempo real y se activa el balance de goteo económico justo para grandes fortunas y novatos.',
    changes: [
      'Eliminación de Resacas y Popups de Interrupción: El farmeo es 100% fluido y directo. Sin barras de resaca que resten producción ni eventos con cuentas atrás invasivas.',
      'Fin de las Redadas Aleatorias a Jugadores AFK: Progresa en segundo plano sin miedo a que una patrulla sorpresa te quite el 50% de las fichas mientras estás en clase o desconectado.',
      'Suministros con Hitos x2 Visibles: Hitos de producción al alcanzar los niveles 10, 25, 50 y 100 en cada bebida para un progreso mucho más gratificante.',
      'El After (Rebirth) Transparente: Multiplicadores permanentes claros (x2.00, x3.50, x5.00...), capital de arranque garantizado y sistema de riesgo policial predecible.',
      'Goteo Solidario y Beca de Novatos: Las cuentas con grandes fortunas (>100k) inactivas aportan una pequeña tasa solidaria al fondo común si no custodian su alijo, ayudando a crecer a los nuevos alumnos.',
      'Motor Unificado Ultraligero: Reducción masiva de intervalos para máxima fluidez táctil y cero consumo innecesario de batería.',
    ],
  },
  {
    version: '1.4.1',
    title: 'SMR2 v1.4.1 · Multiplicador Real de Renacimiento y Mercado en Tiempo Real',
    badge: 'ACTUALIZACIÓN CRÍTICA',
    date: 'Martes, 10 de Noviembre, 2026',
    description:
      'Actualización obligatoria para aplicar el multiplicador masivo y real de los renacimientos (rebirths), farmeo base permanente, potencia de trago garantizada y replicación en vivo absoluta del mercado de inversiones entre todos los dispositivos de la clase.',
    changes: [
      'Multiplicador de Renacimiento Real (Idle Scaling): Se eliminan los límites artificiales. Nivel 1 otorga x2.00 (+100%), Nivel 2 otorga x3.50 (+150%), Nivel 3 otorga x5.00 (+150%), escalando progresivamente hasta x18.50+ en niveles altos.',
      'Farmeo Base y Clic Permanente al Renacer: Al renacer NUNCA vuelves a 0/s. Cada nivel de renacimiento otorga una tasa de producción base permanente (+25 fichas/s escaladas) y +5 fichas base por cada clic manual, garantizando progreso visible e instantáneo desde el segundo cero.',
      'Capital de Arranque Mejorado: Al renacer comienzas con hasta 15.000+ fichas en el bote para comprar suministros inmediatamente y sentir la velocidad del multiplicador.',
      'Mercado de Inversiones con Replicación en Tiempo Real: Sincronización continua de 3.5 segundos entre todos los alumnos y terminales para cotizaciones, cinta de órdenes, tesorería y carteras, junto a canales instantáneos de Supabase Realtime.',
      'Estética Apple y Contraste Perfeccionado: Gráfica interactiva de alta fidelidad con gradientes dinámicos verde/rojo según tendencia, tipografía sobria y legibilidad impecable tanto en Modo Claro como en Modo Oscuro.',
    ],
  },
  {
    version: '1.4.0',
    title: 'SMR2 v1.4.0 · El Botellón 2.0: Rediseño Apple Minimalista, Nube Supabase y Optimización Móvil',
    badge: 'BOTELLÓN 2.0',
    date: 'Martes, 10 de Noviembre, 2026',
    description:
      'Gran rediseño de El Botellón y del Mercado de Inversiones con la filosofía de diseño minimalista de Apple (Human Interface Guidelines), sincronización bidireccional continua con Supabase Cloud y optimización móvil integral de pantalla táctil para todos los alumnos.',
    changes: [
      'Filosofía Apple y Anti-Diseño IA: Eliminación completa de degradados estridentes y brillos de neón artificiales. Interfaz serena, tipografía limpia de alta jerarquía, tarjetas agrupadas y bordes sutiles de 1px hairline con contraste impecable tanto en Modo Claro como en Modo Oscuro.',
      'Dashboard Móvil Compacto: Nuevo panel unificado todo-en-uno que ahorra más de 400px de scroll vertical en pantallas móviles, agrupando el bote de fichas, ritmo de producción, control de resaca y acción táctil de trago en una tarjeta de acceso rápido.',
      'Sincronización Supabase Cloud & Realtime: Persistencia atómica de partida en PostgreSQL con la columna JSONB profiles.party_farm_data, índice GIN acelerado, canal Realtime para reconciliación automática entre dispositivos y reconexión resiliente.',
      'Escena Viva y Personajes Rediseñados: La plaza del botellón ahora luce un cuadro de escenario interactivo adaptativo, globos de diálogo estilo iOS toast y tarjetas de suministros con objetivos táctiles de 44px+ para toques cómodos con el pulgar.',
      'Mercado de Acciones e Inversiones Apple Stocks: Selector de tickers con scroll táctil suave, gráfica SVG inspirada en la app Bolsa de Apple con cotización en verde/rojo de alto contraste, controles segmentados de temporalidad (1H, 6H, 24H, Todo) y boleta de compra/venta instantánea.',
      'Minijuegos y Modales Renovados: Beer Pong de clase con indicador central de enceste calibrado, ruleta de 3 vasos misteriosos táctil y modales de redada/renacimiento con acabado Apple sheet.',
    ],
  },
  {
    version: '1.3.0',
    title: 'SMR2 v1.3.0 · Sistema de Renacimientos y Actualizaciones Obligatorias',
    badge: 'ACTUALIZACIÓN OBLIGATORIA',
    date: 'Martes, 10 de Noviembre, 2026',
    description:
      'Actualización obligatoria para sincronizar a todos los alumnos con el nuevo sistema de renacimientos (rebirths), balance económico y persistencia continua de sesión sin solicitudes repetitivas de ficha de estudiante.',
    changes: [
      'Sistema de Renacimiento (Rebirth): Datos guardados y sincronizados directamente en Supabase con multiplicador permanente acumulativo y registro limpio en la base de datos.',
      'Actualizaciones obligatorias: Bloqueo de pantalla completa para garantizar que todos los alumnos jueguen bajo las mismas reglas y en la misma versión.',
      'Persistencia de sesión permanente: Corrección del cierre de sesión inesperado y eliminación del aviso repetitivo de ficha de estudiante al entrar.',
      'Diseño minimalista: Optimización completa de modos claro y oscuro con estética limpia y profesional.',
    ],
  },
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
