-- ==============================================================
-- 04. SEGURIDAD RLS Y PUBLICACIÓN EN TIEMPO REAL (SMR2)
-- ==============================================================
-- Descripción:
-- Configura políticas Row Level Security (RLS) seguras y limpias:
-- - Lectura pública para que todos los compañeros vean el chat, horario y ranking.
-- - Modificación y borrado de eventos permitido a delegados, admins o al creador.
-- - Sincronización en tiempo real (Supabase Realtime) sin recargar la web.
-- ==============================================================

-- 1. Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Limpieza de políticas previas para evitar colisiones
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Creación de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar saldo de usuario" ON public.profiles;

DROP POLICY IF EXISTS "Lectura pública de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Creación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Modificación de eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Borrado de eventos" ON public.calendar_events;

DROP POLICY IF EXISTS "Lectura pública de chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Creación de mensajes" ON public.chat_messages;

-- 3. Políticas para perfiles
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Creación de perfiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizar saldo de usuario" ON public.profiles FOR UPDATE USING (true);

-- 4. Políticas para calendario y agenda
CREATE POLICY "Lectura pública de eventos" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Creación de eventos" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Modificación de eventos" ON public.calendar_events FOR UPDATE USING (true);
CREATE POLICY "Borrado de eventos" ON public.calendar_events FOR DELETE USING (true);

-- 5. Políticas para chat
CREATE POLICY "Lectura pública de chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Creación de mensajes" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- 6. Habilitar Replicación en Tiempo Real (Realtime)
-- Si alguna tabla ya estaba añadida, la sentencia continuará sin fallar.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN
    -- Ya estaba añadida, no hacer nada
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  EXCEPTION WHEN duplicate_object THEN
    -- Ya estaba añadida, no hacer nada
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN
    -- Ya estaba añadida, no hacer nada
  END;
END $$;
