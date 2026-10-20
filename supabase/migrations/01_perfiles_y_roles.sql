-- ==============================================================
-- 01. PERFILES, ROLES Y ECONOMÍA (SMR2)
-- ==============================================================
-- Descripción:
-- Añade soporte para roles (estudiante, delegado, admin), correo,
-- racha de días consecutivos y fecha de último reclamo sin perder datos.
-- ==============================================================

-- 1. Añadir columnas nuevas a la tabla 'profiles' de forma segura
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'delegado', 'admin')),
  ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP WITH TIME ZONE;

-- 2. Índice para acelerar búsquedas de usuarios por apodo o rol
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Actualizar función automática para nuevos registros en Supabase Auth
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

-- Re-vincular el disparador
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================
-- CÓMO HACERTE DELEGADO O ADMIN:
-- Ejecuta esta línea sustituyendo 'tu_apodo' por tu nombre de usuario:
-- UPDATE public.profiles SET role = 'admin' WHERE username = 'tu_apodo';
-- ==============================================================
