-- ============================================================================
-- SMR2 · MIGRACIÓN 15 · ENDURECIMIENTO DE SEGURIDAD (ECONOMÍA, JUEGOS Y RLS)
-- ============================================================================
-- Esta migración cierra las vías de abuso que permitían "fabricar" monedas y
-- manipular el mercado del botellón desde el navegador:
--
--   1. RLS estricta: el cliente anónimo/público ya NO puede escribir perfiles,
--      mercado, inversiones, transacciones ni partidas. Solo lee.
--   2. Permisos por columna en `profiles`: el navegador nunca puede cambiar
--      monedas, rol, baneos ni estadísticas. Solo datos cosméticos.
--   3. Trigger anti-escalada: bloquea cambios de economía/rol incluso si algún
--      permiso se concede por error.
--   4. Recámara secreta de la ruleta rusa fuera de la tabla pública.
--   5. Función transaccional `execute_market_trade` (sin carreras ni ventas
--      de acciones inexistentes).
--   6. Recibos de un solo uso para premios de minijuegos.
--   7. Retirada de EXECUTE público a las funciones SECURITY DEFINER económicas.
--
-- ⚠️ REQUISITO PREVIO (IMPRESCINDIBLE):
--   El servidor debe usar la SERVICE ROLE KEY de Supabase
--   (SUPABASE_SERVICE_ROLE_KEY en .env.local y en Vercel).
--   Sin ella, las rutas de la API no podrán escribir (la RLS las bloquea) y la
--   economía dejará de funcionar. Es el único modo seguro: la anon key es
--   pública y la ve cualquier alumno en el navegador.
--
-- Ejecuta este script completo en Supabase → SQL Editor.
-- Es idempotente: puedes volver a ejecutarlo sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TIPOS DE MOVIMIENTO DE SALDO
-- ----------------------------------------------------------------------------
-- El listado original solo permitía 5 tipos; el servidor registra muchos más
-- (propinas, canjes del botellón, renacimientos...). Sin esto, los topes
-- antiabuso basados en el histórico no podrían contar los abonos recientes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'balance_transactions'
  ) THEN
    ALTER TABLE public.balance_transactions DROP CONSTRAINT IF EXISTS balance_transactions_type_check;
    ALTER TABLE public.balance_transactions
      ADD CONSTRAINT balance_transactions_type_check CHECK (
        type IN (
          'daily_faucet', 'game_bet', 'game_win', 'admin_adjustment', 'refund',
          'daily', 'spin', 'rescue', 'vault', 'subsidio', 'rebirth', 'checkin',
          'misc', 'purchase', 'spend', 'market_buy', 'market_sell',
          'donation', 'tip_sent', 'tip_received', 'game_sync'
        )
      );

    CREATE INDEX IF NOT EXISTS idx_balance_tx_user_created
      ON public.balance_transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_balance_tx_user_type_created
      ON public.balance_transactions(user_id, type, created_at DESC);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. RECIBOS DE UN SOLO USO (premios de minijuegos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_receipts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_wallet_receipts_user ON public.wallet_receipts(user_id, created_at DESC);

ALTER TABLE public.wallet_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wallet_receipts FROM anon, authenticated;
GRANT ALL ON public.wallet_receipts TO service_role;

-- ----------------------------------------------------------------------------
-- 3. RECÁMARA SECRETA DE LA RULETA RUSA
-- ----------------------------------------------------------------------------
-- `rr_games` es de lectura pública para el tiempo real. La posición real de la
-- bala NO puede vivir ahí: cualquier alumno podía leerla con la anon key.
CREATE TABLE IF NOT EXISTS public.rr_game_secrets (
  game_id UUID PRIMARY KEY REFERENCES public.rr_games(id) ON DELETE CASCADE,
  bullet_chamber INT NOT NULL CHECK (bullet_chamber >= 0 AND bullet_chamber < 6),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rr_game_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rr_game_secrets FROM anon, authenticated;
GRANT ALL ON public.rr_game_secrets TO service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rr_games' AND column_name = 'bullet_chamber'
  ) THEN
    ALTER TABLE public.rr_games ALTER COLUMN bullet_chamber DROP NOT NULL;
    UPDATE public.rr_games SET bullet_chamber = NULL WHERE bullet_chamber IS NOT NULL;
  END IF;

  -- Limpiar la recámara filtrada en turnos antiguos
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rr_turns'
  ) THEN
    UPDATE public.rr_turns
       SET details = details - 'bulletChamber' - 'bullet_chamber' - 'secretBullet'
     WHERE details ?| array['bulletChamber', 'bullet_chamber', 'secretBullet'];
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. FUNCIÓN TRANSACCIONAL DEL MERCADO DEL BOTELLÓN
-- ----------------------------------------------------------------------------
-- La tabla `investments` se creó originalmente con UNIQUE(user_id), lo que
-- impedía tener posiciones en varios activos. Se elimina esa restricción
-- heredada y se garantiza la unicidad correcta (user_id, ticker).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='investments') THEN
    ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_user_id_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_investments_user_ticker') THEN
      ALTER TABLE public.investments ADD CONSTRAINT uq_investments_user_ticker UNIQUE (user_id, ticker);
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo ajustar la unicidad de investments: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.execute_market_trade(
  p_user_id UUID,
  p_ticker TEXT,
  p_action TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticker TEXT := upper(trim(coalesce(p_ticker, '')));
  v_action TEXT := lower(trim(coalesce(p_action, '')));
  v_profile RECORD;
  v_market RECORD;
  v_pos RECORD;
  v_stocks JSONB;
  v_stock JSONB;
  v_price NUMERIC;
  v_base NUMERIC;
  v_shares NUMERIC(18,4);
  v_coins BIGINT;
  v_gross BIGINT;
  v_fee BIGINT;
  v_net BIGINT;
  v_slip NUMERIC;
  v_new_price NUMERIC(12,4);
  v_old_shares NUMERIC(18,4) := 0;
  v_new_shares NUMERIC(18,4);
  v_avg NUMERIC(12,4) := 0;
  v_new_avg NUMERIC(12,4);
  v_invested BIGINT := 0;
  v_withdrawn BIGINT := 0;
  v_cooldown INT;
  v_new_balance BIGINT;
  v_tx_id UUID := gen_random_uuid();
  v_hist_id UUID := gen_random_uuid();
  v_impact NUMERIC(8,4) := 0;
  v_wait INT;
  v_treasury NUMERIC;
  v_pool NUMERIC;
  v_total_shares NUMERIC;
  v_volume BIGINT := 0;
BEGIN
  IF v_ticker NOT IN ('BTLN','ONION','ARDI','CHERR','MBRON','CUTI','TOLED') THEN
    RETURN jsonb_build_object('success', false, 'code', 'TICKER', 'error', 'Ese activo no cotiza en el mercado.');
  END IF;

  IF v_action NOT IN ('buy', 'sell') THEN
    RETURN jsonb_build_object('success', false, 'code', 'ACTION', 'error', 'Acción no válida.');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'AMOUNT', 'error', 'Cantidad fuera de rango.');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'PROFILE', 'error', 'Perfil de usuario no encontrado.');
  END IF;

  IF coalesce(v_profile.is_banned, false) THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Cuenta suspendida.');
  END IF;

  SELECT * INTO v_market FROM public.market_state WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'MARKET', 'error', 'Mercado no inicializado.');
  END IF;

  v_stocks := coalesce(v_market.parody_stocks, '{}'::jsonb);
  IF jsonb_typeof(v_stocks) <> 'object' THEN
    v_stocks := '{}'::jsonb;
  END IF;

  IF v_ticker = 'BTLN' THEN
    v_price := coalesce(v_market.current_price, 10.0);
    v_base := 10.0;
  ELSE
    v_base := CASE v_ticker
      WHEN 'ONION' THEN 45.0 WHEN 'ARDI' THEN 28.0 WHEN 'CHERR' THEN 20.0
      WHEN 'MBRON' THEN 12.0 WHEN 'CUTI' THEN 8.0 WHEN 'TOLED' THEN 34.0
      ELSE 10.0 END;
    v_stock := v_stocks -> v_ticker;
    v_price := coalesce((v_stock ->> 'price')::NUMERIC, v_base);
  END IF;

  IF v_price IS NULL OR v_price <= 0 THEN
    v_price := v_base;
  END IF;

  v_total_shares := coalesce(v_market.total_shares, 0);
  v_pool := coalesce(v_market.pool_balance, 10000);
  v_treasury := coalesce(v_market.treasury_balance, 5000);

  SELECT * INTO v_pos
    FROM public.investments
   WHERE user_id = p_user_id AND ticker = v_ticker
   FOR UPDATE;

  IF FOUND THEN
    v_old_shares := coalesce(v_pos.shares, 0);
    v_avg := coalesce(v_pos.average_buy_price, 0);
    v_invested := coalesce(v_pos.total_invested_coins, 0);
    v_withdrawn := coalesce(v_pos.total_withdrawn_coins, 0);
  END IF;

  -- Cooldown por usuario y activo (anti-snipe / anti-spam de órdenes)
  v_cooldown := greatest(0, coalesce(v_market.cooldown_seconds, 30));
  IF v_cooldown > 0 AND v_pos.id IS NOT NULL AND v_pos.last_transaction_at IS NOT NULL THEN
    v_wait := ceil(v_cooldown - extract(epoch FROM (now() - v_pos.last_transaction_at)))::INT;
    IF v_wait > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'COOLDOWN',
        'error', format('Espera %s s antes de volver a operar con %s.', v_wait, v_ticker),
        'wait_seconds', v_wait
      );
    END IF;
  END IF;

  IF v_action = 'buy' THEN
    v_coins := round(p_amount)::BIGINT;
    IF v_coins < greatest(10, coalesce(v_market.min_investment, 10)) THEN
      RETURN jsonb_build_object('success', false, 'code', 'AMOUNT', 'error', 'La inversión mínima es de 10 monedas.');
    END IF;
    IF v_coins > coalesce(v_profile.coins, 0) THEN
      RETURN jsonb_build_object('success', false, 'code', 'BALANCE', 'error', format('Saldo insuficiente: tienes %s monedas.', v_profile.coins));
    END IF;

    v_shares := round((v_coins::NUMERIC / v_price), 4);
    IF v_shares <= 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'AMOUNT', 'error', 'La orden es demasiado pequeña.');
    END IF;

    v_slip := least(0.20::NUMERIC, (v_coins::NUMERIC / (coalesce(v_market.pool_balance, 10000) + 5000)) * 1.4);
    v_new_price := greatest(1.0, round(v_price * (1 + v_slip), 4));
    v_new_shares := v_old_shares + v_shares;
    v_new_avg := round(((v_avg * v_old_shares) + (v_price * v_shares)) / v_new_shares, 4);
    v_invested := v_invested + v_coins;
    v_new_balance := coalesce(v_profile.coins, 0) - v_coins;
    v_treasury := coalesce(v_market.treasury_balance, 5000);
    v_pool := coalesce(v_market.pool_balance, 10000) + v_coins;
    v_total_shares := coalesce(v_market.total_shares, 0) + v_shares;
    v_volume := v_coins;
    v_impact := round(v_slip * 100, 2);
    INSERT INTO public.balance_transactions (user_id, amount, balance_before, balance_after, type, reference_id, description)
      VALUES (p_user_id, -v_coins, coalesce(v_profile.coins,0), v_new_balance, 'market_buy', v_tx_id::text,
              format('Compra de %s acciones de %s a %s', v_shares, v_ticker, v_price));
  ELSE
    v_shares := round(p_amount, 4);
    IF v_shares <= 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'AMOUNT', 'error', 'Indica una cantidad de acciones a vender.');
    END IF;
    IF v_old_shares <= 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'POSITION', 'error', format('No posees acciones de %s para vender.', v_ticker));
    END IF;
    IF v_shares > v_old_shares THEN
      RETURN jsonb_build_object('success', false, 'code', 'POSITION',
        'error', format('No posees suficientes acciones. Tienes %s e intentas vender %s.', v_old_shares, v_shares));
    END IF;

    v_gross := round(v_shares * v_price)::BIGINT;
    IF v_gross <= 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'AMOUNT', 'error', 'El importe de la venta es demasiado pequeño.');
    END IF;
    v_fee := greatest(1, round(v_gross * coalesce(v_market.fee_rate, 0.02)))::BIGINT;
    v_net := greatest(0, v_gross - v_fee);
    IF v_net <= 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'AMOUNT', 'error', 'El importe de la venta no cubre la comisión mínima.');
    END IF;

    v_slip := least(0.20::NUMERIC, (v_gross::NUMERIC / (coalesce(v_market.pool_balance, 10000) + 5000)) * 1.4);
    v_new_price := greatest(1.0, round(v_price * (1 - v_slip), 4));
    v_new_shares := v_old_shares - v_shares;
    v_new_avg := v_avg;
    -- Coste de adquisición proporcional a las acciones vendidas
    IF v_old_shares > 0 THEN
      v_invested := greatest(0, round(v_invested * (v_new_shares / v_old_shares))::BIGINT);
    END IF;
    v_new_balance := coalesce(v_profile.coins, 0) + v_net;
    v_treasury := coalesce(v_market.treasury_balance, 5000) + v_fee;
    v_pool := greatest(1000, coalesce(v_market.pool_balance, 10000) - v_gross);
    v_total_shares := greatest(0, coalesce(v_market.total_shares, 0) - v_shares);
    v_volume := v_gross;
    v_withdrawn := v_withdrawn + v_net;
    v_impact := -round(v_slip * 100, 2);
    INSERT INTO public.balance_transactions (user_id, amount, balance_before, balance_after, type, reference_id, description)
      VALUES (p_user_id, v_net, coalesce(v_profile.coins,0), v_new_balance, 'market_sell', v_tx_id::text,
              format('Venta de %s acciones de %s (neto %s, comisión %s)', v_shares, v_ticker, v_net, v_fee));
  END IF;

  -- Cartera
  IF v_pos.id IS NOT NULL THEN
    UPDATE public.investments
       SET shares = v_new_shares,
           total_invested_coins = v_invested,
           total_withdrawn_coins = v_withdrawn,
           average_buy_price = v_new_avg,
           last_transaction_at = now(),
           updated_at = now()
     WHERE id = v_pos.id;
  ELSE
    INSERT INTO public.investments (user_id, ticker, shares, total_invested_coins, total_withdrawn_coins, average_buy_price, last_transaction_at)
      VALUES (p_user_id, v_ticker, v_new_shares, v_invested, v_withdrawn, v_new_avg, now());
  END IF;

  -- Saldo
  UPDATE public.profiles SET coins = v_new_balance, updated_at = now() WHERE id = p_user_id;

  -- Mercado
  IF v_ticker = 'BTLN' THEN
    UPDATE public.market_state
       SET current_price = v_new_price,
           total_shares = v_total_shares,
           pool_balance = v_pool,
           treasury_balance = v_treasury,
           total_volume = coalesce(total_volume, 0) + v_volume,
           total_revenue_generated = coalesce(total_revenue_generated, 0) + v_fee,
           total_investors = (SELECT count(*) FROM public.investments WHERE shares > 0.001),
           last_event = format('@%s %s %s', v_profile.username, CASE WHEN v_action='buy' THEN 'compró' ELSE 'vendió' END, v_ticker),
           updated_at = now()
     WHERE id = 1;
  ELSE
    v_stock := coalesce(v_stocks -> v_ticker, jsonb_build_object('ticker', v_ticker, 'name', v_ticker));
    v_stock := jsonb_set(v_stock, '{ticker}', to_jsonb(v_ticker), true);
    v_stock := jsonb_set(v_stock, '{price}', to_jsonb(v_new_price), true);
    v_stock := jsonb_set(v_stock, '{volume}', to_jsonb(coalesce((v_stock ->> 'volume')::BIGINT, 0) + v_volume), true);
    v_stock := jsonb_set(v_stock, '{change24h}', to_jsonb(round(((v_new_price - v_base) / v_base) * 100, 2)), true);
    v_stocks := jsonb_set(v_stocks, ARRAY[v_ticker], v_stock, true);

    UPDATE public.market_state
       SET parody_stocks = v_stocks,
           treasury_balance = v_treasury,
           total_volume = coalesce(total_volume, 0) + v_volume,
           total_revenue_generated = coalesce(total_revenue_generated, 0) + v_fee,
           updated_at = now()
     WHERE id = 1;
  END IF;

  -- Libro público de operaciones
  INSERT INTO public.transactions (
    id, user_id, username, ticker, type, coins_amount, shares_amount,
    price_per_share, fee_coins, net_coins, price_impact_percent, created_at
  ) VALUES (
    v_tx_id, p_user_id, coalesce(v_profile.username, 'Alumno'), v_ticker,
    v_action,
    CASE WHEN v_action = 'buy' THEN v_coins ELSE v_gross END,
    v_shares, round(v_price, 4),
    CASE WHEN v_action = 'buy' THEN 0 ELSE v_fee END,
    CASE WHEN v_action = 'buy' THEN v_coins ELSE v_net END,
    v_impact, now()
  );
  -- Punto del histórico para la gráfica
  INSERT INTO public.price_history (
    id, ticker, price, volume, pool_balance, treasury_balance,
    total_shares, change_percent, trigger_type, event_description, player_username, created_at
  ) VALUES (
    v_hist_id, v_ticker, v_new_price, v_volume,
    v_pool, v_treasury, v_total_shares, v_impact, v_action,
    format('@%s %s %s', v_profile.username, CASE WHEN v_action='buy' THEN 'compró' ELSE 'vendió' END, v_ticker),
    v_profile.username, now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'price_history_id', v_hist_id,
    'ticker', v_ticker,
    'action', v_action,
    'shares', v_shares,
    'price', round(v_price, 4),
    'new_price', v_new_price,
    'coins_delta', CASE WHEN v_action = 'buy' THEN -v_coins ELSE v_net END,
    'fee_paid', CASE WHEN v_action = 'buy' THEN 0 ELSE v_fee END,
    'remaining_shares', v_new_shares,
    'new_balance', v_new_balance,
    'pool_balance', v_pool,
    'treasury_balance', v_treasury,
    'total_shares', v_total_shares,
    'price_impact_percent', v_impact
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_market_trade(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_market_trade(UUID, TEXT, TEXT, NUMERIC) TO service_role;

-- ----------------------------------------------------------------------------
-- 5. FUNCIONES PELIGROSAS: SIN ACCESO PÚBLICO
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Venta/compra antigua por RPC: el cliente podía mover precios sin pasar por la API
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'trade_parody_stock') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.trade_parody_stock(TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.trade_parody_stock(TEXT, TEXT, NUMERIC) TO service_role';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'record_arcade_rake_to_market') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.record_arcade_rake_to_market(BIGINT, TEXT) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.record_arcade_rake_to_market(BIGINT, TEXT) TO service_role';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'tick_market_price') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.tick_market_price() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.tick_market_price() TO service_role';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'sync_botellon_state') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.sync_botellon_state(UUID, JSONB) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.sync_botellon_state(UUID, JSONB) TO authenticated, service_role';
  END IF;
END $$;

-- Rake limitado también dentro de la función (defensa en profundidad)
CREATE OR REPLACE FUNCTION public.record_arcade_rake_to_market(
  p_amount BIGINT,
  p_game TEXT DEFAULT 'arcade'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market RECORD;
  v_amount BIGINT;
BEGIN
  v_amount := least(greatest(coalesce(p_amount, 0), 0), 200);
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Importe no válido');
  END IF;

  SELECT * INTO v_market FROM public.market_state WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mercado no inicializado');
  END IF;

  UPDATE public.market_state
     SET treasury_balance = coalesce(treasury_balance, 0) + v_amount,
         total_revenue_generated = coalesce(total_revenue_generated, 0) + v_amount,
         arcade_rake_accumulated = coalesce(arcade_rake_accumulated, 0) + v_amount,
         updated_at = now()
   WHERE id = 1;

  RETURN jsonb_build_object('success', true, 'rake_added', v_amount, 'game', p_game);
END;
$$;

REVOKE ALL ON FUNCTION public.record_arcade_rake_to_market(BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_arcade_rake_to_market(BIGINT, TEXT) TO service_role;

-- Sincronización del botellón: solo el dueño del perfil (o el servidor)
CREATE OR REPLACE FUNCTION public.sync_botellon_state(
  p_user_id UUID,
  p_state JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_at TIMESTAMPTZ := now();
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL OR v_uid <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  UPDATE public.profiles
     SET party_farm_data = coalesce(p_state, '{}'::jsonb),
         updated_at = now()
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'server_time_ms', extract(epoch FROM v_updated_at) * 1000,
    'user_id', p_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_botellon_state(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_botellon_state(UUID, JSONB) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. LIMPIEZA DE POLÍTICAS PERMISIVAS Y RLS ESTRICTA
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
  tabla TEXT;
  tablas TEXT[] := ARRAY[
    'profiles', 'calendar_events', 'chat_messages', 'chat_message_likes',
    'chat_message_comments', 'community_feedback', 'feedback_votes',
    'market_state', 'investments', 'transactions', 'price_history',
    'balance_transactions', 'rr_rooms', 'rr_room_players', 'rr_games',
    'rr_turns', 'event_logs', 'push_subscriptions', 'app_updates',
    'announcements', 'wallet_receipts', 'rr_game_secrets', 'messages'
  ];
BEGIN
  FOREACH tabla IN ARRAY tablas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tabla) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tabla);
      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tabla LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tabla);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- PERFILES: lectura pública (ranking, feed), escritura solo de las columnas
-- permitidas por los GRANT por columna de la sección 7.
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND coalesce(coins, 1000) = 1000
    AND coalesce(biggest_win, 0) = 0
    AND coalesce(role, 'student') = 'student'
    AND coalesce(is_banned, false) = false
  );

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- CALENDARIO: lectura pública, escritura solo administración/delegados
CREATE POLICY "calendar_select_public" ON public.calendar_events
  FOR SELECT USING (true);

CREATE POLICY "calendar_write_staff" ON public.calendar_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','delegado')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','delegado')));

