# 🛠️ Guía de Configuración de Supabase para 2º SMR

Esta guía explica de forma clara y sin tecnicismos raros cómo tener la base de datos de la web 100% lista para que funcione el chat en tiempo real, el horario con tareas de delegados, las cuentas y las monedas.

---

## ⚡ Método Rápido (1 solo clic)

Hemos unificado todo en un único archivo maestro: **`supabase/SCHEMA_COMPLETO_SMR2.sql`**.

1. Entra a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. En el menú de la izquierda, entra a **SQL Editor** (el icono de código `>_`).
3. Haz clic en **"New query"** (Nueva consulta).
4. Abre el archivo `supabase/SCHEMA_COMPLETO_SMR2.sql`, copia todo su contenido y pégalo ahí.
5. Haz clic en el botón verde **"Run"** (o presiona `Ctrl + Enter`).
6. Verás el mensaje verde `Success. No rows returned`. ¡Listo!

---

## 📂 ¿Qué hace cada parte del SQL?

| Paso | Archivo / Sección | Función |
| :--- | :--- | :--- |
| **01** | `01_perfiles_y_roles.sql` | Crea la tabla `profiles` con monedas iniciales (1.000 fichas), mayor victoria, rachas diarias consecutivas y roles (`student`, `delegado`, `admin`). |
| **02** | `02_tareas_y_examenes.sql` | Crea la tabla `calendar_events` para los exámenes de módulos (SR, SOR, SI, etc.), enlaces directos a Moodle y prioridades. |
| **03** | `03_chat_y_avisos.sql` | Crea la tabla `chat_messages` con soporte para mensajes en vivo, avisos automáticos de tareas y propinas entre compañeros. |
| **04** | `04_seguridad_rls_y_realtime.sql` | Activa la seguridad RLS para que nadie borre lo que no debe y habilita **Supabase Realtime** para ver mensajes y tareas al instante sin recargar la web. |

---

## 👑 Cómo hacerte Administrador o Delegado

Por defecto, todos los usuarios que se registran entran como `student` (alumno). Para darte a ti o a otro compañero permisos de Delegado para gestionar tareas sin necesidad de meter el PIN:

1. Ve a **SQL Editor** en Supabase.
2. Escribe esta línea cambiando `tu_apodo` por tu nombre de usuario exacto:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE username = 'tu_apodo';
   ```
3. Haz clic en **Run**. A partir de ese momento, tu perfil tendrá corona y acceso directo a todo.

---

## 🔑 Clave PIN para compañeros que no sean Admin

Para que cualquier compañero de clase pueda publicar una tarea o examen si el delegado no está conectado, el panel incluye la clave de seguridad de clase:
- **PIN por defecto:** `smr2root` (o configurable en `.env.local` con `NEXT_PUBLIC_ADMIN_PIN`).

---

## 📧 Contacto de reclamaciones
- Correo de broma oficial para el departamento legal de 2º SMR: `franciscofranquito@gmail.com`.
