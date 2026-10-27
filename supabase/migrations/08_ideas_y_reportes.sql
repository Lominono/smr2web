-- ============================================================================
-- MIGRACIÓN 08: SISTEMA DE IDEAS, SUGERENCIAS Y REPORTES COMUNITARIOS
-- Portal El Botellón / SMR2
-- ============================================================================

-- 1. Tabla principal de feedback (ideas, sugerencias y reportes)
CREATE TABLE IF NOT EXISTS public.community_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('idea', 'report', 'improvement')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'juegos', 'horario', 'portal', 'inversiones', 'otros')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'planned', 'completed', 'dismissed')),
  upvotes_count INTEGER NOT NULL DEFAULT 0,
  admin_response TEXT,
  admin_responder_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla para registrar los votos únicos de cada usuario
CREATE TABLE IF NOT EXISTS public.feedback_votes (
  feedback_id UUID NOT NULL REFERENCES public.community_feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (feedback_id, user_id)
);

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_community_feedback_created_at ON public.community_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_feedback_upvotes ON public.community_feedback(upvotes_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_feedback_type ON public.community_feedback(type);
CREATE INDEX IF NOT EXISTS idx_community_feedback_status ON public.community_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_user ON public.feedback_votes(user_id);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.community_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad RLS
DROP POLICY IF EXISTS "Lectura publica de ideas y reportes" ON public.community_feedback;
CREATE POLICY "Lectura publica de ideas y reportes"
  ON public.community_feedback FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Lectura publica de votos de ideas" ON public.feedback_votes;
CREATE POLICY "Lectura publica de votos de ideas"
  ON public.feedback_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios pueden crear ideas y reportes" ON public.community_feedback;
CREATE POLICY "Usuarios pueden crear ideas y reportes"
  ON public.community_feedback FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden votar" ON public.feedback_votes;
CREATE POLICY "Usuarios autenticados pueden votar"
  ON public.feedback_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios autenticados pueden retirar su voto" ON public.feedback_votes;
CREATE POLICY "Usuarios autenticados pueden retirar su voto"
  ON public.feedback_votes FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Autores y delegados pueden actualizar ideas" ON public.community_feedback;
CREATE POLICY "Autores y delegados pueden actualizar ideas"
  ON public.community_feedback FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'delegado'))
  );

DROP POLICY IF EXISTS "Autores y delegados pueden borrar ideas" ON public.community_feedback;
CREATE POLICY "Autores y delegados pueden borrar ideas"
  ON public.community_feedback FOR DELETE
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'delegado'))
  );

-- 6. Función RPC atómica para votar o desvotar una idea
CREATE OR REPLACE FUNCTION public.toggle_feedback_vote(p_feedback_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_voted BOOLEAN;
  v_new_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para votar.';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.feedback_votes 
    WHERE feedback_id = p_feedback_id AND user_id = v_user_id
  ) INTO v_voted;

  IF v_voted THEN
    DELETE FROM public.feedback_votes 
    WHERE feedback_id = p_feedback_id AND user_id = v_user_id;

    UPDATE public.community_feedback
    SET upvotes_count = GREATEST(0, upvotes_count - 1),
        updated_at = NOW()
    WHERE id = p_feedback_id
    RETURNING upvotes_count INTO v_new_count;

    RETURN jsonb_build_object('success', true, 'voted', false, 'upvotes_count', v_new_count);
  ELSE
    INSERT INTO public.feedback_votes (feedback_id, user_id)
    VALUES (p_feedback_id, v_user_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.community_feedback
    SET upvotes_count = upvotes_count + 1,
        updated_at = NOW()
    WHERE id = p_feedback_id
    RETURNING upvotes_count INTO v_new_count;

    RETURN jsonb_build_object('success', true, 'voted', true, 'upvotes_count', v_new_count);
  END IF;
END;
$$;

-- 7. Agregar a publicación Realtime (ignorar si ya está añadido)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_feedback;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
