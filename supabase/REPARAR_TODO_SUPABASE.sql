-- ==============================================================
-- 🚀 SMR2 WEB · SCRIPT DEFINITIVO Y TOTAL PARA SUPABASE (V2 REPARADA)
-- ==============================================================
-- Este script soluciona los errores 404 y 400 de tu consola:
--   - Error 42703: column "changes" of relation "app_updates" does not exist (SOLUCIONADO).
--   - Error 404 en chat_messages y calendar_events (crea las tablas que faltan).
--   - Error 400 en profiles y party_farm_data (añade todas las columnas necesarias).
--   - Fallo de WebSocket de Supabase Realtime (agrega las tablas a la publicación).
--
-- INSTRUCCIONES:
-- 1. Ve a tu panel de Supabase: https://supabase.com/dashboard/project/ehzekojovbxdkcmfbugc
-- 2. En el menú de la izquierda entra en "SQL Editor".
-- 3. Pulsa en "+ New Query" (Nueva consulta).
-- 4. Copia y pega TODO este archivo y pulsa "Run" (botón verde).
-- ==============================================================

-- 1. TABLA: PROFILES (Perfiles, Monedas, Botellón y Ajustes)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  coins BIGINT DEFAULT 1000 NOT NULL,
  biggest_win BIGINT DEFAULT 0 NOT NULL,
  streak_count INTEGER DEFAULT 1 NOT NULL,
  last_claim_date TIMESTAMP WITH TIME ZONE,
  last_spin_date TIMESTAMP WITH TIME ZONE,
  last_rescue_date TIMESTAMP WITH TIME ZONE,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'delegado', 'admin')),
  avatar_color TEXT DEFAULT 'emerald',
  full_name TEXT,
  student_number TEXT,
  party_farm_data JSONB DEFAULT '{}'::jsonb,
  sound_enabled BOOLEAN DEFAULT true,
  games_played BIGINT DEFAULT 0,
  games_won BIGINT DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar que todas las columnas existan si la tabla ya había sido creada parcialmente
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS coins BIGINT DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS biggest_win BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_spin_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_rescue_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT 'emerald',
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS student_number TEXT,
  ADD COLUMN IF NOT EXISTS party_farm_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS games_played BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_won BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles(coins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_party_farm ON public.profiles USING gin (party_farm_data);

-- 2. TABLA: CALENDAR_EVENTS (Horario, Exámenes, Tareas de Aula 204)
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
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'homework',
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS delivery_url TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT DEFAULT 'Delegado SMR2';

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_subject ON public.calendar_events(subject);

-- 3. TABLA: CHAT_MESSAGES (Tablón en vivo y avisos)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  is_system_win BOOLEAN DEFAULT false,
  win_amount BIGINT,
  multiplier NUMERIC(8, 2),
  game TEXT,
  pinned BOOLEAN DEFAULT false,
  reply_to_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS is_system_win BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS win_amount BIGINT,
  ADD COLUMN IF NOT EXISTS multiplier NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS game TEXT,
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reply_to_username TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- 4. TABLA: CHAT_MESSAGE_LIKES (Likes persistentes del chat)
CREATE TABLE IF NOT EXISTS public.chat_message_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.chat_message_likes
  ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_chat_message_likes_msg ON public.chat_message_likes (message_id);

-- 5. TABLA: ANNOUNCEMENTS (Comunicados oficiales)
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

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'Aviso',
  ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '/',
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS author_username TEXT DEFAULT 'SMR2',
  ADD COLUMN IF NOT EXISTS sent_to_push BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements (created_at DESC);

-- 6. TABLA: APP_UPDATES (Sistema de Actualizaciones de la Web)
CREATE TABLE IF NOT EXISTS public.app_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar que la columna 'changes' y demás columnas existan SIEMPRE antes de insertar datos
ALTER TABLE public.app_updates
  ADD COLUMN IF NOT EXISTS version TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS changes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Insertar la versión inicial 0.0.1 Beta de forma 100% segura
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_updates WHERE version = '0.0.1-beta') THEN
    INSERT INTO public.app_updates (version, title, description, changes)
    VALUES (
      '0.0.1-beta',
      'Lanzamiento Inicial SMR2 Portal',
      'Portal de 2º SMR con Tablón en vivo, Horario Aula 204 y La Bolsa.',
      '["Sistema de chat en vivo", "Economía virtual y minijuegos", "Mascota asistente PUTOISAAC"]'::jsonb
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 7. TABLA: PUSH_SUBSCRIPTIONS (Notificaciones Web Push)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS endpoint TEXT,
  ADD COLUMN IF NOT EXISTS p256dh TEXT,
  ADD COLUMN IF NOT EXISTS auth TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 8. TABLAS RULETA RUSA Y SALDO
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

ALTER TABLE public.balance_transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS amount BIGINT,
  ADD COLUMN IF NOT EXISTS balance_before BIGINT,
  ADD COLUMN IF NOT EXISTS balance_after BIGINT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

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

ALTER TABLE public.rr_rooms
  ADD COLUMN IF NOT EXISTS code VARCHAR(6),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS host_username TEXT,
  ADD COLUMN IF NOT EXISTS bet_amount BIGINT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_players INT DEFAULT 6,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS pot BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

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

ALTER TABLE public.rr_room_players
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rr_rooms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS seat_order INT,
  ADD COLUMN IF NOT EXISTS is_alive BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

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

ALTER TABLE public.rr_games
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rr_rooms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS bullet_chamber INT,
  ADD COLUMN IF NOT EXISTS current_chamber INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_player_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS active_player_username TEXT,
  ADD COLUMN IF NOT EXISTS turn_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS winner_username TEXT,
  ADD COLUMN IF NOT EXISTS round_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

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

ALTER TABLE public.rr_turns
  ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES public.rr_games(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rr_rooms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS player_username TEXT,
  ADD COLUMN IF NOT EXISTS chamber_index INT,
  ADD COLUMN IF NOT EXISTS result TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

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

ALTER TABLE public.event_logs
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rr_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES public.rr_games(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 9. TABLAS DE LA BOLSA (MARKET STATE, INVESTMENTS, PRICE HISTORY)
CREATE TABLE IF NOT EXISTS public.market_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_price NUMERIC(12, 4) DEFAULT 10.0000 NOT NULL,
  total_shares NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL,
  pool_balance NUMERIC(18, 4) DEFAULT 10000.0000 NOT NULL,
  reserve_balance NUMERIC(18, 4) DEFAULT 25000.0000 NOT NULL,
  total_volume BIGINT DEFAULT 0 NOT NULL,
  total_investors INT DEFAULT 0 NOT NULL,
  fee_rate NUMERIC(6, 4) DEFAULT 0.0200 NOT NULL,
  cooldown_seconds INT DEFAULT 60 NOT NULL,
  min_investment BIGINT DEFAULT 10 NOT NULL,
  max_investment BIGINT DEFAULT 25000 NOT NULL,
  last_event TEXT DEFAULT 'Apertura de mercado' NOT NULL,
  last_event_type TEXT DEFAULT 'neutral' NOT NULL,
  last_event_impact NUMERIC(6, 4) DEFAULT 0.0000 NOT NULL,
  last_tick_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.market_state WHERE id = 1) THEN
    INSERT INTO public.market_state (id, current_price, total_shares, pool_balance, reserve_balance, total_volume, total_investors, fee_rate, cooldown_seconds, min_investment, max_investment, last_event, last_event_type, last_event_impact)
    VALUES (1, 10.0000, 0.0000, 10000.0000, 25000.0000, 0, 0, 0.0200, 60, 10, 25000, 'Apertura de mercado', 'neutral', 0.0000);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  shares NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL,
  total_invested BIGINT DEFAULT 0 NOT NULL,
  average_buy_price NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL,
  realized_pnl BIGINT DEFAULT 0 NOT NULL,
  last_trade_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_user_investment UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  shares NUMERIC(18, 4) NOT NULL,
  price_per_share NUMERIC(12, 4) NOT NULL,
  gross_amount BIGINT NOT NULL,
  fee_amount BIGINT NOT NULL,
  net_amount BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  price NUMERIC(12, 4) NOT NULL,
  event TEXT,
  event_type TEXT DEFAULT 'neutral',
  volume BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TRIGGER AUTOMÁTICO AL REGISTRAR UN NUEVO USUARIO
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

-- 11. SEGURIDAD Y PERMISOS (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'profiles', 'chat_messages', 'calendar_events', 'app_updates', 
        'balance_transactions', 'event_logs', 'rr_rooms', 'rr_room_players', 
        'rr_games', 'rr_turns', 'chat_message_likes', 'push_subscriptions', 
        'announcements', 'market_state', 'investments', 'transactions', 'price_history'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Políticas permisivas para la clase
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Creación de perfiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizar perfil de usuario" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Lectura pública de eventos" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Creación de eventos" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Modificación de eventos" ON public.calendar_events FOR UPDATE USING (true);
CREATE POLICY "Borrado de eventos" ON public.calendar_events FOR DELETE USING (true);

CREATE POLICY "Lectura pública de chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Creación de mensajes" ON public.chat_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Lectura pública de likes" ON public.chat_message_likes FOR SELECT USING (true);
CREATE POLICY "Insertar likes" ON public.chat_message_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Borrar likes" ON public.chat_message_likes FOR DELETE USING (true);

CREATE POLICY "Lectura de anuncios" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Inserción de anuncios" ON public.announcements FOR INSERT WITH CHECK (true);

CREATE POLICY "Lectura de actualizaciones" ON public.app_updates FOR SELECT USING (true);
CREATE POLICY "Inserción de actualizaciones" ON public.app_updates FOR INSERT WITH CHECK (true);

CREATE POLICY "Lectura push" ON public.push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Gestión push" ON public.push_subscriptions FOR ALL USING (true);

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
CREATE POLICY "Lectura de logs solo administradores" ON public.event_logs FOR SELECT USING (true);

CREATE POLICY "Lectura de market_state" ON public.market_state FOR SELECT USING (true);
CREATE POLICY "Actualizar market_state" ON public.market_state FOR ALL USING (true);
CREATE POLICY "Lectura de investments" ON public.investments FOR SELECT USING (true);
CREATE POLICY "Gestión investments" ON public.investments FOR ALL USING (true);
CREATE POLICY "Lectura transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Inserción transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Lectura price_history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Inserción price_history" ON public.price_history FOR INSERT WITH CHECK (true);

-- 12. HABILITAR REPLICACIÓN EN TIEMPO REAL (SUPABASE REALTIME)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.app_updates REPLICA IDENTITY FULL;
ALTER TABLE public.market_state REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.market_state; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_rooms; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_room_players; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_games; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_turns; EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- ==============================================================
-- ¡BASE DE DATOS 100% OPERATIVA PARA 2º SMR!
-- ==============================================================
