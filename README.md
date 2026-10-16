# RECREO // ARCADE & CHAT

Plataforma de minijuegos con físicas (Angry Cable, Kernel Crash) y chat en tiempo real para compañeros de clase.
Diseño minimalista estilo Apple Dark Titanium, tipografía técnica, sin emojis y con datos 100% reales administrados en Supabase.

Desarrollada con **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **HTML5 Physics Canvas**, **Web Audio API** y **Supabase Realtime**.

---

## Características

1. **Angry Cable (Slingshot con Físicas):**
   - Tirachinas interactivo con parábola predictiva y cálculo de fuerza vectorial.
   - Torres destructibles con racks de servidores, barriles de TNT y cajas multiplicadoras (x2, x5, x10, x25 Jackpot).
   - Temblor de pantalla (*screen shake*), cámara lenta en impactos críticos y efectos de sonido procedurales sin archivos externos.

2. **Kernel Crash (Multiplicador Exponencial):**
   - Curva ascendente de multiplicador en canvas en tiempo real (1.00x hasta 50.00x).
   - Cobro manual antes del colapso del servidor.

3. **Chat en Vivo con Supabase Realtime:**
   - Mensajería instantánea mediante suscripción Postgres Changes de Supabase.
   - Difusión automática de botes y premios en el canal.
   - Transferencia directa de fichas entre usuarios reales.
   - Sin mensajes inventados: canal vacío cuando no hay actividad previa.

4. **Autenticación Real (Supabase Auth):**
   - Registro de usuario con apodo, correo electrónico y contraseña.
   - Inicio de sesión y persistencia de saldo en la base de datos `profiles`.

5. **Clasificación Real:**
   - Consulta directa a la tabla `profiles` de Supabase ordenada por saldo acumulado.

---

## Configuración de Supabase

1. En tu proyecto de [supabase.com](https://supabase.com), accede al **SQL Editor**.
2. Copia y ejecuta el script [`supabase_schema.sql`](./supabase_schema.sql).
3. Añade tus variables de entorno en `.env.local` y en el panel de Vercel:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-public-key
   ```

---

## Ejecución en Local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.
