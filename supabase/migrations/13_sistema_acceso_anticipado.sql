-- ============================================================================
-- MIGRACIÓN 13: SISTEMA DE ACCESO ANTICIPADO Y DESARROLLO ULTRA-SEGURO
-- Portal El Botellón / 2º SMR
--
-- OBJETIVO:
-- Proporcionar un control de acceso previo al lanzamiento oficial (9 de noviembre)
-- 100% verificado en el servidor con hashing criptográfico SHA-256 y protección
-- contra inspección de código cliente en el navegador (DevTools / F12).
-- ============================================================================

BEGIN;

-- 1. TABLA: EARLY_ACCESS_KEYS (Claves Criptográficas de Acceso Anticipado)
CREATE TABLE IF NOT EXISTS public.early_access_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  allowed_role TEXT DEFAULT 'developer' CHECK (allowed_role IN ('developer', 'admin', 'tester')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_early_access_keys_hash ON public.early_access_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_early_access_keys_active ON public.early_access_keys(is_active);

-- 2. HABILITAR SEGURIDAD POR FILAS (RLS)
ALTER TABLE public.early_access_keys ENABLE ROW LEVEL SECURITY;

-- Denegar cualquier lectura o escritura directa desde clientes públicos / anon
DROP POLICY IF EXISTS "Solo service_role gestiona claves de acceso anticipado" ON public.early_access_keys;
CREATE POLICY "Solo service_role gestiona claves de acceso anticipado"
  ON public.early_access_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. FUNCIÓN RPC SEGURA PARA VALIDACIÓN (SECURITY DEFINER)
-- Solo comprueba la coincidencia del hash provisto. Nunca lista ni filtra las demás claves.
CREATE OR REPLACE FUNCTION public.verify_early_access_key(p_key_hash TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  key_name TEXT,
  allowed_role TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actualizar fecha de último uso si la clave es válida y está activa
  UPDATE public.early_access_keys
  SET last_used_at = timezone('utc'::text, now())
  WHERE key_hash = p_key_hash AND is_active = true;

  RETURN QUERY
  SELECT 
    true AS is_valid,
    k.key_name,
    k.allowed_role
  FROM public.early_access_keys k
  WHERE k.key_hash = p_key_hash AND k.is_active = true
  LIMIT 1;
END;
$$;

-- Permitir ejecutar la función a las conexiones autorizadas y al backend
GRANT EXECUTE ON FUNCTION public.verify_early_access_key(TEXT) TO anon, authenticated, service_role;

-- 4. INSERTAR CLAVES MAESTRAS DE ACCESO ANTICIPADO (Almacenadas únicamente en hash SHA-256)
-- Eliminar claves legacy antiguas si existen
DELETE FROM public.early_access_keys WHERE key_hash = 'f824b64452c25275ab37f8ac2e8f2bba9dfdfca9d7dc548288d94ce1f0cbd65c';

-- Clave 1: 'Smr2_Admin#2026_MasterKey!' -> d8b18586f887260d0cf27c430c157f320826ec6a0742e2e92fc374642185b522
INSERT INTO public.early_access_keys (key_name, key_hash, allowed_role, description)
VALUES (
  'Admin Master Key (Oficial)',
  'd8b18586f887260d0cf27c430c157f320826ec6a0742e2e92fc374642185b522',
  'admin',
  'Clave maestra oficial de administración del portal SMR2'
)
ON CONFLICT (key_hash) DO NOTHING;

-- Clave 2: 'Smr2_EarlyAccess#2026_JuanFeDavid!' -> 7f38360ddbb362bd389ab272f79010817babdf1b89eae09fab51d16491ddb996
INSERT INTO public.early_access_keys (key_name, key_hash, allowed_role, description)
VALUES (
  'Clave Acceso Anticipado JuanFe & David',
  '7f38360ddbb362bd389ab272f79010817babdf1b89eae09fab51d16491ddb996',
  'developer',
  'Acceso anticipado seguro para los creadores'
)
ON CONFLICT (key_hash) DO NOTHING;

COMMIT;
