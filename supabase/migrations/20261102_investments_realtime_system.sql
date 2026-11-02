-- ==============================================================
-- MIGRACIÓN SUPABASE: SISTEMA DE INVERSIONES EN TIEMPO REAL
-- Mercado Colectivo, Dinámica AMM/Bonding Curve y Tesorería
-- ==============================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA: ESTADO GLOBAL DEL MERCADO Y TESORERÍA (market_state)
CREATE TABLE IF NOT EXISTS public.market_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_price NUMERIC(12, 4) DEFAULT 10.0000 NOT NULL CHECK (current_price >= 1.0000),
  total_shares NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL CHECK (total_shares >= 0),
  pool_balance NUMERIC(18, 4) DEFAULT 10000.0000 NOT NULL CHECK (pool_balance >= 0),
  treasury_balance NUMERIC(18, 4) DEFAULT 5000.0000 NOT NULL CHECK (treasury_balance >= 0),
  reserve_balance NUMERIC(18, 4) DEFAULT 25000.0000 NOT NULL CHECK (reserve_balance > 0),
  total_volume BIGINT DEFAULT 0 NOT NULL,
  total_investors INT DEFAULT 0 NOT NULL,
  total_revenue_generated BIGINT DEFAULT 0 NOT NULL,
  total_dividends_paid BIGINT DEFAULT 0 NOT NULL,
  arcade_rake_accumulated BIGINT DEFAULT 0 NOT NULL,
  fee_rate NUMERIC(6, 4) DEFAULT 0.0200 NOT NULL CHECK (fee_rate >= 0 AND fee_rate <= 0.20),
  cooldown_seconds INT DEFAULT 30 NOT NULL CHECK (cooldown_seconds >= 0),
  min_investment BIGINT DEFAULT 10 NOT NULL CHECK (min_investment > 0),
  max_investment BIGINT DEFAULT 50000 NOT NULL CHECK (max_investment >= min_investment),
  parody_stocks JSONB DEFAULT '{}'::jsonb NOT NULL,
  last_event TEXT DEFAULT 'Apertura oficial del mercado de SMR2' NOT NULL,
  last_event_type TEXT DEFAULT 'neutral' NOT NULL,
  last_event_impact NUMERIC(6, 4) DEFAULT 0.0000 NOT NULL,
  last_tick_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.market_state ADD COLUMN IF NOT EXISTS treasury_balance NUMERIC(18, 4) DEFAULT 5000.0000;
ALTER TABLE public.market_state ADD COLUMN IF NOT EXISTS total_revenue_generated BIGINT DEFAULT 0;
ALTER TABLE public.market_state ADD COLUMN IF NOT EXISTS total_dividends_paid BIGINT DEFAULT 0;
ALTER TABLE public.market_state ADD COLUMN IF NOT EXISTS arcade_rake_accumulated BIGINT DEFAULT 0;
ALTER TABLE public.market_state ADD COLUMN IF NOT EXISTS parody_stocks JSONB DEFAULT '{}'::jsonb;

-- Fila inicial única
INSERT INTO public.market_state (
  id, current_price, total_shares, pool_balance, treasury_balance, reserve_balance,
  total_volume, total_investors, total_revenue_generated, total_dividends_paid, arcade_rake_accumulated,
  fee_rate, cooldown_seconds, min_investment, max_investment, last_event, last_event_type, last_event_impact
) VALUES (
  1, 10.0000, 0.0000, 10000.0000, 5000.0000, 25000.0000,
  0, 0, 0, 0, 0,
  0.0200, 30, 10, 50000, 'Mercado compartido activo en tiempo real', 'neutral', 0.0000
) ON CONFLICT (id) DO NOTHING;

