-- ==============================================================
-- SMR2 WEB · MIGRACIÓN 07: BOLSA DE ACCIONES PARODIA DEL BOTELLÓN
-- ==============================================================
-- Añade soporte para el mercado de acciones de empresas parodia:
-- ONION (Apple), ARDIDAS (Adidas), CARLOS HERRERO (Carolina Herrera),
-- MERCABRONA (Mercadona), CUTIFY (Spotify), TOLEDO TDI (Tesla)
-- ==============================================================

-- 1. Añadir columnas JSONB para persistencia de acciones y carteras multiactivo
ALTER TABLE public.market_state 
  ADD COLUMN IF NOT EXISTS parody_stocks JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.investments 
  ADD COLUMN IF NOT EXISTS stocks_portfolio JSONB DEFAULT '{}'::jsonb;

-- 2. Inicializar cotizaciones iniciales de empresas parodia si están vacías
UPDATE public.market_state
SET parody_stocks = '{
  "ONION": {
    "ticker": "ONION",
    "name": "Onion Inc.",
    "parody": "Apple",
    "slogan": "Piensa diferente... y llora",
    "sector": "Tecnología & Altavoces",
    "price": 45.2000,
    "change_24h": 4.80,
    "volume": 128400,
    "last_news": "Lanzamiento del altavoz iCubata con luces estroboscópicas (+4.8%)"
  },
  "ARDI": {
    "ticker": "ARDI",
    "name": "Ardidas Sport",
    "parody": "Adidas",
    "slogan": "Impossible is Litrona",
    "sector": "Ropa de Mercadillo",
    "price": 28.5000,
    "change_24h": -2.30,
    "volume": 84200,
    "last_news": "Lote de chándales de 4 rayas causa sensación en el parque (-2.3%)"
  },
  "CHERR": {
    "ticker": "CHERR",
    "name": "Carlos Herrero",
    "parody": "Carolina Herrera",
    "slogan": "Colonia de garrafa anti-olor a cubata",
    "sector": "Lujo & Perfumes",
    "price": 19.8000,
    "change_24h": 6.50,
    "volume": 62500,
    "last_news": "Nuevo desodorante 212 Resaca agota existencias (+6.5%)"
  },
  "MBRON": {
    "ticker": "MBRON",
    "name": "Mercabrona Hielos",
    "parody": "Mercadona",
    "slogan": "Hacendado Premium a granel",
    "sector": "Consumo & Hielos",
    "price": 12.1000,
    "change_24h": 1.20,
    "volume": 215000,
    "last_news": "Se confirma apertura hasta las 22:00 este viernes (+1.2%)"
  },
  "CUTI": {
    "ticker": "CUTI",
    "name": "Cutify Music",
    "parody": "Spotify",
    "slogan": "Bajos que retumban en el pecho",
    "sector": "Entretenimiento",
    "price": 8.4000,
    "change_24h": 8.10,
    "volume": 94100,
    "last_news": "La playlist ''Perreo Legendario 2000'' alcanza el número 1 (+8.1%)"
  },
  "TOLED": {
    "ticker": "TOLED",
    "name": "Toledo TDI Repro",
    "parody": "Tesla",
    "slogan": "0 a 100 en 3 botellones",
    "sector": "Automoción & Car-Audio",
    "price": 34.0000,
    "change_24h": -1.50,
    "volume": 110400,
    "last_news": "La etapa de potencia del maletero supera la ITV provisional (-1.5%)"
  }
}'::jsonb
WHERE id = 1 AND (parody_stocks IS NULL OR parody_stocks = '{}'::jsonb);

