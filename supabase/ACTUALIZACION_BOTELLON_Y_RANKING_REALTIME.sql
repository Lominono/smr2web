-- ==============================================================
-- SMR2 WEB · ACTUALIZACIÓN DEFINITIVA: BOTELLÓN EN LA NUBE Y RANKING REALTIME
-- ==============================================================
-- 100% IDEMPOTENTE: Puedes ejecutar todo este script de una sola vez.
-- No utiliza funciones PL/pgSQL complejas para evitar errores de sintaxis en el editor.
-- ==============================================================

-- 1. COLUMNAS DE SINCRONIZACIÓN Y PERFIL EN PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS party_farm_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_spin_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_rescue_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS avatar_color TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS student_number TEXT,
  ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;

-- 2. REPLICA IDENTITY FULL (VITAL PARA QUE SUPABASE REALTIME TRANSMITA TODOS LOS DATOS)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 3. ÍNDICES DE RENDIMIENTO PARA EL RANKING Y GUARDADO
CREATE INDEX IF NOT EXISTS idx_profiles_coins_ranking 
  ON public.profiles(coins DESC, biggest_win DESC, streak_count DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_party_farm 
  ON public.profiles USING gin (party_farm_data);

-- 4. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Creación de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar perfil de usuario" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar saldo de usuario" ON public.profiles;

-- Lectura para ranking y sincronización en vivo
CREATE POLICY "Lectura pública de perfiles" 
  ON public.profiles FOR SELECT 
  USING (true);

-- Registro de nuevos usuarios
CREATE POLICY "Creación de perfiles" 
  ON public.profiles FOR INSERT 
  WITH CHECK (true);

-- Actualización de saldo, progreso de botellón y estadísticas
CREATE POLICY "Actualizar perfil de usuario" 
  ON public.profiles FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 5. PUBLICACIÓN EN SUPABASE REALTIME (EN TIEMPO REAL)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 6. VISTA OFICIAL DE CLASIFICACIÓN (LEADERBOARD)
CREATE OR REPLACE VIEW public.leaderboard_ranking AS
SELECT 
  id,
  username,
  full_name,
  coins,
  biggest_win,
  streak_count,
  avatar_color,
  role,
  ROW_NUMBER() OVER (ORDER BY coins DESC, biggest_win DESC, streak_count DESC) AS posicion
FROM public.profiles
WHERE is_banned IS NOT TRUE
ORDER BY coins DESC, biggest_win DESC;

GRANT SELECT ON public.leaderboard_ranking TO anon, authenticated;

-- ==============================================================
-- ¡LISTO! Script ejecutado correctamente sin errores.
-- ==============================================================
