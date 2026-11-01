-- ==============================================================
-- SMR2 WEB · MIGRACIÓN 06: SISTEMA DE INVERSIONES "FONDO BOTELLÓN"
-- ==============================================================
-- 100% IDEMPOTENTE: Puedes ejecutar este script completo en el SQL Editor de Supabase.
-- Incluye: Tablas, Índices, RLS, Publicación Realtime, RPCs con FOR UPDATE y pg_cron.
-- ==============================================================

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Compatibilidad: flexibilizar restricción de tipo en balance_transactions si existía
DO $$
BEGIN
  ALTER TABLE public.balance_transactions DROP CONSTRAINT IF EXISTS balance_transactions_type_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. TABLA: market_state (Estado Global del Mercado del Fondo Botellón)
-- Diseñada como fila única (id = 1) para un mercado global compartido.
CREATE TABLE IF NOT EXISTS public.market_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_price NUMERIC(12, 4) DEFAULT 10.0000 NOT NULL CHECK (current_price >= 1.0000),
  total_shares NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL CHECK (total_shares >= 0),
  pool_balance NUMERIC(18, 4) DEFAULT 10000.0000 NOT NULL CHECK (pool_balance >= 0),
  reserve_balance NUMERIC(18, 4) DEFAULT 25000.0000 NOT NULL CHECK (reserve_balance > 0),
  total_volume BIGINT DEFAULT 0 NOT NULL,
  total_investors INT DEFAULT 0 NOT NULL,
  fee_rate NUMERIC(6, 4) DEFAULT 0.0200 NOT NULL CHECK (fee_rate >= 0 AND fee_rate <= 0.20),
  cooldown_seconds INT DEFAULT 60 NOT NULL CHECK (cooldown_seconds >= 0),
  min_investment BIGINT DEFAULT 10 NOT NULL CHECK (min_investment > 0),
  max_investment BIGINT DEFAULT 25000 NOT NULL CHECK (max_investment >= min_investment),
  last_event TEXT DEFAULT 'Apertura de mercado' NOT NULL,
  last_event_type TEXT DEFAULT 'neutral' NOT NULL,
  last_event_impact NUMERIC(6, 4) DEFAULT 0.0000 NOT NULL,
  last_tick_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fila inicial del mercado
INSERT INTO public.market_state (
  id, current_price, total_shares, pool_balance, reserve_balance,
  total_volume, total_investors, fee_rate, cooldown_seconds,
  min_investment, max_investment, last_event, last_event_type, last_event_impact
) VALUES (
  1, 10.0000, 0.0000, 10000.0000, 25000.0000,
  0, 0, 0.0200, 60,
  10, 25000, 'Apertura oficial del Fondo Botellón', 'neutral', 0.0000
) ON CONFLICT (id) DO NOTHING;

-- 3. TABLA: investments (Posiciones de Inversión por Usuario)
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  shares NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL CHECK (shares >= 0),
  total_invested_coins BIGINT DEFAULT 0 NOT NULL CHECK (total_invested_coins >= 0),
  total_withdrawn_coins BIGINT DEFAULT 0 NOT NULL CHECK (total_withdrawn_coins >= 0),
  average_buy_price NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL CHECK (average_buy_price >= 0),
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_shares ON public.investments(shares DESC);

