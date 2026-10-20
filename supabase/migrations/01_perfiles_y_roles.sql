-- ==============================================================
-- 01. PERFILES, ROLES Y ECONOMÍA (SMR2)
-- ==============================================================
-- Descripción:
-- Crea o actualiza la tabla 'profiles' para almacenar la cuenta,
-- saldo de monedas virtuales, rol (estudiante, delegado, admin),
-- racha de días de reclamo diario y récord de mayor premio.
-- ==============================================================

-- 1. Crear tabla 'profiles' si no existe
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  coins BIGINT DEFAULT 1000 NOT NULL,
  biggest_win BIGINT DEFAULT 0 NOT NULL,
  streak_count INTEGER DEFAULT 1 NOT NULL,
  last_claim_date TIMESTAMP WITH TIME ZONE,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'delegado', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Asegurar que las columnas nuevas existan si la tabla ya estaba creada previamente
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'delegado', 'admin')),
  ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP WITH TIME ZONE;

-- 3. Índices para consultas ultra rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles(coins DESC);

-- 4. Disparador automático para crear perfil cuando alguien se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, coins, biggest_win, streak_count, role)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    new.email,
    1000,
    0,
    1,
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================
-- CÓMO HACERTE DELEGADO O ADMIN:
-- UPDATE public.profiles SET role = 'admin' WHERE username = 'tu_usuario';
-- ==============================================================
