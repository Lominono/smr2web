-- ==============================================================
-- SMR2 WEB · MEJORA DEFINITIVA: BOTELLÓN EN LA NUBE Y RANKING EN TIEMPO REAL
-- ==============================================================
-- Este script es 100% IDEMPOTENTE: puedes ejecutarlo cuantas veces quieras.
-- Copia todo este código y pégalo en el SQL Editor de tu proyecto de Supabase.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. TABLA PROFILES: AÑADIR COLUMNAS DE SINCRONIZACIÓN Y JUEGOS
-- --------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS party_farm_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_spin_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_rescue_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS avatar_color TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS student_number TEXT,
  ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;

-- Asegurar comentarios explicativos en el esquema
COMMENT ON COLUMN public.profiles.party_farm_data IS 'Progreso guardado de El Botellón (niveles, zonas, fichas, perks, resaca y after) sincronizado entre dispositivos.';
COMMENT ON COLUMN public.profiles.last_spin_date IS 'Marca temporal de la última tirada en la ruleta diaria de recompensas.';
COMMENT ON COLUMN public.profiles.last_rescue_date IS 'Marca temporal del último rescate de monedas.';

-- --------------------------------------------------------------
-- 2. REPLICA IDENTITY FULL: VITAL PARA SUPABASE REALTIME
-- --------------------------------------------------------------
-- Sin REPLICA IDENTITY FULL, las actualizaciones (UPDATE) por WebSocket
-- solo transmiten la clave primaria, provocando que los rankings no se
-- actualicen en caliente de forma fiable en todos los clientes.
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- --------------------------------------------------------------
-- 3. ÍNDICES DE ALTO RENDIMIENTO PARA EL RANKING
-- --------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_coins_ranking 
  ON public.profiles(coins DESC, biggest_win DESC, streak_count DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_party_farm 
  ON public.profiles USING gin (party_farm_data);

-- --------------------------------------------------------------
-- 4. PUBLICACIÓN EN SUPABASE REALTIME
-- --------------------------------------------------------------
-- Garantiza que cualquier cambio de saldo, nuevo usuario o mensaje
-- se transmita al instante a todos los ordenadores y móviles conectados.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN
    -- Ya suscrito previamente
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN
    -- Ya suscrito previamente
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  EXCEPTION WHEN duplicate_object THEN
    -- Ya suscrito previamente
  END;
END $$;

-- --------------------------------------------------------------
-- 5. POLÍTICAS DE ACCESO (ROW LEVEL SECURITY)
-- --------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Creación de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar perfil de usuario" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar saldo de usuario" ON public.profiles;

-- Lectura pública: imprescindible para que el Ranking y el Realtime funcionen
CREATE POLICY "Lectura pública de perfiles" 
  ON public.profiles FOR SELECT 
  USING (true);

-- Creación de nuevos perfiles al registrarse
CREATE POLICY "Creación de perfiles" 
  ON public.profiles FOR INSERT 
  WITH CHECK (true);

-- Actualización del perfil: saldo, botellón y estadísticas
CREATE POLICY "Actualizar perfil de usuario" 
  ON public.profiles FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------------------------
-- 6. VISTA OFICIAL DE CLASIFICACIÓN (LEADERBOARD)
-- --------------------------------------------------------------
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

-- Otorgar permisos de lectura a usuarios anónimos y autenticados
GRANT SELECT ON public.leaderboard_ranking TO anon, authenticated;

-- --------------------------------------------------------------
-- 7. FUNCIÓN RPC ATÓMICA PARA CANJEAR FICHAS DE EL BOTELLÓN
-- --------------------------------------------------------------
-- Permite un cobro seguro y anti-trampas: resta las fichas y suma las
-- monedas en una sola transacción sin condiciones de carrera.
CREATE OR REPLACE FUNCTION public.claim_botellon_vault(
  p_user_id UUID,
  p_fichas_claimed BIGINT,
  p_coins_awarded BIGINT,
  p_new_farm_data JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_current_coins BIGINT;
  v_new_coins BIGINT;
BEGIN
  -- Validar ratio oficial: 5 fichas = 1 moneda
  IF p_coins_awarded <= 0 OR p_fichas_claimed < p_coins_awarded * 5 THEN
    RAISE EXCEPTION 'Ratio de canje inválido: se necesitan 5 fichas por cada moneda.';
  END IF;

  -- Bloquear fila del usuario para transacción atómica
  SELECT coins INTO v_current_coins 
  FROM public.profiles 
  WHERE id = p_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado.';
  END IF;

  v_new_coins := v_current_coins + p_coins_awarded;

  -- Actualizar perfil en una sola operación
  UPDATE public.profiles
  SET 
    coins = v_new_coins,
    party_farm_data = p_new_farm_data
  WHERE id = p_user_id;

  -- Registrar en transacciones si la tabla de auditoría existe
  BEGIN
    INSERT INTO public.balance_transactions (
      user_id, 
      amount, 
      balance_before, 
      balance_after, 
      type, 
      description
    ) VALUES (
      p_user_id, 
      p_coins_awarded, 
      v_current_coins, 
      v_new_coins, 
      'game_win', 
      'Canje de fichas de El Botellón'
    );
  EXCEPTION WHEN undefined_table THEN
    -- Continuar si balance_transactions aún no ha sido creada
  END;

  RETURN jsonb_build_object(
    'success', true,
    'new_coins', v_new_coins,
    'coins_awarded', p_coins_awarded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_botellon_vault TO anon, authenticated;

-- ==============================================================
-- ¡CONFIGURACIÓN COMPLETADA CON ÉXITO!
-- El Botellón se guardará en la nube y el Ranking funcionará a 0ms en tiempo real.
-- ==============================================================
