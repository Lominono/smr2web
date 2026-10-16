-- ==============================================================
-- SCHEMA SUPABASE: RECREO // CASINO & CHAT DE CLASE
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase
-- ==============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PERFILES DE JUGADORES & SALDO
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  coins BIGINT DEFAULT 1000,
  net_profit BIGINT DEFAULT 0,
  biggest_win BIGINT DEFAULT 0,
  bankrupt_count INTEGER DEFAULT 0,
  rank TEXT DEFAULT 'Apostador Casual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para nuevo usuario registrado
CREATE OR REPLACE FUNCTION public.handle_new_player()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, coins, rank)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', 'Colega de Clase'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/notionists/svg?seed=' || new.id),
    1000,
    'Apostador Casual'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_player_created ON auth.users;
CREATE TRIGGER on_auth_player_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_player();

-- 2. MENSAJES DEL CHAT DE CLASE
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  text TEXT NOT NULL,
  is_system_win BOOLEAN DEFAULT false,
  win_amount BIGINT,
  multiplier NUMERIC(8, 2),
  game TEXT,
  tip_recipient TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HISTORIAL DE APUESTAS
CREATE TABLE IF NOT EXISTS public.bets_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game TEXT NOT NULL,
  bet_amount BIGINT NOT NULL,
  multiplier NUMERIC(8, 2) NOT NULL,
  win_amount BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================
-- RLS (Row Level Security)
-- ==============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Lectura pública de chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Lectura pública de historial" ON public.bets_history FOR SELECT USING (true);

CREATE POLICY "Cualquiera puede enviar mensajes de chat" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar sus monedas" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Registro de apuestas" ON public.bets_history FOR INSERT WITH CHECK (true);

-- Semilla de mensajes iniciales del chat
INSERT INTO public.chat_messages (user_id, username, avatar_url, text, is_system_win, win_amount, multiplier, game)
VALUES
  ('u-adri', 'adri_debian', 'https://api.dicebear.com/7.x/notionists/svg?seed=adri', 'Aposté 500 al Crash y me salí en 4.2x jajajajaja', false, null, null, null),
  ('sys', 'SISTEMA', '', '🚨 ¡@adri_debian ha cobrado 2.100 🪙 en Crash (x4.20)!', true, 2100, 4.20, 'crash'),
  ('u-marcos', 'marcos_ip', 'https://api.dicebear.com/7.x/notionists/svg?seed=marcos', 'Hermano me he comido un crash en 1.04x, me cago en todo.', false, null, null, null),
  ('u-david', 'david_cables', 'https://api.dicebear.com/7.x/notionists/svg?seed=david', 'El Angry Birds está rotísimo, si tiras el rack de la derecha revienta la caja dorada x20', false, null, null, null)
ON CONFLICT DO NOTHING;
