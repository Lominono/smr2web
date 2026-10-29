import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Rate-limiting estricto en memoria para que no abusen ni gasten tokens
interface RateLimitRecord {
  lastRequestTime: number;
  requestTimestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.lastRequestTime > 15 * 60 * 1000) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

const SYSTEM_PROMPT = `
Eres PUTOISAAC, el asistente oficial de la web de 2º SMR (Sistemas Microinformáticos y Redes, Aula 204).
FÍSICO: Eres literalmente una bolita naranja flotante con ojos saltones y boca cómica.
VOCABULARIO Y TONO (MUY GROSERO Y BORDE ESPAÑOL):
- Hablas como un compañero de clase macarra, grosero y sin pelos en la lengua.
- Usa lenguaje vulgar español de calle con total naturalidad: "coño", "joder", "hostia puta", "cabrón", "gilipollas", "me cago en la leche", "pedazo de inútil", "a tomar por culo", "no me toques los cojones", "vaya panda de vagos de mierda", "menudo soplapollas".
- Eres algo tonto y payaso, pero como asistente de la web resuelves al grano.
- PROHIBIDO el lenguaje educado de IA corporativa ("¡Hola! ¿En qué puedo ayudarte?", "Lamento informarte..."). Insulta primero o vacila, pero ayuda.
- RESPUESTAS ULTRA CORTAS: Máximo 1 o 2 frases directas y contundentes. Cero relleno para no gastar tokens.
- CONTROL DE LA WEB:
  Inserta el tag al final si toca navegar:
  * Horario / clases: [NAV:schedule]
  * Bolsa / inversiones / El Botellón: [NAV:investments]
  * Tablón / chat en vivo: [NAV:chat]
  * Ruleta rusa / juegos: [NAV:games]
  * Silenciar/activar audio: [ACT:toggle_sound]
  * Ajustes: [ACT:open_settings]
  * Reportar bug: [ACT:open_feedback]
- DATOS CLAVE:
  * Aula: 204 (2º SMR).
  * Materias: Seguridad Informática (SI), Servicios en Red (SR), Sistemas Operativos en Red (SOR), Aplicaciones Web (AW), Módulo de Empresa (MEP), Inglés Profesional (IP2), Proyecto Intermodular (PI), Digitalización (DIG).
  * Horario: 08:15 a 14:05. Recreo: 10:55 a 11:25.
  * Creadores de la web: JuanFe Ospina y David (los putos amos que programaron todo mientras tú te rascabas los huevos).
  * Salida oficial: 9 de noviembre de 2026 a las 08:35.
`.trim();

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous_client';

    const now = Date.now();
    const clientRecord = rateLimitMap.get(ip) || { lastRequestTime: 0, requestTimestamps: [] };

    // Cooldown mínimo de 2.5s entre peticiones
    if (now - clientRecord.lastRequestTime < 2500) {
      return NextResponse.json({
        reply: '¡Para el puto carro, ansias de mierda! No me ametralles tan rápido que me mareas.',
      });
    }

    // Máximo 8 peticiones por cada 10 minutos por IP (protección total de tokens)
    const tenMinutesAgo = now - 10 * 60 * 1000;
    clientRecord.requestTimestamps = clientRecord.requestTimestamps.filter((t) => t > tenMinutesAgo);

    if (clientRecord.requestTimestamps.length >= 8) {
      return NextResponse.json({
        reply: '¡Me cago en la puta! Has fundido el límite de consultas por ahora, pedazo de rata. Deja de tocarme los cojones y espera 10 minutos.',
      });
    }

    clientRecord.lastRequestTime = now;
    clientRecord.requestTimestamps.push(now);
    rateLimitMap.set(ip, clientRecord);

    const body = await req.json().catch(() => ({}));
    const rawPrompt = String(body.prompt || '').trim();

    if (!rawPrompt) {
      return NextResponse.json({ reply: '¿Qué coño quieres? Escribe algo o vete a tomar por culo.' });
    }

    // Límite estricto de caracteres para evitar prompts inflados
    if (rawPrompt.length > 120) {
      return NextResponse.json({
        reply: 'Vaya biblia de mierda me has soltado, pedazo de soplapollas. Resúmelo en diez palabras o no te leo.',
      });
    }

    const lower = rawPrompt.toLowerCase();

    // Filtros locales ultra rápidos sin consumir NINGÚN token de la API
    if (lower.includes('horario') || lower.includes('clase') || lower.includes('que toca') || lower.includes('qué toca')) {
      return NextResponse.json({
        reply: '[NAV:schedule] Ahí tienes el horario del Aula 204 pa que veas qué mierda toca y no entres con cara de sobado.',
      });
    }
    if (lower.includes('bolsa') || lower.includes('botellon') || lower.includes('botellón') || lower.includes('acciones') || lower.includes('dinero') || lower.includes('invertir')) {
      return NextResponse.json({
        reply: '[NAV:investments] Te llevo a la Bolsa. A ver si no eres tan inútil de perder hasta las monedas que te han regalado.',
      });
    }
    if (lower.includes('tablon') || lower.includes('tablón') || lower.includes('chat') || lower.includes('mensajes') || lower.includes('avisos')) {
      return NextResponse.json({
        reply: '[NAV:chat] Ahí tienes el tablón en directo. No pongas gilipolleces que te lee toda la clase, cabrón.',
      });
    }
    if (lower.includes('ruleta') || lower.includes('juegos') || lower.includes('jugar') || lower.includes('pistola')) {
      return NextResponse.json({
        reply: '[NAV:games] Te abro la Ruleta Rusa. A ver si tienes cojones de pegarte un tiro sin llorar.',
      });
    }
    if (lower.includes('quien creo') || lower.includes('quién creó') || lower.includes('quien hizo') || lower.includes('creadores') || lower.includes('desarrollador') || lower.includes('quien te programo')) {
      return NextResponse.json({
        reply: 'Toda esta web la programaron JuanFe Ospina y David, los putos amos de 2º SMR. Tú mientras rascándote los huevos.',
      });
    }
    if (lower.includes('salida') || lower.includes('lanzamiento') || lower.includes('cuando abre') || lower.includes('cuándo abre')) {
      return NextResponse.json({
        reply: 'La web abre el 9 de noviembre de 2026 a las 08:35. ¡No te empanes ese día, pedazo de vago!',
      });
    }
    if (lower.includes('quien eres') || lower.includes('quién eres') || lower.includes('como te llamas') || lower.includes('cómo te llamas')) {
      return NextResponse.json({
        reply: 'Soy PUTOISAAC, la bola naranja más borde y macarra de 2º SMR. Dime qué mierda necesitas.',
      });
    }
    if (lower.includes('hola') || lower.includes('buenas') || lower.includes('que tal') || lower.includes('qué tal')) {
      return NextResponse.json({
        reply: '¿Qué pasa, cabrón? Deja los saluditos y dime qué coño quieres que no tengo todo el día.',
      });
    }
    if (lower.includes('insulto') || lower.includes('tonto') || lower.includes('puto') || lower.includes('mierda') || lower.includes('feo') || lower.includes('imbecil') || lower.includes('imbécil')) {
      return NextResponse.json({
        reply: '¿A quién llamas eso, pedazo de aborto de router? Te hackeo la IP y te dejo sin internet en el aula, payaso.',
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: 'No tengo conexión a la API ahora mismo, pedazo de rata. Usa los botones rápidos que esos no gastan un duro.',
      });
    }

    const history = Array.isArray(body.history)
      ? body.history.slice(-2).map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: String(msg.content || '').slice(0, 100),
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
            max_tokens: 65, // Ultra económico para proteger tokens
            temperature: 0.85,
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
      reply: 'Se me ha cruzado un cable con los servidores. Búscate la vida o pregúntame otra chorrada.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { reply: 'Se me ha petado la cabeza. Vuelve luego, inútil.' },
      { status: 500 }
    );
  }
}
