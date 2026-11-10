-- ============================================================================
-- SCRIPT DE BLINDAJE DE SEGURIDAD DEFINITIVO PARA SUPABASE (POSTGRESQL / RLS)
-- SMR2 - PORTAL DEL AULA 35 (CURSO 2026/2027)
-- ============================================================================
-- Este script revoca las políticas abiertas permisivas (USING true en UPDATE/DELETE)
-- y activa Row Level Security (RLS) estricto junto a triggers anti-escalada.
-- Ejecutar en el SQL Editor del panel de Supabase:
-- ============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS CORE
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_message_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rr_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rr_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_updates ENABLE ROW LEVEL SECURITY;

-- 2. LIMPIEZA TOTAL DE POLÍTICAS PREVIAS PERMISIVAS EN PROFILES
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Creación de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar saldo de usuario" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;

-- NUEVAS POLÍTICAS PARA PROFILES
-- Lectura pública: Necesaria para el tablón, perfiles de compañeros y ranking de clase
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (true);

-- Inserción: Solo durante registro coincidiendo con el UID autenticado o service_role
CREATE POLICY "profiles_insert_owner" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR auth.uid() = id
  );

-- Actualización: Solo el dueño de la cuenta puede actualizar su propio perfil
CREATE POLICY "profiles_update_owner" ON public.profiles
  FOR UPDATE USING (
    auth.role() = 'service_role' OR auth.uid() = id
  ) WITH CHECK (
    auth.role() = 'service_role' OR auth.uid() = id
  );

-- TRIGGER POSTGRESQL ANTI-ESCALADA DE PRIVILEGIOS
-- Previene que un usuario ordinario cambie su propio rol a 'admin' o desbanee su cuenta
CREATE OR REPLACE FUNCTION public.protect_profiles_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la modificación proviene de un cliente con token de usuario (no service_role del servidor)
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    -- Impedir escalada de rol (ej: ponerse 'admin' o 'delegado')
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Operación denegada por seguridad: No tienes permisos para alterar el rango o rol de usuario.';
    END IF;

    -- Impedir auto-desbanearse
    IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
      RAISE EXCEPTION 'Operación denegada por seguridad: No tienes permisos para alterar el estado de suspensión.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profiles_integrity ON public.profiles;
CREATE TRIGGER trg_protect_profiles_integrity
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profiles_integrity();

-- 3. CALENDAR_EVENTS (AGENDA LECTIVA Y TAREAS)
-- Evita que cualquiera pueda borrar o desconfigurar el calendario de la clase
DROP POLICY IF EXISTS "calendar_select_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_insert_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_update_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_delete_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "Lectura pública de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Creación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Modificación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Borrado de eventos" ON public.calendar_events;

CREATE POLICY "calendar_select_public" ON public.calendar_events
  FOR SELECT USING (true);

CREATE POLICY "calendar_insert_staff" ON public.calendar_events
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'delegado'))
  );

CREATE POLICY "calendar_update_staff" ON public.calendar_events
  FOR UPDATE USING (
    auth.role() = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'delegado'))
  );

CREATE POLICY "calendar_delete_staff" ON public.calendar_events
  FOR DELETE USING (
    auth.role() = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'delegado'))
  );

-- 4. EVENT_LOGS (AUDITORÍA FORENSE DEL SERVIDOR)
-- Cierra la brecha que permitía a usuarios sin sesión consultar IPs y registros
DROP POLICY IF EXISTS "Lectura de logs solo administradores" ON public.event_logs;
DROP POLICY IF EXISTS "Inserción de logs" ON public.event_logs;
DROP POLICY IF EXISTS "event_logs_select_policy" ON public.event_logs;