-- 4. TABLA: transactions (Historial de Operaciones de Inversión)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  coins_amount BIGINT NOT NULL CHECK (coins_amount > 0),
  shares_amount NUMERIC(18, 4) NOT NULL CHECK (shares_amount > 0),
  price_per_share NUMERIC(12, 4) NOT NULL CHECK (price_per_share > 0),
  fee_coins BIGINT DEFAULT 0 NOT NULL CHECK (fee_coins >= 0),
  net_coins BIGINT NOT NULL CHECK (net_coins > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 5. TABLA: price_history (Historial de Precios para Gráficas y Velas)
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  price NUMERIC(12, 4) NOT NULL CHECK (price > 0),
  pool_balance NUMERIC(18, 4) NOT NULL,
  total_shares NUMERIC(18, 4) NOT NULL,
  change_percent NUMERIC(8, 4) DEFAULT 0.0000 NOT NULL,
  trigger_type TEXT DEFAULT 'tick' NOT NULL CHECK (trigger_type IN ('tick', 'buy', 'sell', 'event', 'initial')),
  event_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON public.price_history(created_at DESC);

-- Registro inicial de precio si la tabla está vacía
INSERT INTO public.price_history (
  price, pool_balance, total_shares, change_percent, trigger_type, event_description
)
SELECT 10.0000, 10000.0000, 0.0000, 0.0000, 'initial', 'Precio base de lanzamiento'
WHERE NOT EXISTS (SELECT 1 FROM public.price_history);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas previas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('market_state', 'investments', 'transactions', 'price_history')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- POLÍTICAS RLS:
-- market_state: lectura pública; nadie puede escribir directamente desde el cliente
CREATE POLICY "Lectura pública de market_state" 
  ON public.market_state FOR SELECT 
  USING (true);

-- price_history: lectura pública para que todos vean la gráfica en vivo
CREATE POLICY "Lectura pública de price_history" 
  ON public.price_history FOR SELECT 
  USING (true);

-- investments: cada usuario solo ve su propia posición de inversión
CREATE POLICY "Lectura propia de investments" 
  ON public.investments FOR SELECT 
  USING (auth.uid() = user_id);

-- transactions: cada usuario solo ve su propio historial de transacciones
CREATE POLICY "Lectura propia de transactions" 
  ON public.transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- 7. REPLICA IDENTITY FULL (Para payloads completos en Supabase Realtime)
ALTER TABLE public.market_state REPLICA IDENTITY FULL;
ALTER TABLE public.investments REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.price_history REPLICA IDENTITY FULL;

-- 8. AÑADIR A LA PUBLICACIÓN REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'market_state') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.market_state;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'investments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.investments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'price_history') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;
  END IF;
END $$;


-- ==============================================================
-- 9. FUNCIONES SQL (RPC) CON BLOQUEO ATÓMICO (FOR UPDATE)
-- ==============================================================