-- 3. TABLA: CARTERA DE INVERSIONES POR USUARIO Y TICKER (investments)
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL DEFAULT 'BTLN',
  shares NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL CHECK (shares >= 0),
  total_invested_coins BIGINT DEFAULT 0 NOT NULL CHECK (total_invested_coins >= 0),
  total_withdrawn_coins BIGINT DEFAULT 0 NOT NULL CHECK (total_withdrawn_coins >= 0),
  average_buy_price NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL CHECK (average_buy_price >= 0),
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columna ticker y unicidad compuesta
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS ticker TEXT NOT NULL DEFAULT 'BTLN';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_investments_user_ticker'
  ) THEN
    ALTER TABLE public.investments ADD CONSTRAINT uq_investments_user_ticker UNIQUE (user_id, ticker);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_investments_user_ticker ON public.investments(user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_investments_ticker_shares ON public.investments(ticker, shares DESC);

-- 4. TABLA: LIBRO PÚBLICO DE TRANSACCIONES (transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  ticker TEXT NOT NULL DEFAULT 'BTLN',
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  coins_amount BIGINT NOT NULL CHECK (coins_amount > 0),
  shares_amount NUMERIC(18, 4) NOT NULL CHECK (shares_amount > 0),
  price_per_share NUMERIC(12, 4) NOT NULL CHECK (price_per_share > 0),
  fee_coins BIGINT DEFAULT 0 NOT NULL CHECK (fee_coins >= 0),
  net_coins BIGINT NOT NULL CHECK (net_coins > 0),
  price_impact_percent NUMERIC(8, 4) DEFAULT 0.0000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS ticker TEXT NOT NULL DEFAULT 'BTLN';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS price_impact_percent NUMERIC(8, 4) DEFAULT 0.0000;

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ticker_created ON public.transactions(ticker, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id, created_at DESC);

-- 5. TABLA: HISTÓRICO DE PRECIOS PARA LA GRÁFICA SINCRONIZADA (price_history)
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL DEFAULT 'BTLN',
  price NUMERIC(12, 4) NOT NULL CHECK (price > 0),
  volume BIGINT DEFAULT 0 NOT NULL,
  pool_balance NUMERIC(18, 4) NOT NULL,
  treasury_balance NUMERIC(18, 4) DEFAULT 0,
  total_shares NUMERIC(18, 4) DEFAULT 0,
  change_percent NUMERIC(8, 4) DEFAULT 0.0000 NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('buy', 'sell', 'tick', 'event', 'revenue', 'arcade_rake', 'initial')),
  event_description TEXT,
  player_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS ticker TEXT NOT NULL DEFAULT 'BTLN';
ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS volume BIGINT DEFAULT 0;
ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS treasury_balance NUMERIC(18, 4) DEFAULT 0;
ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS player_username TEXT;

CREATE INDEX IF NOT EXISTS idx_price_history_ticker_created ON public.price_history(ticker, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON public.price_history(created_at DESC);

-- Semillas iniciales para cada activo si price_history está vacío para ese ticker
INSERT INTO public.price_history (ticker, price, volume, pool_balance, treasury_balance, total_shares, change_percent, trigger_type, event_description)
SELECT 'BTLN', 10.0000, 0, 10000.0000, 5000.0000, 0.0000, 0.0000, 'initial', 'Precio base de salida: Fondo Botellón'
WHERE NOT EXISTS (SELECT 1 FROM public.price_history WHERE ticker = 'BTLN');

INSERT INTO public.price_history (ticker, price, volume, pool_balance, treasury_balance, total_shares, change_percent, trigger_type, event_description)
SELECT 'ONION', 45.0000, 0, 10000.0000, 5000.0000, 0.0000, 0.0000, 'initial', 'Precio base de salida: Onion Inc.'
WHERE NOT EXISTS (SELECT 1 FROM public.price_history WHERE ticker = 'ONION');

INSERT INTO public.price_history (ticker, price, volume, pool_balance, treasury_balance, total_shares, change_percent, trigger_type, event_description)
SELECT 'ARDI', 28.0000, 0, 10000.0000, 5000.0000, 0.0000, 0.0000, 'initial', 'Precio base de salida: Ardidas Sport'
WHERE NOT EXISTS (SELECT 1 FROM public.price_history WHERE ticker = 'ARDI');

INSERT INTO public.price_history (ticker, price, volume, pool_balance, treasury_balance, total_shares, change_percent, trigger_type, event_description)
SELECT 'CHERR', 20.0000, 0, 10000.0000, 5000.0000, 0.0000, 0.0000, 'initial', 'Precio base de salida: Carlos Herrero'
WHERE NOT EXISTS (SELECT 1 FROM public.price_history WHERE ticker = 'CHERR');

INSERT INTO public.price_history (ticker, price, volume, pool_balance, treasury_balance, total_shares, change_percent, trigger_type, event_description)
SELECT 'MBRON', 12.0000, 0, 10000.0000, 5000.0000, 0.0000, 0.0000, 'initial', 'Precio base de salida: Mercabrona Hielos'
WHERE NOT EXISTS (SELECT 1 FROM public.price_history WHERE ticker = 'MBRON');

INSERT INTO public.price_history (ticker, price, volume, pool_balance, treasury_balance, total_shares, change_percent, trigger_type, event_description)
SELECT 'CUTI', 8.0000, 0, 10000.0000, 5000.0000, 0.0000, 0.0000, 'initial', 'Precio base de salida: Cutify Music'
WHERE NOT EXISTS (SELECT 1 FROM public.price_history WHERE ticker = 'CUTI');

INSERT INTO public.price_history (ticker, price, volume, pool_balance, treasury_balance, total_shares, change_percent, trigger_type, event_description)
SELECT 'TOLED', 34.0000, 0, 10000.0000, 5000.0000, 0.0000, 0.0000, 'initial', 'Precio base de salida: Toledo TDI Repro'
WHERE NOT EXISTS (SELECT 1 FROM public.price_history WHERE ticker = 'TOLED');

-- 6. SEGURIDAD Y POLÍTICAS ROW LEVEL SECURITY (RLS)
ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas para evitar errores 42710
DROP POLICY IF EXISTS "Lectura pública de market_state" ON public.market_state;
DROP POLICY IF EXISTS "Lectura pública de price_history" ON public.price_history;
DROP POLICY IF EXISTS "Lectura pública de transactions" ON public.transactions;
DROP POLICY IF EXISTS "Lectura pública de investments" ON public.investments;
DROP POLICY IF EXISTS "Lectura propia de transactions" ON public.transactions;
DROP POLICY IF EXISTS "Lectura propia de investments" ON public.investments;

-- Políticas de lectura 100% públicas para juego estratégico y gráfica compartida
CREATE POLICY "Lectura pública de market_state" ON public.market_state FOR SELECT USING (true);
CREATE POLICY "Lectura pública de price_history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Lectura pública de transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Lectura pública de investments" ON public.investments FOR SELECT USING (true);

-- Permisos de escritura para el backend / service role
CREATE POLICY "Servicio total market_state" ON public.market_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Servicio total price_history" ON public.price_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Servicio total transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Servicio total investments" ON public.investments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.market_state REPLICA IDENTITY FULL;
ALTER TABLE public.investments REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.price_history REPLICA IDENTITY FULL;

-- 7. SUSCRIPCIÓN SUPABASE REALTIME
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

-- 8. RPC: APORTE DE RAKE DEL ARCADE A LA EMPRESA (record_arcade_rake_to_market)
-- Cuando los alumnos juegan en el casino, el 1-2% alimenta la tesorería de la empresa
CREATE OR REPLACE FUNCTION public.record_arcade_rake_to_market(
  p_amount BIGINT,
  p_game TEXT DEFAULT 'arcade'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_market RECORD;
  v_new_treasury NUMERIC;
  v_new_revenue BIGINT;
  v_new_rake BIGINT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Importe no válido');
  END IF;

  SELECT * INTO v_market FROM public.market_state WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mercado no inicializado');
  END IF;

  v_new_treasury := v_market.treasury_balance + p_amount;
  v_new_revenue := v_market.total_revenue_generated + p_amount;
  v_new_rake := v_market.arcade_rake_accumulated + p_amount;

  UPDATE public.market_state
  SET
    treasury_balance = v_new_treasury,
    total_revenue_generated = v_new_revenue,
    arcade_rake_accumulated = v_new_rake,
    updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object(
    'success', true,
    'rake_added', p_amount,
    'new_treasury', v_new_treasury,
    'game', p_game
  );
END;
$$;

-- 9. RPC: CAP TABLE / LIBRO DE ACCIONISTAS POR ACTIVO
CREATE OR REPLACE FUNCTION public.get_market_top_shareholders(
  p_ticker TEXT DEFAULT 'BTLN',
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_color TEXT,
  shares NUMERIC,
  ownership_percentage NUMERIC,
  position_value NUMERIC,
  total_invested BIGINT,
  profit_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_total_asset_shares NUMERIC;
  v_current_price NUMERIC;
  v_market RECORD;
BEGIN
  SELECT * INTO v_market FROM public.market_state WHERE id = 1;
  IF p_ticker = 'BTLN' THEN
    v_current_price := COALESCE(v_market.current_price, 10.0);
  ELSE
    v_current_price := COALESCE((v_market.parody_stocks->p_ticker->>'price')::NUMERIC, 10.0);
  END IF;

  SELECT COALESCE(SUM(i.shares), 0) INTO v_total_asset_shares
  FROM public.investments i
  WHERE i.ticker = p_ticker AND i.shares > 0.001;

  IF v_total_asset_shares <= 0 THEN
    v_total_asset_shares := 1.0;
  END IF;

  RETURN QUERY
  SELECT
    i.user_id,
    COALESCE(p.username, 'Alumno') AS username,
    COALESCE(p.avatar_color, 'emerald') AS avatar_color,
    i.shares,
    ROUND(((i.shares / v_total_asset_shares) * 100)::NUMERIC, 2) AS ownership_percentage,
    ROUND((i.shares * v_current_price)::NUMERIC, 2) AS position_value,
    i.total_invested_coins AS total_invested,
    CASE 
      WHEN i.total_invested_coins > 0 THEN
        ROUND((((i.shares * v_current_price - i.total_invested_coins)::NUMERIC / i.total_invested_coins) * 100)::NUMERIC, 2)
      ELSE 0.00
    END AS profit_percent
  FROM public.investments i
  LEFT JOIN public.profiles p ON p.id = i.user_id
  WHERE i.ticker = p_ticker AND i.shares > 0.001
  ORDER BY i.shares DESC
  LIMIT p_limit;
END;
$$;

-- Permisos de ejecución
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.market_state TO anon, authenticated, service_role;
GRANT SELECT ON public.price_history TO anon, authenticated, service_role;
GRANT SELECT ON public.transactions TO anon, authenticated, service_role;
GRANT SELECT ON public.investments TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.record_arcade_rake_to_market(BIGINT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_market_top_shareholders(TEXT, INT) TO anon, authenticated, service_role;
