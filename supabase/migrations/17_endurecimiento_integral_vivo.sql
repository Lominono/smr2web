-- ============================================================================
-- MIGRACIÓN 17: ENDURECIMIENTO INTEGRAL DE SEGURIDAD Y ALINEACIÓN DE ESQUEMA
-- Proyecto: smr2web (ehzekojovbxdkcmfbugc)
-- ============================================================================
-- 100% idempotente: alinea columnas/tablas usadas por el servidor Next.js,
-- corrige vistas SECURITY INVOKER, bloquea search_path y privilegios EXECUTE
-- en funciones SECURITY DEFINER, y elimina todas las políticas RLS abiertas
-- (USING (true), WITH CHECK (true), auth.uid() IS NULL).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ALINEACIÓN SEGURA DEL ESQUEMA EN VIVO CON LA APLICACIÓN
-- ----------------------------------------------------------------------------

-- 1.1 Perfiles: columnas de mascotas y granja
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mascota_equipada TEXT,
  ADD COLUMN IF NOT EXISTS mascotas_desbloqueadas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS party_farm_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS mascota_equipada TEXT;

-- 1.2 Ledger de monedas (balance_transactions)
ALTER TABLE public.balance_transactions
  ADD COLUMN IF NOT EXISTS balance_before BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.balance_transactions
  ALTER COLUMN reason SET DEFAULT 'transaction';

CREATE INDEX IF NOT EXISTS idx_balance_tx_user_created
  ON public.balance_transactions(user_id, created_at DESC);