-- --------------------------------------------------------------
-- RPC 1: invest_in_botellon(p_amount BIGINT)
-- Invertir monedas en el fondo botellón comprando participaciones.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invest_in_botellon(p_amount BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_username TEXT;
  v_user_coins BIGINT;
  v_market RECORD;
  v_inv RECORD;
  v_shares_to_buy NUMERIC(18, 4);
  v_exec_price NUMERIC(12, 4);
  v_new_price NUMERIC(12, 4);
  v_new_pool NUMERIC(18, 4);
  v_new_total_shares NUMERIC(18, 4);
  v_new_user_coins BIGINT;
  v_cooldown_left INT;
  v_slippage_factor NUMERIC;
  v_new_avg_price NUMERIC(12, 4);
  v_final_shares NUMERIC(18, 4);
BEGIN
  -- 1. Identificar usuario autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado: debes iniciar sesión para operar en el Fondo Botellón.';
  END IF;

  -- 2. Bloquear fila de perfiles (FOR UPDATE) para prevenir condiciones de carrera y doble gasto
  SELECT username, coins INTO v_username, v_user_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado.';
  END IF;

  -- 3. Bloquear estado global del mercado (FOR UPDATE) para serializar las órdenes concurrentes
  SELECT * INTO v_market
  FROM public.market_state
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El mercado del Fondo Botellón no está inicializado.';
  END IF;

  -- 4. Validaciones de negocio: límites e importe
  IF p_amount IS NULL OR p_amount < v_market.min_investment THEN
    RAISE EXCEPTION 'La inversión mínima es de % monedas.', v_market.min_investment;
  END IF;

  IF p_amount > v_market.max_investment THEN
    RAISE EXCEPTION 'La inversión máxima por operación es de % monedas.', v_market.max_investment;
  END IF;

  IF v_user_coins < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente: tienes % monedas e intentas invertir %.', v_user_coins, p_amount;
  END IF;

  -- 5. Validar cooldown de 1 minuto entre operaciones
  SELECT * INTO v_inv
  FROM public.investments
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND AND v_inv.last_transaction_at IS NOT NULL THEN
    IF (EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at))) < v_market.cooldown_seconds THEN
      v_cooldown_left := CEIL(v_market.cooldown_seconds - EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at)));
      RAISE EXCEPTION 'Cooldown activo: debes esperar % segundos para volver a operar.', v_cooldown_left;
    END IF;
  END IF;

  -- 6. Ejecución matemática (curva suave con pool de liquidez)
  -- Precio de compra = precio actual
  v_exec_price := v_market.current_price;
  v_shares_to_buy := ROUND((p_amount::NUMERIC / v_exec_price), 4);

  IF v_shares_to_buy <= 0 THEN
    RAISE EXCEPTION 'El importe es insuficiente para comprar participaciones.';
  END IF;

  -- Impacto en el precio (slippage suave):
  -- El precio sube en proporción a la entrada de capital frente a la liquidez total (reserva + pool)
  v_slippage_factor := p_amount::NUMERIC / (v_market.reserve_balance + v_market.pool_balance);
  IF v_slippage_factor > 0.12 THEN
    v_slippage_factor := 0.12; -- Tope de impacto máximo de +12% por operación individual
  END IF;

  v_new_price := ROUND(v_market.current_price * (1.0 + v_slippage_factor), 4);
  v_new_pool := v_market.pool_balance + p_amount;
  v_new_total_shares := v_market.total_shares + v_shares_to_buy;
  v_new_user_coins := v_user_coins - p_amount;

  -- 7. Descontar monedas del usuario en profiles
  UPDATE public.profiles
  SET coins = v_new_user_coins
  WHERE id = v_user_id;

  -- 8. Registrar en balance_transactions para mantener trazabilidad global
  INSERT INTO public.balance_transactions (
    user_id, amount, balance_before, balance_after, type, description
  ) VALUES (
    v_user_id, -p_amount, v_user_coins, v_new_user_coins, 'game_bet',
    format('Inversión en Fondo Botellón: %s participaciones a %s c/u', v_shares_to_buy, v_exec_price)
  );

  -- 9. Actualizar o insertar posición en investments
  IF v_inv.id IS NOT NULL THEN
    v_final_shares := v_inv.shares + v_shares_to_buy;
    v_new_avg_price := ROUND(
      ((v_inv.average_buy_price * v_inv.shares) + (v_exec_price * v_shares_to_buy)) / v_final_shares,
      4
    );

    UPDATE public.investments
    SET 
      shares = v_final_shares,
      total_invested_coins = total_invested_coins + p_amount,
      average_buy_price = v_new_avg_price,
      last_transaction_at = now(),
      updated_at = now()
    WHERE user_id = v_user_id;
  ELSE
    v_final_shares := v_shares_to_buy;
    v_new_avg_price := v_exec_price;

    INSERT INTO public.investments (
      user_id, shares, total_invested_coins, total_withdrawn_coins,
      average_buy_price, last_transaction_at
    ) VALUES (
      v_user_id, v_shares_to_buy, p_amount, 0,
      v_exec_price, now()
    );
  END IF;

  -- 10. Actualizar market_state
  UPDATE public.market_state
  SET 
    current_price = v_new_price,
    total_shares = v_new_total_shares,
    pool_balance = v_new_pool,
    total_volume = total_volume + p_amount,
    total_investors = (SELECT COUNT(*) FROM public.investments WHERE shares > 0.001),
    updated_at = now()
  WHERE id = 1;

  -- 11. Registrar en historial de transacciones
  INSERT INTO public.transactions (
    user_id, username, type, coins_amount, shares_amount,
    price_per_share, fee_coins, net_coins
  ) VALUES (
    v_user_id, v_username, 'buy', p_amount, v_shares_to_buy,
    v_exec_price, 0, p_amount
  );

  -- 12. Registrar en historial de precio (price_history) para la gráfica
  INSERT INTO public.price_history (
    price, pool_balance, total_shares, change_percent, trigger_type, event_description
  ) VALUES (
    v_new_price, v_new_pool, v_new_total_shares,
    ROUND(((v_new_price - v_market.current_price) / v_market.current_price) * 100, 2),
    'buy',
    format('Inversión de %s monedas por %s', p_amount, v_username)
  );

  -- 13. Retornar payload estructurado para el cliente
  RETURN jsonb_build_object(
    'success', true,
    'type', 'buy',
    'coins_spent', p_amount,
    'shares_bought', v_shares_to_buy,
    'execution_price', v_exec_price,
    'new_price', v_new_price,
    'new_balance', v_new_user_coins,
    'new_shares', v_final_shares,
    'message', format('Has invertido %s monedas y recibido %s participaciones a %s 🪙', p_amount, v_shares_to_buy, v_exec_price)
  );
END;
$$;


