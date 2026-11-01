-- ==============================================================
-- MIGRACIÓN DEFINITIVA SMR2: REALTIME, PUSH Y ANUNCIOS
-- Ejecuta este script en Supabase -> SQL Editor -> New Query -> Run
-- ==============================================================

-- 1. COLUMNAS ADICIONALES EN CHAT_MESSAGES PARA AVISOS FIJADOS Y RESPUESTAS
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_username TEXT;

-- 2. TABLA DE LIKES EN TIEMPO REAL (Garantiza que el like sea por usuario y persista)
CREATE TABLE IF NOT EXISTS public.chat_message_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_likes_msg ON public.chat_message_likes (message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_likes_user ON public.chat_message_likes (user_id);

-- 3. TABLA DE SUSCRIPCIONES PUSH WEB (Para recibir avisos con la web cerrada)
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

-- 5. TABLA DE REGISTRO DE ACTUALIZACIONES
CREATE TABLE IF NOT EXISTS public.app_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.chat_message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas
DROP POLICY IF EXISTS "Lectura pública de likes" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Insertar likes" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Eliminar likes" ON public.chat_message_likes;
DROP POLICY IF EXISTS "Lectura suscripciones push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Gestión suscripciones push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Lectura anuncios" ON public.announcements;
DROP POLICY IF EXISTS "Inserción anuncios" ON public.announcements;
DROP POLICY IF EXISTS "Lectura app_updates" ON public.app_updates;

-- Políticas de acceso
CREATE POLICY "Lectura pública de likes" ON public.chat_message_likes FOR SELECT USING (true);
CREATE POLICY "Insertar likes" ON public.chat_message_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminar likes" ON public.chat_message_likes FOR DELETE USING (true);

CREATE POLICY "Lectura suscripciones push" ON public.push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Gestión suscripciones push" ON public.push_subscriptions FOR ALL USING (true);

CREATE POLICY "Lectura anuncios" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Inserción anuncios" ON public.announcements FOR INSERT WITH CHECK (true);

CREATE POLICY "Lectura app_updates" ON public.app_updates FOR SELECT USING (true);

-- 7. REPLICA IDENTITY FULL PARA TRANSMISIÓN EN TIEMPO REAL
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_likes REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.app_updates REPLICA IDENTITY FULL;

-- 8. REGISTRO EN SUPABASE_REALTIME (COMPROBACIÓN SEGURA E IDEMPOTENTE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_likes;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_updates') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_feedback') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'community_feedback') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_feedback;
    END IF;
  END IF;
END $$;
