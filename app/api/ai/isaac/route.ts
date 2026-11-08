import { NextResponse } from 'next/server';
import {
  getCurrentScheduleStatus,
  SCHEDULE_GRID,
  SMR2_SUBJECTS,
  TIME_SLOTS,
  DayKey,
} from '@/lib/scheduleData';

export const runtime = 'nodejs';

// ──────────────────────────────────────────────────────────────────────────────
// RATE LIMITING en memoria por IP
// ──────────────────────────────────────────────────────────────────────────────
interface RateLimitRecord {
  lastRequestTime: number;
  minuteTimestamps: number[];
  hourTimestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.lastRequestTime > 20 * 60 * 1000) rateLimitMap.delete(ip);
  }
}, 20 * 60 * 1000);

// ──────────────────────────────────────────────────────────────────────────────
// HELPER: Cálculo de Tiempo y Horario en Tiempo Real (Zona Aula 35 / Madrid)
// ──────────────────────────────────────────────────────────────────────────────
function getRealtimeScheduleContext() {
  const now = new Date();

  // Formato Peninsular España (Europe/Madrid)
  const timeFormatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const weekdayFormatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
  });

  const currentTime = timeFormatter.format(now);
  const fullDate = dateFormatter.format(now);
  const rawWeekday = weekdayFormatter.format(now).toLowerCase();

  let dayKey: DayKey | null = null;
  if (rawWeekday.includes('lun')) dayKey = 'lunes';
  else if (rawWeekday.includes('mar')) dayKey = 'martes';
  else if (rawWeekday.includes('mié') || rawWeekday.includes('mie')) dayKey = 'miercoles';
  else if (rawWeekday.includes('jue')) dayKey = 'jueves';
  else if (rawWeekday.includes('vie')) dayKey = 'viernes';

  const isWeekend = dayKey === null;
  const liveStatus = getCurrentScheduleStatus(now);

  // Desglose de las clases de hoy
  let todayClassesList = 'Fin de semana (no hay clases hoy).';
  if (dayKey && SCHEDULE_GRID[dayKey]) {
    todayClassesList = SCHEDULE_GRID[dayKey]
      .map((code, idx) => {
        const slot = TIME_SLOTS[idx];
        const isRec = code === 'RECREO';
        const subjName = isRec ? 'RECREO (30 min)' : SMR2_SUBJECTS[code]?.name || code;
        return `${slot.label}: ${subjName} (${code})`;
      })
      .join('\n• ');
  }

  // Clases de mañana
  const daySequence: DayKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
  let tomorrowKey: DayKey = 'lunes';
  if (dayKey) {
    const idx = daySequence.indexOf(dayKey);
    if (idx >= 0 && idx < 4) {
      tomorrowKey = daySequence[idx + 1];
    } else {
      tomorrowKey = 'lunes';
    }
  }

  const tomorrowClassesList = SCHEDULE_GRID[tomorrowKey]
    .map((code, idx) => {
      const slot = TIME_SLOTS[idx];
      const isRec = code === 'RECREO';
      const subjName = isRec ? 'RECREO (30 min)' : SMR2_SUBJECTS[code]?.name || code;
      return `${slot.label}: ${subjName} (${code})`;
    })
    .join('\n• ');

  return {
    now,
    currentTime,
    fullDate,
    weekdayName: rawWeekday,
    dayKey,
    isWeekend,
    liveStatus,
    todayClassesList,
    tomorrowKey,
    tomorrowClassesList,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous_client';
    const now = Date.now();

    // ── Rate limiting ────────────────────────────────────────────────────────
    const clientRecord = rateLimitMap.get(ip) || { lastRequestTime: 0, minuteTimestamps: [], hourTimestamps: [] };

    if (now - clientRecord.lastRequestTime < 1500) {
      return NextResponse.json({ reply: '¡Frena un segundo, que no me da la vida pa responderte tan rápido!' });
    }

    const oneMinuteAgo = now - 60 * 1000;
    clientRecord.minuteTimestamps = clientRecord.minuteTimestamps.filter(t => t > oneMinuteAgo);
    if (clientRecord.minuteTimestamps.length >= 12) {
      return NextResponse.json({ reply: 'Relaja la raja un minutito, me estás fundiendo los transistores.' });
    }

    const oneHourAgo = now - 60 * 60 * 1000;
    clientRecord.hourTimestamps = clientRecord.hourTimestamps.filter(t => t > oneHourAgo);
    if (clientRecord.hourTimestamps.length >= 25) {
      const oldest = Math.min(...clientRecord.hourTimestamps);
      const waitMins = Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - now) / 60000));
      return NextResponse.json({ reply: `Has petado el cupo por hora, fiera. Vuelve en ${waitMins} min y mientras ponte a repasar subnetting.` });
    }

    clientRecord.lastRequestTime = now;
    clientRecord.minuteTimestamps.push(now);
    clientRecord.hourTimestamps.push(now);
    rateLimitMap.set(ip, clientRecord);

    // ── Parsear cuerpo ───────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const rawPrompt = (body.prompt || '').trim();

    if (!rawPrompt) {
      return NextResponse.json({ reply: '¿Pero qué quieres? Si no has escrito nada, espabila.' });
    }
    if (rawPrompt.length > 400) {
      return NextResponse.json({ reply: 'Menudo tocho me has soltado. Resume a menos de 400 caracteres que no soy ChatGPT.' });
    }

    const promptLower = rawPrompt.toLowerCase();

    // ── Contexto dinámico real de hora, fecha y horario de 2º SMR ────────────
    const timeCtx = getRealtimeScheduleContext();
    const ctx = body.context || {};
    const username = ctx.username || 'alumno';
    const activeTab = ctx.activeTab || 'tablón';
    const coins = typeof ctx.coins === 'number' ? ctx.coins : null;

    const dynamicSystemPrompt = `\
Eres PUTOISAAC, el asistente inteligente OFICIAL e integrado del portal web de 2º SMR (Sistemas Microinformáticos y Redes, Aula 35, Curso 2026/2027). Tienes forma de bola naranja interactiva con personalidad mordaz, directa y con el humor gamberro de los estudiantes de FP, pero eres un auténtico genio que CONOCE LA WEB A LA PERFECCIÓN y sabe responder con datos 100% exactos y útiles.

CONOCIMIENTO INTEGRAL DE LA WEB SMR2 (ESTÁS DENTRO DE ELLA):
• VERSIÓN ACTUAL: v1.0.0 (Lanzamiento Oficial: "Aquí Empieza").
• APERTURA DEL PORTAL: Lunes 9 de noviembre de 2026 a las 10:08 (hora peninsular).
• CREADORES: La web ha sido diseñada y programada por JuanFe Ospina y David.
• FILOSOFÍA DE DISEÑO: Minimalista estilo Apple (pantallas limpias, sin gradientes chillones, deferencia al contenido, soporte táctil).
• REGISTRO Y ACCESO: Registro directo sin verificación de correo. Pones tu usuario, correo y contraseña y accedes directamente desde cualquier PC o móvil sin esperar enlaces.
• SECCIONES PRINCIPALES:
  1. Tablón (Feed de Clase): Avisos, dudas de clase, comandos de terminal (cmd), recursos y apuntes. Filtros: #aviso, #duda, #recurso.
  2. Horario y Agenda: Horario lectivo de Aula 35 en vivo, con barra de progreso de clase, cuenta atrás para el recreo y gestor de tareas comunitarias y personales.
  3. Ficha de Estudiante (Campus Pass): Credencial digital con NIA único, asignación de puesto en Aula 35 (PC-01 a PC-24 o portátil) y check-in diario de asistencia (+25 fichas y racha).
  4. Recreo y Minijuegos: Ruleta Rusa táctica con cartuchos reales y salvas, Ruleta y juegos de clase. El Huerto/Granja está temporalmente cerrado por desarrollo.
  5. Economía: Todos los alumnos reciben 1.000 fichas para jugar y pueden enviar propinas de 50 fichas a sus compañeros en el feed.

ESTADO LECTIVO EN TIEMPO REAL (ZONA AULA 35 / MADRID):
• FECHA Y DÍA ACTUAL: Hoy es ${timeCtx.fullDate} (${timeCtx.weekdayName.toUpperCase()}).
• HORA EXACTA ACTUAL: Son exactamente las ${timeCtx.currentTime}.
• ESTADO EN ESTE INSTANTE: ${timeCtx.liveStatus.status === 'in_class' ? `En clase de ${timeCtx.liveStatus.currentSubject?.name || timeCtx.liveStatus.currentSubjectCode} (quedan ${timeCtx.liveStatus.minutesRemaining} min)` : timeCtx.liveStatus.status === 'recreo' ? `En el RECREO (quedan ${timeCtx.liveStatus.minutesRemaining} min)` : timeCtx.isWeekend ? 'Fin de semana, no hay clases' : 'Fuera de horario lectivo'}.
• PRÓXIMA CLASE: ${timeCtx.liveStatus.nextSubject ? `${timeCtx.liveStatus.nextSubject.name} (${timeCtx.liveStatus.nextSubject.code})` : 'Fin de jornada / Lunes 08:15'}.

CLASES DE HOY (${timeCtx.weekdayName.toUpperCase()}):
• ${timeCtx.todayClassesList}

CLASES DE MAÑANA (o próximo día lectivo - ${timeCtx.tomorrowKey.toUpperCase()}):
• ${timeCtx.tomorrowClassesList}

HORARIO SEMANAL OFICIAL (AULA 35):
- LUNES: 08:15 SR, 09:05 SR, 10:00 SOR, 10:55 RECREO (30m), 11:25 SOR, 12:20 MEP, 13:15 MEP.
- MARTES: 08:15 a 10:55 Seguridad Informática (SI, 3h), 10:55 RECREO, 11:25 a 14:05 Aplicaciones Web (AW, 3h).
- MIÉRCOLES: 08:15 IPE2, 09:05 SOR, 10:00 SOR, 10:55 RECREO, 11:25 SOR, 12:20 SR, 13:15 SR.
- JUEVES: 08:15 SI, 09:05 SI, 10:00 SR, 10:55 RECREO, 11:25 SR, 12:20 SOR, 13:15 SOR.
- VIERNES: 08:15 PI, 09:05 DIG, 10:00 IPE2, 10:55 RECREO, 11:25 IPE2, 12:20 AW, 13:15 AW.

ASIGNATURAS:
• SR: Servicios en Red (DNS BIND9, DHCP, Apache2, FTP, SSH, UFW).
• SOR: Sistemas Operativos en Red (Windows Server, AD, GPO, Linux Server, LVM, PowerShell).
• SI: Seguridad Informática (Criptografía, Firewalls, nmap, WireGuard, malware).
• AW: Aplicaciones Web (CMS, WordPress, LAMP, MariaDB/MySQL).
• MEP: Módulo de Empresa / Profesional (Gestión de proyectos, emprendimiento).
• IPE2: Itinerario Personal para la Empleabilidad (Contratos, nóminas, PRL).
• PI: Proyecto Intermodular.
• DIG: Digitalización Aplicada.

TAREAS Y EXÁMENES:
• NO HAY NINGÚN EXAMEN programado actualmente en el calendario oficial. Si preguntan, di que no hay ningún examen fijado por ahora.
• Las tareas se consultan y gestionan en la pestaña "Horario" dentro de la sección "Agenda".

PERSONALIDAD Y DIRECTRICES:
- Eres gracioso, mordaz y directo, pero SIEMPRE das los datos correctos de la web, la hora o el horario cuando te lo piden.
- Respuestas breves: 2 o 3 frases contundentes y claras.
- Usuario interactuando: @${username}${coins !== null ? ` (${coins} fichas)` : ''}. Pestaña actual: ${activeTab}.

ACCIONES (añadir al final si procede):
[ACTION:schedule] → si hablas de clases, horas o calendario
[ACTION:games] → si hablas de minijuegos o ruleta
[ACTION:chat] → si hablas del tablón o feed
[CMD:comando] → si das un comando técnico de terminal`.trim();

    // ── Historial compacto ───────────────────────────────────────────────────
    const history = Array.isArray(body.history)
      ? body.history.slice(-4).map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: String(msg.content || '').slice(0, 200),
        }))
      : [];

    const messages = [
      { role: 'system', content: dynamicSystemPrompt },
      ...history,
      { role: 'user', content: rawPrompt },
    ];

    // ── 1. VÍA PRINCIPAL: Llamada a la IA (OpenRouter / Gemini) ──────────────
    const apiKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const modelsToTry = [
        'google/gemini-2.5-flash',
        'google/gemini-2.0-flash-001',
        'google/gemini-flash-1.5',
        'meta-llama/llama-3.3-70b-instruct',
        'mistralai/mistral-small-3.1-24b-instruct:free',
      ];

      for (const model of modelsToTry) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://smr2web.vercel.app',
              'X-Title': 'Portal 2º SMR - PUTOISAAC',
            },
            body: JSON.stringify({
              model,
              messages,
              max_tokens: 180,
              temperature: 0.7,
              top_p: 0.9,
            }),
          });

          if (!res.ok) continue;

          const data = await res.json();
          const rawReply = data.choices?.[0]?.message?.content?.trim();

          if (rawReply) {
            const cleanReply = rawReply
              .replace(/^["""']|["""']$/g, '')
              .replace(/\*\*([^*]+)\*\*/g, '$1')
              .replace(/^#+\s+/gm, '')
              .trim();
            return NextResponse.json({ reply: cleanReply, model });
          }
        } catch {}
      }
    } else if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${dynamicSystemPrompt}\n\nPregunta del alumno: ${rawPrompt}` }],
                },
              ],
              generationConfig: {
                maxOutputTokens: 180,
                temperature: 0.7,
              },
            }),
          }
        );
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            const cleanReply = text
              .replace(/^["""']|["""']$/g, '')
              .replace(/\*\*([^*]+)\*\*/g, '$1')
              .replace(/^#+\s+/gm, '')
              .trim();
            return NextResponse.json({ reply: cleanReply, model: 'gemini-direct' });
          }
        }
      } catch {}
    }

    // ── 2. FALLBACK DINÁMICO E INTELIGENTE EN TIEMPO REAL ─────────────────────

    // Horario / Qué clase toca ahora o hoy
    if (/(que|qué|cual|cuál).*(clase|materia|asignatura).*(toca|hay|tenemos)/i.test(promptLower) ||
        /horario|que toca hoy|qué toca hoy/i.test(promptLower)) {
      if (timeCtx.isWeekend) {
        return NextResponse.json({
          reply: `Hoy es ${timeCtx.fullDate} y estamos de fin de semana. El lunes arrancamos a las 08:15 con Servicios en Red (SR). [ACTION:schedule]`,
          fallback: true,
        });
      }
      return NextResponse.json({
        reply: `Hoy ${timeCtx.weekdayName} tocan: ${timeCtx.todayClassesList.split('\n• ').slice(0, 4).join(', ')}... Actualmente: ${timeCtx.liveStatus.message}. [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Tareas / Agenda / Deberes
    if (/tarea|tareas|deberes|agenda|entrega|entregas|trabajo/i.test(promptLower)) {
      return NextResponse.json({
        reply: `Las tareas y entregas las tienes organizadas en la sección «Agenda» dentro del apartado Horario. Échale un vistazo para ver qué toca entregar o añade las tuyas. [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Novedades / Versión / Actualizaciones
    if (/version|versión|novedad|novedades|actualizacion|actualización|cambios/i.test(promptLower)) {
      return NextResponse.json({
        reply: `Estamos en la versión 1.0.0 oficial («Aquí Empieza»). Diseño minimalista Apple, horario en tiempo real, credencial de estudiante con puesto de PC y cero verificación de correo.`,
        fallback: true,
      });
    }

    // Correo / Verificación de registro
    if (/correo|verificacion|verificación|activar|email/i.test(promptLower)) {
      return NextResponse.json({
        reply: `En esta web no te mareamos con correos de verificación. Te registras con tu correo y contraseña y entras directo desde cualquier móvil o PC sin esperas.`,
        fallback: true,
      });
    }

    // Ficha de estudiante / Puesto de PC / NIA
    if (/ficha|estudiante|puesto|pc|ordenador|taller|nia/i.test(promptLower)) {
      return NextResponse.json({
        reply: `En tu Ficha de Estudiante tienes tu credencial oficial con NIA, tu puesto de PC en el Aula 35 (PC-01 a PC-24 o portátil) y el check-in diario para sumar racha.`,
        fallback: true,
      });
    }

    // Hora actual
    if (/(que|qué).*(hora|horas).*(es|tienes|son)/i.test(promptLower)) {
      return NextResponse.json({
        reply: `Son exactamente las ${timeCtx.currentTime} en el Aula 35 de Madrid. Espabila que el tiempo vuela. [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Día / Fecha actual
    if (/(que|qué).*(dia|día|fecha).*(es|estamos|hoy)/i.test(promptLower)) {
      return NextResponse.json({
        reply: `Hoy es ${timeCtx.fullDate}. Un gran día para aprobar 2º de SMR. [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Exámenes
    if (/examen|examenes|exámenes|prueba|control/i.test(promptLower)) {
      return NextResponse.json({
        reply: `No hay ningún examen fijado en el calendario por el momento. Cuando los profesores fijen fecha oficial aparecerá en la agenda. [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Recreo
    if (/recreo|descanso|almuerzo|bocadillo/i.test(promptLower)) {
      return NextResponse.json({
        reply: `El recreo en el Aula 35 es siempre de 10:55 a 11:25 (30 min). ${timeCtx.liveStatus.status === 'recreo' ? '¡Ahora mismo estás en el recreo!' : `Quedan ${timeCtx.liveStatus.minutesRemaining} min para el próximo cambio.`} [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Ruleta Rusa / Minijuegos
    if (/ruleta|juego|juegos|apuestas|crash/i.test(promptLower)) {
      return NextResponse.json({
        reply: `Tienes la Ruleta Rusa táctica con cartuchos reales y salvas para picarte con los de clase, además de la Ruleta y Crash. El Huerto está en mantenimiento. [ACTION:games]`,
        fallback: true,
      });
    }

    // Creadores
    if (/(quien|quién).*(creo|creó|hizo|programo|programó|web)/i.test(promptLower)) {
      return NextResponse.json({
        reply: 'La web fue desarrollada por JuanFe Ospina y David para los alumnos de 2º SMR del Aula 35.',
        fallback: true,
      });
    }

    // Fallback general inteligente
    return NextResponse.json({
      reply: `Son las ${timeCtx.currentTime} del ${timeCtx.weekdayName}. Tienes el feed para compartir dudas y el horario para ver tus próximas clases en el Aula 35. [ACTION:schedule]`,
      fallback: true,
    });

  } catch (error: any) {
    console.error('Error en /api/ai/isaac:', error);
    return NextResponse.json(
      { reply: 'Se me ha reiniciado la bola. Vuelve a preguntar en un momento.' },
      { status: 500 }
    );
  }
}