-- CHAT: lectura pública, publicación autenticada, borrado propio o staff
CREATE POLICY "chat_select_public" ON public.chat_messages
  FOR SELECT USING (true);

CREATE POLICY "h15_chat_insert" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "chat_update_authenticated" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "chat_delete_owner_or_staff" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','delegado'))
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_message_likes') THEN
    EXECUTE 'CREATE POLICY "h15_chat_likes" ON public.chat_message_likes FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_message_comments') THEN
    EXECUTE 'CREATE POLICY "chat_comments_select" ON public.chat_message_comments FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "h15_chat_comments_insert" ON public.chat_message_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY "chat_comments_delete_owner" ON public.chat_message_comments FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- FEEDBACK (incidencias y sugerencias)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='community_feedback') THEN
    EXECUTE 'CREATE POLICY "feedback_select_authenticated" ON public.community_feedback FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "feedback_insert_authenticated" ON public.community_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY "feedback_update_staff" ON public.community_feedback FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN (''admin'',''delegado''))) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN (''admin'',''delegado'')))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feedback_votes') THEN
    EXECUTE 'CREATE POLICY "h15_feedback_votes" ON public.feedback_votes FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- MERCADO: SOLO LECTURA desde el navegador (escritura exclusiva del servidor)
CREATE POLICY "market_select_public" ON public.market_state FOR SELECT USING (true);
CREATE POLICY "price_history_select_public" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "transactions_select_public" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "investments_select_public" ON public.investments FOR SELECT USING (true);
CREATE POLICY "balance_tx_select_owner" ON public.balance_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- RULETA RUSA: SOLO LECTURA desde el navegador
CREATE POLICY "rr_rooms_select_public" ON public.rr_rooms FOR SELECT USING (true);
CREATE POLICY "rr_room_players_select_public" ON public.rr_room_players FOR SELECT USING (true);
CREATE POLICY "rr_games_select_public" ON public.rr_games FOR SELECT USING (true);
CREATE POLICY "rr_turns_select_public" ON public.rr_turns FOR SELECT USING (true);

