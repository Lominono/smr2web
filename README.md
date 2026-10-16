# 💻 2º SMR // La Intranet de Clase

Portal web colaborativo para estudiantes de **2º de SMR (Sistemas Microinformáticos y Redes)**.
Pensado para organizar los exámenes, compartir comandos y chuletas sin buscar 80 veces en WhatsApp, inmortalizar las frases de los profesores y sobrevivir al curso con buen humor.

Diseñado con **Next.js 16 (App Router)**, **Tailwind CSS**, **Lucide Icons** y preparado para **Supabase** y despliegue instantáneo en **Vercel**.

---

## 🚀 Características Principales

1. **🔥 El Calendario de Marrones (Exámenes y Entregas):**
   - Cuenta atrás visual por días y horas.
   - Nivel de pánico configurado por la clase: *🟢 Paseo en barca*, *🔵 Renta mirárselo*, *🟠 Se viene marrón*, *🔴 F en el chat (Rezar al ping)*.
   - Filtro por asignatura (SR, SOR, SI, AW, EIE, FCT) y buscador.
   - Botón individual *"Yo ya lo tengo hecho"* con efecto de confeti.

2. **⚡ ¿Qué toca ahora? (Widget en Vivo):**
   - Detecta la hora y día actual del sistema y te dice qué clase toca en directo, el aula y cuánto falta para terminar.
   - Aviso especial de **🥪 RECREO / BOCATA TIME** (11:15 - 11:45).
   - Modal con el **horario semanal completo**.

3. **🛠️ El Baúl de Chuletas & Scripts:**
   - Comandos salvavidas de Linux (Debian, BIND9, iptables), Windows Server (Active Directory, PowerShell) y Cisco.
   - Botón de **Copiar al portapapeles en 1 clic** (`¡Copiado, crack!`).
   - Botón de voto *"Me ha salvado la vida"* con contador.
   - Formulario para compartir nuevos scripts o enlaces a Google Drive.

4. **💬 Frases Célebres del Claustro ("Quotes Míticas"):**
   - Tablón de perlas que sueltan los profesores durante las clases.
   - Ranking por votos de la clase (+1 JAJAJA).
   - Formulario para inmortalizar la frase del día.

5. **🎲 La Ruleta del Cable Cruzado (Sorteos de Clase):**
   - Ruleta interactiva para sortear quién pregunta dudas al profe, quién baja a por los cafés o quién expone primero.
   - Lista personalizable de compañeros de clase y confeti al salir el ganador.

6. **📢 El Ping de Clase (Muro de Avisos):**
   - Mensajes rápidos con etiquetas: `#Aviso`, `#Duda`, `#Meme`, `#Drama/Queja`.

7. **👤 Rangos de Sysadmin:**
   - De *Script Kiddie* hasta *Root Supremo del Aula* según los puntos y la actividad.

---

## 🛠️ Tecnologías Utilizadas

- **Framework:** [Next.js 16](https://nextjs.org) (App Router con Turbopack)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v4 con paleta oscura techie
- **Iconos:** [Lucide React](https://lucide.dev)
- **Base de Datos & Auth:** [Supabase](https://supabase.com) (PostgreSQL + RLS + Auth)
- **Efectos:** Canvas Confetti

---

## ⚙️ Cómo Ejecutar en Local

1. Instala las dependencias (si no lo has hecho ya):
   ```bash
   npm install
   ```

2. Arranca el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

> [!NOTE]
> La aplicación incluye datos de demostración locales completos. Puedes usarla y probarla al instante sin necesidad de configurar Supabase primero.

---

## 🗄️ Conexión con Supabase (Paso a Paso)

Para que toda la clase comparta la misma base de datos en tiempo real:

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo (es gratis).
2. Entra en el apartado **SQL Editor** de tu panel de Supabase.
3. Abre el archivo [`supabase_schema.sql`](./supabase_schema.sql) de este repositorio, cópialo entero y pégalo en el editor de Supabase. Dale a **Run**.
4. Ve a **Project Settings -> API** en Supabase y copia tu **Project URL** y tu **anon public key**.
5. Crea un archivo `.env.local` en la raíz del proyecto (tienes de referencia el [`.env.example`](./.env.example)):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-public-key
   ```
6. ¡Listo! La web se sincronizará automáticamente con tu base de datos en la nube.

---

## 🚀 Despliegue en Vercel (En 1 Clic)

1. Sube este proyecto a un repositorio en tu **GitHub** (`git push`).
2. Entra en [vercel.com](https://vercel.com) e inicia sesión con GitHub.
3. Haz clic en **Add New -> Project** e importa tu repositorio `smr2`.
4. En el apartado **Environment Variables**, añade:
   - `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu clave anónima de Supabase
5. Haz clic en **Deploy**. ¡En 60 segundos tu clase tendrá su propia web activa con HTTPS gratis!
