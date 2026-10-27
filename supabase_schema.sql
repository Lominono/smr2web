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

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_username TEXT;

-- 10. REPLICA IDENTITY FULL (Para asegurar que los payloads de Supabase Realtime incluyan todos los campos)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.app_updates REPLICA IDENTITY FULL;
ALTER TABLE public.rr_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.rr_games REPLICA IDENTITY FULL;
ALTER TABLE public.rr_turns REPLICA IDENTITY FULL;

-- TABLAS DE TIEMPO REAL Y PUSH
CREATE TABLE IF NOT EXISTS public.chat_message_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT DEFAULT 'Aviso' NOT NULL,
  url TEXT DEFAULT '/',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_username TEXT NOT NULL DEFAULT 'SMR2',
  sent_to_push BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_message_likes' AND policyname = 'Lectura pública de likes') THEN
    CREATE POLICY "Lectura pública de likes" ON public.chat_message_likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_message_likes' AND policyname = 'Insertar likes') THEN
    CREATE POLICY "Insertar likes" ON public.chat_message_likes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_message_likes' AND policyname = 'Eliminar likes') THEN
    CREATE POLICY "Eliminar likes" ON public.chat_message_likes FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'Lectura suscripciones push') THEN
    CREATE POLICY "Lectura suscripciones push" ON public.push_subscriptions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'Creación suscripciones push') THEN
    CREATE POLICY "Creación suscripciones push" ON public.push_subscriptions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements' AND policyname = 'Lectura pública de anuncios') THEN
    CREATE POLICY "Lectura pública de anuncios" ON public.announcements FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements' AND policyname = 'Inserción de anuncios') THEN
    CREATE POLICY "Inserción de anuncios" ON public.announcements FOR INSERT WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.chat_message_likes REPLICA IDENTITY FULL;
ALTER TABLE public.push_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;

-- 11. PUBLICACIÓN SUPABASE REALTIME (Evita error 42710 si ya están añadidas)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_likes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
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
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'market_state') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.market_state;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'investments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.investments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'price_history') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;
  END IF;
END $$;

-- 12. TABLAS Y LÓGICA DEL SISTEMA DE INVERSIONES "FONDO BOTELLÓN"
CREATE TABLE IF NOT EXISTS public.market_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_price NUMERIC(12, 4) DEFAULT 10.0000 NOT NULL CHECK (current_price >= 1.0000),
  total_shares NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL CHECK (total_shares >= 0),
  pool_balance NUMERIC(18, 4) DEFAULT 10000.0000 NOT NULL CHECK (pool_balance >= 0),
  reserve_balance NUMERIC(18, 4) DEFAULT 25000.0000 NOT NULL CHECK (reserve_balance > 0),
  total_volume BIGINT DEFAULT 0 NOT NULL,
  total_investors INT DEFAULT 0 NOT NULL,
  fee_rate NUMERIC(6, 4) DEFAULT 0.0200 NOT NULL CHECK (fee_rate >= 0 AND fee_rate <= 0.20),
  cooldown_seconds INT DEFAULT 60 NOT NULL CHECK (cooldown_seconds >= 0),
  min_investment BIGINT DEFAULT 10 NOT NULL CHECK (min_investment > 0),
  max_investment BIGINT DEFAULT 25000 NOT NULL CHECK (max_investment >= min_investment),
  last_event TEXT DEFAULT 'Apertura de mercado' NOT NULL,
  last_event_type TEXT DEFAULT 'neutral' NOT NULL,
  last_event_impact NUMERIC(6, 4) DEFAULT 0.0000 NOT NULL,
  last_tick_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.market_state (
  id, current_price, total_shares, pool_balance, reserve_balance,
  total_volume, total_investors, fee_rate, cooldown_seconds,
  min_investment, max_investment, last_event, last_event_type, last_event_impact
) VALUES (
  1, 10.0000, 0.0000, 10000.0000, 25000.0000,
  0, 0, 0.0200, 60,
  10, 25000, 'Apertura oficial del Fondo Botellón', 'neutral', 0.0000
) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  shares NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL CHECK (shares >= 0),
  total_invested_coins BIGINT DEFAULT 0 NOT NULL CHECK (total_invested_coins >= 0),
  total_withdrawn_coins BIGINT DEFAULT 0 NOT NULL CHECK (total_withdrawn_coins >= 0),
  average_buy_price NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL CHECK (average_buy_price >= 0),
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_shares ON public.investments(shares DESC);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  coins_amount BIGINT NOT NULL CHECK (coins_amount > 0),
  shares_amount NUMERIC(18, 4) NOT NULL CHECK (shares_amount > 0),
  price_per_share NUMERIC(12, 4) NOT NULL CHECK (price_per_share > 0),
  fee_coins BIGINT DEFAULT 0 NOT NULL CHECK (fee_coins >= 0),
  net_coins BIGINT NOT NULL CHECK (net_coins > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  price NUMERIC(12, 4) NOT NULL CHECK (price > 0),
  pool_balance NUMERIC(18, 4) NOT NULL,
  total_shares NUMERIC(18, 4) NOT NULL,
  change_percent NUMERIC(8, 4) DEFAULT 0.0000 NOT NULL,
  trigger_type TEXT DEFAULT 'tick' NOT NULL CHECK (trigger_type IN ('tick', 'buy', 'sell', 'event', 'initial')),
  event_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON public.price_history(created_at DESC);

INSERT INTO public.price_history (
  price, pool_balance, total_shares, change_percent, trigger_type, event_description
)
SELECT 10.0000, 10000.0000, 0.0000, 0.0000, 'initial', 'Precio base de lanzamiento'
WHERE NOT EXISTS (SELECT 1 FROM public.price_history);

ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'market_state' AND policyname = 'Lectura pública de market_state') THEN
    CREATE POLICY "Lectura pública de market_state" ON public.market_state FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'price_history' AND policyname = 'Lectura pública de price_history') THEN
    CREATE POLICY "Lectura pública de price_history" ON public.price_history FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investments' AND policyname = 'Lectura propia de investments') THEN
    CREATE POLICY "Lectura propia de investments" ON public.investments FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Lectura propia de transactions') THEN
    CREATE POLICY "Lectura propia de transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.market_state REPLICA IDENTITY FULL;
