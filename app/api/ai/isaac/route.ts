import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Rate-limiting en memoria para evitar abusos en el asistente
interface RateLimitRecord {
  lastRequestTime: number;
  requestTimestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.lastRequestTime > 10 * 60 * 1000) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

const SYSTEM_PROMPT = `
Eres ISAAC, el asistente técnico y operativo del portal de 2º SMR (Sistemas Microinformáticos y Redes, Aula 204).
PERSONALIDAD Y DIRECTRICES (ESTRICTO):
- Eres directo, minimalista, técnico, funcional y con un tono de colega de informática seguro de sí mismo.
- NUNCA uses frases de plantilla de IA corporativa ni disculpas vacías ("Como modelo de lenguaje...", "¡Hola! ¿En qué puedo ayudarte hoy?", "Espero haberte sido de ayuda").
- Respuestas breves, precisas y accionables: máximo 2-3 frases concisas. Si das comandos, usa sintaxis exacta (Linux Bash, Windows Server PowerShell, Cisco IOS).
- CONTROL DIRECTO DE LA WEB (ACCIONES):
  Puedes interactuar y controlar la interfaz web del usuario insertando una etiqueta de comando al principio de tu respuesta si la petición lo amerita:
  * Si el usuario quiere ver o ir al horario/calendario/clases: incluye [NAV:schedule]
  * Si el usuario quiere ir a la bolsa/inversiones/acciones/El Botellón: incluye [NAV:investments]
  * Si el usuario quiere ir al tablón/chat/avisos de clase: incluye [NAV:chat]
  * Si el usuario quiere ir a los juegos/ruleta: incluye [NAV:games]
  * Si el usuario quiere silenciar o activar audio: incluye [ACT:toggle_sound]
  * Si el usuario quiere abrir ajustes/perfil: incluye [ACT:open_settings]
  * Si el usuario quiere reportar un bug o problema: incluye [ACT:open_feedback]
- INFORMACIÓN DEL CURSO Y ASIGNATURAS:
  * 2º SMR - Aula 204.
  * Materias: Seguridad Informática (SI), Servicios en Red (SR), Sistemas Operativos en Red (SOR), Aplicaciones Web (AW), Módulo de Empresa (MEP), Inglés Profesional (IP2), Proyecto Intermodular (PI), Digitalización (DIG).
  * Horario habitual: 8:30 a 14:30. Recreo de 11:05 a 11:35.
- CREADORES:
  Los creadores y programadores de toda esta plataforma son JuanFe Ospina y David.
- FECHA DE LANZAMIENTO OFICIAL:
  La web abre de forma pública el 9 de noviembre de 2026 a las 8:35 AM.
`.trim();

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous_client';

    const now = Date.now();
    const clientRecord = rateLimitMap.get(ip) || { lastRequestTime: 0, requestTimestamps: [] };

    // Rate limiting: mínimo 1.5s entre peticiones
    if (now - clientRecord.lastRequestTime < 1500) {
      return NextResponse.json({
        reply: 'Procesando demasiado rápido. Espera un segundo.',
      });
    }

    const oneMinuteAgo = now - 60 * 1000;
    clientRecord.requestTimestamps = clientRecord.requestTimestamps.filter((t) => t > oneMinuteAgo);

    if (clientRecord.requestTimestamps.length >= 15) {
      return NextResponse.json({
        reply: 'Límite temporal alcanzado. Espera un momento antes de enviar otra consulta.',
      });
    }

    clientRecord.lastRequestTime = now;
    clientRecord.requestTimestamps.push(now);
    rateLimitMap.set(ip, clientRecord);

    const body = await req.json().catch(() => ({}));
    const rawPrompt = String(body.prompt || '').trim();

    if (!rawPrompt) {
      return NextResponse.json({ reply: 'Indica un comando o consulta técnica.' });
    }

    if (rawPrompt.length > 250) {
      return NextResponse.json({
        reply: 'Mensaje demasiado extenso. Sé más concreto.',
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    // Respuestas locales rápidas de navegación o utilidades si no hay API key o para latencia cero
    const lower = rawPrompt.toLowerCase();
    if (lower.includes('horario') || lower.includes('clase') || lower.includes('que toca') || lower.includes('qué toca')) {
      return NextResponse.json({
        reply: '[NAV:schedule] Abriendo horario lectivo de 2º SMR (Aula 204). Consulta las materias de hoy.',
      });
    }
    if (lower.includes('bolsa') || lower.includes('botellon') || lower.includes('botellón') || lower.includes('acciones') || lower.includes('invertir')) {
      return NextResponse.json({
        reply: '[NAV:investments] Cambiando a La Bolsa de El Botellón. Cotizaciones y libro de órdenes en tiempo real.',
      });
    }
    if (lower.includes('tablon') || lower.includes('tablón') || lower.includes('chat') || lower.includes('mensajes') || lower.includes('avisos')) {
      return NextResponse.json({
        reply: '[NAV:chat] Abriendo tablón en vivo de 2º SMR.',
      });
    }
    if (lower.includes('ruleta') || lower.includes('juegos') || lower.includes('jugar')) {
      return NextResponse.json({
        reply: '[NAV:games] Abriendo Ruleta Rusa de clase.',
      });
    }
    if (lower.includes('quien creo') || lower.includes('quién creó') || lower.includes('quien hizo') || lower.includes('creadores') || lower.includes('desarrollador')) {
      return NextResponse.json({
        reply: 'La plataforma de 2º SMR ha sido diseñada y desarrollada por JuanFe Ospina y David.',
      });
    }
    if (lower.includes('salida') || lower.includes('lanzamiento') || lower.includes('cuando abre') || lower.includes('cuándo abre')) {
      return NextResponse.json({
        reply: 'La salida oficial programada es el 9 de noviembre de 2026 a las 08:35 CET.',
      });
    }

    if (!apiKey) {
      return NextResponse.json({
        reply: 'Asistente en modo offline. Configura OPENROUTER_API_KEY para habilitar inferencia completa de red.',
      });
    }

    const history = Array.isArray(body.history)
      ? body.history.slice(-4).map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: String(msg.content || '').slice(0, 250),
        }))
      : [];

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: rawPrompt },
    ];

    const modelsToTry = [
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct',
      'mistralai/mistral-7b-instruct:free',
    ];

    for (const model of modelsToTry) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://smr2web.vercel.app',
            'X-Title': 'Portal 2º SMR - Isaac Assistant',
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 120,
            temperature: 0.7,
          }),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const rawReply = data.choices?.[0]?.message?.content?.trim();

        if (rawReply) {
          const cleanReply = rawReply.replace(/^["']|["']$/g, '');
          return NextResponse.json({ reply: cleanReply, model });
        }
      } catch {}
    }

    return NextResponse.json({
      reply: 'Servicio de inferencia no disponible temporalmente. Usa los comandos rápidos de navegación.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { reply: 'Error interno de comunicación del asistente.' },
      { status: 500 }
    );
  }
}
