-- ============================================================================
-- SCRIPT DE BLINDAJE DE SEGURIDAD DEFINITIVO PARA SUPABASE (POSTGRESQL / RLS)
-- SMR2 - PORTAL DEL AULA 35 (CURSO 2026/2027)
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Abre el panel de Supabase: SQL Editor -> New Query.
-- 2. Asegúrate de vaciar completamente la pestaña (sin nada seleccionado).
-- 3. Pega este contenido completo y pulsa en "Run" (o Ctrl+Enter).
-- ============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS QUE EXISTAN
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles', 'calendar_events', 'chat_messages', 'chat_message_likes',
        'chat_message_comments', 'community_feedback', 'feedback_votes',
        'market_state', 'investments', 'transactions', 'price_history',
        'balance_transactions', 'rr_rooms', 'rr_room_players', 'rr_games',
        'rr_turns', 'event_logs', 'push_subscriptions', 'app_updates'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        END IF;
    END LOOP;
END $$;

-- 2. ELIMINAR DE FORMA DINÁMICA Y SEGURA TODAS LAS POLÍTICAS PREVIAS PERMISIVAS
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'profiles', 'calendar_events', 'chat_messages', 'chat_message_likes',
            'chat_message_comments', 'community_feedback', 'feedback_votes',
            'market_state', 'investments', 'transactions', 'price_history',
            'balance_transactions', 'rr_rooms', 'rr_room_players', 'rr_games',
            'rr_turns', 'event_logs', 'push_subscriptions', 'app_updates'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 3. POLÍTICAS RLS SEGURAS PARA PROFILES
-- Lectura pública: Necesaria para el feed de clase, perfiles de compañeros y ranking de alumnos
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (true);

-- Inserción: Solo el propio usuario autenticado durante el registro (su ID de auth.uid())
CREATE POLICY "profiles_insert_owner" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- Actualización: Solo el dueño de la cuenta puede modificar su propio registro
CREATE POLICY "profiles_update_owner" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- 4. TRIGGER POSTGRESQL ANTI-ESCALADA DE PRIVILEGIOS
-- Impide que un usuario ordinario modifique su columna 'role' (ej: auto-nombrarse admin) o 'is_banned'
CREATE OR REPLACE FUNCTION public.protect_profiles_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la modificación proviene de un usuario autenticado (no llamadas directas internas de administración)
  IF auth.uid() IS NOT NULL THEN
    -- Impedir modificar el rol (solo modificable por administradores legítimos desde el backend)
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

-- 5. CALENDAR_EVENTS (AGENDA Y TAREAS DE CLASE)
-- Lectura pública para que todos los alumnos vean el horario
CREATE POLICY "calendar_select_public" ON public.calendar_events
  FOR SELECT USING (true);

-- Solo administradores o delegados pueden crear, editar o borrar eventos del calendario
CREATE POLICY "calendar_insert_staff" ON public.calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'delegado'))
  );

CREATE POLICY "calendar_update_staff" ON public.calendar_events
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'delegado'))
  );

CREATE POLICY "calendar_delete_staff" ON public.calendar_events
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'delegado'))
  );

-- 6. EVENT_LOGS (AUDITORÍA FORENSE DEL SERVIDOR)
-- Inserción de logs permitida para que el sistema registre acciones
CREATE POLICY "event_logs_insert_system" ON public.event_logs
  FOR INSERT WITH CHECK (true);

-- Lectura estrictamente para administradores (cierra la brecha previa de OR auth.uid() IS NULL)
CREATE POLICY "event_logs_select_admin_only" ON public.event_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- 7. CHAT_MESSAGES Y COMENTARIOS
CREATE POLICY "chat_select_public" ON public.chat_messages
  FOR SELECT USING (true);

CREATE POLICY "chat_insert_authenticated" ON public.chat_messages
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_message_likes') THEN
        EXECUTE 'CREATE POLICY "chat_likes_all" ON public.chat_message_likes FOR ALL USING (true) WITH CHECK (true);';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_message_comments') THEN
        EXECUTE 'CREATE POLICY "chat_comments_select" ON public.chat_message_comments FOR SELECT USING (true);';
        EXECUTE 'CREATE POLICY "chat_comments_insert" ON public.chat_message_comments FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);';
    END IF;
END $$;

-- 8. COMMUNITY_FEEDBACK (INCIDENCIAS Y SUGERENCIAS)
CREATE POLICY "feedback_select_public" ON public.community_feedback
  FOR SELECT USING (true);

CREATE POLICY "feedback_insert_authenticated" ON public.community_feedback
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "feedback_update_staff" ON public.community_feedback
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'delegado'))
  );

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback_votes') THEN
        EXECUTE 'CREATE POLICY "feedback_votes_all" ON public.feedback_votes FOR ALL USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);';
    END IF;
END $$;

-- 9. RULETA RUSA Y SALAS DE JUEGO (LECTURA PÚBLICA, GESTIÓN POR SERVIDOR)
CREATE POLICY "rr_rooms_select_public" ON public.rr_rooms FOR SELECT USING (true);
CREATE POLICY "rr_room_players_select_public" ON public.rr_room_players FOR SELECT USING (true);
CREATE POLICY "rr_games_select_public" ON public.rr_games FOR SELECT USING (true);
CREATE POLICY "rr_turns_select_public" ON public.rr_turns FOR SELECT USING (true);

-- 10. MERCADO, INVERSIONES Y TRANSACCIONES
CREATE POLICY "market_select_public" ON public.market_state FOR SELECT USING (true);
CREATE POLICY "price_history_select_public" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "transactions_select_public" ON public.transactions FOR SELECT USING (true);

CREATE POLICY "investments_select_owner" ON public.investments
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "balance_tx_select_owner" ON public.balance_transactions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
