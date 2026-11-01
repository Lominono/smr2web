-- ==============================================================
-- SMR2 WEB · REINICIO TOTAL DE LA BASE DE DATOS (NUEVA TEMPORADA)
-- ==============================================================
-- Este script reinicia la economía, el ranking y el historial de todos
-- los alumnos a los valores iniciales para comenzar una competición limpia.
--
-- INSTRUCCIONES:
-- 1. Ve a tu panel de Supabase -> SQL Editor.
-- 2. Pega todo este código y pulsa "Run".
-- ==============================================================

BEGIN;

-- 1. Reiniciar la economía y estadísticas de todos los perfiles de alumnos
UPDATE public.profiles
SET 
  coins = 1000,
  biggest_win = 0,
  streak_count = 1,
  games_played = 0,
  games_won = 0,
  last_claim_date = NULL;

-- 2. Limpiar el historial de transacciones de saldo
DELETE FROM public.balance_transactions;

-- 3. Limpiar las salas y partidas antiguas de la Ruleta Rusa
DELETE FROM public.rr_turns;
DELETE FROM public.rr_games;
DELETE FROM public.rr_rooms;

-- 4. Limpiar los registros de auditoría de partidas anteriores
DELETE FROM public.audit_logs;

-- 5. Limpiar el chat en vivo y publicar el aviso oficial de reinicio
DELETE FROM public.chat_messages;

INSERT INTO public.chat_messages (username, text, created_at)
VALUES (
  'Delegado SMR2',
  '¡Atención a toda la clase! Se ha reiniciado la base de datos y la economía para la nueva temporada. Todos los alumnos empiezan con 1.000 monedas en el ranking. ¡A competir!',
  now()
);

COMMIT;

-- ==============================================================
-- ¡Listo! Todos los alumnos vuelven a tener 1.000 fichas y el ranking está limpio.
-- ==============================================================
