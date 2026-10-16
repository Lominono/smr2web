-- ==============================================================
-- SCHEMA SUPABASE: RECREO // ARCADE & CHAT DE CLASE
-- Totalmente idempotente: puedes ejecutarlo cuantas veces quieras sin errores.
-- ==============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE PERFILES REALES DE USUARIOS (Vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  coins BIGINT DEFAULT 1000 NOT NULL,
  biggest_win BIGINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para crear perfil automáticamente al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, coins, biggest_win)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    1000,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TABLA DE MENSAJES DE CHAT REALES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  is_system_win BOOLEAN DEFAULT false,
  win_amount BIGINT,
  multiplier NUMERIC(8, 2),
  game TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HABILITAR REALTIME EN CHAT (De forma segura si ya estaba añadido)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- 4. POLÍTICAS RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas si ya existían para evitar errores de duplicado
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Lectura pública de chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Creación de mensajes" ON public.chat_messages;
DROP POLICY IF EXISTS "Actualizar saldo de usuario" ON public.profiles;

-- Creación de políticas limpias
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Lectura pública de chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Creación de mensajes" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizar saldo de usuario" ON public.profiles FOR UPDATE USING (true);
