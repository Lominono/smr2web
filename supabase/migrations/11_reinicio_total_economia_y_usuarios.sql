-- ============================================================================
-- MIGRACIÓN 11: REINICIO TOTAL DE ECONOMÍA, MERCADO Y USUARIOS (1.000 MONEDAS)
-- Portal El Botellón / 2º SMR
--
-- INSTRUCCIONES:
-- Ejecuta este script en el Editor SQL de tu panel de Supabase (SQL Editor -> New Query -> Run)
-- para reiniciar a cero todas las operaciones de prueba, resetear las carteras
-- a 1.000 monedas de bienvenida y poner el mercado en tiempo real limpio.
-- ============================================================================

-- 1. DESACTIVAR RESTRICCIONES TEMPORALMENTE PARA LIMPIEZA ATÓMICA
BEGIN;

-- 2. LIMPIEZA DE TRANSACCIONES, POSICIONES E HISTORIAL ANTIGUO
DELETE FROM public.transactions;
DELETE FROM public.investments;
DELETE FROM public.price_history;

-- Limpieza de juegos antiguos de ruleta y logs ficticios (si existen las tablas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roulette_logs') THEN
    DELETE FROM public.roulette_logs;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'russian_roulette_games') THEN
    DELETE FROM public.russian_roulette_games;
  END IF;
END $$;

-- 3. RESET DE MONEDAS Y ESTADÍSTICAS DE USUARIOS REALES A 1.000 MONEDAS
-- Todos los usuarios registrados empiezan con 1.000 monedas de saldo base
UPDATE public.profiles
SET 
  coins = 1000,
  biggest_win = 0,
  streak_count = 1,
  last_claim_date = NULL,
  last_spin_date = NULL,
  last_rescue_date = NULL;

-- 4. REINICIAR ESTADO DEL MERCADO (BOTELLÓN Y EMPRESAS PARODIA)
-- Precios base oficiales:
-- BTLN: 10.00
-- MERCA: 25.00
-- REDB: 18.50
-- MONS: 15.00
-- DIA: 8.20
-- CHIN: 5.50
-- KEBAB: 12.00
DELETE FROM public.market_state;

INSERT INTO public.market_state (
  id,
  current_price,
  pool_balance,
  total_shares,
  parody_stocks,
  updated_at
) VALUES (
  1,
  10.00,
  0,
  0,
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
  parody_stocks = EXCLUDED.parody_stocks,
  updated_at = NOW();

-- 5. INSERTAR PUNTOS BASE INICIALES EN HISTÓRICO DE PRECIOS
-- Para que las gráficas inicien en tiempo real con líneas nítidas
INSERT INTO public.price_history (ticker, price, pool_balance, total_shares, change_percent, trigger_type, event_description, created_at)
VALUES 
  ('BTLN', 10.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio económico del mercado Botellón SMR2', NOW() - INTERVAL '10 minutes'),
  ('ONION', 45.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Onion Inc.', NOW() - INTERVAL '10 minutes'),
  ('ARDI', 28.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Ardidas Sport', NOW() - INTERVAL '10 minutes'),
  ('CHERR', 20.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Carlos Herrero', NOW() - INTERVAL '10 minutes'),
  ('MBRON', 12.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Mercabrona Hielos', NOW() - INTERVAL '10 minutes'),
  ('CUTI', 8.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Cutify Music', NOW() - INTERVAL '10 minutes'),
  ('TOLED', 34.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Toledo TDI Repro', NOW() - INTERVAL '10 minutes'),
  ('MERCA', 25.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Mercadona Hacendado Corp', NOW() - INTERVAL '10 minutes'),
  ('REDB', 18.50, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Red Bull Combustión', NOW() - INTERVAL '10 minutes'),
  ('MONS', 15.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Monster Energy Mango', NOW() - INTERVAL '10 minutes'),
  ('DIA', 8.20, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Supermercados Día%', NOW() - INTERVAL '10 minutes'),
  ('CHIN', 5.50, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Bazar El Chino 24h', NOW() - INTERVAL '10 minutes'),
  ('KEBAB', 12.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Reinicio oficial Doner Kebab Amigo', NOW() - INTERVAL '10 minutes');

-- 6. LIMPIEZA DE MENSAJES DE PRUEBA EN EL FEED
-- Opcional: elimina mensajes de prueba anteriores para dejar el tablón libre para los alumnos
DELETE FROM public.chat_messages WHERE username IN ('TestBot', 'DemoUser', 'Bot', 'FakeUser', 'Sistema');

-- 7. REFORZAR POLÍTICAS RLS Y PUBLICACIÓN REALTIME
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura abierta para sincronización multiusuario en vivo
DROP POLICY IF EXISTS "Lectura publica transactions" ON public.transactions;
CREATE POLICY "Lectura publica transactions" ON public.transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura publica price_history" ON public.price_history;
CREATE POLICY "Lectura publica price_history" ON public.price_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura publica market_state" ON public.market_state;
CREATE POLICY "Lectura publica market_state" ON public.market_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura publica profiles" ON public.profiles;
CREATE POLICY "Lectura publica profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura publica chat_messages" ON public.chat_messages;
CREATE POLICY "Lectura publica chat_messages" ON public.chat_messages FOR SELECT USING (true);

-- Replica Identity Full para asegurar que WebSockets envíen el payload completo
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.price_history REPLICA IDENTITY FULL;
ALTER TABLE public.market_state REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Asegurar publicación en supabase_realtime
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

COMMIT;

-- INSTRUCCIÓN OPCIONAL PARA BORRAR TODOS LOS USUARIOS DE SUPABASE AUTH (SI SE QUIERE EMPEZAR DE CERO ABSOLUTO):
-- Si quieres borrar también todas las cuentas de usuario de la autenticación de Supabase (requiere que se registren otra vez de cero):
-- Descomenta y ejecuta la siguiente línea:
-- TRUNCATE auth.users CASCADE;
