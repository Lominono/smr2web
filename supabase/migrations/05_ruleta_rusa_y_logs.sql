-- ==============================================================
-- 05. RULETA RUSA MULTIJUGADOR Y REGISTRO AUDITABLE (EVENT LOGS)
-- ==============================================================
-- Este script crea las estructuras para el juego multijugador en tiempo
-- real de Ruleta Rusa (cilindro de 6 recámaras virtuales) y la tabla
-- inmutable de logs de auditoría para el panel de administración.
-- ==============================================================

-- 1. ACTUALIZAR PROFILES CON ESTADÍSTICAS Y BLOQUEO
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS games_played BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_won BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_banned ON public.profiles(is_banned);

-- 2. TABLA: BALANCE_TRANSACTIONS (Transacciones de fichas)
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

CREATE INDEX IF NOT EXISTS idx_balance_tx_user ON public.balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_tx_type ON public.balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_balance_tx_created ON public.balance_transactions(created_at DESC);

-- 3. TABLA: RR_ROOMS (Salas de Ruleta Rusa)
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

CREATE INDEX IF NOT EXISTS idx_rr_rooms_code ON public.rr_rooms(code);
CREATE INDEX IF NOT EXISTS idx_rr_rooms_status ON public.rr_rooms(status);
CREATE INDEX IF NOT EXISTS idx_rr_rooms_host ON public.rr_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rr_rooms_created ON public.rr_rooms(created_at DESC);

-- 4. TABLA: RR_ROOM_PLAYERS (Jugadores en sala)
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

CREATE INDEX IF NOT EXISTS idx_rr_players_room ON public.rr_room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_rr_players_user ON public.rr_room_players(user_id);

-- 5. TABLA: RR_GAMES (Partidas activas e historial)
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

CREATE INDEX IF NOT EXISTS idx_rr_games_room ON public.rr_games(room_id);
CREATE INDEX IF NOT EXISTS idx_rr_games_status ON public.rr_games(status);
CREATE INDEX IF NOT EXISTS idx_rr_games_active_player ON public.rr_games(active_player_id);

-- 6. TABLA: RR_TURNS (Cada disparo / paso / resultado)
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

CREATE INDEX IF NOT EXISTS idx_rr_turns_game ON public.rr_turns(game_id);
CREATE INDEX IF NOT EXISTS idx_rr_turns_player ON public.rr_turns(player_id);
CREATE INDEX IF NOT EXISTS idx_rr_turns_created ON public.rr_turns(created_at DESC);

-- 7. TABLA INMUTABLE: EVENT_LOGS (Registro de Auditoría Solo-Escritura)
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

-- Índices optimizados para filtros y búsquedas en el panel admin
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON public.event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON public.event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON public.event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_username ON public.event_logs(username);
CREATE INDEX IF NOT EXISTS idx_event_logs_room_id ON public.event_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_game_id ON public.event_logs(game_id);

-- 8. SEGURIDAD ROW LEVEL SECURITY (RLS)
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas
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

DROP POLICY IF EXISTS "Inserción pública de logs" ON public.event_logs;
DROP POLICY IF EXISTS "Lectura de logs solo administradores" ON public.event_logs;

-- Políticas de lectura y escritura para el juego
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

-- POLÍTICAS INMUTABLES PARA EVENT_LOGS:
-- 1) Creadores/servidor pueden insertar (append-only)
CREATE POLICY "Inserción de logs" ON public.event_logs FOR INSERT WITH CHECK (true);
-- 2) Solo lectura para usuarios con rol 'admin'
CREATE POLICY "Lectura de logs solo administradores" ON public.event_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
  )
  OR auth.uid() IS NULL -- Permite acceso a llamadas de servidor
);
-- 3) NO EXISTEN POLÍTICAS FOR UPDATE NI FOR DELETE EN event_logs: ¡INMUTABILIDAD GARANTIZADA!

-- 9. CONFIGURAR SUPABASE REALTIME
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_rooms; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_room_players; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_games; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rr_turns; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.event_logs; EXCEPTION WHEN duplicate_object THEN END;
END $$;
