-- ==============================================================
-- SMR2 WEB · ESQUEMA COMPLETO Y DEFINITIVO DE BASE DE DATOS
-- ==============================================================
-- Copia todo este código y pégalo directamente en el SQL Editor de Supabase.
-- Es 100% idempotente (puedes ejecutarlo varias veces sin perder datos ni fallar).
-- ==============================================================

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
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'delegado', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'delegado', 'admin')),
  ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles(coins DESC);

-- Disparador para crear automáticamente el perfil al registrarse un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, coins, biggest_win, streak_count, role)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    new.email,
    1000,
    0,
    1,
    'student'
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
  event_type TEXT DEFAULT 'homework' CHECK (event_type IN ('exam', 'homework', 'reminder', 'class')),
  event_date DATE NOT NULL,
  start_time TEXT,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  delivery_url TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT DEFAULT 'Delegado SMR2',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  ADD COLUMN IF NOT EXISTS delivery_url TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT DEFAULT 'Delegado SMR2';

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_subject ON public.calendar_events(subject);
CREATE INDEX IF NOT EXISTS idx_calendar_events_priority ON public.calendar_events(priority);
CREATE INDEX IF NOT EXISTS idx_calendar_events_completed ON public.calendar_events(is_completed);

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- --------------------------------------------------------------
-- 4. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Creación de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar saldo de usuario" ON public.profiles;

DROP POLICY IF EXISTS "Lectura pública de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Creación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Modificación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Borrado de eventos" ON public.calendar_events;

DROP POLICY IF EXISTS "Lectura pública de chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Creación de mensajes" ON public.chat_messages;

-- Políticas de perfiles
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Creación de perfiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizar saldo de usuario" ON public.profiles FOR UPDATE USING (true);

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
    -- Ya añadido
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  EXCEPTION WHEN duplicate_object THEN
    -- Ya añadido
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN
    -- Ya añadido
  END;
END $$;

-- ==============================================================
-- ¡LISTO! Todo configurado para 2º SMR.
-- Para hacerte administrador o delegado ejecuta:
-- UPDATE public.profiles SET role = 'admin' WHERE username = 'tu_usuario';
-- ==============================================================
