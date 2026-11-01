-- ==============================================================
-- 10. REPARACIÓN TIEMPO REAL: FEED DE MENSAJES Y GRÁFICAS DE BOLSA
-- ==============================================================
-- Ejecuta este script en el SQL Editor de Supabase para activar:
-- 1. Publicación de mensajes en el Feed para todos los usuarios.
-- 2. Replicación en tiempo real (Realtime WebSockets) en todas las tablas.
-- 3. Histórico de cotizaciones en tiempo real por cada acción ($ONION, $ARDI, etc.).
-- 4. Sistema de control de actualizaciones de la app (app_updates).
-- ==============================================================

-- 1. TABLA CHAT_MESSAGES (FEED)
-- Asegurar que la tabla existe y tiene todas las columnas del Feed
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  tag TEXT,
  pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  reply_to_username TEXT,
  is_system_win BOOLEAN DEFAULT false,
  win_amount BIGINT,
  multiplier NUMERIC(8, 2),
  game TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_username TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_system_win BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS win_amount BIGINT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS multiplier NUMERIC(8, 2);
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS game TEXT;

-- Quitar cualquier restricción que bloquee la inserción de mensajes
ALTER TABLE public.chat_messages ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Índices para carga inmediata del Feed
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tag ON public.chat_messages(tag);

-- 2. TABLA PRICE_HISTORY Y TRANSACTIONS (GRÁFICAS DE MERCADO)
ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS ticker TEXT DEFAULT 'BTLN';
ALTER TABLE public.price_history ALTER COLUMN trigger_type DROP NOT NULL;
ALTER TABLE public.price_history DROP CONSTRAINT IF EXISTS price_history_trigger_type_check;
CREATE INDEX IF NOT EXISTS idx_price_history_ticker ON public.price_history(ticker, created_at DESC);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS ticker TEXT DEFAULT 'BTLN';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS username TEXT;
CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON public.transactions(ticker, created_at DESC);

-- 3. TABLA APP_UPDATES (MENSAJES DE ACTUALIZACIÓN)
CREATE TABLE IF NOT EXISTS public.app_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar actualización actual v2.6.0 si no existe
INSERT INTO public.app_updates (version, title, description, changes)
VALUES (
  '2.6.0',
  'SMR2 v2.6.0 Lista',
  'Sincronización en vivo del Feed y cotizaciones de bolsa en tiempo real',
  '["Feed en tiempo real: tus publicaciones ahora se reflejan al instante para toda la clase.", "Gráfica interactiva de inversiones con cotización en vivo y volumen real.", "Acceso directo al panel de administración para delegados y profesores."]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 4. POLÍTICAS ROW LEVEL SECURITY (RLS) - PERMISOS DE LECTURA Y ESCRITURA
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Creación pública de mensajes" ON public.chat_messages;
DROP POLICY IF EXISTS "Borrado público de mensajes" ON public.chat_messages;
CREATE POLICY "Lectura pública de chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Creación pública de mensajes" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Borrado público de mensajes" ON public.chat_messages FOR DELETE USING (true);

ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de market_state" ON public.market_state;
DROP POLICY IF EXISTS "Actualización de market_state" ON public.market_state;
CREATE POLICY "Lectura pública de market_state" ON public.market_state FOR SELECT USING (true);
CREATE POLICY "Actualización de market_state" ON public.market_state FOR ALL USING (true);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de price_history" ON public.price_history;
DROP POLICY IF EXISTS "Inserción pública de price_history" ON public.price_history;
CREATE POLICY "Lectura pública de price_history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Inserción pública de price_history" ON public.price_history FOR INSERT WITH CHECK (true);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de transactions" ON public.transactions;
DROP POLICY IF EXISTS "Inserción pública de transactions" ON public.transactions;
CREATE POLICY "Lectura pública de transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Inserción pública de transactions" ON public.transactions FOR INSERT WITH CHECK (true);

ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de app_updates" ON public.app_updates;
DROP POLICY IF EXISTS "Inserción pública de app_updates" ON public.app_updates;
CREATE POLICY "Lectura pública de app_updates" ON public.app_updates FOR SELECT USING (true);
CREATE POLICY "Inserción pública de app_updates" ON public.app_updates FOR INSERT WITH CHECK (true);

-- 5. CONFIGURACIÓN REPLICA IDENTITY (DATOS COMPLETOS EN WEBSOCKETS)
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.market_state REPLICA IDENTITY FULL;
ALTER TABLE public.price_history REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.app_updates REPLICA IDENTITY FULL;

-- 6. HABILITAR TIEMPO REAL (REALTIME) EN TODAS LAS TABLAS CLAVE
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.market_state; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates; EXCEPTION WHEN duplicate_object THEN END;
END $$;
