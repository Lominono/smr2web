-- ==============================================================
-- SCHEMA SUPABASE: RECREO // ARCADE, CHAT Y HORARIO SMR2
-- ==============================================================

-- ==============================================================
-- INSTRUCCIONES DE ACTUALIZACIÓN (SEGURO, IDEMPOTENTE Y SIN ERRORES):
-- Copia y pega este bloque en el SQL Editor de tu panel de Supabase:
--
-- 1. Añadir columnas de likes y etiquetas al feed de mensajes si no existen:
-- ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;
-- ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS tag TEXT;
--
-- 2. Permitir actualizar likes en el feed (RLS UPDATE policy):
-- DROP POLICY IF EXISTS "Actualizar likes de chat" ON public.chat_messages;
-- CREATE POLICY "Actualizar likes de chat" ON public.chat_messages FOR UPDATE USING (true);
--
-- 3. Crear tabla de actualizaciones del sistema en tiempo real si no existe:
-- CREATE TABLE IF NOT EXISTS public.app_updates (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   version TEXT NOT NULL,
--   title TEXT NOT NULL,
--   description TEXT,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
-- );
--
-- 4. Habilitar RLS y políticas para app_updates:
-- ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Lectura pública de actualizaciones" ON public.app_updates;
-- DROP POLICY IF EXISTS "Creación de actualizaciones" ON public.app_updates;
-- CREATE POLICY "Lectura pública de actualizaciones" ON public.app_updates FOR SELECT USING (true);
-- CREATE POLICY "Creación de actualizaciones" ON public.app_updates FOR INSERT WITH CHECK (true);
--
-- 5. Habilitar Replicación en Tiempo Real completa (Full Replica Identity):
-- ALTER TABLE public.profiles REPLICA IDENTITY FULL;
-- ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
-- ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
-- ALTER TABLE public.app_updates REPLICA IDENTITY FULL;
--
-- 6. Añadir tablas a la publicación de Supabase Realtime (con verificación previa para evitar error 42710):
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
--     ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
--   END IF;
--   IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'calendar_events') THEN
--     ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
--   END IF;
--   IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
--     ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
--   END IF;
--   IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_updates') THEN
--     ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates;
--   END IF;
-- END $$;
-- ==============================================================

-- 1. TABLA DE PERFILES REALES DE USUARIOS (Vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  student_number TEXT UNIQUE,
  email TEXT,
  role TEXT DEFAULT 'student',
  avatar_color TEXT DEFAULT 'emerald',
  coins BIGINT DEFAULT 1000 NOT NULL,
  biggest_win BIGINT DEFAULT 0 NOT NULL,
  streak_count INT DEFAULT 1,
  last_claim_date DATE,
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para crear perfil automáticamente al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, coins, biggest_win)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    1000,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TABLA DE MENSAJES DE CHAT REALES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  is_system_win BOOLEAN DEFAULT false,
  win_amount BIGINT,
  multiplier NUMERIC(8, 2),
  game TEXT,
  likes_count INT DEFAULT 0,
  tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA DE CALENDARIO Y AGENDA SMR2 (Exámenes, Entregas y Recordatorios)
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL, -- 'SR', 'SOR', 'SI', 'AW', 'MEP', 'IP2', 'PI', 'DIG'
  event_type TEXT DEFAULT 'exam' NOT NULL, -- 'exam', 'homework', 'reminder', 'class'
  event_date DATE NOT NULL,
  start_time TIME,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA DE ACTUALIZACIONES Y AVISOS DEL SISTEMA EN TIEMPO REAL
CREATE TABLE IF NOT EXISTS public.app_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. POLÍTICAS RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Creación de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar saldo de usuario" ON public.profiles;

DROP POLICY IF EXISTS "Lectura pública de chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Creación de mensajes" ON public.chat_messages;
DROP POLICY IF EXISTS "Actualizar likes de chat" ON public.chat_messages;

DROP POLICY IF EXISTS "Lectura pública de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Creación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Modificación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Borrado de eventos" ON public.calendar_events;

DROP POLICY IF EXISTS "Lectura pública de actualizaciones" ON public.app_updates;
DROP POLICY IF EXISTS "Creación de actualizaciones" ON public.app_updates;

-- Creación de políticas
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Creación de perfiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizar saldo de usuario" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Lectura pública de chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Creación de mensajes" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizar likes de chat" ON public.chat_messages FOR UPDATE USING (true);

CREATE POLICY "Lectura pública de eventos" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Creación de eventos" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Modificación de eventos" ON public.calendar_events FOR UPDATE USING (true);
CREATE POLICY "Borrado de eventos" ON public.calendar_events FOR DELETE USING (true);

CREATE POLICY "Lectura pública de actualizaciones" ON public.app_updates FOR SELECT USING (true);
CREATE POLICY "Creación de actualizaciones" ON public.app_updates FOR INSERT WITH CHECK (true);

-- 6. REPLICA IDENTITY (Para asegurar que los payloads de realtime incluyan todos los campos)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.app_updates REPLICA IDENTITY FULL;

-- 7. HABILITAR PUBLICACIÓN SUPABASE REALTIME (con verificación para evitar error 42710)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'calendar_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_updates') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates;
  END IF;
END $$;
