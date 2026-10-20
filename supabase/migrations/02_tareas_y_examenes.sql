-- ==============================================================
-- 02. GESTIÓN DE TAREAS, EXÁMENES Y ENTREGAS (SMR2)
-- ==============================================================
-- Descripción:
-- Amplía la tabla 'calendar_events' para soportar prioridad (urgente, normal, baja),
-- enlace de entrega (Moodle, Classroom, GitHub) y estado completado/pendiente.
-- ==============================================================

-- 1. Ampliar columnas en 'calendar_events'
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  ADD COLUMN IF NOT EXISTS delivery_url TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- 2. Índices de alto rendimiento para filtrado por fecha y módulo
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_subject ON public.calendar_events(subject);
CREATE INDEX IF NOT EXISTS idx_calendar_events_priority ON public.calendar_events(priority);
CREATE INDEX IF NOT EXISTS idx_calendar_events_completed ON public.calendar_events(is_completed);

-- 3. Comentarios explicativos en las columnas
COMMENT ON TABLE public.calendar_events IS 'Agenda oficial y tareas de 2º SMR creadas por delegados o alumnos';
COMMENT ON COLUMN public.calendar_events.subject IS 'Código oficial del módulo: SR, SOR, SI, AW, MEP, IP2, PI, DIG';
COMMENT ON COLUMN public.calendar_events.priority IS 'Nivel de prioridad: high (urgente), normal, low (informativa)';
COMMENT ON COLUMN public.calendar_events.delivery_url IS 'Enlace opcional directo a Moodle, Classroom o repositorio';
