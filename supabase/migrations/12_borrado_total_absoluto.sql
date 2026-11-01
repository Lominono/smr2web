-- ============================================================================
-- MIGRACIÓN 12: BORRADO TOTAL Y ABSOLUTO DE LA BASE DE DATOS
-- Portal El Botellón / 2º SMR
--
-- ADVERTENCIA CRÍTICA:
-- Esta operación BORRA TODO permanentemente:
--  - Todos los usuarios, correos electrónicos, contraseñas y logins (auth.users).
--  - Todas las sesiones y tokens de autenticación activos.
--  - Todos los perfiles, monedas, récords y rachas (profiles).
--  - Todas las órdenes, transacciones, participaciones y cartera (investments, transactions).
--  - Todo el historial de precios y gráficas (price_history).
--  - Todos los mensajes del feed, tareas, exámenes, ideas y reportes.
--  - Restablece el mercado con precios base oficiales para empezar desde cero.
--
-- CÓMO EJECUTAR EN SUPABASE:
-- 1. Ve a tu panel de Supabase: https://supabase.com/dashboard/project/_/sql
-- 2. Entra en "SQL Editor" -> "New query".
-- 3. Pega todo este código y pulsa en "Run".
-- ============================================================================

BEGIN;

-- 1. DESCONECTAR RESTRICCIONES Y TRUNCAR USUARIOS DE AUTENTICACIÓN
-- TRUNCATE auth.users CASCADE elimina de golpe:
--   - Cuentas de correo y contraseñas
--   - Identidades y proveedores
--   - Sesiones y refresh tokens activos
--   - Todos los perfiles en public.profiles (por clave foránea ON DELETE CASCADE)
TRUNCATE auth.users CASCADE;

-- 2. VACIAR ABSOLUTAMENTE TODAS LAS TABLAS PÚBLICAS
TRUNCATE TABLE 
  public.profiles,
  public.chat_messages,
  public.community_feedback,
  public.feedback_votes,
  public.transactions,
  public.investments,
  public.price_history,
  public.balance_transactions,
  public.rr_turns,
  public.rr_games,
  public.rr_room_players,
  public.rr_rooms,
  public.event_logs,
  public.calendar_events,
  public.app_updates
CASCADE;

-- Limpieza de cualquier tabla adicional si existiese
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roulette_logs') THEN
    DELETE FROM public.roulette_logs;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'russian_roulette_games') THEN
    DELETE FROM public.russian_roulette_games;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    DELETE FROM public.audit_logs;
  END IF;
END $$;

-- 3. REINICIAR EL ESTADO DEL MERCADO A VALORES BASE OFICIALES (ID = 1)
DELETE FROM public.market_state;

INSERT INTO public.market_state (
  id,
  current_price,
  pool_balance,
  total_shares,
  total_volume,
  total_investors,
  parody_stocks,
  updated_at
) VALUES (
  1,
  10.00,
  0,
  0,
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
  total_volume = EXCLUDED.total_volume,
  total_investors = EXCLUDED.total_investors,
  parody_stocks = EXCLUDED.parody_stocks,
  updated_at = NOW();

-- 4. INSERTAR PUNTOS BASE INICIALES LIMPIOS EN EL HISTÓRICO DE PRECIOS
-- Permite que las gráficas inicien en tiempo real con líneas de cotización nítidas
INSERT INTO public.price_history (ticker, price, pool_balance, total_shares, change_percent, trigger_type, event_description, created_at)
VALUES 
  ('BTLN', 10.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Botellón SMR2', NOW()),
  ('ONION', 45.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Onion Inc.', NOW()),
  ('ARDI', 28.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Ardidas Sport', NOW()),
  ('CHERR', 20.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Carlos Herrero', NOW()),
  ('MBRON', 12.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Mercabrona Hielos', NOW()),
  ('CUTI', 8.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Cutify Music', NOW()),
  ('TOLED', 34.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Toledo TDI Repro', NOW()),
  ('MERCA', 25.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Mercadona Hacendado Corp', NOW()),
  ('REDB', 18.50, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Red Bull Combustión', NOW()),
  ('MONS', 15.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Monster Energy Mango', NOW()),
  ('DIA', 8.20, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Supermercados Día%', NOW()),
  ('CHIN', 5.50, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Bazar El Chino 24h', NOW()),
  ('KEBAB', 12.00, 0, 0, 0.0, 'SYSTEM_INIT', 'Punto base oficial Doner Kebab Amigo', NOW());

COMMIT;
