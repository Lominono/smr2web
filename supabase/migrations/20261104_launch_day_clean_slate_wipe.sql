-- ============================================================================
-- MIGRACIÓN: REINICIO TOTAL Y LIMPIEZA ABSOLUTA PARA EL DÍA DE LANZAMIENTO
-- Portal El Botellón / 2º SMR
--
-- PROPÓSITO:
-- 1. Elimina TODOS los usuarios, logins, contraseñas y sesiones activas (auth.users).
-- 2. Elimina TODOS los perfiles, monedas, transacciones, inversiones y carteras.
-- 3. Elimina TODOS los mensajes de chat, reportes, tareas y partidas anteriores.
-- 4. Restablece la empresa y el mercado al estado limpio oficial (10.00 🪙 base, 5.000 🪙 tesorería).
-- 5. Deja la base de datos completamente en blanco ("clean slate") lista para el día de estreno.
--
-- CÓMO EJECUTAR EN SUPABASE:
-- 1. Abre el panel de tu proyecto: https://supabase.com/dashboard/project/ehzekojovbxdkcmfbugc/sql/new
-- 2. Pega todo este script y pulsa en "Run" (o presiona Ctrl+Enter).
-- ============================================================================

BEGIN;

-- 1. BORRADO TOTAL DE AUTENTICACIÓN Y SESIONES
-- TRUNCATE auth.users CASCADE purga de inmediato:
-- - Cuentas de email y contraseñas
-- - Sesiones activas (auth.sessions)
-- - Refresh tokens (auth.refresh_tokens)
-- - Identidades de login (auth.identities)
-- - Factores MFA (auth.mfa_factors, auth.mfa_challenges)
-- - Perfiles públicos vinculados (public.profiles ON DELETE CASCADE)
TRUNCATE auth.users CASCADE;

-- 2. VACIAR ABSOLUTAMENTE TODAS LAS TABLAS DE DATOS PÚBLICAS
DO $$
BEGIN
  -- Tablas principales
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    TRUNCATE TABLE public.profiles CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    TRUNCATE TABLE public.transactions CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investments') THEN
    TRUNCATE TABLE public.investments CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'price_history') THEN
    TRUNCATE TABLE public.price_history CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'balance_transactions') THEN
    TRUNCATE TABLE public.balance_transactions CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_message_likes') THEN
    TRUNCATE TABLE public.chat_message_likes CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    TRUNCATE TABLE public.chat_messages CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback_votes') THEN
    TRUNCATE TABLE public.feedback_votes CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_feedback') THEN
    TRUNCATE TABLE public.community_feedback CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rr_turns') THEN
    TRUNCATE TABLE public.rr_turns CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rr_room_players') THEN
    TRUNCATE TABLE public.rr_room_players CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rr_games') THEN
    TRUNCATE TABLE public.rr_games CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rr_rooms') THEN
    TRUNCATE TABLE public.rr_rooms CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_logs') THEN
    TRUNCATE TABLE public.event_logs CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_events') THEN
    TRUNCATE TABLE public.calendar_events CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_updates') THEN
    TRUNCATE TABLE public.app_updates CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_subscriptions') THEN
    TRUNCATE TABLE public.push_subscriptions CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
    TRUNCATE TABLE public.announcements CASCADE;
  END IF;

  -- Tablas de auditoría y minijuegos secundarios
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    TRUNCATE TABLE public.audit_logs CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roulette_logs') THEN
    TRUNCATE TABLE public.roulette_logs CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'russian_roulette_games') THEN
    TRUNCATE TABLE public.russian_roulette_games CASCADE;
  END IF;
END $$;

-- 3. REINICIAR EL ESTADO DEL MERCADO Y TESORERÍA (ID = 1) A ESTADO PRÍSTINO
DELETE FROM public.market_state WHERE id = 1;

