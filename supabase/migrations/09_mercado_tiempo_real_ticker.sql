-- ============================================================================
-- MIGRACIÓN 09: CINTA EN TIEMPO REAL Y TICKER EN TRANSACCIONES DE MERCADO
-- Portal El Botellón / SMR2
-- ============================================================================

-- 1. Añadir columna ticker a transactions si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'transactions' 
      AND column_name = 'ticker'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN ticker TEXT NOT NULL DEFAULT 'BTLN';
  END IF;
END $$;

-- 2. Índice por ticker y fecha
CREATE INDEX IF NOT EXISTS idx_transactions_ticker_created_at ON public.transactions(ticker, created_at DESC);

-- 3. Permitir lectura pública de transacciones para alimentar la cinta de operaciones en vivo
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura propia de transactions" ON public.transactions;
DROP POLICY IF EXISTS "Lectura publica de transacciones de mercado" ON public.transactions;

CREATE POLICY "Lectura publica de transacciones de mercado"
  ON public.transactions FOR SELECT
  USING (true);

-- 4. Actualizar trade_parody_stock para registrar en public.transactions con ticker
CREATE OR REPLACE FUNCTION public.trade_parody_stock(
  p_ticker TEXT,
  p_action TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_username TEXT;
  v_user_coins BIGINT;
  v_market RECORD;
  v_stocks JSONB;
  v_stock JSONB;
  v_stock_price NUMERIC;
  v_inv RECORD;
  v_portfolio JSONB;
  v_holding JSONB;
  v_current_shares NUMERIC := 0.0000;
  v_current_avg NUMERIC := 0.0000;
  v_current_invested BIGINT := 0;
  
  -- Cálculos
  v_coins BIGINT;
  v_shares NUMERIC(18, 4);
  v_slippage NUMERIC;
  v_new_price NUMERIC(12, 4);
  v_gross BIGINT;
  v_fee BIGINT;
  v_net BIGINT;
  v_new_shares NUMERIC(18, 4);
  v_new_avg NUMERIC(12, 4);
  v_new_invested BIGINT;
  v_stock_volume BIGINT;
  v_stock_change NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  SELECT username, coins INTO v_username, v_user_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado.';
  END IF;

  SELECT * INTO v_market
  FROM public.market_state
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estado del mercado no inicializado.';
  END IF;

  v_stocks := COALESCE(v_market.parody_stocks, '{}'::jsonb);
  v_stock := v_stocks->UPPER(p_ticker);

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'La empresa con ticker % no cotiza en la bolsa.', UPPER(p_ticker);
  END IF;

  v_stock_price := (v_stock->>'price')::NUMERIC;
  v_stock_volume := COALESCE((v_stock->>'volume')::BIGINT, 0);
  v_stock_change := COALESCE((v_stock->>'change_24h')::NUMERIC, 0.0);

  IF v_stock_price <= 0 THEN
    v_stock_price := 10.0;
  END IF;

  SELECT * INTO v_inv
  FROM public.investments
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND AND v_inv.stocks_portfolio IS NOT NULL THEN
    v_portfolio := v_inv.stocks_portfolio;
    v_holding := v_portfolio->UPPER(p_ticker);
    IF v_holding IS NOT NULL THEN
      v_current_shares := COALESCE((v_holding->>'shares')::NUMERIC, 0.0000);
      v_current_avg := COALESCE((v_holding->>'average_price')::NUMERIC, 0.0000);
      v_current_invested := COALESCE((v_holding->>'total_invested')::BIGINT, 0);
    END IF;
  ELSE
    v_portfolio := '{}'::jsonb;
  END IF;

  -- OPERACION COMPRA
  IF LOWER(p_action) = 'buy' THEN
    v_coins := ROUND(p_amount);
    IF v_coins < 10 THEN
      RAISE EXCEPTION 'La inversión mínima es de 10 monedas.';
    END IF;
    IF v_coins > v_user_coins THEN
      RAISE EXCEPTION 'Saldo insuficiente: tienes % monedas e intentas invertir %.', v_user_coins, v_coins;
    END IF;

    v_shares := ROUND((v_coins::NUMERIC / v_stock_price), 4);
    v_slippage := LEAST(0.08, v_coins::NUMERIC / 40000.0);
    v_new_price := ROUND(v_stock_price * (1.0 + v_slippage), 4);

    v_new_shares := v_current_shares + v_shares;
    v_new_avg := ROUND(((v_current_avg * v_current_shares + v_stock_price * v_shares) / v_new_shares), 4);
    v_new_invested := v_current_invested + v_coins;

    v_portfolio := jsonb_set(
      v_portfolio,
      ARRAY[UPPER(p_ticker)],
      jsonb_build_object(
        'ticker', UPPER(p_ticker),
        'shares', v_new_shares,
        'average_price', v_new_avg,
        'total_invested', v_new_invested
      )
    );

    UPDATE public.profiles
    SET coins = coins - v_coins, updated_at = now()
    WHERE id = v_user_id;

    v_stock := jsonb_set(v_stock, '{price}', to_jsonb(v_new_price));
    v_stock := jsonb_set(v_stock, '{volume}', to_jsonb(v_stock_volume + v_coins));
    v_stock := jsonb_set(v_stock, '{change_24h}', to_jsonb(ROUND(v_stock_change + (v_slippage * 100.0), 1)));
    v_stocks := jsonb_set(v_stocks, ARRAY[UPPER(p_ticker)], v_stock);

    UPDATE public.market_state
    SET parody_stocks = v_stocks,
        total_volume = total_volume + v_coins,
        updated_at = now()
    WHERE id = 1;

    -- Registrar en transactions general
    INSERT INTO public.transactions (
      user_id, username, ticker, type, coins_amount, shares_amount, price_per_share, fee_coins, net_coins
    ) VALUES (
      v_user_id, v_username, UPPER(p_ticker), 'buy', v_coins, v_shares, v_stock_price, 0, v_coins
    );

    -- Registrar en balance_transactions
    INSERT INTO public.balance_transactions (
      user_id, amount, balance_before, balance_after, type, description
    ) VALUES (
      v_user_id, -v_coins, v_user_coins, v_user_coins - v_coins, 'game_bet',
      format('Compra de %s acciones de %s a %s c/u', v_shares, v_stock->>'name', v_stock_price)
    );

  -- OPERACION VENTA
  ELSIF LOWER(p_action) = 'sell' THEN
    v_shares := ROUND(p_amount, 4);
    IF v_shares <= 0 THEN
      RAISE EXCEPTION 'La cantidad de acciones debe ser mayor que 0.';
    END IF;
    IF v_shares > v_current_shares THEN
      RAISE EXCEPTION 'No tienes suficientes acciones de %: posees % e intentas vender %.', UPPER(p_ticker), v_current_shares, v_shares;
    END IF;

    v_gross := ROUND(v_shares * v_stock_price);
    v_fee := GREATEST(1, ROUND(v_gross * 0.02));
    v_net := v_gross - v_fee;

    v_slippage := LEAST(0.08, v_gross::NUMERIC / 40000.0);
    v_new_price := GREATEST(1.0000, ROUND(v_stock_price * (1.0 - v_slippage), 4));

    v_new_shares := ROUND(v_current_shares - v_shares, 4);
    IF v_new_shares <= 0.0001 THEN
      v_portfolio := v_portfolio - UPPER(p_ticker);
    ELSE
      v_new_invested := GREATEST(0, ROUND(v_current_invested * (v_new_shares / v_current_shares)));
      v_portfolio := jsonb_set(
        v_portfolio,
        ARRAY[UPPER(p_ticker)],
        jsonb_build_object(
          'ticker', UPPER(p_ticker),
          'shares', v_new_shares,
          'average_price', v_current_avg,
          'total_invested', v_new_invested
        )
      );
    END IF;

    UPDATE public.profiles
    SET coins = coins + v_net, updated_at = now()
    WHERE id = v_user_id;

    v_stock := jsonb_set(v_stock, '{price}', to_jsonb(v_new_price));
    v_stock := jsonb_set(v_stock, '{volume}', to_jsonb(v_stock_volume + v_gross));
    v_stock := jsonb_set(v_stock, '{change_24h}', to_jsonb(ROUND(v_stock_change - (v_slippage * 100.0), 1)));
    v_stocks := jsonb_set(v_stocks, ARRAY[UPPER(p_ticker)], v_stock);

    UPDATE public.market_state
    SET parody_stocks = v_stocks,
        pool_balance = pool_balance + v_fee,
        total_volume = total_volume + v_gross,
        updated_at = now()
    WHERE id = 1;

    -- Registrar en transactions general
    INSERT INTO public.transactions (
      user_id, username, ticker, type, coins_amount, shares_amount, price_per_share, fee_coins, net_coins
    ) VALUES (
      v_user_id, v_username, UPPER(p_ticker), 'sell', v_gross, v_shares, v_stock_price, v_fee, v_net
    );

    -- Registrar en balance_transactions
    INSERT INTO public.balance_transactions (
      user_id, amount, balance_before, balance_after, type, description
    ) VALUES (
      v_user_id, v_net, v_user_coins, v_user_coins + v_net, 'game_win',
      format('Venta de %s acciones de %s (Neto: %s, Comisión: %s)', v_shares, v_stock->>'name', v_net, v_fee)
    );

  ELSE
    RAISE EXCEPTION 'Acción no válida: debe ser buy o sell.';
  END IF;

  -- Guardar cartera en investments
  IF v_inv.id IS NOT NULL THEN
    UPDATE public.investments 
    SET stocks_portfolio = v_portfolio, updated_at = now() 
    WHERE user_id = v_user_id;
  ELSE
    INSERT INTO public.investments (
      user_id, shares, total_invested_coins, total_withdrawn_coins, average_buy_price, stocks_portfolio
    ) VALUES (
      v_user_id, 0.0000, 0, 0, 0.0000, v_portfolio
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ticker', UPPER(p_ticker),
    'action', LOWER(p_action),
    'shares', v_shares,
    'price', v_stock_price,
    'new_price', v_new_price,
    'coins_delta', CASE WHEN LOWER(p_action) = 'buy' THEN -v_coins ELSE v_net END,
    'fee_paid', CASE WHEN LOWER(p_action) = 'buy' THEN 0 ELSE v_fee END,
    'remaining_shares', v_new_shares,
    'new_balance', CASE WHEN LOWER(p_action) = 'buy' THEN v_user_coins - v_coins ELSE v_user_coins + v_net END
  );
END;
$$;

-- 5. Añadir public.transactions a publicación Realtime de Supabase
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
