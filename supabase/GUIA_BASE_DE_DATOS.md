# Estructura de Base de Datos — SMR2 Hub

Esta guía detalla la base de datos de Supabase para **SMR2**, diseñada específicamente para estudiantes (gestión de horario, tareas/exámenes, chat en vivo y economía virtual con apuestas y recompensas).

---

## 🗄️ Esquema de Tablas

### 1. `profiles` (Perfiles y Economía de Alumnos)
Guarda la información de cada compañero y su progreso en el hub.
* `id` (UUID, PK): ID único vinculado a la cuenta de autenticación.
* `username` (TEXT, UNIQUE): Apodo del estudiante (ej: `carlos_root`).
* `email` (TEXT): Correo electrónico para acceso dual.
* `coins` (BIGINT): Fichas virtuales para juegos y propinas en el chat.
* `biggest_win` (BIGINT): Mayor premio obtenido en Slingshot o Crash (para el ranking).
* `role` (TEXT): Rol del usuario (`student`, `delegado`, `admin`).
* `streak_count` (INTEGER): Días consecutivos entrando a la web (1 a 5).
* `last_claim_date` (TIMESTAMPTZ): Fecha y hora del último reclamo de recompensa diaria.
* `created_at` (TIMESTAMPTZ): Momento de registro.

---

### 2. `calendar_events` (Tareas, Exámenes y Entregas)
Almacena la agenda de la clase para que nadie se pierda una fecha límite.
* `id` (UUID, PK): Identificador único del evento.
* `title` (TEXT): Título de la tarea o examen (ej: *Examen BIND9 y DHCP*).
* `subject` (TEXT): Código del módulo oficial (`SR`, `SOR`, `SI`, `AW`, `MEP`, `IP2`, `PI`, `DIG`).
* `event_type` (TEXT): Tipo (`exam`, `homework`, `reminder`, `class`).
* `event_date` (DATE): Fecha de entrega o examen (`AAAA-MM-DD`).
* `start_time` (TIME): Hora de inicio (opcional).
* `description` (TEXT): Detalles e instrucciones de la práctica.
* `priority` (TEXT): Urgencia (`high`, `normal`, `low`).
* `delivery_url` (TEXT): Enlace directo al enunciado o entrega (Moodle, Classroom, GitHub).
* `is_completed` (BOOLEAN): Si la tarea ya ha sido finalizada.
* `created_by` (UUID): ID del estudiante o delegado que la creó.
* `created_by_name` (TEXT): Nombre legible de quien publicó el aviso.
* `created_at` (TIMESTAMPTZ): Fecha de creación.

---

### 3. `chat_messages` (Chat en Vivo y Avisos del Sistema)
Canal en tiempo real para cachondeo entre compañeros, propinas y avisos automáticos.
* `id` (UUID, PK): ID del mensaje.
* `user_id` (UUID): ID del alumno emisor.
* `username` (TEXT): Apodo que se muestra en pantalla.
* `text` (TEXT): Contenido del mensaje.
* `is_system_win` (BOOLEAN): Indica si es una notificación automática del sistema (ej: premio gordo o nueva tarea creada).
* `win_amount` (BIGINT): Cantidad de fichas involucrada.
* `multiplier` (NUMERIC): Multiplicador si proviene de un juego.
* `game` (TEXT): `'angry'` o `'crash'`.
* `created_at` (TIMESTAMPTZ): Fecha y hora de envío.

---

## 🚀 Cómo aplicar las migraciones en Supabase

En el panel de **Supabase** -> **SQL Editor** -> **New query**, copia y pega los archivos en este orden:

1. `supabase/migrations/01_perfiles_y_roles.sql`
2. `supabase/migrations/02_tareas_y_examenes.sql`
3. `supabase/migrations/03_chat_y_avisos.sql`
4. `supabase/migrations/04_seguridad_rls_y_realtime.sql`

> **Nota:** Todos los scripts usan `ADD COLUMN IF NOT EXISTS` y `CREATE IF NOT EXISTS`, por lo que **no borran datos existentes ni dan error si ya ejecutaste partes antes**.

---

## 👑 Cómo asignar el rol de Delegado o Admin a un compañero

En el SQL Editor de Supabase:
```sql
UPDATE public.profiles 
SET role = 'delegado' 
WHERE username = 'apodo_del_delegado';
```
Para otorgar acceso completo de Administrador:
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE username = 'tu_apodo';
```