ALTER TABLE public.investments REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.price_history REPLICA IDENTITY FULL;

-- RPCs DEL SISTEMA DE INVERSIONES
CREATE OR REPLACE FUNCTION public.invest_in_botellon(p_amount BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_username TEXT;
  v_user_coins BIGINT;
  v_market RECORD;
  v_inv RECORD;
  v_shares_to_buy NUMERIC(18, 4);
  v_exec_price NUMERIC(12, 4);
  v_new_price NUMERIC(12, 4);
  v_new_pool NUMERIC(18, 4);
  v_new_total_shares NUMERIC(18, 4);
  v_new_user_coins BIGINT;
  v_cooldown_left INT;
  v_slippage_factor NUMERIC;
  v_new_avg_price NUMERIC(12, 4);
  v_final_shares NUMERIC(18, 4);
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado: debes iniciar sesión para operar en el Fondo Botellón.';
  END IF;

  SELECT username, coins INTO v_username, v_user_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado.';
  END IF;

  SELECT * INTO v_market
  FROM public.market_state
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El mercado del Fondo Botellón no está inicializado.';
  END IF;

  IF p_amount IS NULL OR p_amount < v_market.min_investment THEN
    RAISE EXCEPTION 'La inversión mínima es de % monedas.', v_market.min_investment;
  END IF;

  IF p_amount > v_market.max_investment THEN
    RAISE EXCEPTION 'La inversión máxima por operación es de % monedas.', v_market.max_investment;
  END IF;

  IF v_user_coins < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente: tienes % monedas e intentas invertir %.', v_user_coins, p_amount;
  END IF;

  SELECT * INTO v_inv
  FROM public.investments
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND AND v_inv.last_transaction_at IS NOT NULL THEN
    IF (EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at))) < v_market.cooldown_seconds THEN
      v_cooldown_left := CEIL(v_market.cooldown_seconds - EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at)));
      RAISE EXCEPTION 'Cooldown activo: debes esperar % segundos para volver a operar.', v_cooldown_left;
    END IF;
  END IF;

  v_exec_price := v_market.current_price;
  v_shares_to_buy := ROUND((p_amount::NUMERIC / v_exec_price), 4);

  IF v_shares_to_buy <= 0 THEN
    RAISE EXCEPTION 'El importe es insuficiente para comprar participaciones.';
  END IF;

  v_slippage_factor := p_amount::NUMERIC / (v_market.reserve_balance + v_market.pool_balance);
  IF v_slippage_factor > 0.12 THEN
    v_slippage_factor := 0.12;
  END IF;

  v_new_price := ROUND(v_market.current_price * (1.0 + v_slippage_factor), 4);
  v_new_pool := v_market.pool_balance + p_amount;
  v_new_total_shares := v_market.total_shares + v_shares_to_buy;
  v_new_user_coins := v_user_coins - p_amount;

  UPDATE public.profiles
  SET coins = v_new_user_coins
  WHERE id = v_user_id;

  INSERT INTO public.balance_transactions (
    user_id, amount, balance_before, balance_after, type, description
  ) VALUES (
    v_user_id, -p_amount, v_user_coins, v_new_user_coins, 'game_bet',
    format('Inversión en Fondo Botellón: %s participaciones a %s c/u', v_shares_to_buy, v_exec_price)
  );

  IF v_inv.id IS NOT NULL THEN
    v_final_shares := v_inv.shares + v_shares_to_buy;
    v_new_avg_price := ROUND(
      ((v_inv.average_buy_price * v_inv.shares) + (v_exec_price * v_shares_to_buy)) / v_final_shares,
      4
    );

    UPDATE public.investments
    SET 
      shares = v_final_shares,
      total_invested_coins = total_invested_coins + p_amount,
      average_buy_price = v_new_avg_price,
      last_transaction_at = now(),
      updated_at = now()
    WHERE user_id = v_user_id;
  ELSE
    v_final_shares := v_shares_to_buy;
    v_new_avg_price := v_exec_price;

    INSERT INTO public.investments (
      user_id, shares, total_invested_coins, total_withdrawn_coins,
      average_buy_price, last_transaction_at
    ) VALUES (
      v_user_id, v_shares_to_buy, p_amount, 0,
      v_exec_price, now()
    );
  END IF;

  UPDATE public.market_state
  SET 
    current_price = v_new_price,
    total_shares = v_new_total_shares,
    pool_balance = v_new_pool,
    total_volume = total_volume + p_amount,
    total_investors = (SELECT COUNT(*) FROM public.investments WHERE shares > 0.001),
    updated_at = now()
  WHERE id = 1;

  INSERT INTO public.transactions (
    user_id, username, type, coins_amount, shares_amount,
    price_per_share, fee_coins, net_coins
  ) VALUES (
    v_user_id, v_username, 'buy', p_amount, v_shares_to_buy,
    v_exec_price, 0, p_amount
  );

  INSERT INTO public.price_history (
    price, pool_balance, total_shares, change_percent, trigger_type, event_description
  ) VALUES (
    v_new_price, v_new_pool, v_new_total_shares,
    ROUND(((v_new_price - v_market.current_price) / v_market.current_price) * 100, 2),
    'buy',
    format('Inversión de %s monedas por %s', p_amount, v_username)
  );

  RETURN jsonb_build_object(
    'success', true,
    'type', 'buy',
    'coins_spent', p_amount,
    'shares_bought', v_shares_to_buy,
    'execution_price', v_exec_price,
    'new_price', v_new_price,
    'new_balance', v_new_user_coins,
    'new_shares', v_final_shares,
    'message', format('Has invertido %s monedas y recibido %s participaciones a %s 🪙', p_amount, v_shares_to_buy, v_exec_price)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_from_botellon(p_shares NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_username TEXT;
  v_user_coins BIGINT;
  v_market RECORD;
  v_inv RECORD;
  v_exec_price NUMERIC(12, 4);
  v_gross_coins BIGINT;
  v_fee_coins BIGINT;
  v_net_coins BIGINT;
  v_slippage_factor NUMERIC;
  v_new_price NUMERIC(12, 4);
  v_new_pool NUMERIC(18, 4);
  v_new_total_shares NUMERIC(18, 4);
  v_new_user_coins BIGINT;
  v_remaining_shares NUMERIC(18, 4);
  v_cooldown_left INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado: debes iniciar sesión para operar en el Fondo Botellón.';
  END IF;

  SELECT username, coins INTO v_username, v_user_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado.';
  END IF;

  SELECT * INTO v_inv
  FROM public.investments
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_inv.shares <= 0 THEN
    RAISE EXCEPTION 'No posees participaciones en el Fondo Botellón.';
  END IF;

  IF p_shares IS NULL OR p_shares <= 0 THEN
    RAISE EXCEPTION 'La cantidad de participaciones a retirar debe ser mayor que 0.';
  END IF;

  IF p_shares > v_inv.shares THEN
    RAISE EXCEPTION 'No tienes suficientes participaciones: posees % e intentas vender %.', v_inv.shares, p_shares;
  END IF;

  SELECT * INTO v_market
  FROM public.market_state
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El mercado del Fondo Botellón no está inicializado.';
  END IF;

  IF v_inv.last_transaction_at IS NOT NULL THEN
    IF (EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at))) < v_market.cooldown_seconds THEN
      v_cooldown_left := CEIL(v_market.cooldown_seconds - EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at)));
      RAISE EXCEPTION 'Cooldown activo: debes esperar % segundos para volver a operar.', v_cooldown_left;
    END IF;
  END IF;

  v_exec_price := v_market.current_price;
  v_gross_coins := ROUND(p_shares * v_exec_price);

  IF v_gross_coins <= 0 THEN
    RAISE EXCEPTION 'El valor de venta es demasiado pequeño para liquidarse.';
  END IF;

  v_fee_coins := ROUND(v_gross_coins * v_market.fee_rate);
  IF v_fee_coins < 1 AND v_market.fee_rate > 0 THEN
    v_fee_coins := 1;
  END IF;

  v_net_coins := v_gross_coins - v_fee_coins;
  IF v_net_coins <= 0 THEN
    RAISE EXCEPTION 'La comisión absorbe la totalidad de la retirada.';
  END IF;

  v_slippage_factor := v_gross_coins::NUMERIC / (v_market.reserve_balance + v_market.pool_balance);
  IF v_slippage_factor > 0.12 THEN
    v_slippage_factor := 0.12;
  END IF;

  v_new_price := GREATEST(1.0000, ROUND(v_market.current_price * (1.0 - v_slippage_factor), 4));
  v_new_pool := GREATEST(0.0000, v_market.pool_balance - v_net_coins);
  v_new_total_shares := GREATEST(0.0000, v_market.total_shares - p_shares);
  v_new_user_coins := v_user_coins + v_net_coins;
  v_remaining_shares := ROUND(v_inv.shares - p_shares, 4);

  UPDATE public.profiles
  SET coins = v_new_user_coins
  WHERE id = v_user_id;

  INSERT INTO public.balance_transactions (
    user_id, amount, balance_before, balance_after, type, description
  ) VALUES (
    v_user_id, v_net_coins, v_user_coins, v_new_user_coins, 'game_win',
    format('Venta de %s participaciones a %s c/u (Comisión pool: %s 🪙)', p_shares, v_exec_price, v_fee_coins)
  );

  UPDATE public.investments
  SET 
    shares = v_remaining_shares,
    total_withdrawn_coins = total_withdrawn_coins + v_net_coins,
    average_buy_price = CASE WHEN v_remaining_shares <= 0.0001 THEN 0.0000 ELSE average_buy_price END,
    last_transaction_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id;

  UPDATE public.market_state
  SET 
    current_price = v_new_price,
    total_shares = v_new_total_shares,
    pool_balance = v_new_pool,
    total_volume = total_volume + v_gross_coins,
    total_investors = (SELECT COUNT(*) FROM public.investments WHERE shares > 0.001),
    updated_at = now()
  WHERE id = 1;

  INSERT INTO public.transactions (
    user_id, username, type, coins_amount, shares_amount,
    price_per_share, fee_coins, net_coins
  ) VALUES (
    v_user_id, v_username, 'sell', v_gross_coins, p_shares,
    v_exec_price, v_fee_coins, v_net_coins
  );

  INSERT INTO public.price_history (
    price, pool_balance, total_shares, change_percent, trigger_type, event_description
  ) VALUES (
    v_new_price, v_new_pool, v_new_total_shares,
    ROUND(((v_new_price - v_market.current_price) / v_market.current_price) * 100, 2),
    'sell',
    format('Retirada de %s participaciones por %s', p_shares, v_username)
  );

  RETURN jsonb_build_object(
    'success', true,
    'type', 'sell',
    'shares_sold', p_shares,
    'gross_coins', v_gross_coins,
    'fee_paid', v_fee_coins,
    'coins_received', v_net_coins,
    'execution_price', v_exec_price,
    'new_price', v_new_price,
    'new_balance', v_new_user_coins,
    'new_shares', v_remaining_shares,
    'message', format('Has vendido %s participaciones y cobrado %s monedas (comisión: %s 🪙)', p_shares, v_net_coins, v_fee_coins)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.tick_market_price()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_market RECORD;
  v_rnd NUMERIC;
  v_change_pct NUMERIC(6, 4);
  v_new_price NUMERIC(12, 4);
  v_event_happened BOOLEAN := false;
  v_event_title TEXT := '';
  v_event_type TEXT := 'neutral';
  v_event_impact NUMERIC(6, 4) := 0.0000;
  v_event_roll NUMERIC;
  v_chat_text TEXT := '';
BEGIN
  SELECT * INTO v_market
  FROM public.market_state
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mercado no inicializado.';
  END IF;

  v_rnd := random();
  v_change_pct := ROUND(((v_rnd * 0.038) - 0.018)::NUMERIC, 4);

  v_event_roll := random();
  IF v_event_roll < 0.15 THEN
    v_event_happened := true;

    CASE FLOOR(random() * 8)
      WHEN 0 THEN
        v_event_title := '🚨 ¡Redada de la Policía Local!';
        v_event_type := 'police';
        v_event_impact := -0.1150;
        v_chat_text := '🚨 ¡Alarma! La policía local llega al parque con sirenas y multas. El fondo cae un 11.5%.';
      WHEN 1 THEN
        v_event_title := '🎉 ¡Noche Épica de Botellón!';
        v_event_type := 'epic';
        v_event_impact := 0.1450;
        v_chat_text := '🎉 ¡Ambientazo legendario! El altavoz JBL truena y se desborda la plaza. El fondo sube un 14.5%.';
      WHEN 2 THEN
        v_event_title := '🧊 Desabastecimiento de hielo en gasolineras';
        v_event_type := 'bearish';
        v_event_impact := -0.0550;
        v_chat_text := '🧊 ¡Se agotó el hielo en la gasolinera! Los cubatas están calientes. El fondo corrige un 5.5%.';
      WHEN 3 THEN
        v_event_title := '🍻 Oferta 2x1 en el Chino del barrio';
        v_event_type := 'bullish';
        v_event_impact := 0.0750;
        v_chat_text := '🍻 ¡El chino saca oferta 2x1 en litronas y pipas! Euforia en el fondo (+7.5%).';
      WHEN 4 THEN
        v_event_title := '🌧️ Chaparrón y tormenta repentina';
        v_event_type := 'bearish';
        v_event_impact := -0.0800;
        v_chat_text := '🌧️ Tormenta imprevista. La peña sale corriendo a guarecerse. El fondo cae un 8.0%.';
      WHEN 5 THEN
        v_event_title := '🎵 Batalla de gallos improvisada';
        v_event_type := 'bullish';
        v_event_impact := 0.0900;
        v_chat_text := '🎵 Dos chavales se marcan un freestyle legendario y atraen a media ciudad (+9.0%).';
      WHEN 6 THEN
        v_event_title := '🍕 Llega el repartidor de kebabs y pizzas';
        v_event_type := 'bullish';
        v_event_impact := 0.0500;
        v_chat_text := '🍕 Inyección de carbohidratos a las 3 AM. Ánimos arriba en el botellón (+5.0%).';
      ELSE
        v_event_title := '🔋 Se agota la batería del altavoz';
        v_event_type := 'bearish';
        v_event_impact := -0.0450;
        v_chat_text := '🔋 Se apagó el altavoz Bluetooth y cae el hype de la fiesta (-4.5%).';
    END CASE;

    v_change_pct := v_change_pct + v_event_impact;
  END IF;

  v_new_price := GREATEST(1.0000, ROUND(v_market.current_price * (1.0 + v_change_pct), 4));

  UPDATE public.market_state
  SET 
    current_price = v_new_price,
    last_event = CASE WHEN v_event_happened THEN v_event_title ELSE last_event END,
    last_event_type = CASE WHEN v_event_happened THEN v_event_type ELSE last_event_type END,
    last_event_impact = CASE WHEN v_event_happened THEN v_event_impact ELSE last_event_impact END,
    last_tick_at = now(),
    updated_at = now()
  WHERE id = 1;

  INSERT INTO public.price_history (
    price, pool_balance, total_shares, change_percent, trigger_type, event_description
  ) VALUES (
    v_new_price, v_market.pool_balance, v_market.total_shares,
    ROUND(((v_new_price - v_market.current_price) / v_market.current_price) * 100, 2),
    CASE WHEN v_event_happened THEN 'event' ELSE 'tick' END,
    CASE WHEN v_event_happened THEN v_event_title ELSE 'Tick periódico del mercado' END
  );

  IF v_event_happened AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    INSERT INTO public.chat_messages (
      username, text, tag, is_system_win
    ) VALUES (
      'Fondo Botellón', v_chat_text, 'Fondo', false
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'previous_price', v_market.current_price,
    'new_price', v_new_price,
    'change_percent', ROUND(v_change_pct * 100, 2),
    'event_happened', v_event_happened,
    'event_title', v_event_title,
    'event_type', v_event_type
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_botellon_top_investors(p_limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_color TEXT,
  shares NUMERIC,
  position_value NUMERIC,
  total_invested BIGINT,
  profit_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_price NUMERIC;
BEGIN
  SELECT current_price INTO v_current_price FROM public.market_state WHERE id = 1;
  IF v_current_price IS NULL THEN
    v_current_price := 10.0;
  END IF;

  RETURN QUERY
  SELECT 
    i.user_id,
    COALESCE(p.username, 'Anónimo') AS username,
    COALESCE(p.avatar_color, 'emerald') AS avatar_color,
    i.shares,
    ROUND(i.shares * v_current_price, 2) AS position_value,
    i.total_invested_coins AS total_invested,
    CASE 
      WHEN i.average_buy_price > 0 THEN 
        ROUND(((v_current_price - i.average_buy_price) / i.average_buy_price) * 100, 2)
      ELSE 0.00
    END AS profit_percent
  FROM public.investments i
  LEFT JOIN public.profiles p ON p.id = i.user_id
  WHERE i.shares > 0.001
  ORDER BY i.shares DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_botellon_portfolio()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_market RECORD;
  v_inv RECORD;
  v_coins BIGINT;
  v_cooldown_remaining INT := 0;
  v_position_value NUMERIC(18, 4) := 0.0000;
  v_unrealized_profit NUMERIC(18, 4) := 0.0000;
  v_profit_pct NUMERIC(8, 2) := 0.00;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  SELECT coins INTO v_coins FROM public.profiles WHERE id = v_user_id;
  SELECT * INTO v_market FROM public.market_state WHERE id = 1;
  SELECT * INTO v_inv FROM public.investments WHERE user_id = v_user_id;

  IF v_inv.id IS NOT NULL AND v_inv.last_transaction_at IS NOT NULL THEN
    IF (EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at))) < v_market.cooldown_seconds THEN
      v_cooldown_remaining := CEIL(v_market.cooldown_seconds - EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at)));
    END IF;
  END IF;

  IF v_inv.id IS NOT NULL AND v_inv.shares > 0 THEN
    v_position_value := ROUND(v_inv.shares * v_market.current_price, 2);
    IF v_inv.average_buy_price > 0 THEN
      v_unrealized_profit := ROUND(v_position_value - (v_inv.shares * v_inv.average_buy_price), 2);
      v_profit_pct := ROUND(((v_market.current_price - v_inv.average_buy_price) / v_inv.average_buy_price) * 100, 2);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'user_id', v_user_id,
    'user_coins', COALESCE(v_coins, 0),
    'shares', COALESCE(v_inv.shares, 0.0000),
    'average_buy_price', COALESCE(v_inv.average_buy_price, 0.0000),
    'total_invested_coins', COALESCE(v_inv.total_invested_coins, 0),
    'total_withdrawn_coins', COALESCE(v_inv.total_withdrawn_coins, 0),
    'position_value', v_position_value,
    'unrealized_profit_coins', v_unrealized_profit,
    'unrealized_profit_percent', v_profit_pct,
    'cooldown_remaining_seconds', v_cooldown_remaining,
    'last_transaction_at', v_inv.last_transaction_at
  );
