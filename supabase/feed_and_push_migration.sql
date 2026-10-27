-- ==============================================================
-- MIGRACIÓN PARA SUPABASE: FEED EN TIEMPO REAL Y NOTIFICACIONES PUSH
-- Ejecuta este script en Supabase -> SQL Editor -> New Query -> Run
-- ==============================================================

-- 1. COLUMNAS ADICIONALES EN CHAT_MESSAGES PARA AVISOS FIJADOS Y RESPUESTAS
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_username TEXT;

-- 2. TABLA DE LIKES EN TIEMPO REAL (Garantiza que el like sea por usuario y no se pierda al recargar)
CREATE TABLE IF NOT EXISTS public.chat_message_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_likes_msg ON public.chat_message_likes (message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_likes_user ON public.chat_message_likes (user_id);

-- 3. TABLA DE SUSCRIPCIONES PUSH WEB (Para enviar notificaciones fuera de la web a móviles y PCs)
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

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions (user_id);

-- 4. TABLA DE ANUNCIOS Y COMUNICADOS GLOBALES
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

CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements (created_at DESC);

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.chat_message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas
DROP POLICY IF EXISTS "Lectura pública de likes" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Gestión de likes propios" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Insertar likes" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Eliminar likes" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Lectura suscripciones push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Creación suscripciones push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Actualización suscripciones push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Lectura pública de anuncios" ON public.announcements;
DROP POLICY IF EXISTS "Inserción de anuncios" ON public.announcements;

-- Políticas permisivas y seguras
CREATE POLICY "Lectura pública de likes" ON public.chat_message_likes FOR SELECT USING (true);
CREATE POLICY "Insertar likes" ON public.chat_message_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminar likes" ON public.chat_message_likes FOR DELETE USING (true);

CREATE POLICY "Lectura suscripciones push" ON public.push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Creación suscripciones push" ON public.push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización suscripciones push" ON public.push_subscriptions FOR UPDATE USING (true);

CREATE POLICY "Lectura pública de anuncios" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Inserción de anuncios" ON public.announcements FOR INSERT WITH CHECK (true);

-- 6. REPLICA IDENTITY FULL PARA REALTIME
ALTER TABLE public.chat_message_likes REPLICA IDENTITY FULL;
ALTER TABLE public.push_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;

-- 7. ACTIVAR EN PUBLICACIÓN SUPABASE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_likes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'push_subscriptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
  END IF;
END $$;
