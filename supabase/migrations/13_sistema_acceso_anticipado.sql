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

-- 4. INSERTAR CLAVES MAESTRAS INICIALES (Almacenadas únicamente en hash SHA-256)
-- Clave 1: 'smr2-dev-2026-master' -> 4ba8141fe33e8ffe257915e00ef2aa04da22a86ce149de94ca95c83a31416bca
INSERT INTO public.early_access_keys (key_name, key_hash, allowed_role, description)
VALUES (
  'Dev Master Key (JuanFe & David)',
  '4ba8141fe33e8ffe257915e00ef2aa04da22a86ce149de94ca95c83a31416bca',
  'developer',
  'Clave principal de desarrollo para pruebas antes del 9 de noviembre'
)
ON CONFLICT (key_hash) DO NOTHING;

-- Clave 2: 'juanfe-david-acceso-2026' -> 992a3799ff64a426d41b91eb3913a818b991c22632d1ad7f94209efd200059e4
INSERT INTO public.early_access_keys (key_name, key_hash, allowed_role, description)
VALUES (
  'Clave Personal JuanFe & David',
  '992a3799ff64a426d41b91eb3913a818b991c22632d1ad7f94209efd200059e4',
  'developer',
  'Acceso secundario para los creadores'
)
ON CONFLICT (key_hash) DO NOTHING;

-- Clave 3: '2026papu' -> f824b64452c25275ab37f8ac2e8f2bba9dfdfca9d7dc548288d94ce1f0cbd65c
INSERT INTO public.early_access_keys (key_name, key_hash, allowed_role, description)
VALUES (
  'Legacy Admin Key',
  'f824b64452c25275ab37f8ac2e8f2bba9dfdfca9d7dc548288d94ce1f0cbd65c',
  'admin',
  'Clave de administración histórica de aula'
)
ON CONFLICT (key_hash) DO NOTHING;

COMMIT;
