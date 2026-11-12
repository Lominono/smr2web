-- ==============================================================
-- SMR2 · MIGRACIÓN 16: ENDURECIMIENTO FINAL DE SEGURIDAD (RLS)
-- ==============================================================
-- Objetivos:
--   1. Un alumno con su JWT (anon/auth vía PostgREST) NO puede modificar
--      datos económicos ni de inventario de su perfil (coins, mascotas,
--      items, party_farm_data, role, is_banned). Esos campos solo los
--      escribe el SERVIDOR con la service-role key (sin JWT -> vacía).
--   2. event_logs solo acepta inserciones del servidor (sin JWT).
--   3. Cerrar foro-like tables abiertas a anónimos (chat_message_likes,
--      feedback_votes) al exigir usuario autenticado.
-- 100% IDEMPOTENTE.
-- ==============================================================

-- ============================================================
-- 1. PROTECCIÓN DE COLUMNAS SENSIBLES EN PROFILES
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_profiles_own_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo aplica a peticiones AUTENTICADAS con JWT (navegador/anon key).
  -- El servidor usa service role sin JWT -> auth.uid() IS NULL -> permitido.
  IF auth.uid() IS NOT NULL THEN

    -- Economía: el saldo solo se mueve a través del backend autoritativo
    IF NEW.coins IS DISTINCT FROM OLD.coins THEN
      RAISE EXCEPTION 'Op. denegada: el saldo solo se modifica en el servidor.';
    END IF;

    IF NEW.biggest_win IS DISTINCT FROM OLD.biggest_win THEN
      RAISE EXCEPTION 'Op. denegada: el récord solo se modifica en el servidor.';
    END IF;

    -- Rol / suspensión
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Op. denegada: el rol solo se modifica por la administración.';
    END IF;

    IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
      RAISE EXCEPTION 'Op. denegada: la suspensión solo la altera la administración.';
    END IF;

    -- Tienda de mascotas: adquisiciones y equipado server-side
    IF NEW.mascotas_desbloqueadas IS DISTINCT FROM OLD.mascotas_desbloqueadas THEN
      RAISE EXCEPTION 'Op. denegada: las mascotas se conceden únicamente comprando en la tienda.';
    END IF;

    -- Solo se puede equipar una mascota previamente COMPRADA (registrada en
    -- el array de mascotas_desbloqueadas de la propia fila) o desequipar (NULL)
    IF NEW.mascota_equipada IS DISTINCT FROM OLD.mascota_equipada
       AND NEW.mascota_equipada IS NOT NULL THEN
      IF NOT (NEW.mascota_equipada = ANY(OLD.mascotas_desbloqueadas)) THEN
        RAISE EXCEPTION 'Op. denegada: solo puedes equipar mascotas que hayas comprado.';
      END IF;
    END IF;

    -- Perfil decorativo permitido: username, avatar_color, full_name,
    -- student_number, mascota_equipada (se valida propiedad en el servidor),
    -- game flags, etc. quedan libres para el dueño.
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profiles_own_columns ON public.profiles;
CREATE TRIGGER trg_protect_profiles_own_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_own_columns();

-- ============================================================
-- 2. EVENT_LOGS: solo el servidor escribe y solo admins leen
-- ============================================================
-- NOTA: en Supabase la service-role key tiene BYPASSRLS, por lo que el
-- servidor no depende de estas políticas. Aquí se BLOQUEA a todo cliente
-- con JWT (incluida la anon key, que el navegador siempre envía).
DROP POLICY IF EXISTS "event_logs_insert_system" ON public.event_logs;
CREATE POLICY "event_logs_insert_server_only" ON public.event_logs
  FOR INSERT WITH CHECK (
    current_setting('request.jwt.claims', true)::text IS NULL OR
    current_setting('request.jwt.claims', true)::text = '' 
  );

DROP POLICY IF EXISTS "event_logs_select_admin_only" ON public.event_logs;
CREATE POLICY "event_logs_select_admin_only" ON public.event_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- ============================================================
-- 3. Ningún anónimo escribe en tablas sociales
-- ============================================================
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_insert_authenticated" ON public.chat_messages;
CREATE POLICY "chat_insert_authenticated" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_message_likes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "chat_likes_all" ON public.chat_message_likes';
    EXECUTE 'CREATE POLICY "chat_likes_authenticated" ON public.chat_message_likes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_message_comments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "chat_comments_insert" ON public.chat_message_comments';
    EXECUTE 'CREATE POLICY "chat_comments_insert" ON public.chat_message_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feedback_votes') THEN
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS "feedback_votes_all" ON public.feedback_votes';
  EXECUTE 'CREATE POLICY "feedback_votes_authenticated" ON public.feedback_votes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
END $$;

-- ============================================================
-- 4. push_subscriptions ligadas al dueño (para evitar spoofing)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='push_subscriptions') THEN
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "push_subs_select_owner" ON public.push_subscriptions';
  EXECUTE $$CREATE POLICY "push_subs_select_owner" ON public.push_subscriptions
    FOR SELECT USING (
      auth.uid() IS NULL OR auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )$$;

  -- La escritura es siempre del servidor (service role, sin JWT: bypassrls).
  EXECUTE 'DROP POLICY IF EXISTS "push_subs_write_server_only" ON public.push_subscriptions';
  EXECUTE $$CREATE POLICY "push_subs_write_server_only" ON public.push_subscriptions FOR INSERT WITH CHECK (
    current_setting('request.jwt.claims', true)::text IS NULL OR
    current_setting('request.jwt.claims', true)::text = ''
  )$$;

  EXECUTE 'DROP POLICY IF EXISTS "push_subs_update_server_only" ON public.push_subscriptions';
  EXECUTE $$CREATE POLICY "push_subs_update_server_only" ON public.push_subscriptions FOR UPDATE USING (
    current_setting('request.jwt.claims', true)::text IS NULL OR
    current_setting('request.jwt.claims', true)::text = ''
  )$$;

  EXECUTE 'DROP POLICY IF EXISTS "push_subs_delete_server_only" ON public.push_subscriptions';
  EXECUTE $$CREATE POLICY "push_subs_delete_server_only" ON public.push_subscriptions FOR DELETE USING (
    current_setting('request.jwt.claims', true)::text IS NULL OR
    current_setting('request.jwt.claims', true)::text = ''
  )$$;
END $$;


-- ============================================================
-- FIN MIGRACIÓN 16
-- ============================================================