-- --------------------------------------------------------------
-- RPC 2: withdraw_from_botellon(p_shares NUMERIC)
-- Vender participaciones al precio actual con 2% de comisión retenida.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_from_botellon(p_shares NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_username TEXT;
  v_user_coins BIGINT;
  v_market RECORD;
  v_inv RECORD;
  v_exec_price NUMERIC(12, 4);
  v_gross_coins BIGINT;
  v_fee_coins BIGINT;
  v_net_coins BIGINT;
  v_slippage_factor NUMERIC;
  v_new_price NUMERIC(12, 4);
  v_new_pool NUMERIC(18, 4);
  v_new_total_shares NUMERIC(18, 4);
  v_new_user_coins BIGINT;
  v_remaining_shares NUMERIC(18, 4);
  v_cooldown_left INT;
BEGIN
  -- 1. Identificar usuario autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado: debes iniciar sesión para operar en el Fondo Botellón.';
  END IF;

  -- 2. Bloquear perfil del usuario (FOR UPDATE)
  SELECT username, coins INTO v_username, v_user_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado.';
  END IF;

  -- 3. Bloquear posición del inversor (FOR UPDATE)
  SELECT * INTO v_inv
  FROM public.investments
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_inv.shares <= 0 THEN
    RAISE EXCEPTION 'No posees participaciones en el Fondo Botellón.';
  END IF;

  -- 4. Validar cantidad de participaciones a retirar
  IF p_shares IS NULL OR p_shares <= 0 THEN
    RAISE EXCEPTION 'La cantidad de participaciones a retirar debe ser mayor que 0.';
  END IF;

  IF p_shares > v_inv.shares THEN
    RAISE EXCEPTION 'No tienes suficientes participaciones: posees % e intentas vender %.', v_inv.shares, p_shares;
  END IF;

  -- 5. Bloquear estado del mercado (FOR UPDATE)
  SELECT * INTO v_market
  FROM public.market_state
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El mercado del Fondo Botellón no está inicializado.';
  END IF;

  -- 6. Validar cooldown de 1 minuto
  IF v_inv.last_transaction_at IS NOT NULL THEN
    IF (EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at))) < v_market.cooldown_seconds THEN
      v_cooldown_left := CEIL(v_market.cooldown_seconds - EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at)));
      RAISE EXCEPTION 'Cooldown activo: debes esperar % segundos para volver a operar.', v_cooldown_left;
    END IF;
  END IF;

  -- 7. Ejecución matemática
  v_exec_price := v_market.current_price;
  v_gross_coins := ROUND(p_shares * v_exec_price);

  IF v_gross_coins <= 0 THEN
    RAISE EXCEPTION 'El valor de venta es demasiado pequeño para liquidarse.';
  END IF;

  -- Comisión de retirada (ej. 2%): se deduce del cobro y permanece en el pool
  v_fee_coins := ROUND(v_gross_coins * v_market.fee_rate);
  IF v_fee_coins < 1 AND v_market.fee_rate > 0 THEN
    v_fee_coins := 1;
  END IF;

  v_net_coins := v_gross_coins - v_fee_coins;
  IF v_net_coins <= 0 THEN
    RAISE EXCEPTION 'La comisión absorbe la totalidad de la retirada.';
  END IF;

  -- Impacto bajista suave por retirada de liquidez:
  v_slippage_factor := v_gross_coins::NUMERIC / (v_market.reserve_balance + v_market.pool_balance);
  IF v_slippage_factor > 0.12 THEN
    v_slippage_factor := 0.12; -- Tope de impacto máximo de -12% por operación individual
  END IF;

  -- Precio nuevo: nunca permite caer por debajo de 1.0000
  v_new_price := GREATEST(1.0000, ROUND(v_market.current_price * (1.0 - v_slippage_factor), 4));

  -- La comisión se queda en el pool, por lo que solo se descuenta v_net_coins del pool
  v_new_pool := GREATEST(0.0000, v_market.pool_balance - v_net_coins);
  v_new_total_shares := GREATEST(0.0000, v_market.total_shares - p_shares);
  v_new_user_coins := v_user_coins + v_net_coins;
  v_remaining_shares := ROUND(v_inv.shares - p_shares, 4);

  -- 8. Ingresar monedas netas al usuario
  UPDATE public.profiles
  SET coins = v_new_user_coins
  WHERE id = v_user_id;

  -- 9. Registrar en balance_transactions
  INSERT INTO public.balance_transactions (
    user_id, amount, balance_before, balance_after, type, description
  ) VALUES (
    v_user_id, v_net_coins, v_user_coins, v_new_user_coins, 'game_win',
    format('Venta de %s participaciones a %s c/u (Comisión pool: %s 🪙)', p_shares, v_exec_price, v_fee_coins)
  );

  -- 10. Actualizar posición en investments
  UPDATE public.investments
  SET 
    shares = v_remaining_shares,
    total_withdrawn_coins = total_withdrawn_coins + v_net_coins,
    average_buy_price = CASE WHEN v_remaining_shares <= 0.0001 THEN 0.0000 ELSE average_buy_price END,
    last_transaction_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id;

  -- 11. Actualizar market_state
  UPDATE public.market_state
  SET 
    current_price = v_new_price,
    total_shares = v_new_total_shares,
    pool_balance = v_new_pool,
    total_volume = total_volume + v_gross_coins,
    total_investors = (SELECT COUNT(*) FROM public.investments WHERE shares > 0.001),
    updated_at = now()
  WHERE id = 1;

  -- 12. Registrar en historial de transacciones
  INSERT INTO public.transactions (
    user_id, username, type, coins_amount, shares_amount,
    price_per_share, fee_coins, net_coins
  ) VALUES (
    v_user_id, v_username, 'sell', v_gross_coins, p_shares,
    v_exec_price, v_fee_coins, v_net_coins
  );

  -- 13. Registrar en historial de precios (price_history)
  INSERT INTO public.price_history (
    price, pool_balance, total_shares, change_percent, trigger_type, event_description
  ) VALUES (
    v_new_price, v_new_pool, v_new_total_shares,
    ROUND(((v_new_price - v_market.current_price) / v_market.current_price) * 100, 2),
    'sell',
    format('Retirada de %s participaciones por %s', p_shares, v_username)
  );

  -- 14. Retornar payload estructurado
  RETURN jsonb_build_object(
    'success', true,
    'type', 'sell',
    'shares_sold', p_shares,
    'gross_coins', v_gross_coins,
    'fee_paid', v_fee_coins,
    'coins_received', v_net_coins,
    'execution_price', v_exec_price,
    'new_price', v_new_price,
    'new_balance', v_new_user_coins,
    'new_shares', v_remaining_shares,
    'message', format('Has vendido %s participaciones y cobrado %s monedas (comisión: %s 🪙)', p_shares, v_net_coins, v_fee_coins)
  );
