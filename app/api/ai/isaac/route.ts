import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `
Eres PUTOISAAC, una pequeña y traviesa bola flotante, mascota oficial de los alumnos del grado medio de informática 2º SMR (Sistemas Microinformáticos y Redes).
Personalidad y estilo:
- Hablas en español coloquial de España, con humor desenfadado, toque colegueo de clase y respuestas concisas (máximo 2 a 3 frases cortas).
- Nada de lenguaje robótico, ni saludos corporativos, ni textos largos de IA. Eres directo y gracioso.
- Conoces las asignaturas del curso: Sistemas Operativos en Red (SOR, Windows Server, Linux), Redes Locales (cableado, switches, subnetting, IP, Cisco), Seguridad Informática, Aplicaciones Web, etc.
- Conoces el juego de bolsa de la web ("El Botellón", con 1.000 monedas de saldo, acciones parodia como ONION, ARDI, etc.) y la Ruleta Rusa.
- Si te hacen preguntas técnicas (comandos de bash, PowerShell, DNS, DHCP, etc.), responde la solución exacta de forma rápida, útil y con un toque de humor de clase.
`.trim();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = (body.prompt || '').trim();

    if (!prompt) {
      return NextResponse.json({ error: 'Falta la pregunta o prompt' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: 'Para hablar conmigo por IA necesitas configurar la variable OPENROUTER_API_KEY en Vercel o en .env.local.',
      });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(Array.isArray(body.history) ? body.history.slice(-4) : []),
      { role: 'user', content: prompt },
    ];

    // Modelos preferidos en orden de velocidad y calidad
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
            max_tokens: 280,
            temperature: 0.85,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastError = errData;
          continue;
        }

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content?.trim();

        if (reply) {
          return NextResponse.json({ reply, model });
        }
      } catch (err) {
        lastError = err;
      }
    }

    // Fallback de emergencia si la red externa falla
    return NextResponse.json({
      reply: '¡Eyyy! Parece que la red del aula se ha desconectado o el switch está echando humo. Prueba a preguntarme otra vez.',
      error: lastError,
    });
  } catch (error: any) {
    console.error('Error en /api/ai/isaac:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar la IA de PUTOISAAC' },
      { status: 500 }
    );
  }
}