-- 1.3 Tabla de recibos firmados (anti-replay de créditos)
CREATE TABLE IF NOT EXISTS public.wallet_receipts (
  receipt_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_receipts_user
  ON public.wallet_receipts(user_id, created_at DESC);

-- 1.4 Tabla de secretos del servidor para Ruleta Rusa
CREATE TABLE IF NOT EXISTS public.rr_game_secrets (
  game_id UUID PRIMARY KEY,
  bullet_chamber INT NOT NULL CHECK (bullet_chamber >= 0 AND bullet_chamber < 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.5 Tabla de auditoría inmutable (event_logs)
CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT,
  room_id UUID,
  game_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON public.event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON public.event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON public.event_logs(user_id);

-- 1.6 Inversiones y mercado en tiempo real
ALTER TABLE public.market_state
  ADD COLUMN IF NOT EXISTS treasury_balance NUMERIC(18, 4) DEFAULT 5000.0000,
  ADD COLUMN IF NOT EXISTS total_revenue_generated BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_dividends_paid BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arcade_rake_accumulated BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parody_stocks JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS ticker TEXT NOT NULL DEFAULT 'BTLN',
  ADD COLUMN IF NOT EXISTS total_invested_coins BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_withdrawn_coins BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.investments
  DROP CONSTRAINT IF EXISTS investments_user_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_investments_user_ticker'
  ) THEN
    ALTER TABLE public.investments ADD CONSTRAINT uq_investments_user_ticker UNIQUE (user_id, ticker);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_investments_user_ticker
  ON public.investments(user_id, ticker);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Alumno',
  ADD COLUMN IF NOT EXISTS ticker TEXT NOT NULL DEFAULT 'BTLN',
  ADD COLUMN IF NOT EXISTS coins_amount BIGINT,
  ADD COLUMN IF NOT EXISTS shares_amount NUMERIC(18, 4),
  ADD COLUMN IF NOT EXISTS price_per_share NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS fee_coins BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_coins BIGINT,
  ADD COLUMN IF NOT EXISTS price_impact_percent NUMERIC(8, 4) DEFAULT 0.0000;

ALTER TABLE public.transactions
  ALTER COLUMN shares DROP NOT NULL,
  ALTER COLUMN price DROP NOT NULL,
  ALTER COLUMN total_amount DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_ticker_created
  ON public.transactions(ticker, created_at DESC);

ALTER TABLE public.price_history
  ADD COLUMN IF NOT EXISTS ticker TEXT NOT NULL DEFAULT 'BTLN',
  ADD COLUMN IF NOT EXISTS pool_balance NUMERIC(18, 4) DEFAULT 10000.0000,
  ADD COLUMN IF NOT EXISTS treasury_balance NUMERIC(18, 4) DEFAULT 5000.0000,
  ADD COLUMN IF NOT EXISTS total_shares NUMERIC(18, 4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'tick',
  ADD COLUMN IF NOT EXISTS event_description TEXT,
  ADD COLUMN IF NOT EXISTS player_username TEXT;

CREATE INDEX IF NOT EXISTS idx_price_history_ticker_created
  ON public.price_history(ticker, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. VISTAS: CAMBIAR A SECURITY INVOKER (ELIMINAR SECURITY_DEFINER_VIEW)
-- ----------------------------------------------------------------------------

ALTER VIEW IF EXISTS public.ranking_general SET (security_invoker = true);
ALTER VIEW IF EXISTS public.ranking_semanal SET (security_invoker = true);
ALTER VIEW IF EXISTS public.ranking_rachas SET (security_invoker = true);
ALTER VIEW IF EXISTS public.ranking_diario SET (security_invoker = true);
ALTER VIEW IF EXISTS public.leaderboard_ranking SET (security_invoker = true);

-- ----------------------------------------------------------------------------
-- 3. FUNCIONES: FIJAR search_path Y REVOCAR EJECUCIÓN ABIERTA A anon/authenticated
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  fn RECORD;
  ident_args TEXT;
BEGIN
  -- Fijar search_path en todas las funciones de public que no lo tengan definido
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname, p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    ident_args := pg_get_function_identity_arguments(fn.oid);

    IF fn.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(fn.proconfig) cfg WHERE cfg LIKE 'search_path=%'
    ) THEN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
        fn.nspname, fn.proname, ident_args
      );
    END IF;

    -- Revocar EXECUTE público / anon / authenticated sobre todas las RPC heredadas
    -- (los triggers siguen ejecutándose sin necesidad de GRANT EXECUTE al invocador)
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.nspname, fn.proname, ident_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      fn.nspname, fn.proname, ident_args
    );
  END LOOP;
END $$;

-- Helper interno sin recursión en esquema privado (no expuesto vía PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin_or_delegado()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND (
        p.role IN ('admin', 'delegado')
        OR p.rol IN ('admin', 'moderador')
      )
      AND COALESCE(p.is_banned, false) = false
      AND COALESCE(p.baneado, false) = false
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin_or_delegado() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin_or_delegado() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. TRIGGERS DE INTEGRIDAD SOBRE PROFILES (ANTI-ESCALADA DE SALDO/ROL/BANEOS)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.protect_profiles_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR (SELECT auth.role()) = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.role := 'student';
  NEW.rol := 'alumno';
  NEW.is_banned := false;
  NEW.baneado := false;
  NEW.ban_reason := NULL;
  NEW.motivo_ban := NULL;
  NEW.coins := LEAST(GREATEST(COALESCE(NEW.coins, 1000), 0), 1000);
  NEW.biggest_win := 0;
  NEW.games_played := 0;
  NEW.games_won := 0;
  NEW.puntos_total := LEAST(GREATEST(COALESCE(NEW.puntos_total, 0), 0), 1000);
  NEW.monedas_ruleta_yoshi := 0;
  NEW.items_comprados := '[]'::jsonb;
  NEW.mascotas_desbloqueadas := '[]'::jsonb;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_profiles_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.protect_profiles_insert() TO service_role;

DROP TRIGGER IF EXISTS trg_protect_profiles_insert ON public.profiles;
CREATE TRIGGER trg_protect_profiles_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_profiles_insert();

CREATE OR REPLACE FUNCTION private.protect_profiles_own_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR (SELECT auth.role()) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida para modificar perfiles.';
  END IF;

  NEW.coins := OLD.coins;
  NEW.biggest_win := OLD.biggest_win;
  NEW.streak_count := OLD.streak_count;
  NEW.games_played := OLD.games_played;
  NEW.games_won := OLD.games_won;
  NEW.role := OLD.role;
  NEW.rol := OLD.rol;
  NEW.is_banned := OLD.is_banned;
  NEW.baneado := OLD.baneado;
  NEW.ban_reason := OLD.ban_reason;
  NEW.motivo_ban := OLD.motivo_ban;
  NEW.items_comprados := OLD.items_comprados;
  NEW.mascotas_desbloqueadas := OLD.mascotas_desbloqueadas;
  NEW.puntos_total := OLD.puntos_total;
  NEW.xp_nivel := OLD.xp_nivel;
  NEW.racha_actual := OLD.racha_actual;
  NEW.mejor_racha := OLD.mejor_racha;
  NEW.monedas_ruleta_yoshi := OLD.monedas_ruleta_yoshi;
  NEW.last_claim_date := OLD.last_claim_date;
  NEW.last_spin_date := OLD.last_spin_date;
  NEW.last_rescue_date := OLD.last_rescue_date;
  NEW.email := OLD.email;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_profiles_own_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.protect_profiles_own_columns() TO service_role;

DROP TRIGGER IF EXISTS trg_protect_profiles_own_columns ON public.profiles;
CREATE TRIGGER trg_protect_profiles_own_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_profiles_own_columns();

-- ----------------------------------------------------------------------------
-- 5. LIMPIEZA TOTAL DE POLÍTICAS RLS PERMISIVAS Y APLICACIÓN DE POLÍTICAS ESTRICTAS
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
  target_tables TEXT[] := ARRAY[
    'achievements', 'announcements', 'app_updates', 'apuntes', 'arcade_scores',
    'balance_transactions', 'calendar_events', 'canjes_pedidos', 'canjes_tienda',
    'chat_message_comments', 'chat_message_likes', 'chat_messages', 'checkins',
    'community_feedback', 'direct_messages', 'event_logs', 'feed_post_comments',
    'feed_post_likes', 'feed_posts', 'feedback_votes', 'inventario_usuario',
    'investments', 'juegos_puntuaciones', 'login_records', 'market_state',
    'message_likes', 'messages', 'notifications', 'pregunta_flash',
    'pregunta_flash_votos', 'price_history', 'profiles', 'push_subscriptions',
    'pvp_blackjack', 'pvp_partidas', 'reto_completado', 'retos',
    'rr_game_secrets', 'rr_games', 'rr_room_players', 'rr_rooms', 'rr_turns',
    'sesiones_clase', 'steven_ledger', 'transactions', 'user_skills',
    'wallet_receipts', 'yoshi_sesiones'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;

  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(target_tables)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 5.1 PROFILES: Sin exposición anónima de emails/NIAs; modificación limitada a columnas seguras propias
CREATE POLICY "profiles_select_own_or_staff" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id OR private.is_admin_or_delegado());

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (
  username, nombre, full_name, student_number, pc_seat,
  avatar_color, avatar_emoji, color_acento,
  sound_enabled, notifications_enabled, onboarding_completado,
  party_farm_data, mascota_equipada, banner_estilo, titulo_personalizado, frase
) ON public.profiles TO authenticated;

-- 5.2 TABLAS FINANCIERAS, SECRETOS Y AUDITORÍA (SOLO SERVIDOR / LECTURA PROPIA)
CREATE POLICY "balance_tx_select_own_or_staff" ON public.balance_transactions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "event_logs_select_staff" ON public.event_logs
  FOR SELECT TO authenticated
  USING (private.is_admin_or_delegado());

CREATE POLICY "steven_ledger_select_own_or_staff" ON public.steven_ledger
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "login_records_select_own_or_staff" ON public.login_records
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "yoshi_sesiones_select_own" ON public.yoshi_sesiones
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

-- wallet_receipts y rr_game_secrets tienen RLS activo y 0 políticas (solo service_role)

-- 5.3 MERCADO / BOLSA (Lectura pública de cotizaciones; escrituras SOLO servidor)
CREATE POLICY "market_state_select_public" ON public.market_state
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "price_history_select_public" ON public.price_history
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "transactions_select_public" ON public.transactions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "investments_select_public" ON public.investments
  FOR SELECT TO anon, authenticated USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.market_state FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.price_history FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.investments FROM anon, authenticated;

-- 5.4 RULETA RUSA Y PVP (Lectura sin escrituras directas desde cliente)
CREATE POLICY "rr_rooms_select_public" ON public.rr_rooms
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rr_room_players_select_public" ON public.rr_room_players
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rr_games_select_public" ON public.rr_games
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rr_turns_select_public" ON public.rr_turns
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "pvp_partidas_select_auth" ON public.pvp_partidas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pvp_blackjack_select_participant" ON public.pvp_blackjack
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = creador_id OR (SELECT auth.uid()) = oponente_id OR private.is_admin_or_delegado());

-- 5.5 CHAT, FEED Y COMENTARIOS (Sin auth.uid() IS NULL; escrituras autenticadas con autoría verificada)
CREATE POLICY "chat_messages_select_public" ON public.chat_messages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chat_messages_insert_auth" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "chat_messages_update_owner_or_staff" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado())
  WITH CHECK ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());