END;
$$;


-- --------------------------------------------------------------
-- RPC 3: tick_market_price()
-- Tick de mercado programado: volatilidad suave + eventos temáticos aleatorios.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tick_market_price()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_market RECORD;
  v_rnd NUMERIC;
  v_change_pct NUMERIC(6, 4);
  v_new_price NUMERIC(12, 4);
  v_event_happened BOOLEAN := false;
  v_event_title TEXT := '';
  v_event_type TEXT := 'neutral';
  v_event_impact NUMERIC(6, 4) := 0.0000;
  v_event_roll NUMERIC;
  v_chat_text TEXT := '';
BEGIN
  -- 1. Bloquear market_state (FOR UPDATE)
  SELECT * INTO v_market
  FROM public.market_state
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mercado no inicializado.';
  END IF;

  -- 2. Volatilidad normal por defecto: entre -1.80% y +2.00%
  -- random() devuelve [0, 1)
  v_rnd := random();
  v_change_pct := ROUND(((v_rnd * 0.038) - 0.018)::NUMERIC, 4);

  -- 3. Posibilidad de evento temático ocasional (15% de probabilidad por tick)
  v_event_roll := random();
  IF v_event_roll < 0.15 THEN
    v_event_happened := true;

    -- Escoger uno de los eventos temáticos del Botellón:
    CASE FLOOR(random() * 8)
      WHEN 0 THEN
        v_event_title := '🚨 ¡Redada de la Policía Local!';
        v_event_type := 'police';
        v_event_impact := -0.1150; -- -11.5%
        v_chat_text := '🚨 ¡Alarma! La policía local llega al parque con sirenas y multas. El fondo cae un 11.5%.';
      WHEN 1 THEN
        v_event_title := '🎉 ¡Noche Épica de Botellón!';
        v_event_type := 'epic';
        v_event_impact := 0.1450; -- +14.5%
        v_chat_text := '🎉 ¡Ambientazo legendario! El altavoz JBL truena y se desborda la plaza. El fondo sube un 14.5%.';
      WHEN 2 THEN
        v_event_title := '🧊 Desabastecimiento de hielo en gasolineras';
        v_event_type := 'bearish';
        v_event_impact := -0.0550; -- -5.5%
        v_chat_text := '🧊 ¡Se agotó el hielo en la gasolinera! Los cubatas están calientes. El fondo corrige un 5.5%.';
      WHEN 3 THEN
        v_event_title := '🍻 Oferta 2x1 en el Chino del barrio';
        v_event_type := 'bullish';
        v_event_impact := 0.0750; -- +7.5%
        v_chat_text := '🍻 ¡El chino saca oferta 2x1 en litronas y pipas! Euforia en el fondo (+7.5%).';
      WHEN 4 THEN
        v_event_title := '🌧️ Chaparrón y tormenta repentina';
        v_event_type := 'bearish';
        v_event_impact := -0.0800; -- -8.0%
        v_chat_text := '🌧️ Tormenta imprevista. La peña sale corriendo a guarecerse. El fondo cae un 8.0%.';
      WHEN 5 THEN
        v_event_title := '🎵 Batalla de gallos improvisada';
        v_event_type := 'bullish';
        v_event_impact := 0.0900; -- +9.0%
        v_chat_text := '🎵 Dos chavales se marcan un freestyle legendario y atraen a media ciudad (+9.0%).';
      WHEN 6 THEN
        v_event_title := '🍕 Llega el repartidor de kebabs y pizzas';
        v_event_type := 'bullish';
        v_event_impact := 0.0500; -- +5.0%
        v_chat_text := '🍕 Inyección de carbohidratos a las 3 AM. Ánimos arriba en el botellón (+5.0%).';
      ELSE
        v_event_title := '🔋 Se agota la batería del altavoz';
        v_event_type := 'bearish';
        v_event_impact := -0.0450; -- -4.5%
        v_chat_text := '🔋 Se apagó el altavoz Bluetooth y cae el hype de la fiesta (-4.5%).';
    END CASE;

    -- Combinar volatilidad base con impacto del evento
    v_change_pct := v_change_pct + v_event_impact;
  END IF;

  -- 4. Calcular nuevo precio con suelo de seguridad (1.0000)
  v_new_price := GREATEST(1.0000, ROUND(v_market.current_price * (1.0 + v_change_pct), 4));

  -- 5. Actualizar market_state
  UPDATE public.market_state
  SET 
    current_price = v_new_price,
    last_event = CASE WHEN v_event_happened THEN v_event_title ELSE last_event END,
    last_event_type = CASE WHEN v_event_happened THEN v_event_type ELSE last_event_type END,
    last_event_impact = CASE WHEN v_event_happened THEN v_event_impact ELSE last_event_impact END,
    last_tick_at = now(),
    updated_at = now()
  WHERE id = 1;

  -- 6. Insertar en price_history
  INSERT INTO public.price_history (
    price, pool_balance, total_shares, change_percent, trigger_type, event_description
  ) VALUES (
    v_new_price, v_market.pool_balance, v_market.total_shares,
    ROUND(((v_new_price - v_market.current_price) / v_market.current_price) * 100, 2),
    CASE WHEN v_event_happened THEN 'event' ELSE 'tick' END,
    CASE WHEN v_event_happened THEN v_event_title ELSE 'Tick periódico del mercado' END
  );

  -- 7. Si ocurrió un evento temático, publicarlo en chat_messages para emoción comunitaria
  IF v_event_happened AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    INSERT INTO public.chat_messages (
      username, text, tag, is_system_win
    ) VALUES (
      'Fondo Botellón', v_chat_text, 'Fondo', false
    );
  END IF;

  -- 8. Retornar resumen del tick
  RETURN jsonb_build_object(
    'success', true,
    'previous_price', v_market.current_price,
    'new_price', v_new_price,
    'change_percent', ROUND(v_change_pct * 100, 2),
    'event_happened', v_event_happened,
    'event_title', v_event_title,
    'event_type', v_event_type
  );
