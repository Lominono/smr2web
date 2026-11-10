-- ==============================================================
-- SMR2 WEB · MIGRACIÓN 15: TIENDA DE MASCOTAS EXCLUSIVAS
-- ==============================================================
-- 100% IDEMPOTENTE: Seguro de ejecutar en cualquier entorno Supabase.
-- ==============================================================

-- 1. Asegurar columnas de mascotas en perfiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mascota_equipada TEXT,
  ADD COLUMN IF NOT EXISTS mascotas_desbloqueadas TEXT[] DEFAULT '{}'::text[];

-- 2. Asegurar columna de mascota en mensajes y comentarios del feed para tiempo real
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS mascota_equipada TEXT;

ALTER TABLE public.chat_comments
  ADD COLUMN IF NOT EXISTS mascota_equipada TEXT;

-- 3. Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_profiles_mascota_equipada 
  ON public.profiles(mascota_equipada);

-- ==============================================================
-- FIN DE LA MIGRACIÓN 15
-- ==============================================================
