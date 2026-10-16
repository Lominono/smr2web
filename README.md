# 🎮 RECREO // Casino & Chat de Clase

Plataforma social y minijuegos dopamínicos para amigos de clase.
Sin deberes ni listas de tareas: solo chat en directo, apuestas de fichas virtuales, piques sanos y juegos adictivos diseñados con estética **Apple Dark Titanium** (ultra limpia, minimalista y cero estilo IA).

Desarrollada con **Next.js 16 (App Router)**, **Tailwind CSS**, **HTML5 Physics Canvas**, **Web Audio API** (efectos de sonido procedurales sin archivos externos) y preparada para **Supabase** y **Vercel**.

---

## ⚡ Minijuegos y Funcionalidades

1. **🏹 Angry Cable (Slingshot Dopamínico):**
   - Tirachinas físico en HTML5 Canvas con arrastre, cálculo de vector de fuerza y puntos de trayectoria parabólica.
   - Torre de racks de servidores y cajas destructibles con físicas de impacto, rebote, gravedad y fricción.
   - **Cajas Multiplicadoras:** `x2`, `x5`, `x10` y **Jackpot Dorado `x25`**.
   - **Barriles de TNT:** Explosiones en cadena que mandan los bloques por los aires.
   - **Efectos Dopamínicos:** Temblor de pantalla (*screen shake*), cámara lenta (*slow-mo*) en impactos críticos, explosión de partículas de colores y confeti.
   - Botón directo para fardar en el chat de clase al sacar un bote gordo.

2. **📈 Kernel Crash (El Servidor va a Petar):**
   - El clásico juego de multiplicador en curva ascendente (`1.00x` hasta `50.00x`).
   - Tensión creciente con sonido acelerado a medida que el multiplicador se dispara.
   - Cobra a tiempo antes de que el servidor sufra un *Kernel Panic* y colapse.

3. **💬 El Chat del Fondo (Classroom Chat):**
   - Chat en tiempo real con estética Apple Messages.
   - Avisos automáticos destacados en dorado cuando algún compañero gana un gran premio.
   - Sistema de propinas: pasa fichas a cualquier colega en 1 clic.
   - Reacciones rápidas con emojis sonoros.

4. **🪙 Economía de Clase & La Beca del Recreo:**
   - Monedas virtuales del aula para apostar sin dinero real.
   - Si te arruinas, pulsa en **Beca** para recargar 500 🪙 fijas o arriesgarte en la ruleta de la suerte (hasta 2.000 🪙).

5. **🏆 Clasificación ("Los Millonarios del Aula"):**
   - Podio de honor con los que más monedas tienen acumuladas y sus rangos (*Banquero del Recreo*, *Lobo de Wall Street*, etc.).

---

## 🛠️ Cómo Ejecutar en Local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🗄️ Conexión con Supabase & Despliegue en Vercel

1. **Supabase:**
   - En tu proyecto de Supabase, abre el **SQL Editor**.
   - Pega el contenido de [`supabase_schema.sql`](./supabase_schema.sql) y dale a **Run**.
2. **Vercel:**
   - Sube este proyecto a tu GitHub (`git push`).
   - Importa el repositorio en Vercel.
   - Agrega tus variables de entorno:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Pulsa **Deploy** y pásale el link a tus amigos de clase.
