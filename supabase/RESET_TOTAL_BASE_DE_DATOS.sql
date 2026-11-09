-- ==============================================================
-- SMR2 WEB · RESET TOTAL Y LIMPIEZA ABSOLUTA PARA EL LANZAMIENTO
-- ==============================================================
-- Este script deja la base de datos 100% LIMPIA para el estreno oficial:
-- 1. Elimina TODOS los usuarios y logins registrados (auth.users y sus sesiones).
-- 2. Elimina TODOS los perfiles de alumnos (public.profiles / perfiles).
-- 3. Elimina TODOS los mensajes del feed / chat (public.chat_messages, mensajes, likes).
-- 4. Elimina TODAS las transacciones, inversiones, salas de ruleta rusa y feedback.
-- 5. Restablece el mercado parodia y la tesorería al valor inicial oficial (10.00 🪙 base, 0 inversores).
-- 6. No deja ningún usuario fantasma ni mensajes de prueba.
--
-- INSTRUCCIONES:
-- 1. Entra a tu panel de Supabase:
--    https://supabase.com/dashboard/project/ehzekojovbxdkcmfbugc/sql/new
-- 2. Pega todo este código y pulsa "Run" (o presiona Ctrl+Enter).
-- ==============================================================

BEGIN;

-- 1. BORRADO TOTAL DE CUENTAS DE USUARIOS Y AUTENTICACIÓN
-- TRUNCATE auth.users CASCADE purga de inmediato:
-- - Cuentas de email y contraseñas
-- - Sesiones activas (auth.sessions)
-- - Refresh tokens (auth.refresh_tokens)
-- - Identidades de login (auth.identities)
-- - Factores MFA (auth.mfa_factors, auth.mfa_challenges)
TRUNCATE auth.users CASCADE;

-- 2. VACIAR ABSOLUTAMENTE TODAS LAS TABLAS DE DATOS PÚBLICAS
DO $$
DECLARE
  tbl_name text;
  public_tables text[] := ARRAY[
    'profiles',
    'perfiles',
    'chat_messages',
    'chat_message_likes',
    'messages',
    'posts',
    'comments',
    'comment_reactions',
    'likes_posts',
    'post_likes',
    'post_votes',
    'chismes',
    'conversations',
    'transactions',
    'investments',
    'balance_transactions',
    'price_history',
    'feedback_votes',
    'community_feedback',
    'calendar_events',
    'rr_turns',
    'rr_room_players',
    'rr_games',
    'rr_rooms',
    'russian_roulette_games',
    'roulette_logs',
    'event_logs',
    'audit_logs',
    'admin_audit_logs',
    'admin_actions',
    'push_subscriptions',
    'notifications',
    'announcements',
    'app_updates',
    'user_activity',
    'user_cosmetics',
    'user_auras',
    'anchoa_tx',
    'faro_wheel_spins',
    'follows',
    'blocked_users',
    'rate_limits',
    'cookie_consent_logs'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY public_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', tbl_name);
    END IF;
  END LOOP;
END $$;

-- 3. REINICIAR EL ESTADO DEL MERCADO Y TESORERÍA AL ESTADO LIMPIO OFICIAL
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
-- Garantiza que las gráficas inicien en tiempo real con líneas de cotización nítidas y sin operaciones previas
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

-- 5. NOTIFICAR RECARGA INMEDIATA DE ESQUEMA EN POSTGREST
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ==============================================================
-- 6. VERIFICACIÓN VISUAL DEL ESTADO LIMPIO:
-- Debe devolver 0 usuarios, 0 perfiles, 0 mensajes y 0 transacciones.
-- ==============================================================
SELECT 
  (SELECT count(*) FROM auth.users) AS "Usuarios Auth (debe ser 0)",
  (SELECT count(*) FROM public.profiles) AS "Perfiles Registrados (debe ser 0)",
  (SELECT count(*) FROM public.chat_messages) AS "Mensajes en Feed (debe ser 0)",
  (SELECT count(*) FROM public.transactions) AS "Transacciones (debe ser 0)",
  (SELECT count(*) FROM public.investments) AS "Inversiones (debe ser 0)";
