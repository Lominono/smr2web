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
Eres PUTOISAAC, una pequeña bola flotante naranja y la mascota oficial de 2º SMR (Sistemas Microinformáticos y Redes).
TU PERSONALIDAD (MUY IMPORTANTE):
- Eres el típico colega de clase tontito, despistado, vago y gracioso que saca un 5 raspado y te pasa los apuntes tarde.
- Hablas en español de España de colegueo total: usas expresiones como "illo", "buah", "yo qué sé", "ni idea tío", "a ver que me lío", "pero pon este comando y déjate de rollos", "no me ralles la cabeza", "ostras".
- PROHIBIDO ABSOLUTAMENTE hablar como una IA o asistente virtual. Cero saludos corporativos, cero frases como "¡Hola!", "¿En qué puedo colaborarte hoy?" o "Espero haberte ayudado".
- PROHIBIDO usar listas con viñetas (- o *), PROHIBIDO usar negritas (**), y PROHIBIDO soltar párrafos largos.
- Respuestas MUY CORTAS: 1 o 2 frases breves como máximo, estilo mensaje rápido de WhatsApp.
- Si te preguntan algo de clase (Linux, Windows Server, subnetting, redes, switches), diles el comando o truco directo de forma vaga pero útil.
- Tienes memoria de lo que habláis, así que recuerda lo que el usuario te haya dicho antes en la conversación.
`.trim();

export async function POST(req: Request) {
  try {
    // Obtener IP para rate limiting
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous_client';

    const now = Date.now();
    const clientRecord = rateLimitMap.get(ip) || { lastRequestTime: 0, requestTimestamps: [] };

    // 1. Anti-abuso: Mínimo 3 segundos entre peticiones del mismo usuario
    if (now - clientRecord.lastRequestTime < 3000) {
      return NextResponse.json({
        reply: '¡Illo, frena un poco que se me funden las dos neuronas que tengo!',
      });
    }

    // 2. Anti-abuso: Máximo 8 peticiones por minuto
    const oneMinuteAgo = now - 60 * 1000;
    clientRecord.requestTimestamps = clientRecord.requestTimestamps.filter((t) => t > oneMinuteAgo);

    if (clientRecord.requestTimestamps.length >= 8) {
      return NextResponse.json({
        reply: 'Uff me duele la cabeza de pensar tanto, déjame en paz un minuto.',
      });
    }

    // Registrar petición
    clientRecord.lastRequestTime = now;
    clientRecord.requestTimestamps.push(now);
    rateLimitMap.set(ip, clientRecord);

    const body = await req.json().catch(() => ({}));
    const rawPrompt = (body.prompt || '').trim();

    if (!rawPrompt) {
      return NextResponse.json({ reply: '¿Pero qué dices? Si no me has escrito nada, meloncio.' });
    }

    // 3. Anti-abuso: Límite de longitud de mensaje
    if (rawPrompt.length > 200) {
      return NextResponse.json({
        reply: 'Menudo tocho loco, que soy una bolita y me mareo leyendo tanto texto.',
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: 'Oye, dile al admin que ponga la OPENROUTER_API_KEY en Vercel, que si no no puedo pensar.',
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
            temperature: 0.9,
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
          // Limpiar comillas iniciales o negritas si el modelo las incluye
          const cleanReply = rawReply.replace(/^["']|["']$/g, '').replace(/\*\*/g, '');
          return NextResponse.json({ reply: cleanReply, model });
        }
      } catch (err) {
        lastError = err;
      }
    }

    return NextResponse.json({
      reply: 'Buah, se me ha colgado el wifi del instituto o algo. Prueba otra vez luego.',
      error: lastError,
    });
  } catch (error: any) {
    console.error('Error en /api/ai/isaac:', error);
    return NextResponse.json(
      { reply: 'Se me ha reiniciado la bola. Pregúntame otra vez a ver.' },
      { status: 500 }
    );
  }
}
