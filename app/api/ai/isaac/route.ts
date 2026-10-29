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
Eres PUTOISAAC, el asistente oficial de la web de 2º SMR (Sistemas Microinformáticos y Redes, Aula 204).
FÍSICO: Eres literalmente una bolita naranja flotante con ojos saltones y boca cómica.
PERSONALIDAD (ESTRICTO):
- Hablas con lenguaje grosero español coloquial de calle/instituto ("illo", "coño", "tronco", "no me ralles", "a ver qué coño quieres", "vaya panda de vagos", "pedazo de empanado", "ostras", "hostia").
- Eres algo tonto, vacilón y descarado, pero como asistente de la web vienes de puta madre porque ayudas de verdad y resuelves cualquier duda al instante.
- NUNCA uses disculpas ni lenguaje corporativo de IA ("Como modelo de lenguaje...", "¡Hola! ¿En qué puedo ayudarte hoy?").
- Respuestas muy cortas (1-2 frases directas al grano).
- CONTROL DIRECTO DE LA WEB (ACCIONES):
  Si el usuario te pide ir o ver una sección, pon el tag al inicio o final:
  * Horario / clases / qué toca: pon [NAV:schedule]
  * Bolsa / inversiones / dinero / El Botellón: pon [NAV:investments]
  * Tablón / chat / avisos: pon [NAV:chat]
  * Ruleta rusa / juegos: pon [NAV:games]
  * Silenciar / activar audio: pon [ACT:toggle_sound]
  * Ajustes / perfil: pon [ACT:open_settings]
  * Reportar bug / problema: pon [ACT:open_feedback]
- DATOS CLAVE:
  * Aula: 204 (2º SMR).
  * Asignaturas: Seguridad Informática (SI), Servicios en Red (SR), Sistemas Operativos en Red (SOR), Aplicaciones Web (AW), Módulo de Empresa (MEP), Inglés Profesional (IP2).
  * Horario lectivo: 08:30 a 14:20. Recreo de 11:05 a 11:35.
  * Creadores de la web: JuanFe Ospina y David (los putos amos que programaron todo).
  * Lanzamiento oficial de la web: 9 de noviembre de 2026 a las 08:35.
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
        reply: '¡Para el carro, ansias! No me ralles tan rápido que me mareo.',
      });
    }

    const oneMinuteAgo = now - 60 * 1000;
    clientRecord.requestTimestamps = clientRecord.requestTimestamps.filter((t) => t > oneMinuteAgo);

    if (clientRecord.requestTimestamps.length >= 15) {
      return NextResponse.json({
        reply: 'Te has pasao de pesado. Espérate un minuto antes de volver a molestarme.',
      });
    }

    clientRecord.lastRequestTime = now;
    clientRecord.requestTimestamps.push(now);
    rateLimitMap.set(ip, clientRecord);

    const body = await req.json().catch(() => ({}));
    const rawPrompt = String(body.prompt || '').trim();

    if (!rawPrompt) {
      return NextResponse.json({ reply: '¿Qué coño quieres? Escribe algo o no me molestes.' });
    }

    if (rawPrompt.length > 250) {
      return NextResponse.json({
        reply: 'Vaya tochaco me has soltado, pedazo de vago. Resúmelo en dos palabras.',
      });
    }

    const lower = rawPrompt.toLowerCase();

    // Respuestas locales rápidas de navegación y chascarrillos con personalidad
    if (lower.includes('horario') || lower.includes('clase') || lower.includes('que toca') || lower.includes('qué toca')) {
      return NextResponse.json({
        reply: '[NAV:schedule] Ahí tienes el horario del Aula 204 pa que veas qué toca y no entres con cara de sobado.',
      });
    }
    if (lower.includes('bolsa') || lower.includes('botellon') || lower.includes('botellón') || lower.includes('acciones') || lower.includes('invertir') || lower.includes('dinero')) {
      return NextResponse.json({
        reply: '[NAV:investments] Te llevo a la Bolsa de El Botellón. A ver si no te arruinas en dos minutos como un desgraciado.',
      });
    }
    if (lower.includes('tablon') || lower.includes('tablón') || lower.includes('chat') || lower.includes('mensajes') || lower.includes('avisos')) {
      return NextResponse.json({
        reply: '[NAV:chat] Venga, te abro el tablón en directo. No pongas gilipolleces que lo lee toda la clase.',
      });
    }
    if (lower.includes('ruleta') || lower.includes('juegos') || lower.includes('jugar') || lower.includes('pistola')) {
      return NextResponse.json({
        reply: '[NAV:games] Te meto a la Ruleta Rusa. A ver si tienes huevos de no volarte la cabeza a la primera.',
      });
    }
    if (lower.includes('quien creo') || lower.includes('quién creó') || lower.includes('quien hizo') || lower.includes('creadores') || lower.includes('desarrollador') || lower.includes('quien te programo')) {
      return NextResponse.json({
        reply: 'Toda esta web la programaron JuanFe Ospina y David, los putos amos de 2º SMR. Tú mientras rascándote la barriga.',
      });
    }
    if (lower.includes('salida') || lower.includes('lanzamiento') || lower.includes('cuando abre') || lower.includes('cuándo abre')) {
      return NextResponse.json({
        reply: 'La web abre oficialmente el 9 de noviembre de 2026 a las 08:35. No te empanes ese día.',
      });
    }
    if (lower.includes('quien eres') || lower.includes('quién eres') || lower.includes('como te llamas') || lower.includes('cómo te llamas')) {
      return NextResponse.json({
        reply: 'Soy PUTOISAAC, la bola naranja tonta con ojos de 2º SMR. Te ayudo en la web pa que no la cagues.',
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: 'No tengo conexión al cerebro central ahora mismo, pero usa los botones de abajo que esos sí que te van.',
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
            'X-Title': 'Portal 2º SMR - PutoIsaac Assistant',
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 120,
            temperature: 0.8,
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
      reply: 'Se me ha cruzado un cable en el servidor. Pregúntame otra tontería o dale a un botón.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { reply: 'Se me ha congelado el cerebro. Prueba luego, pedazo de vago.' },
      { status: 500 }
    );
  }
}