END;
$$;


-- --------------------------------------------------------------
-- RPC 4: get_botellon_top_investors(p_limit INT)
-- Ranking público de mayores inversores del fondo (seguro con RLS).
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_botellon_top_investors(p_limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_color TEXT,
  shares NUMERIC,
  position_value NUMERIC,
  total_invested BIGINT,
  profit_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_price NUMERIC;
BEGIN
  SELECT current_price INTO v_current_price FROM public.market_state WHERE id = 1;
  IF v_current_price IS NULL THEN
    v_current_price := 10.0;
  END IF;

  RETURN QUERY
  SELECT 
    i.user_id,
    COALESCE(p.username, 'Anónimo') AS username,
    COALESCE(p.avatar_color, 'emerald') AS avatar_color,
    i.shares,
    ROUND(i.shares * v_current_price, 2) AS position_value,
    i.total_invested_coins AS total_invested,
    CASE 
      WHEN i.average_buy_price > 0 THEN 
        ROUND(((v_current_price - i.average_buy_price) / i.average_buy_price) * 100, 2)
      ELSE 0.00
    END AS profit_percent
  FROM public.investments i
  LEFT JOIN public.profiles p ON p.id = i.user_id
  WHERE i.shares > 0.001
  ORDER BY i.shares DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;


-- --------------------------------------------------------------
-- RPC 5: get_botellon_portfolio()
-- Obtiene la cartera completa del usuario autenticado en una sola llamada.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_botellon_portfolio()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_market RECORD;
  v_inv RECORD;
  v_coins BIGINT;
  v_cooldown_remaining INT := 0;
  v_position_value NUMERIC(18, 4) := 0.0000;
  v_unrealized_profit NUMERIC(18, 4) := 0.0000;
  v_profit_pct NUMERIC(8, 2) := 0.00;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  SELECT coins INTO v_coins FROM public.profiles WHERE id = v_user_id;
  SELECT * INTO v_market FROM public.market_state WHERE id = 1;
  SELECT * INTO v_inv FROM public.investments WHERE user_id = v_user_id;

  IF v_inv.id IS NOT NULL AND v_inv.last_transaction_at IS NOT NULL THEN
    IF (EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at))) < v_market.cooldown_seconds THEN
      v_cooldown_remaining := CEIL(v_market.cooldown_seconds - EXTRACT(EPOCH FROM (now() - v_inv.last_transaction_at)));
    END IF;
  END IF;

  IF v_inv.id IS NOT NULL AND v_inv.shares > 0 THEN
    v_position_value := ROUND(v_inv.shares * v_market.current_price, 2);
    IF v_inv.average_buy_price > 0 THEN
      v_unrealized_profit := ROUND(v_position_value - (v_inv.shares * v_inv.average_buy_price), 2);
      v_profit_pct := ROUND(((v_market.current_price - v_inv.average_buy_price) / v_inv.average_buy_price) * 100, 2);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'user_id', v_user_id,
    'user_coins', COALESCE(v_coins, 0),
    'shares', COALESCE(v_inv.shares, 0.0000),
    'average_buy_price', COALESCE(v_inv.average_buy_price, 0.0000),
    'total_invested_coins', COALESCE(v_inv.total_invested_coins, 0),
    'total_withdrawn_coins', COALESCE(v_inv.total_withdrawn_coins, 0),
    'position_value', v_position_value,
    'unrealized_profit_coins', v_unrealized_profit,
    'unrealized_profit_percent', v_profit_pct,
    'cooldown_remaining_seconds', v_cooldown_remaining,
    'last_transaction_at', v_inv.last_transaction_at
  );
END;
$$;


-- ==============================================================
-- 10. PERMISOS DE EJECUCIÓN (GRANT)
-- ==============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.market_state TO anon, authenticated, service_role;
GRANT SELECT ON public.price_history TO anon, authenticated, service_role;
GRANT SELECT ON public.investments TO authenticated, service_role;
GRANT SELECT ON public.transactions TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.invest_in_botellon(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_from_botellon(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_market_price() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_botellon_top_investors(INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_botellon_portfolio() TO authenticated;


-- ==============================================================
-- 11. CONFIGURACIÓN OPCIONAL DE PG_CRON (TICK AUTOMÁTICO EN SUPABASE)
-- ==============================================================
-- Si tu instancia de Supabase tiene la extensión pg_cron activa,
-- descomenta y ejecuta estas dos líneas:
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('botellon-market-tick', '*/5 * * * *', 'SELECT public.tick_market_price();');
-- ==============================================================