INSERT INTO public.market_state (
  id,
  current_price,
  pool_balance,
  total_shares,
  total_volume,
  total_investors,
  treasury_balance,
  total_revenue_generated,
  arcade_rake_accumulated,
  parody_stocks,
  updated_at
) VALUES (
  1,
  10.00,
  0,
  0,
  0,
  0,
  5000.00,
  0.00,
  0.00,
  '{
    "ONION": {
      "ticker": "ONION",
      "name": "Onion Inc.",
      "price": 45.00,
      "basePrice": 45.00,
      "change": 0.0,
      "volume": 0,
      "description": "Dispositivos y tecnología del aula."
    },
    "ARDI": {
      "ticker": "ARDI",
      "name": "Ardidas Sport",
      "price": 28.00,
      "basePrice": 28.00,
      "change": 0.0,
      "volume": 0,
      "description": "Ropa y zapatillas deportivas de recreo."
    },
    "CHERR": {
      "ticker": "CHERR",
      "name": "Carlos Herrero",
      "price": 20.00,
      "basePrice": 20.00,
      "change": 0.0,
      "volume": 0,
      "description": "Fragancias y colonia de informática."
    },
    "MBRON": {
      "ticker": "MBRON",
      "name": "Mercabrona Hielos",
      "price": 12.00,
      "basePrice": 12.00,
      "change": 0.0,
      "volume": 0,
      "description": "Supermercados y suministros de botellón."
    },
    "CUTI": {
      "ticker": "CUTI",
      "name": "Cutify Music",
      "price": 8.00,
      "basePrice": 8.00,
      "change": 0.0,
      "volume": 0,
      "description": "Streaming de música y podcasts en clase."
    },
    "TOLED": {
      "ticker": "TOLED",
      "name": "Toledo TDI Repro",
      "price": 34.00,
      "basePrice": 34.00,
      "change": 0.0,
      "volume": 0,
      "description": "Vehículos, escape libre y repro Stage 1."
    },
    "MERCA": {
      "ticker": "MERCA",
      "name": "Mercadona Hacendado Corp",
      "price": 25.00,
      "basePrice": 25.00,
      "change": 0.0,
      "volume": 0,
      "description": "Líder indiscutible en marcas blancas y pizzas congeladas."
    },
    "REDB": {
      "ticker": "REDB",
      "name": "Red Bull Combustión",
      "price": 18.50,
      "basePrice": 18.50,
      "change": 0.0,
      "volume": 0,
      "description": "Combustible prémium para sobrevivir a las clases teóricas."
    },
    "MONS": {
      "ticker": "MONS",
      "name": "Monster Energy Mango",
      "price": 15.00,
      "basePrice": 15.00,
      "change": 0.0,
      "volume": 0,
      "description": "Bebida de exámenes y proyectos."
    },
    "DIA": {
      "ticker": "DIA",
      "name": "Supermercados Día%",
      "price": 8.20,
      "basePrice": 8.20,
      "change": 0.0,
      "volume": 0,
      "description": "El plan B económico para el recreo."
    },
    "CHIN": {
      "ticker": "CHIN",
      "name": "Bazar El Chino 24h",
      "price": 5.50,
      "basePrice": 5.50,
      "change": 0.0,
      "volume": 0,
      "description": "Cables RJ45 y adaptadores VGA-HDMI."
    },
    "KEBAB": {
      "ticker": "KEBAB",
      "name": "Doner Kebab Amigo",
      "price": 12.00,
      "basePrice": 12.00,
      "change": 0.0,
      "volume": 0,
      "description": "Patatas mixtas y menú de fin de trimestre."
    }
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  current_price = EXCLUDED.current_price,
  pool_balance = EXCLUDED.pool_balance,
  total_shares = EXCLUDED.total_shares,
  total_volume = EXCLUDED.total_volume,
  total_investors = EXCLUDED.total_investors,
  treasury_balance = EXCLUDED.treasury_balance,
  total_revenue_generated = EXCLUDED.total_revenue_generated,
  arcade_rake_accumulated = EXCLUDED.arcade_rake_accumulated,
  parody_stocks = EXCLUDED.parody_stocks,
  updated_at = NOW();

-- 4. INSERTAR PUNTOS BASE OFICIALES LIMPIOS EN EL HISTÓRICO DE PRECIOS
-- Garantiza que las gráficas inicien en tiempo real con líneas de cotización nítidas
INSERT INTO public.price_history (
  ticker,
  price,
  volume,
  pool_balance,
  treasury_balance,
  total_shares,
  change_percent,
  trigger_type,
  event_description,
  player_username,
  created_at
)
VALUES 
  ('BTLN', 10.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial de lanzamiento Botellón SMR2', 'Sistema', NOW()),
  ('ONION', 45.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Onion Inc.', 'Sistema', NOW()),
  ('ARDI', 28.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Ardidas Sport', 'Sistema', NOW()),
  ('CHERR', 20.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Carlos Herrero', 'Sistema', NOW()),
  ('MBRON', 12.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Mercabrona Hielos', 'Sistema', NOW()),
  ('CUTI', 8.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Cutify Music', 'Sistema', NOW()),
  ('TOLED', 34.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Toledo TDI Repro', 'Sistema', NOW()),
  ('MERCA', 25.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Mercadona Hacendado Corp', 'Sistema', NOW()),
  ('REDB', 18.50, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Red Bull Combustión', 'Sistema', NOW()),
  ('MONS', 15.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Monster Energy Mango', 'Sistema', NOW()),
  ('DIA', 8.20, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Supermercados Día%', 'Sistema', NOW()),
  ('CHIN', 5.50, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Bazar El Chino 24h', 'Sistema', NOW()),
  ('KEBAB', 12.00, 0, 0, 5000.00, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Doner Kebab Amigo', 'Sistema', NOW());

-- 5. ASEGURAR HABILITACIÓN DE SUPABASE REALTIME PARA LAS TABLAS CRÍTICAS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'price_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'market_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.market_state;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 6. RECARGAR EL ESQUEMA DE POSTGREST DE INMEDIATO
NOTIFY pgrst, 'reload schema';

COMMIT;
