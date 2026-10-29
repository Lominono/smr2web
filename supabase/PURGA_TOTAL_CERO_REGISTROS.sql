-- =========================================================================
-- PURGA TOTAL DE BASE DE DATOS: 0 REGISTROS (REINICIO LIMPIO ABSOLUTO)
-- Ejecuta este script en Supabase -> SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. Vaciar todas las tablas de mensajes, likes, avisos e incidencias
TRUNCATE TABLE public.chat_message_likes CASCADE;
TRUNCATE TABLE public.chat_messages CASCADE;
TRUNCATE TABLE public.push_subscriptions CASCADE;
TRUNCATE TABLE public.announcements CASCADE;
TRUNCATE TABLE public.community_feedback CASCADE;
TRUNCATE TABLE public.app_updates CASCADE;
TRUNCATE TABLE public.event_logs CASCADE;

-- 2. Vaciar tablas de juegos, partidas y economía si existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rr_turns') THEN
    TRUNCATE TABLE public.rr_turns CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rr_games') THEN
    TRUNCATE TABLE public.rr_games CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rr_rooms') THEN
    TRUNCATE TABLE public.rr_rooms CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'russian_roulette_turns') THEN
    TRUNCATE TABLE public.russian_roulette_turns CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'russian_roulette_games') THEN
    TRUNCATE TABLE public.russian_roulette_games CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'russian_roulette_rooms') THEN
    TRUNCATE TABLE public.russian_roulette_rooms CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    TRUNCATE TABLE public.transactions CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investments') THEN
    TRUNCATE TABLE public.investments CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_history') THEN
    TRUNCATE TABLE public.price_history CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'balance_transactions') THEN
    TRUNCATE TABLE public.balance_transactions CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    TRUNCATE TABLE public.audit_logs CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stock_holdings') THEN
    TRUNCATE TABLE public.user_stock_holdings CASCADE;
  END IF;
END $$;

-- 3. Vaciar perfiles de usuarios de la aplicación
TRUNCATE TABLE public.profiles CASCADE;

-- 4. Vaciar todos los usuarios registrados de Supabase Auth
TRUNCATE TABLE auth.users CASCADE;

-- 5. Reiniciar estado del mercado de El Botellón a valores limpios iniciales
DELETE FROM public.market_state;
INSERT INTO public.market_state (
  id,
  current_price,
  total_shares,
  pool_balance,
  reserve_balance,
  total_volume,
  total_investors,
  fee_rate,
  cooldown_seconds,
  min_investment,
  max_investment,
  last_event,
  last_event_type,
  last_event_impact,
  last_tick_at,
  updated_at
) VALUES (
  1,
  10.0,
  0,
  0,
  0,
  0,
  0,
  0.02,
  60,
  10,
  25000,
  'Mercado cerrado previo al lanzamiento oficial',
  'neutral',
  0.0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  current_price = 10.0,
  total_shares = 0,
  pool_balance = 0,
  reserve_balance = 0,
  total_volume = 0,
  total_investors = 0,
  last_event = 'Mercado reiniciado a cero',
  last_event_type = 'neutral',
  last_event_impact = 0.0,
  updated_at = NOW();

-- Resumen de comprobación
SELECT 'Usuarios en Auth:' AS tabla, COUNT(*) AS total FROM auth.users
UNION ALL
SELECT 'Perfiles de Alumnos:', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'Mensajes de Chat:', COUNT(*) FROM public.chat_messages
UNION ALL
SELECT 'Incidencias / Feedback:', COUNT(*) FROM public.community_feedback;