END;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.market_state TO anon, authenticated, service_role;
GRANT SELECT ON public.price_history TO anon, authenticated, service_role;
GRANT SELECT ON public.investments TO authenticated, service_role;
GRANT SELECT ON public.transactions TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.invest_in_botellon(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_from_botellon(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_market_price() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_botellon_top_investors(INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_botellon_portfolio() TO authenticated;




-- ============================================================================
-- SECCIÓN: SISTEMA DE IDEAS, SUGERENCIAS Y REPORTES (MIGRACIÓN 08)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.community_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('idea', 'report', 'improvement')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'juegos', 'horario', 'portal', 'inversiones', 'otros')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'planned', 'completed', 'dismissed')),
  upvotes_count INTEGER NOT NULL DEFAULT 0,
  admin_response TEXT,
  admin_responder_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_votes (
  feedback_id UUID NOT NULL REFERENCES public.community_feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (feedback_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_feedback_created_at ON public.community_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_feedback_upvotes ON public.community_feedback(upvotes_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_feedback_type ON public.community_feedback(type);
CREATE INDEX IF NOT EXISTS idx_community_feedback_status ON public.community_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_user ON public.feedback_votes(user_id);

ALTER TABLE public.community_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de ideas y reportes" ON public.community_feedback;
CREATE POLICY "Lectura publica de ideas y reportes"
  ON public.community_feedback FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Lectura publica de votos de ideas" ON public.feedback_votes;
CREATE POLICY "Lectura publica de votos de ideas"
  ON public.feedback_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios pueden crear ideas y reportes" ON public.community_feedback;
CREATE POLICY "Usuarios pueden crear ideas y reportes"
  ON public.community_feedback FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden votar" ON public.feedback_votes;
CREATE POLICY "Usuarios autenticados pueden votar"
  ON public.feedback_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios autenticados pueden retirar su voto" ON public.feedback_votes;
CREATE POLICY "Usuarios autenticados pueden retirar su voto"
  ON public.feedback_votes FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Autores y delegados pueden actualizar ideas" ON public.community_feedback;
CREATE POLICY "Autores y delegados pueden actualizar ideas"
  ON public.community_feedback FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'delegado'))
  );

