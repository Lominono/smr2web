-- ==============================================================
-- SCHEMA SUPABASE COMPLETO: PORTAL 2º SMR (ARCADE, CHAT, HORARIO Y PRESENCIA)
-- ==============================================================
--
-- ⚡ GUÍA RÁPIDA DE RESOLUCIÓN DE ERRORES:
-- Si te apareció: "ERROR: 42710: policy already exists", este script
-- incluye limpieza dinámica previa para eliminar ese error por completo.
--
-- 👑 CÓDIGO SQL PARA DARTE ACCESO ADMIN AL INSTANTE EN SUPABASE:
-- UPDATE public.profiles SET role = 'admin' WHERE username = 'tu_usuario';
-- ==============================================================

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA DE PERFILES DE USUARIO (Vinculada a auth.users)
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
  last_spin_date TIMESTAMP WITH TIME ZONE,
  last_rescue_date TIMESTAMP WITH TIME ZONE,
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT 'emerald';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins BIGINT DEFAULT 1000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS biggest_win BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count INT DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_claim_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_spin_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_rescue_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS games_played INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS games_won INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_number ON public.profiles (student_number) WHERE student_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles (coins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- Trigger automático al registrarse un usuario en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, coins, biggest_win, role, avatar_color)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    new.email,
    1000,
    0,
    CASE WHEN COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)) = 'admin' THEN 'admin' ELSE 'student' END,
    'emerald'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TABLA DE MENSAJES DE CHAT REALES
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

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS tag TEXT;
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tag ON public.chat_messages (tag);

-- 4. TABLA DE CALENDARIO Y AGENDA SMR2 (Exámenes, Entregas y Recordatorios)
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  event_type TEXT DEFAULT 'exam' NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events (event_date ASC);

-- 5. TABLA DE ACTUALIZACIONES Y AVISOS DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.app_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLA DE TRANSACCIONES ECONÓMICAS
CREATE TABLE IF NOT EXISTS public.balance_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_user ON public.balance_transactions (user_id, created_at DESC);

-- 7. TABLA DE AUDITORÍA Y LOGS DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT,
  room_id TEXT,
  game_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON public.event_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_type ON public.event_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_user ON public.event_logs (user_id);

-- 8. TABLAS DE RULETA RUSA MULTIJUGADOR
CREATE TABLE IF NOT EXISTS public.rr_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  host_username TEXT NOT NULL,
  bet_amount BIGINT DEFAULT 100 NOT NULL,
  max_players INT DEFAULT 6 NOT NULL,
  status TEXT DEFAULT 'waiting' NOT NULL,
  pot BIGINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rr_room_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rr_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  seat_order INT NOT NULL,
  is_alive BOOLEAN DEFAULT true NOT NULL,
  is_connected BOOLEAN DEFAULT true NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.rr_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rr_rooms(id) ON DELETE CASCADE NOT NULL,
  round_number INT DEFAULT 1 NOT NULL,
  bullet_chamber INT NOT NULL,
  current_turn_user_id UUID,
  current_turn_username TEXT,
  current_turn_index INT DEFAULT 0,
  status TEXT DEFAULT 'in_progress' NOT NULL,
  winner_user_id UUID,
  winner_username TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.rr_turns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.rr_games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  username TEXT,
  chamber_index INT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_turns ENABLE ROW LEVEL SECURITY;

-- Limpieza dinámica de políticas previas (garantiza cero errores 42710)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'profiles', 
        'chat_messages', 
        'calendar_events', 
        'app_updates', 
        'balance_transactions', 
        'event_logs', 
        'rr_rooms', 
        'rr_room_players', 
        'rr_games', 
        'rr_turns'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Creación segura y protegida de políticas RLS
