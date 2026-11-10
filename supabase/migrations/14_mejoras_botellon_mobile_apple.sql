-- ==============================================================
-- SMR2 WEB · MIGRACIÓN 14: MEJORAS SISTEMA BOTELLÓN SUPABASE,
-- MODO APPLE MINIMALISTA, REALTIME Y OPTIMIZACIÓN MÓVIL
-- ==============================================================
-- 100% IDEMPOTENTE: Seguro de ejecutar en cualquier entorno Supabase.
-- ==============================================================

-- 1. ASEGURAR COLUMNA DE PERSISTENCIA DEL BOTELLÓN EN PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS party_farm_data JSONB DEFAULT '{}'::jsonb;

-- 2. ÍNDICE GIN PARA BÚSQUEDAS Y RENDIMIENTO DE ACCESO A PARTY_FARM_DATA
CREATE INDEX IF NOT EXISTS idx_profiles_party_farm_data_gin 
  ON public.profiles USING gin (party_farm_data);

-- 3. CONFIRMAR REPLICA IDENTITY FULL Y RLS EN PROFILES
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 4. PUBLICACIÓN EN SUPABASE REALTIME
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.market_state;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 5. FUNCIÓN ATÓMICA DE GUARDADO Y SINCRONIZACIÓN DEL BOTELLÓN
-- Garantiza guardado sin condiciones de carrera y devuelve timestamp del servidor
CREATE OR REPLACE FUNCTION public.sync_botellon_state(
  p_user_id UUID,
  p_state JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_at TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  -- Actualizar datos del botellón de forma segura
  UPDATE public.profiles
  SET 
    party_farm_data = COALESCE(p_state, '{}'::jsonb)
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'server_time_ms', EXTRACT(EPOCH FROM v_updated_at) * 1000,
    'user_id', p_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_botellon_state(UUID, JSONB) TO anon, authenticated, service_role;

-- ==============================================================
-- FIN DE LA MIGRACIÓN 14
-- ==============================================================
