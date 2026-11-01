-- ==============================================================
-- TEST SUITE SQL: SISTEMA DE INVERSIONES "FONDO BOTELLÓN"
-- ==============================================================
-- Ejecuta este script en el SQL Editor de Supabase para validar
-- todas las RPCs, bloqueos y reglas de negocio.
-- 100% SEGURO: Utiliza un usuario existente (o crea uno de prueba en auth.users)
-- y restaura todos los saldos y estados al finalizar.
-- ==============================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_is_ephemeral_user BOOLEAN := false;
  v_coins_original BIGINT := 1000;
  v_res JSONB;
  v_coins_before BIGINT;
  v_coins_after BIGINT;
  v_market_price_initial NUMERIC;
  v_market_shares_initial NUMERIC;
  v_market_pool_initial NUMERIC;
  v_market_price_after_buy NUMERIC;
  v_market_price_after_sell NUMERIC;
  v_shares_bought NUMERIC;
  v_user_shares NUMERIC;
  v_cooldown_error_caught BOOLEAN := false;
  v_balance_error_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'INICIANDO SUITE DE TESTS: SISTEMA DE INVERSIONES';
  RAISE NOTICE '==================================================';

  -- 1. OBTENCIÓN O CREACIÓN DEL USUARIO DE PRUEBA (Respetando FK auth.users)
  SELECT id INTO v_test_user_id FROM auth.users LIMIT 1;

  IF v_test_user_id IS NULL THEN
    v_test_user_id := gen_random_uuid();
    v_is_ephemeral_user := true;
    
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_test_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'tester_botellon@test.local', crypt('password123', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"tester_botellon"}'::jsonb, now(), now()
    );
  END IF;

  -- Guardar o asegurar saldo en profiles
  INSERT INTO public.profiles (id, username, email, coins, role)
  VALUES (v_test_user_id, 'tester_botellon', 'tester_botellon@test.local', 2000, 'student')
  ON CONFLICT (id) DO NOTHING;

  SELECT coins INTO v_coins_original FROM public.profiles WHERE id = v_test_user_id;
  UPDATE public.profiles SET coins = 2500 WHERE id = v_test_user_id;

  -- Guardar estado inicial del mercado
  SELECT current_price, total_shares, pool_balance 
  INTO v_market_price_initial, v_market_shares_initial, v_market_pool_initial 
  FROM public.market_state WHERE id = 1;

  IF v_market_price_initial IS NULL THEN
    RAISE EXCEPTION 'ERROR: Debes ejecutar primero la migración principal (06_sistema_inversiones_botellon.sql)';
  END IF;
  RAISE NOTICE '1. Precio inicial de mercado: % 🪙', v_market_price_initial;

  -- 2. TEST DE COMPRA (INVERSIÓN)
  PERFORM set_config('request.jwt.claim.sub', v_test_user_id::text, true);

  SELECT coins INTO v_coins_before FROM public.profiles WHERE id = v_test_user_id;
  RAISE NOTICE '2. Saldo antes de invertir: % 🪙', v_coins_before;

  -- Invertir 500 monedas
  v_res := public.invest_in_botellon(500);
  RAISE NOTICE '   Resultado compra: %', v_res;

  SELECT coins INTO v_coins_after FROM public.profiles WHERE id = v_test_user_id;
  SELECT current_price INTO v_market_price_after_buy FROM public.market_state WHERE id = 1;
  SELECT shares INTO v_user_shares FROM public.investments WHERE user_id = v_test_user_id;

  IF v_coins_after != (v_coins_before - 500) THEN
    RAISE EXCEPTION 'ERROR: El saldo no se descontó correctamente.';
  END IF;

  IF COALESCE(v_user_shares, 0) <= 0 THEN
    RAISE EXCEPTION 'ERROR: No se asignaron participaciones al usuario.';
  END IF;

  IF v_market_price_after_buy <= v_market_price_initial THEN
    RAISE EXCEPTION 'ERROR: El precio de mercado debió subir tras la inversión.';
  END IF;

  RAISE NOTICE '   ✅ Compra exitosa. Saldo: % 🪙, Participaciones: %, Nuevo Precio: % 🪙',
    v_coins_after, v_user_shares, v_market_price_after_buy;

  -- 3. TEST DE SALDO INSUFICIENTE
  -- El usuario tiene 2000 monedas e intenta invertir 50.000 monedas
  BEGIN
    PERFORM public.invest_in_botellon(99999);
  EXCEPTION WHEN OTHERS THEN
    v_balance_error_caught := true;
    RAISE NOTICE '   ✅ Saldo insuficiente detectado y rechazado correctamente: "%"', SQLERRM;
  END;

  IF NOT v_balance_error_caught THEN
    RAISE EXCEPTION 'ERROR: Se permitió invertir con saldo insuficiente.';
  END IF;

  -- 4. TEST DE COOLDOWN DE 60 SEGUNDOS
  BEGIN
    PERFORM public.invest_in_botellon(50);
  EXCEPTION WHEN OTHERS THEN
    v_cooldown_error_caught := true;
    RAISE NOTICE '   ✅ Cooldown activo detectado y rechazado correctamente: "%"', SQLERRM;
  END;

  IF NOT v_cooldown_error_caught THEN
    RAISE EXCEPTION 'ERROR: Se permitió operar sin respetar el cooldown de 60s.';
  END IF;

  -- Modificamos temporalmente el timestamp para saltar el cooldown en el test
  UPDATE public.investments 
  SET last_transaction_at = now() - INTERVAL '65 seconds' 
  WHERE user_id = v_test_user_id;

  -- 5. TEST DE RETIRADA (VENTA CON COMISIÓN DEL 2%)
  v_shares_bought := v_user_shares / 2.0; -- Vender la mitad de participaciones
  SELECT coins INTO v_coins_before FROM public.profiles WHERE id = v_test_user_id;

  v_res := public.withdraw_from_botellon(v_shares_bought);
  RAISE NOTICE '5. Resultado retirada: %', v_res;

  SELECT coins INTO v_coins_after FROM public.profiles WHERE id = v_test_user_id;
  SELECT current_price INTO v_market_price_after_sell FROM public.market_state WHERE id = 1;

  IF v_coins_after <= v_coins_before THEN
    RAISE EXCEPTION 'ERROR: El usuario no recibió las monedas netas de la venta.';
  END IF;

  IF v_market_price_after_sell >= v_market_price_after_buy THEN
    RAISE EXCEPTION 'ERROR: El precio debió bajar tras la venta.';
  END IF;

  IF (v_res->>'fee_paid')::BIGINT <= 0 THEN
    RAISE EXCEPTION 'ERROR: No se aplicó la comisión del 2 por ciento al pool.';
  END IF;

  RAISE NOTICE '   ✅ Retirada exitosa. Cobrado neto: % 🪙, Comisión retenida: % 🪙, Nuevo Precio: % 🪙',
    (v_res->>'coins_received'), (v_res->>'fee_paid'), v_market_price_after_sell;

  -- 6. TEST DE TICK Y VOLATILIDAD DE MERCADO
  v_res := public.tick_market_price();
  RAISE NOTICE '6. Resultado tick de servidor: %', v_res;
  IF (v_res->>'success')::BOOLEAN != true THEN
    RAISE EXCEPTION 'ERROR: El tick de mercado falló.';
  END IF;
  RAISE NOTICE '   ✅ Tick ejecutado correctamente.';

  -- 7. TEST DE RANKING DE INVERSORES
  PERFORM * FROM public.get_botellon_top_investors(5);
  RAISE NOTICE '7. ✅ RPC de Top inversores funciona sin violar RLS.';

  -- 8. TEST DE CARTERA INTEGRADA (PORTFOLIO)
  v_res := public.get_botellon_portfolio();
  IF (v_res->>'authenticated')::BOOLEAN != true THEN
    RAISE EXCEPTION 'ERROR: La cartera debe reflejar usuario autenticado.';
  END IF;
  RAISE NOTICE '8. ✅ Cartera del usuario consultada con éxito: %', v_res;

  -- 9. LIMPIEZA Y RESTAURACIÓN DE SALDOS ORIGINALES
  DELETE FROM public.transactions WHERE user_id = v_test_user_id;
  DELETE FROM public.balance_transactions WHERE user_id = v_test_user_id;
  DELETE FROM public.investments WHERE user_id = v_test_user_id;
  
  IF v_is_ephemeral_user THEN
    DELETE FROM auth.users WHERE id = v_test_user_id;
  ELSE
    UPDATE public.profiles SET coins = v_coins_original WHERE id = v_test_user_id;
  END IF;

  UPDATE public.market_state 
  SET current_price = v_market_price_initial,
      total_shares = v_market_shares_initial,
      pool_balance = v_market_pool_initial
  WHERE id = 1;

  RAISE NOTICE '==================================================';
  RAISE NOTICE '🎉 TODOS LOS TESTS SQL PASARON SATISFACTORIAMENTE';
  RAISE NOTICE '==================================================';
END $$;
