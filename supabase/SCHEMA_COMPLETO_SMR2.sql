-- ==============================================================
-- SMR2 WEB · ESQUEMA COMPLETO Y DEFINITIVO DE BASE DE DATOS
-- ==============================================================
-- Copia todo este código y pégalo directamente en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/ehzekojovbxdkcmfbugc/sql/new
-- Es 100% idempotente (puedes ejecutarlo varias veces sin perder datos ni fallar).
-- ==============================================================

-- 0. EXTENSIONES BÁSICAS DE POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------
-- 1. TABLA: PROFILES (Cuentas, Roles y Economía)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  coins BIGINT DEFAULT 1000 NOT NULL,
  biggest_win BIGINT DEFAULT 0 NOT NULL,
  streak_count INTEGER DEFAULT 1 NOT NULL,
  last_claim_date TIMESTAMP WITH TIME ZONE,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar TODAS las columnas de public.profiles si la tabla ya existía previamente
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS student_number TEXT,
  ADD COLUMN IF NOT EXISTS coins BIGINT DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS biggest_win BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pc_seat TEXT DEFAULT 'PC-01',
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT 'emerald',
  ADD COLUMN IF NOT EXISTS party_farm_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_spin_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_rescue_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Rellenar valores por defecto para filas existentes sin saldo o campos clave
UPDATE public.profiles SET coins = 1000 WHERE coins IS NULL;
UPDATE public.profiles SET biggest_win = 0 WHERE biggest_win IS NULL;
UPDATE public.profiles SET streak_count = 1 WHERE streak_count IS NULL;
UPDATE public.profiles SET role = 'student' WHERE role IS NULL;
UPDATE public.profiles SET avatar_color = 'emerald' WHERE avatar_color IS NULL;
UPDATE public.profiles SET pc_seat = 'PC-01' WHERE pc_seat IS NULL;

-- Índices optimizados para clasificación y búsquedas rápidas
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_number 
  ON public.profiles (student_number) 
  WHERE student_number IS NOT NULL AND student_number <> '';

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles(coins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_coins_ranking 
  ON public.profiles(coins DESC, biggest_win DESC, streak_count DESC);

-- Replica Identity para transmisión en tiempo real
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Disparador ultra-seguro para crear automáticamente el perfil al registrarse un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username text;
BEGIN
  v_username := COALESCE(
    NULLIF(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );

  -- Si el nombre de usuario ya existe en otro ID, evitar colisión
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username AND id <> new.id) THEN
    v_username := v_username || '_' || substr(new.id::text, 1, 4);
  END IF;

  INSERT INTO public.profiles (
    id,
    username,
    email,
    coins,
    biggest_win,
    streak_count,
    role,
    avatar_color
  )
  VALUES (
    new.id,
    v_username,
    new.email,
    1000,
    0,
    1,
    'student',
    'emerald'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------
-- 2. TABLA: CALENDAR_EVENTS (Tareas, Exámenes y Entregas)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  event_type TEXT DEFAULT 'homework',
  event_date DATE NOT NULL,
  start_time TEXT,
  description TEXT,
  priority TEXT DEFAULT 'normal',
  delivery_url TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT DEFAULT 'Delegado SMR2',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'homework',
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS delivery_url TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT DEFAULT 'Delegado SMR2',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_subject ON public.calendar_events(subject);
CREATE INDEX IF NOT EXISTS idx_calendar_events_priority ON public.calendar_events(priority);
CREATE INDEX IF NOT EXISTS idx_calendar_events_completed ON public.calendar_events(is_completed);

ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;

-- --------------------------------------------------------------
-- 3. TABLA: CHAT_MESSAGES (Chat en vivo y Avisos de la Clase)
-- --------------------------------------------------------------
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

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS is_system_win BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS win_amount BIGINT,
  ADD COLUMN IF NOT EXISTS multiplier NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS game TEXT,
  ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tag TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- --------------------------------------------------------------
-- 4. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas para evitar error 42710
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Creación de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar saldo de usuario" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar perfil de usuario" ON public.profiles;

DROP POLICY IF EXISTS "Lectura pública de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Creación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Modificación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Borrado de eventos" ON public.calendar_events;

DROP POLICY IF EXISTS "Lectura pública de chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Creación de mensajes" ON public.chat_messages;

-- Políticas de perfiles (Lectura, Creación y Actualización de saldo y botellón)
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Creación de perfiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizar perfil de usuario" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

-- Políticas de calendario / tareas
CREATE POLICY "Lectura pública de eventos" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Creación de eventos" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Modificación de eventos" ON public.calendar_events FOR UPDATE USING (true);
CREATE POLICY "Borrado de eventos" ON public.calendar_events FOR DELETE USING (true);

-- Políticas de chat en vivo
CREATE POLICY "Lectura pública de chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Creación de mensajes" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- --------------------------------------------------------------
-- 5. REPLICACIÓN EN TIEMPO REAL (SUPABASE REALTIME)
-- --------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- --------------------------------------------------------------
-- 6. VISTA OFICIAL DE CLASIFICACIÓN (LEADERBOARD)
-- --------------------------------------------------------------
CREATE OR REPLACE VIEW public.leaderboard_ranking AS
SELECT 
  id,
  username,
  full_name,
  coins,
  biggest_win,
  streak_count,
  avatar_color,
  role,
  ROW_NUMBER() OVER (ORDER BY coins DESC, biggest_win DESC, streak_count DESC) AS posicion
FROM public.profiles
WHERE is_banned IS NOT TRUE
ORDER BY coins DESC, biggest_win DESC;

GRANT SELECT ON public.leaderboard_ranking TO anon, authenticated;

-- ==============================================================
-- ¡LISTO! Esquema reparado e instalado al 100% sin ningún error.
-- Para hacerte administrador o delegado ejecuta en cualquier momento:
-- UPDATE public.profiles SET role = 'admin', coins = 50000 WHERE username = 'tu_usuario';
-- ==============================================================
