-- ==============================================================
-- 03. CHAT EN VIVO Y AVISOS DE LA CLASE (SMR2)
-- ==============================================================
-- Descripción:
-- Asegura la tabla 'chat_messages' para comunicación en tiempo real entre compañeros,
-- alertas automáticas de tareas nuevas y celebraciones de premios en juegos.
-- ==============================================================

-- 1. Asegurar la tabla de mensajes
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  is_system_win BOOLEAN DEFAULT false,
  win_amount BIGINT,
  multiplier NUMERIC(8, 2),
  game TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Índice cronológico para carga instantánea de los últimos mensajes
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
