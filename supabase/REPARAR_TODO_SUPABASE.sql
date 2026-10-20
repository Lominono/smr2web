-- ==============================================================
-- REPARAR Y CONFIGURAR TODO EN SUPABASE (SOLUCIÓN DEFINITIVA)
-- ==============================================================
-- Este script crea primero TODAS las tablas si faltan, por lo que
-- NUNCA fallará con "relation does not exist" ni con "policy already exists".
-- Cópialo completo y ejecútalo en el SQL Editor de Supabase:
-- ==============================================================

-- 1. TABLA: PROFILES
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

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'delegado', 'admin')),
  ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles(coins DESC);

-- 2. TABLA: CALENDAR_EVENTS (Evita error 42P01)
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

-- 3. TABLA: CHAT_MESSAGES
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

-- 4. DISPARADOR AUTOMÁTICO DE USUARIOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, coins, biggest_win, streak_count, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
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

-- 5. SEGURIDAD ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas para evitar error 42710 (duplicate_object)
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Creación de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar saldo de usuario" ON public.profiles;

DROP POLICY IF EXISTS "Lectura pública de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Creación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Modificación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Borrado de eventos" ON public.calendar_events;

DROP POLICY IF EXISTS "Lectura pública de chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Creación de mensajes" ON public.chat_messages;

-- Políticas de lectura y escritura
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Creación de perfiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizar saldo de usuario" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Lectura pública de eventos" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Creación de eventos" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Modificación de eventos" ON public.calendar_events FOR UPDATE USING (true);
CREATE POLICY "Borrado de eventos" ON public.calendar_events FOR DELETE USING (true);

CREATE POLICY "Lectura pública de chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Creación de mensajes" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- 6. TABLAS RULETA RUSA MULTIJUGADOR Y LOGS DE AUDITORÍA
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS games_played BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_won BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_banned ON public.profiles(is_banned);

CREATE TABLE IF NOT EXISTS public.balance_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily_faucet', 'game_bet', 'game_win', 'admin_adjustment', 'refund')),
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rr_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  host_username TEXT NOT NULL,
  bet_amount BIGINT DEFAULT 50 NOT NULL,
  max_players INT DEFAULT 6 NOT NULL CHECK (max_players >= 2 AND max_players <= 6),
  status TEXT DEFAULT 'waiting' NOT NULL CHECK (status IN ('waiting', 'in_progress', 'finished', 'cancelled')),
  pot BIGINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rr_room_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rr_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  seat_order INT NOT NULL CHECK (seat_order >= 0 AND seat_order <= 5),
  is_alive BOOLEAN DEFAULT true NOT NULL,
  is_connected BOOLEAN DEFAULT true NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_room_player UNIQUE (room_id, user_id),
  CONSTRAINT uq_room_seat UNIQUE (room_id, seat_order)
);

CREATE TABLE IF NOT EXISTS public.rr_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rr_rooms(id) ON DELETE CASCADE,
  bullet_chamber INT NOT NULL CHECK (bullet_chamber >= 0 AND bullet_chamber < 6),
  current_chamber INT DEFAULT 0 NOT NULL CHECK (current_chamber >= 0 AND current_chamber < 6),
  active_player_id UUID REFERENCES public.profiles(id),
  active_player_username TEXT,
  turn_deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'finished', 'aborted')),
  winner_id UUID REFERENCES public.profiles(id),
  winner_username TEXT,
  round_number INT DEFAULT 1 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.rr_turns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.rr_games(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rr_rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.profiles(id),
  player_username TEXT NOT NULL,
  chamber_index INT NOT NULL CHECK (chamber_index >= 0 AND chamber_index < 6),
  result TEXT NOT NULL CHECK (result IN ('blank', 'discharge', 'timeout')),
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT,
  room_id UUID REFERENCES public.rr_rooms(id) ON DELETE SET NULL,
  game_id UUID REFERENCES public.rr_games(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON public.event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON public.event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON public.event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_username ON public.event_logs(username);
CREATE INDEX IF NOT EXISTS idx_event_logs_room_id ON public.event_logs(room_id);

ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de salas" ON public.rr_rooms;
DROP POLICY IF EXISTS "Inserción de salas" ON public.rr_rooms;
DROP POLICY IF EXISTS "Actualización de salas" ON public.rr_rooms;
DROP POLICY IF EXISTS "Lectura pública de jugadores en salas" ON public.rr_room_players;
DROP POLICY IF EXISTS "Inserción de jugadores en salas" ON public.rr_room_players;
DROP POLICY IF EXISTS "Actualización de jugadores en salas" ON public.rr_room_players;
DROP POLICY IF EXISTS "Salida de jugadores de salas" ON public.rr_room_players;
DROP POLICY IF EXISTS "Lectura de partidas de ruleta rusa" ON public.rr_games;
DROP POLICY IF EXISTS "Lectura de turnos de ruleta rusa" ON public.rr_turns;
DROP POLICY IF EXISTS "Lectura de transacciones de saldo" ON public.balance_transactions;
DROP POLICY IF EXISTS "Inserción de logs" ON public.event_logs;
DROP POLICY IF EXISTS "Lectura de logs solo administradores" ON public.event_logs;

CREATE POLICY "Lectura pública de salas" ON public.rr_rooms FOR SELECT USING (true);
CREATE POLICY "Inserción de salas" ON public.rr_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización de salas" ON public.rr_rooms FOR UPDATE USING (true);
CREATE POLICY "Lectura pública de jugadores en salas" ON public.rr_room_players FOR SELECT USING (true);
CREATE POLICY "Inserción de jugadores en salas" ON public.rr_room_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización de jugadores en salas" ON public.rr_room_players FOR UPDATE USING (true);
CREATE POLICY "Salida de jugadores de salas" ON public.rr_room_players FOR DELETE USING (true);
CREATE POLICY "Lectura de partidas de ruleta rusa" ON public.rr_games FOR SELECT USING (true);
CREATE POLICY "Lectura de turnos de ruleta rusa" ON public.rr_turns FOR SELECT USING (true);
CREATE POLICY "Lectura de transacciones de saldo" ON public.balance_transactions FOR SELECT USING (true);
CREATE POLICY "Inserción de logs" ON public.event_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Lectura de logs solo administradores" ON public.event_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin')
  OR auth.uid() IS NULL
);

-- 7. PUBLICACIÓN EN TIEMPO REAL (REALTIME)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_rooms; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_room_players; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_games; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_turns; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.event_logs; EXCEPTION WHEN duplicate_object THEN END;
END $$;