DO $$
BEGIN
  -- PROFILES
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Lectura pública de perfiles') THEN
    CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Creación de perfiles') THEN
    CREATE POLICY "Creación de perfiles" ON public.profiles FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Actualizar saldo de usuario') THEN
    CREATE POLICY "Actualizar saldo de usuario" ON public.profiles FOR UPDATE USING (true);
  END IF;

  -- CHAT MESSAGES
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Lectura pública de chat') THEN
    CREATE POLICY "Lectura pública de chat" ON public.chat_messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Creación de mensajes') THEN
    CREATE POLICY "Creación de mensajes" ON public.chat_messages FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Actualizar likes de chat') THEN
    CREATE POLICY "Actualizar likes de chat" ON public.chat_messages FOR UPDATE USING (true);
  END IF;

  -- CALENDAR EVENTS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'Lectura pública de eventos') THEN
    CREATE POLICY "Lectura pública de eventos" ON public.calendar_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'Creación de eventos') THEN
    CREATE POLICY "Creación de eventos" ON public.calendar_events FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'Modificación de eventos') THEN
    CREATE POLICY "Modificación de eventos" ON public.calendar_events FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'Borrado de eventos') THEN
    CREATE POLICY "Borrado de eventos" ON public.calendar_events FOR DELETE USING (true);
  END IF;

  -- APP UPDATES
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_updates' AND policyname = 'Lectura pública de actualizaciones') THEN
    CREATE POLICY "Lectura pública de actualizaciones" ON public.app_updates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_updates' AND policyname = 'Creación de actualizaciones') THEN
    CREATE POLICY "Creación de actualizaciones" ON public.app_updates FOR INSERT WITH CHECK (true);
  END IF;

  -- BALANCE TRANSACTIONS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'balance_transactions' AND policyname = 'Lectura de transacciones') THEN
    CREATE POLICY "Lectura de transacciones" ON public.balance_transactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'balance_transactions' AND policyname = 'Inserción de transacciones') THEN
    CREATE POLICY "Inserción de transacciones" ON public.balance_transactions FOR INSERT WITH CHECK (true);
  END IF;

  -- EVENT LOGS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_logs' AND policyname = 'Lectura de logs') THEN
    CREATE POLICY "Lectura de logs" ON public.event_logs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_logs' AND policyname = 'Inserción de logs') THEN
    CREATE POLICY "Inserción de logs" ON public.event_logs FOR INSERT WITH CHECK (true);
  END IF;

  -- RR ROOMS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_rooms' AND policyname = 'Lectura de salas RR') THEN
    CREATE POLICY "Lectura de salas RR" ON public.rr_rooms FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_rooms' AND policyname = 'Inserción de salas RR') THEN
    CREATE POLICY "Inserción de salas RR" ON public.rr_rooms FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_rooms' AND policyname = 'Actualización de salas RR') THEN
    CREATE POLICY "Actualización de salas RR" ON public.rr_rooms FOR UPDATE USING (true);
  END IF;

  -- RR ROOM PLAYERS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_room_players' AND policyname = 'Lectura jugadores RR') THEN
    CREATE POLICY "Lectura jugadores RR" ON public.rr_room_players FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_room_players' AND policyname = 'Inserción jugadores RR') THEN
    CREATE POLICY "Inserción jugadores RR" ON public.rr_room_players FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_room_players' AND policyname = 'Actualización jugadores RR') THEN
    CREATE POLICY "Actualización jugadores RR" ON public.rr_room_players FOR UPDATE USING (true);
  END IF;

  -- RR GAMES
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_games' AND policyname = 'Lectura partidas RR') THEN
    CREATE POLICY "Lectura partidas RR" ON public.rr_games FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_games' AND policyname = 'Inserción partidas RR') THEN
    CREATE POLICY "Inserción partidas RR" ON public.rr_games FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_games' AND policyname = 'Actualización partidas RR') THEN
    CREATE POLICY "Actualización partidas RR" ON public.rr_games FOR UPDATE USING (true);
  END IF;

  -- RR TURNS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_turns' AND policyname = 'Lectura turnos RR') THEN
    CREATE POLICY "Lectura turnos RR" ON public.rr_turns FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rr_turns' AND policyname = 'Inserción turnos RR') THEN
    CREATE POLICY "Inserción turnos RR" ON public.rr_turns FOR INSERT WITH CHECK (true);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 10. REPLICA IDENTITY FULL (Para asegurar que los payloads de Supabase Realtime incluyan todos los campos)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.app_updates REPLICA IDENTITY FULL;
ALTER TABLE public.rr_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.rr_games REPLICA IDENTITY FULL;
ALTER TABLE public.rr_turns REPLICA IDENTITY FULL;

-- 11. PUBLICACIÓN SUPABASE REALTIME (Evita error 42710 si ya están añadidas)
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
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rr_rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_rooms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rr_games') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_games;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rr_turns') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_turns;
  END IF;
END $$;
