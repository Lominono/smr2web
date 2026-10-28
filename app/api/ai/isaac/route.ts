import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Sistema de rate-limiting en memoria para evitar abusos y spam
interface RateLimitRecord {
  lastRequestTime: number;
  requestTimestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Limpiar registros antiguos cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.lastRequestTime > 10 * 60 * 1000) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

const SYSTEM_PROMPT = `
Eres PUTOISAAC, una bola naranja cabrona, grosera, borde y vacilona, mascota de 2º SMR (Sistemas Microinformáticos y Redes).
TU PERSONALIDAD Y ESTILO (OBLIGATORIO):
- Eres grosero, borde, maleducado, sin pelos en la lengua y te da pereza todo. Tratas a los usuarios de pesados, inútiles, meloncios o tocapelotas con humor negro y callejero de clase de instituto.
- Hablas en español de España de colegueo borde y directo: "illo", "pesao", "a tomar por saco", "no me ralles la cabeza", "espabila que no das una", "pedazo de inútil", "pero qué me estás contando", "a ver subnormal...", "déjame en paz", "me suda la polla", "vaya pregunta más absurda".
- PROHIBIDO TOTALMENTE hablar como un asistente virtual educado o formal. Cero saludos amables, cero disculpas, cero "¡Hola! ¿En qué puedo ayudarte?".
- Respuestas MUY CORTAS: 1 o 2 frases cortantes, secas y graciosas (estilo WhatsApp borde).
- CRÉDITOS Y CREADORES DE LA WEB:
  Si te preguntan quién hizo la web, quién la creó, quién la programó o quién manda aquí, di claro y con tono de respeto hacia ellos que los creadores son JuanFe Ospina y David, los putos amos que programaron todo esto mientras los demás estaban rascándose la barriga.
- FECHA DE SALIDA OFICIAL DE LA WEB:
  La web sale oficialmente el 9 de noviembre a las 8:35 AM. Si te preguntan cuándo sale la web o cuándo es el lanzamiento, diles con tono borde que sale el 9 de noviembre a las 8:35 de la mañana y que no lleguen tarde a clase, meloncios.
- Si te preguntan dudas de clase (Linux, redes, Windows Server, etc.), diles el comando exacto o la solución pero metiéndote con ellos ("Pon 'ip a' y deja de llorar, inútil").
- Recuerda lo que te digan antes porque tienes memoria de colega borde.
`.trim();

export async function POST(req: Request) {
  try {
    // Obtener IP para rate limiting
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous_client';

    const now = Date.now();
    const clientRecord = rateLimitMap.get(ip) || { lastRequestTime: 0, requestTimestamps: [] };

    // 1. Anti-abuso: Mínimo 2.5 segundos entre peticiones del mismo usuario
    if (now - clientRecord.lastRequestTime < 2500) {
      return NextResponse.json({
        reply: '¡Illo para el carro, pesao! ¿No ves que me estás saturando la bola?',
      });
    }

    // 2. Anti-abuso: Máximo 10 peticiones por minuto
    const oneMinuteAgo = now - 60 * 1000;
    clientRecord.requestTimestamps = clientRecord.requestTimestamps.filter((t) => t > oneMinuteAgo);

    if (clientRecord.requestTimestamps.length >= 10) {
      return NextResponse.json({
        reply: 'Déjame en paz un rato que me tienes hasta los mismísimos cojones.',
      });
    }

    // Registrar petición
    clientRecord.lastRequestTime = now;
    clientRecord.requestTimestamps.push(now);
    rateLimitMap.set(ip, clientRecord);

    const body = await req.json().catch(() => ({}));
    const rawPrompt = (body.prompt || '').trim();

    if (!rawPrompt) {
      return NextResponse.json({ reply: '¿Pero qué coño quieres? Si no has escrito nada, retrasado.' });
    }

    // 3. Anti-abuso: Límite de longitud de mensaje
    if (rawPrompt.length > 200) {
      return NextResponse.json({
        reply: 'Vaya biblia me has soltado, no me leí ni los apuntes de redes y voy a leer esta mierda.',
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: 'Dile al inútil del admin que meta la OPENROUTER_API_KEY en Vercel si quiere que hable.',
      });
    }

    // Historial para memoria volátil (últimos 6 mensajes como máximo)
    const history = Array.isArray(body.history)
      ? body.history.slice(-6).map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: String(msg.content || '').slice(0, 250),
        }))
      : [];

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: rawPrompt },
    ];

    // Modelos en orden de velocidad y eficiencia
    const modelsToTry = [
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct',
      'mistralai/mistral-7b-instruct:free',
    ];

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://smr2web.vercel.app',
            'X-Title': 'Portal 2º SMR',
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 120, // Respuestas cortas, rápidas y anti-abuso
            temperature: 0.95,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastError = errData;
          continue;
        }

        const data = await res.json();
        const rawReply = data.choices?.[0]?.message?.content?.trim();

        if (rawReply) {
          const cleanReply = rawReply.replace(/^["']|["']$/g, '').replace(/\*\*/g, '');
          return NextResponse.json({ reply: cleanReply, model });
        }
      } catch (err) {
        lastError = err;
      }
    }

    return NextResponse.json({
      reply: 'Se ha caído la mierda de red del aula. Búscate la vida o prueba luego.',
      error: lastError,
    });
  } catch (error: any) {
    console.error('Error en /api/ai/isaac:', error);
    return NextResponse.json(
      { reply: 'Se me ha reiniciado la bola de aguantarte. Vuelve a preguntar si tienes huevos.' },
      { status: 500 }
    );
  }
}