-- LOGS: Solo el servidor escribe y administración lee
CREATE POLICY "event_logs_select_admin" ON public.event_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- PUSH: cada alumno gestiona sus propias suscripciones
CREATE POLICY "push_select_owner" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_delete_owner" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ANUNCIOS Y ACTUALIZACIONES: lectura pública
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='announcements') THEN
    EXECUTE 'CREATE POLICY "announcements_select_public" ON public.announcements FOR SELECT USING (true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='app_updates') THEN
    EXECUTE 'CREATE POLICY "app_updates_select_public" ON public.app_updates FOR SELECT USING (true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages') THEN
    EXECUTE 'CREATE POLICY "messages_select_public" ON public.messages FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "messages_insert_authenticated" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. PERFILES: PERMISOS POR COLUMNA (nadie toca dinero/rol/estadísticas)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  cols_publicas TEXT;
  cols_insert TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols_publicas
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name IN (
       'username', 'nombre', 'full_name', 'student_number', 'avatar_color',
       'banner_estilo', 'titulo_personalizado', 'frase', 'mascota_equipada',
       'mascotas_desbloqueadas', 'items_comprados', 'sound_enabled',
       'notifications_enabled', 'onboarding_completado', 'pc_seat',
       'party_farm_data'
     );

  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols_insert
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name IN (
       'id', 'username', 'nombre', 'full_name', 'email', 'coins', 'biggest_win',
       'streak_count', 'role', 'rol', 'avatar_color', 'onboarding_completado',
       'created_at'
     );

  IF cols_publicas IS NOT NULL THEN
    REVOKE UPDATE ON public.profiles FROM anon, authenticated;
    EXECUTE format('GRANT UPDATE (%s) ON public.profiles TO authenticated', cols_publicas);
  END IF;

  IF cols_insert IS NOT NULL THEN
    REVOKE INSERT ON public.profiles FROM anon, authenticated;
    EXECUTE format('GRANT INSERT (%s) ON public.profiles TO authenticated', cols_insert);
  END IF;

  -- El resto de tablas económicas: sin escritura para el público
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='market_state') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.market_state FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.market_state TO anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='investments') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.investments FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.investments TO anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transactions') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.transactions TO anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='price_history') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.price_history FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.price_history TO anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='balance_transactions') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.balance_transactions FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.balance_transactions TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rr_games') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.rr_games FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.rr_games TO anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rr_rooms') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.rr_rooms FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.rr_rooms TO anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rr_room_players') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.rr_room_players FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.rr_room_players TO anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rr_turns') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.rr_turns FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.rr_turns TO anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='event_logs') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.event_logs FROM anon, authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. TRIGGER ANTI-ESCALADA (defensa en profundidad)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profiles_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Las operaciones del servidor (service_role) y de mantenimiento pueden tocar todo
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.coins IS DISTINCT FROM OLD.coins THEN
    RAISE EXCEPTION 'Operación denegada: el saldo solo puede modificarlo el servidor.';
  END IF;

  IF NEW.biggest_win IS DISTINCT FROM OLD.biggest_win THEN
    RAISE EXCEPTION 'Operación denegada: la mejor victoria solo puede modificarla el servidor.';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Operación denegada: no puedes alterar tu rango.';
  END IF;

  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason THEN
    RAISE EXCEPTION 'Operación denegada: no puedes alterar el estado de suspensión.';
  END IF;

  IF NEW.streak_count IS DISTINCT FROM OLD.streak_count
     OR NEW.last_claim_date IS DISTINCT FROM OLD.last_claim_date
     OR NEW.last_spin_date IS DISTINCT FROM OLD.last_spin_date
     OR NEW.last_rescue_date IS DISTINCT FROM OLD.last_rescue_date THEN
    RAISE EXCEPTION 'Operación denegada: las recompensas solo puede gestionarlas el servidor.';
  END IF;

  IF NEW.games_played IS DISTINCT FROM OLD.games_played
     OR NEW.games_won IS DISTINCT FROM OLD.games_won THEN
    RAISE EXCEPTION 'Operación denegada: las estadísticas solo puede gestionarlas el servidor.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profiles_integrity ON public.profiles;
CREATE TRIGGER trg_protect_profiles_integrity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profiles_integrity();

-- ----------------------------------------------------------------------------
-- 9. RECARGA DE ESQUEMA
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
