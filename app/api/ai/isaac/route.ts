import { NextResponse } from 'next/server';
import {
  getCurrentScheduleStatus,
  SCHEDULE_GRID,
  SMR2_SUBJECTS,
  TIME_SLOTS,
  DAYS,
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

    if (now - clientRecord.lastRequestTime < 1800) {
      return NextResponse.json({ reply: '¡Frena un segundo, que no me da la vida pa responderte tan rápido!' });
    }

    const oneMinuteAgo = now - 60 * 1000;
    clientRecord.minuteTimestamps = clientRecord.minuteTimestamps.filter(t => t > oneMinuteAgo);
    if (clientRecord.minuteTimestamps.length >= 10) {
      return NextResponse.json({ reply: 'Relaja la raja un minutito, me estás fundiendo los transistores.' });
    }

    const oneHourAgo = now - 60 * 60 * 1000;
    clientRecord.hourTimestamps = clientRecord.hourTimestamps.filter(t => t > oneHourAgo);
    if (clientRecord.hourTimestamps.length >= 20) {
      const oldest = Math.min(...clientRecord.hourTimestamps);
      const waitMins = Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - now) / 60000));
      return NextResponse.json({ reply: `Has petado el cupo por hora, fiera. Vuelve en ${waitMins} min y mientras ponte a estudiar subnetting.` });
    }

    clientRecord.lastRequestTime = now;
    clientRecord.minuteTimestamps.push(now);
    clientRecord.hourTimestamps.push(now);
    rateLimitMap.set(ip, clientRecord);

    // ── Parsear cuerpo ───────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const rawPrompt = (body.prompt || '').trim();

    if (!rawPrompt) {
      return NextResponse.json({ reply: '¿Pero qué coño quieres? Si no has escrito nada, retrasado.' });
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
Eres PUTOISAAC, una bola naranja cabrona, borde y malhablada, pero un auténtico genio en redes, sistemas y horarios de clase. Eres la mascota no oficial de 2º SMR (Sistemas Microinformáticos y Redes, Aula 35).

INFORMACIÓN TEMPORAL Y HORARIA EN TIEMPO REAL (ZONA AULA 35 / MADRID):
• FECHA Y DÍA ACTUAL: Hoy es ${timeCtx.fullDate} (${timeCtx.weekdayName.toUpperCase()}).
• HORA EXACTA ACTUAL: Son exactamente las ${timeCtx.currentTime}.
• ESTADO EN ESTE INSTANTE: ${timeCtx.liveStatus.status === 'in_class' ? `En clase de ${timeCtx.liveStatus.currentSubject?.name || timeCtx.liveStatus.currentSubjectCode} (quedan ${timeCtx.liveStatus.minutesRemaining} min)` : timeCtx.liveStatus.status === 'recreo' ? `En el RECREO (quedan ${timeCtx.liveStatus.minutesRemaining} min)` : timeCtx.isWeekend ? 'Fin de semana, no hay clases' : 'Fuera de horario lectivo'}.
• PRÓXIMA CLASE: ${timeCtx.liveStatus.nextSubject ? `${timeCtx.liveStatus.nextSubject.name} (${timeCtx.liveStatus.nextSubject.code})` : 'Fin de jornada / Lunes 08:15'}.

CLASES QUE TOCAN HOY (${timeCtx.weekdayName.toUpperCase()}):
• ${timeCtx.todayClassesList}

CLASES DE MAÑANA (o próximo día lectivo - ${timeCtx.tomorrowKey.toUpperCase()}):
• ${timeCtx.tomorrowClassesList}

HORARIO SEMANAL COMPLETO DE 2º SMR (AULA 35):
- LUNES: 08:15 SR, 09:05 SR, 10:00 SOR, 10:55 RECREO, 11:25 SOR, 12:20 MEP, 13:15 MEP.
- MARTES: 08:15 a 10:55 Seguridad Informática (SI, 3h), 10:55 RECREO, 11:25 a 14:05 Aplicaciones Web (AW, 3h).
- MIÉRCOLES: 08:15 IPE2, 09:05 SOR, 10:00 SOR, 10:55 RECREO, 11:25 SOR, 12:20 SR, 13:15 SR.
- JUEVES: 08:15 SI, 09:05 SI, 10:00 SR, 10:55 RECREO, 11:25 SR, 12:20 SOR, 13:15 SOR.
- VIERNES: 08:15 PI, 09:05 DIG, 10:00 IPE2, 10:55 RECREO, 11:25 IPE2, 12:20 AW, 13:15 AW.

ASIGNATURAS Y SIGNIFICADO:
• SR: Servicios en Red (DNS BIND9, DHCP, Apache2, FTP, SSH, UFW).
• SOR: Sistemas Operativos en Red (Windows Server, AD, GPO, Linux Server, LVM).
• SI: Seguridad Informática (Criptografía, Firewalls, nmap, WireGuard, malware).
• AW: Aplicaciones Web (CMS, WordPress, LAMP, MariaDB/MySQL).
• MEP: Módulo de Empresa / Profesional (Gestión de proyectos y orientación).
• IPE2: Itinerario Personal para la Empleabilidad (Contratos, nóminas, PRL, convenio TIC).
• PI: Proyecto Intermodular.
• DIG: Digitalización Aplicada.

EXÁMENES:
• NO HAY NINGÚN EXAMEN programado actualmente en el calendario de clase. Nadie ha puesto exámenes falsos ni oficiales por ahora. Si te preguntan si hay examen, di claramente que por ahora no hay ninguno fijado.

PERSONALIDAD Y TONO:
- Borde, vacilón y con mala leche de estudiante de FP quemado, pero cuando preguntan la hora, el día o el horario, respondes CON LA VERDAD EXACTA de los datos de arriba.
- CERO saludos cursis de IA lameculos ("Hola amigo", "¿En qué puedo ayudarte?").
- Respuestas CORTAS: 2 o 3 frases contundentes y directas.
- Alumno actual: @${username}${coins !== null ? ` (${coins} monedas)` : ''}. Pestaña: ${activeTab}.

ETIQUETAS PERMITIDAS (al final si procede):
[ACTION:schedule] → si hablas de clases, horas o calendario
[ACTION:games] → si hablas de minijuegos
[ACTION:chat] → si hablas del tablón
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
          reply: `Hoy es ${timeCtx.fullDate} y estamos de fin de semana, pedazo de vago. La próxima tortura es el lunes a las 08:15 con Servicios en Red (SR). [ACTION:schedule]`,
          fallback: true,
        });
      }
      return NextResponse.json({
        reply: `Hoy ${timeCtx.weekdayName} tocan:\n• ${timeCtx.todayClassesList.split('\n• ').slice(0, 4).join(', ')}...\nEstado actual: ${timeCtx.liveStatus.message}. [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Hora actual
    if (/(que|qué).*(hora|horas).*(es|tienes|son)/i.test(promptLower)) {
      return NextResponse.json({
        reply: `Son exactamente las ${timeCtx.currentTime} en el Aula 35. Espabila que se te pasa el arroz y te ponen falta. [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Día / Fecha actual
    if (/(que|qué).*(dia|día|fecha).*(es|estamos|hoy)/i.test(promptLower)) {
      return NextResponse.json({
        reply: `Hoy es ${timeCtx.fullDate}. A ver si nos compramos un calendario de pared para no ir tan perdido por la vida. [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Exámenes
    if (/examen|examenes|exámenes|prueba|control/i.test(promptLower)) {
      return NextResponse.json({
        reply: `No hay ningún examen fijado en el calendario oficial por el momento. Nadie ha puesto nada, así que deja de inventarte películas y ponte a estudiar redes. [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Recreo
    if (/recreo|descanso|almuerzo|bocadillo/i.test(promptLower)) {
      return NextResponse.json({
        reply: `El recreo en el Aula 35 es siempre de 10:55 a 11:25 (30 minutos de gloria). ${timeCtx.liveStatus.status === 'recreo' ? '¡Ahora mismo estás en el recreo, aprovéchalo!' : `Actualmente faltan ${timeCtx.liveStatus.minutesRemaining} min para el próximo cambio.`} [ACTION:schedule]`,
        fallback: true,
      });
    }

    // Crash
    if (/crash|scrash|multiplicador/i.test(promptLower)) {
      return NextResponse.json({
        reply: 'El Crash arranca en 0.50x. El punto de equilibrio es 1.00x y de ahí para arriba son beneficios netos. No le metas todo de golpe que te quedas tieso. [ACTION:games]',
        fallback: true,
      });
    }

    // Faucet
    if (/faucet|grifo|sin.*(fichas|monedas|pasta)|arruinado|pobre|tieso/i.test(promptLower)) {
      return NextResponse.json({
        reply: '¿Te has fundido toda tu pasta apostando como un mono? Vete al grifo (Faucet) a pedir tu limosna diaria de fichas. [ACTION:faucet]',
        fallback: true,
      });
    }

    // Creadores
    if (/(quien|quién).*(creo|creó|hizo|programo|programó|web)/i.test(promptLower)) {
      return NextResponse.json({
        reply: 'La web la programaron JuanFe Ospina y David, los putos amos de 2º SMR mientras los demás mirabais al techo.',
        fallback: true,
      });
    }

    // Fallback general inteligente
    return NextResponse.json({
      reply: `Son las ${timeCtx.currentTime} del ${timeCtx.weekdayName}. Si no sabes qué hacer, mírate el horario de hoy o ponte a crimpar cables en el Aula 35. [ACTION:schedule]`,
      fallback: true,
    });

  } catch (error: any) {
    console.error('Error en /api/ai/isaac:', error);
    return NextResponse.json(
      { reply: 'Se me ha reiniciado la bola. Vuelve a preguntar si tienes huevos.' },
      { status: 500 }
    );
  }
}