-- 3. RPC: trade_parody_stock (Comprar o vender acciones de empresas parodia)
CREATE OR REPLACE FUNCTION public.trade_parody_stock(
  p_ticker TEXT,
  p_action TEXT,
  p_amount NUMERIC
)
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
  v_ticker TEXT;
  v_stock JSONB;
  v_stock_price NUMERIC(12, 4);
  v_shares NUMERIC(18, 4);
  v_coins BIGINT;
  v_gross BIGINT;
  v_fee BIGINT := 0;
  v_net BIGINT;
  v_portfolio JSONB;
  v_holding JSONB;
  v_current_shares NUMERIC(18, 4) := 0;
  v_current_avg NUMERIC(12, 4) := 0;
  v_new_shares NUMERIC(18, 4) := 0;
  v_new_avg NUMERIC(12, 4) := 0;
  v_new_price NUMERIC(12, 4);
  v_slippage NUMERIC;
  v_all_stocks JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado: debes iniciar sesión.';
  END IF;

  v_ticker := UPPER(TRIM(p_ticker));
  IF v_ticker NOT IN ('ONION', 'ARDI', 'CHERR', 'MBRON', 'CUTI', 'TOLED') THEN
    RAISE EXCEPTION 'Empresa no encontrada en la Bolsa del Botellón: %', p_ticker;
  END IF;

  -- Bloquear usuario
  SELECT username, coins INTO v_username, v_user_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  -- Bloquear mercado
  SELECT * INTO v_market
  FROM public.market_state
  WHERE id = 1
  FOR UPDATE;

  v_all_stocks := COALESCE(v_market.parody_stocks, '{}'::jsonb);
  v_stock := v_all_stocks->v_ticker;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Datos de cotización no disponibles para %', v_ticker;
  END IF;

  v_stock_price := (v_stock->>'price')::NUMERIC;
  IF v_stock_price IS NULL OR v_stock_price <= 0 THEN
    v_stock_price := 10.0;
  END IF;

  -- Bloquear posición de inversiones
  SELECT * INTO v_inv
  FROM public.investments
  WHERE user_id = v_user_id
  FOR UPDATE;

  v_portfolio := COALESCE(v_inv.stocks_portfolio, '{}'::jsonb);
  v_holding := v_portfolio->v_ticker;

  IF v_holding IS NOT NULL THEN
    v_current_shares := (v_holding->>'shares')::NUMERIC;
    v_current_avg := (v_holding->>'average_price')::NUMERIC;
  END IF;

  -- ACCIÓN 1: COMPRAR
  IF LOWER(p_action) = 'buy' THEN
    v_coins := ROUND(p_amount);
    IF v_coins < 10 THEN
      RAISE EXCEPTION 'La inversión mínima es de 10 monedas.';
    END IF;
    IF v_coins > v_user_coins THEN
      RAISE EXCEPTION 'Saldo insuficiente: tienes % monedas e intentas invertir %.', v_user_coins, v_coins;
    END IF;

    v_shares := ROUND((v_coins::NUMERIC / v_stock_price), 4);
    IF v_shares <= 0 THEN
      RAISE EXCEPTION 'Monto insuficiente para comprar acciones.';
    END IF;

    -- Slippage suave al alza
    v_slippage := LEAST(0.08, v_coins::NUMERIC / 50000.0);
    v_new_price := ROUND(v_stock_price * (1.0 + v_slippage), 4);

    -- Actualizar cartera del usuario
    v_new_shares := v_current_shares + v_shares;
    v_new_avg := ROUND(((v_current_avg * v_current_shares) + (v_stock_price * v_shares)) / v_new_shares, 4);

    v_portfolio := jsonb_set(
      v_portfolio,
      ARRAY[v_ticker],
      jsonb_build_object(
        'ticker', v_ticker,
        'shares', v_new_shares,
        'average_price', v_new_avg,
        'total_invested', COALESCE((v_holding->>'total_invested')::BIGINT, 0) + v_coins
      )
    );

    -- Descontar monedas
    UPDATE public.profiles SET coins = coins - v_coins WHERE id = v_user_id;

    -- Registrar auditoría en balance_transactions
    INSERT INTO public.balance_transactions (
      user_id, amount, balance_before, balance_after, type, description
    ) VALUES (
      v_user_id, -v_coins, v_user_coins, v_user_coins - v_coins, 'game_bet',
      format('Compra de %s acciones de %s a %s 🪙', v_shares, v_stock->>'name', v_stock_price)
    );

  -- ACCIÓN 2: VENDER
  ELSIF LOWER(p_action) = 'sell' THEN
    v_shares := ROUND(p_amount, 4);
    IF v_shares <= 0 THEN
      RAISE EXCEPTION 'La cantidad de acciones debe ser mayor que 0.';
    END IF;
    IF v_shares > v_current_shares THEN
      RAISE EXCEPTION 'No tienes suficientes acciones de %: posees % e intentas vender %.', v_ticker, v_current_shares, v_shares;
    END IF;

    v_gross := ROUND(v_shares * v_stock_price);
    v_fee := GREATEST(1, ROUND(v_gross * 0.02)); -- 2% comisión
    v_net := v_gross - v_fee;

    -- Slippage a la baja (suelo mínimo 1.0000)
    v_slippage := LEAST(0.08, v_gross::NUMERIC / 50000.0);
    v_new_price := GREATEST(1.0000, ROUND(v_stock_price * (1.0 - v_slippage), 4));

    v_new_shares := ROUND(v_current_shares - v_shares, 4);
    IF v_new_shares <= 0.0001 THEN
      v_portfolio := v_portfolio - v_ticker;
    ELSE
      v_portfolio := jsonb_set(
        v_portfolio,
        ARRAY[v_ticker],
        jsonb_build_object(
          'ticker', v_ticker,
          'shares', v_new_shares,
          'average_price', v_current_avg,
          'total_invested', (v_holding->>'total_invested')::BIGINT
        )
      );
    END IF;

    -- Ingresar monedas netas
    UPDATE public.profiles SET coins = coins + v_net WHERE id = v_user_id;

    -- Registrar auditoría
    INSERT INTO public.balance_transactions (
      user_id, amount, balance_before, balance_after, type, description
    ) VALUES (
      v_user_id, v_net, v_user_coins, v_user_coins + v_net, 'game_win',
      format('Venta de %s acciones de %s (Neto: %s 🪙, Comisión pool: %s 🪙)', v_shares, v_stock->>'name', v_net, v_fee)
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
    INSERT INTO public.investments (user_id, shares, stocks_portfolio)
    VALUES (v_user_id, 0, v_portfolio);
  END IF;

  -- Actualizar cotización del stock en market_state
  v_stock := jsonb_set(v_stock, '{price}', to_jsonb(v_new_price));
  v_all_stocks := jsonb_set(v_all_stocks, ARRAY[v_ticker], v_stock);
  UPDATE public.market_state SET parody_stocks = v_all_stocks, updated_at = now() WHERE id = 1;

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'ticker', v_ticker,
    'action', p_action,
    'shares', v_shares,
    'price', v_stock_price,
    'new_price', v_new_price,
    'coins_delta', CASE WHEN LOWER(p_action) = 'buy' THEN -v_coins ELSE v_net END,
    'fee_paid', v_fee,
    'remaining_shares', v_new_shares,
    'new_balance', (SELECT coins FROM public.profiles WHERE id = v_user_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.trade_parody_stock(TEXT, TEXT, NUMERIC) TO authenticated;