CREATE POLICY "chat_messages_delete_owner_or_staff" ON public.chat_messages
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "chat_comments_select_public" ON public.chat_message_comments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chat_comments_insert_auth" ON public.chat_message_comments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "chat_comments_delete_owner_or_staff" ON public.chat_message_comments
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "chat_likes_select_public" ON public.chat_message_likes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chat_likes_insert_own" ON public.chat_message_likes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "chat_likes_delete_own" ON public.chat_message_likes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "messages_select_public" ON public.messages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "messages_insert_auth" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "messages_delete_owner_or_staff" ON public.messages
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "message_likes_select_public" ON public.message_likes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "message_likes_insert_own" ON public.message_likes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "message_likes_delete_own" ON public.message_likes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "feed_posts_select_public" ON public.feed_posts
  FOR SELECT TO anon, authenticated USING (COALESCE(soft_deleted, false) = false);
CREATE POLICY "feed_posts_insert_auth" ON public.feed_posts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "feed_posts_update_owner_or_staff" ON public.feed_posts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado())
  WITH CHECK ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());
CREATE POLICY "feed_posts_delete_owner_or_staff" ON public.feed_posts
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "feed_comments_select_public" ON public.feed_post_comments
  FOR SELECT TO anon, authenticated USING (COALESCE(soft_deleted, false) = false);
