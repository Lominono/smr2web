-- ==============================================================
-- 13. MIGRACIÓN FEED DEFINITIVO: COMENTARIOS, LIKES Y REALTIME
-- ==============================================================
-- Ejecuta este script en el SQL Editor de Supabase para:
-- 1. Asegurar la tabla chat_message_comments con permisos completos y sin bloqueos de FK.
-- 2. Asegurar la tabla chat_message_likes con permisos completos.
-- 3. Activar replicación en tiempo real (Realtime WebSockets) para mensajes, comentarios y likes.
-- ==============================================================

-- 1. TABLA CHAT_MESSAGE_COMMENTS
CREATE TABLE IF NOT EXISTS public.chat_message_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar que user_id sea nullable para permitir comentarios de cualquier usuario sin bloqueo FK
ALTER TABLE public.chat_message_comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_message_comments DROP CONSTRAINT IF EXISTS chat_message_comments_user_id_fkey;
ALTER TABLE public.chat_message_comments DROP CONSTRAINT IF EXISTS chat_message_comments_message_id_fkey;

-- Índices de búsqueda y ordenación
CREATE INDEX IF NOT EXISTS idx_chat_message_comments_msg ON public.chat_message_comments (message_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_message_comments_created ON public.chat_message_comments (created_at DESC);

-- Habilitar RLS en chat_message_comments
ALTER TABLE public.chat_message_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de comentarios" ON public.chat_message_comments;
DROP POLICY IF EXISTS "Inserción pública de comentarios" ON public.chat_message_comments;
DROP POLICY IF EXISTS "Borrado de comentarios" ON public.chat_message_comments;

CREATE POLICY "Lectura pública de comentarios" ON public.chat_message_comments FOR SELECT USING (true);
CREATE POLICY "Inserción pública de comentarios" ON public.chat_message_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Borrado de comentarios" ON public.chat_message_comments FOR DELETE USING (true);

-- 2. TABLA CHAT_MESSAGE_LIKES
CREATE TABLE IF NOT EXISTS public.chat_message_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.chat_message_likes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_message_likes DROP CONSTRAINT IF EXISTS chat_message_likes_user_id_fkey;
ALTER TABLE public.chat_message_likes DROP CONSTRAINT IF EXISTS chat_message_likes_message_id_fkey;

CREATE INDEX IF NOT EXISTS idx_chat_message_likes_msg ON public.chat_message_likes (message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_likes_user ON public.chat_message_likes (user_id);

ALTER TABLE public.chat_message_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de likes" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Inserción de likes" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Borrado de likes" ON public.chat_message_likes;

CREATE POLICY "Lectura pública de likes" ON public.chat_message_likes FOR SELECT USING (true);
CREATE POLICY "Inserción de likes" ON public.chat_message_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Borrado de likes" ON public.chat_message_likes FOR DELETE USING (true);

-- 3. REPLICA IDENTITY FULL PARA WEBSOCKETS EN TIEMPO REAL
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_comments REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_likes REPLICA IDENTITY FULL;

-- 4. REGISTRAR TABLAS EN LA PUBLICACIÓN SUPABASE_REALTIME
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_comments; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_likes; EXCEPTION WHEN duplicate_object THEN END;
END $$;