CREATE POLICY "event_logs_insert_system" ON public.event_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "event_logs_select_admin_only" ON public.event_logs
  FOR SELECT USING (
    auth.role() = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. CHAT_MESSAGES Y COMENTARIOS
DROP POLICY IF EXISTS "chat_select_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_likes_all_policy" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Lectura pública de chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Creación de mensajes" ON public.chat_messages;

CREATE POLICY "chat_select_public" ON public.chat_messages
  FOR SELECT USING (true);

CREATE POLICY "chat_insert_authenticated" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR auth.uid() IS NOT NULL
  );

CREATE POLICY "chat_likes_all" ON public.chat_message_likes
  FOR ALL USING (true) WITH CHECK (true);

-- 6. COMMUNITY_FEEDBACK (INCIDENCIAS Y SUGERENCIAS)
DROP POLICY IF EXISTS "feedback_all_policy" ON public.community_feedback;
DROP POLICY IF EXISTS "feedback_votes_all_policy" ON public.feedback_votes;

CREATE POLICY "feedback_select_public" ON public.community_feedback
  FOR SELECT USING (true);

CREATE POLICY "feedback_insert_author" ON public.community_feedback
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR auth.uid() IS NOT NULL
  );

CREATE POLICY "feedback_update_staff" ON public.community_feedback
  FOR UPDATE USING (
    auth.role() = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'delegado'))
  );

CREATE POLICY "feedback_votes_authenticated" ON public.feedback_votes
  FOR ALL USING (
    auth.role() = 'service_role' OR auth.uid() IS NOT NULL
  );

-- 7. RULETA RUSA Y SALAS DE JUEGO
DROP POLICY IF EXISTS "rr_rooms_all_policy" ON public.rr_rooms;
DROP POLICY IF EXISTS "rr_players_all_policy" ON public.rr_room_players;
DROP POLICY IF EXISTS "rr_games_all_policy" ON public.rr_games;
DROP POLICY IF EXISTS "rr_turns_all_policy" ON public.rr_turns;
DROP POLICY IF EXISTS "Lectura pública de salas" ON public.rr_rooms;
DROP POLICY IF EXISTS "Lectura de partidas de ruleta rusa" ON public.rr_games;

CREATE POLICY "rr_rooms_select_public" ON public.rr_rooms FOR SELECT USING (true);
CREATE POLICY "rr_rooms_manage_server" ON public.rr_rooms FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "rr_players_select_public" ON public.rr_room_players FOR SELECT USING (true);
CREATE POLICY "rr_players_manage_server" ON public.rr_room_players FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "rr_games_select_public" ON public.rr_games FOR SELECT USING (true);
CREATE POLICY "rr_games_manage_server" ON public.rr_games FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "rr_turns_select_public" ON public.rr_turns FOR SELECT USING (true);
CREATE POLICY "rr_turns_manage_server" ON public.rr_turns FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 8. ECONOMÍA, INVERSIONES Y TRANSACCIONES
DROP POLICY IF EXISTS "market_select_policy" ON public.market_state;
DROP POLICY IF EXISTS "market_update_policy" ON public.market_state;
DROP POLICY IF EXISTS "investments_all_policy" ON public.investments;
DROP POLICY IF EXISTS "transactions_all_policy" ON public.transactions;
DROP POLICY IF EXISTS "price_history_select_policy" ON public.price_history;
DROP POLICY IF EXISTS "balance_tx_all_policy" ON public.balance_transactions;

CREATE POLICY "market_select_public" ON public.market_state FOR SELECT USING (true);
CREATE POLICY "market_modify_server" ON public.market_state FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "price_history_select_public" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "price_history_insert_server" ON public.price_history FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "transactions_select_public" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "transactions_manage_server" ON public.transactions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "investments_select_owner" ON public.investments FOR SELECT USING (
  auth.role() = 'service_role' OR auth.uid() = user_id
);
CREATE POLICY "investments_manage_server" ON public.investments FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "balance_tx_select_owner" ON public.balance_transactions FOR SELECT USING (
  auth.role() = 'service_role' OR auth.uid() = user_id
);
CREATE POLICY "balance_tx_manage_server" ON public.balance_transactions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- FINALIZADO CON ÉXITO
