-- ==============================================================
-- 02. GESTIÓN DE TAREAS, EXÁMENES Y ENTREGAS (SMR2)
-- ==============================================================
-- Descripción:
-- Crea o actualiza la tabla 'calendar_events' para almacenar la agenda
-- de la clase, exámenes de módulos, entregas con link directo a Moodle
-- y nivel de prioridad (urgente, normal, informativa).
-- ==============================================================

-- 1. Crear tabla si no existe
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  event_type TEXT DEFAULT 'homework' CHECK (event_type IN ('exam', 'homework', 'reminder', 'class')),
  event_date DATE NOT NULL,
  start_time TEXT,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  delivery_url TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT DEFAULT 'Delegado SMR2',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Asegurar columnas si la tabla ya existía
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  ADD COLUMN IF NOT EXISTS delivery_url TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT DEFAULT 'Delegado SMR2';

-- 3. Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_subject ON public.calendar_events(subject);
CREATE INDEX IF NOT EXISTS idx_calendar_events_priority ON public.calendar_events(priority);
CREATE INDEX IF NOT EXISTS idx_calendar_events_completed ON public.calendar_events(is_completed);

-- 4. Comentarios informativos
COMMENT ON TABLE public.calendar_events IS 'Agenda oficial y tareas de 2º SMR creadas por delegados o alumnos';
COMMENT ON COLUMN public.calendar_events.subject IS 'Código oficial del módulo: SR, SOR, SI, AW, MEP, IP2, PI, DIG';
COMMENT ON COLUMN public.calendar_events.priority IS 'Nivel de prioridad: high (urgente), normal, low (informativa)';
COMMENT ON COLUMN public.calendar_events.delivery_url IS 'Enlace opcional directo a Moodle, Classroom o repositorio';