DROP POLICY IF EXISTS "Autores y delegados pueden borrar ideas" ON public.community_feedback;
CREATE POLICY "Autores y delegados pueden borrar ideas"
  ON public.community_feedback FOR DELETE
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'delegado'))
  );

CREATE OR REPLACE FUNCTION public.toggle_feedback_vote(p_feedback_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_voted BOOLEAN;
  v_new_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para votar.';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.feedback_votes 
    WHERE feedback_id = p_feedback_id AND user_id = v_user_id
  ) INTO v_voted;

  IF v_voted THEN
    DELETE FROM public.feedback_votes 
    WHERE feedback_id = p_feedback_id AND user_id = v_user_id;

    UPDATE public.community_feedback
    SET upvotes_count = GREATEST(0, upvotes_count - 1),
        updated_at = NOW()
    WHERE id = p_feedback_id
    RETURNING upvotes_count INTO v_new_count;

    RETURN jsonb_build_object('success', true, 'voted', false, 'upvotes_count', v_new_count);
  ELSE
    INSERT INTO public.feedback_votes (feedback_id, user_id)
    VALUES (p_feedback_id, v_user_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.community_feedback
    SET upvotes_count = upvotes_count + 1,
        updated_at = NOW()
    WHERE id = p_feedback_id
    RETURNING upvotes_count INTO v_new_count;

    RETURN jsonb_build_object('success', true, 'voted', true, 'upvotes_count', v_new_count);
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_feedback TO anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.feedback_votes TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_feedback_vote(UUID) TO authenticated;