CREATE POLICY "feed_comments_insert_auth" ON public.feed_post_comments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "feed_comments_delete_owner_or_staff" ON public.feed_post_comments
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "feed_likes_select_public" ON public.feed_post_likes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "feed_likes_insert_own" ON public.feed_post_likes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "feed_likes_delete_own" ON public.feed_post_likes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 5.6 CALENDARIO, ANUNCIOS, ACTUALIZACIONES, RETOS Y ENCUESTAS
CREATE POLICY "calendar_select_public" ON public.calendar_events
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "calendar_insert_staff" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin_or_delegado() AND ((SELECT auth.uid()) = created_by OR created_by IS NULL));
CREATE POLICY "calendar_update_staff_or_creator" ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (private.is_admin_or_delegado() OR (SELECT auth.uid()) = created_by)
  WITH CHECK (private.is_admin_or_delegado() OR (SELECT auth.uid()) = created_by);
CREATE POLICY "calendar_delete_staff_or_creator" ON public.calendar_events
  FOR DELETE TO authenticated
  USING (private.is_admin_or_delegado() OR (SELECT auth.uid()) = created_by);

CREATE POLICY "announcements_select_public" ON public.announcements
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "announcements_insert_staff" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "announcements_update_staff" ON public.announcements
  FOR UPDATE TO authenticated USING (private.is_admin_or_delegado()) WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "announcements_delete_staff" ON public.announcements
  FOR DELETE TO authenticated USING (private.is_admin_or_delegado());

CREATE POLICY "app_updates_select_public" ON public.app_updates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app_updates_insert_staff" ON public.app_updates
  FOR INSERT TO authenticated WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "app_updates_update_staff" ON public.app_updates
  FOR UPDATE TO authenticated USING (private.is_admin_or_delegado()) WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "app_updates_delete_staff" ON public.app_updates
  FOR DELETE TO authenticated USING (private.is_admin_or_delegado());

CREATE POLICY "retos_select_public" ON public.retos
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "retos_insert_staff" ON public.retos
  FOR INSERT TO authenticated WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "retos_update_staff" ON public.retos
  FOR UPDATE TO authenticated USING (private.is_admin_or_delegado()) WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "retos_delete_staff" ON public.retos
  FOR DELETE TO authenticated USING (private.is_admin_or_delegado());

CREATE POLICY "pregunta_flash_select_public" ON public.pregunta_flash
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pregunta_flash_insert_staff" ON public.pregunta_flash
  FOR INSERT TO authenticated WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "pregunta_flash_update_staff" ON public.pregunta_flash
  FOR UPDATE TO authenticated USING (private.is_admin_or_delegado()) WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "pregunta_flash_delete_staff" ON public.pregunta_flash
  FOR DELETE TO authenticated USING (private.is_admin_or_delegado());

CREATE POLICY "sesiones_clase_select_auth" ON public.sesiones_clase
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sesiones_clase_insert_staff" ON public.sesiones_clase
  FOR INSERT TO authenticated WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "sesiones_clase_update_staff" ON public.sesiones_clase
  FOR UPDATE TO authenticated USING (private.is_admin_or_delegado()) WITH CHECK (private.is_admin_or_delegado());
CREATE POLICY "sesiones_clase_delete_staff" ON public.sesiones_clase
  FOR DELETE TO authenticated USING (private.is_admin_or_delegado());

-- 5.7 INCIDENCIAS, VOTOS Y APUNTES
CREATE POLICY "feedback_select_public" ON public.community_feedback
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "feedback_insert_auth" ON public.community_feedback
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "feedback_update_owner_or_staff" ON public.community_feedback
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado())
  WITH CHECK ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());
CREATE POLICY "feedback_delete_owner_or_staff" ON public.community_feedback
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "feedback_votes_select_public" ON public.feedback_votes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "feedback_votes_insert_own" ON public.feedback_votes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "feedback_votes_delete_own" ON public.feedback_votes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "apuntes_select_public" ON public.apuntes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "apuntes_insert_auth" ON public.apuntes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "apuntes_update_owner_or_staff" ON public.apuntes
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado())
  WITH CHECK ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());
CREATE POLICY "apuntes_delete_owner_or_staff" ON public.apuntes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

-- 5.8 PUSH SUBSCRIPTIONS, NOTIFICACIONES Y MENSAJES DIRECTOS (PRIVACIDAD ESTRICTA)
CREATE POLICY "push_sub_select_own" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "push_sub_insert_own" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "push_sub_update_own" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "push_sub_delete_own" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "dm_select_participant" ON public.direct_messages
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);
CREATE POLICY "dm_insert_sender" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = sender_id);
CREATE POLICY "dm_update_participant" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id)
  WITH CHECK ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

-- 5.9 TABLAS DE PROGRESO / DATOS POR USUARIO
CREATE POLICY "achievements_select_public" ON public.achievements
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "arcade_scores_select_public" ON public.arcade_scores
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "arcade_scores_insert_own" ON public.arcade_scores
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "juegos_puntuaciones_select_public" ON public.juegos_puntuaciones
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "juegos_puntuaciones_insert_own" ON public.juegos_puntuaciones
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "canjes_tienda_select_own_or_staff" ON public.canjes_tienda
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "canjes_pedidos_select_own_or_staff" ON public.canjes_pedidos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "inventario_usuario_select_own_or_staff" ON public.inventario_usuario
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

CREATE POLICY "checkins_select_own_or_staff" ON public.checkins
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());
CREATE POLICY "checkins_insert_own" ON public.checkins
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "pregunta_flash_votos_select_own" ON public.pregunta_flash_votos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());
CREATE POLICY "pregunta_flash_votos_insert_own" ON public.pregunta_flash_votos
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "reto_completado_select_own_or_staff" ON public.reto_completado
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());
CREATE POLICY "reto_completado_insert_own" ON public.reto_completado
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_skills_select_own" ON public.user_skills
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_admin_or_delegado());

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
