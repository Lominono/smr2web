-- ==============================================================
-- SMR2 WEB · LIMPIAR TODOS LOS USUARIOS Y ASIGNAR ADMINISTRADOR
-- ==============================================================
-- Ejecuta este script en el SQL Editor de tu panel de Supabase:
-- https://supabase.com/dashboard/project/ehzekojovbxdkcmfbugc/sql/new
-- ==============================================================

BEGIN;

-- 1. Vaciar auth.users y perfiles
TRUNCATE auth.users CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- 2. Vaciar feed, transacciones y partidas
TRUNCATE TABLE public.chat_messages CASCADE;
TRUNCATE TABLE public.transactions CASCADE;
TRUNCATE TABLE public.investments CASCADE;
TRUNCATE TABLE public.calendar_events CASCADE;
TRUNCATE TABLE public.balance_transactions CASCADE;
TRUNCATE TABLE public.rr_turns CASCADE;
TRUNCATE TABLE public.rr_games CASCADE;
TRUNCATE TABLE public.rr_room_players CASCADE;
TRUNCATE TABLE public.rr_rooms CASCADE;

COMMIT;

-- ==============================================================
-- INSTRUCCIONES PARA TU CUENTA DE ADMINISTRADOR:
-- 1. Entra a la web una vez lanzada y regístrate con tu correo y contraseña.
-- 2. Luego ejecuta esta consulta en el SQL Editor para otorgarte el rol de admin:
--
--    UPDATE public.profiles
--    SET role = 'admin', coins = 50000
--    WHERE email = 'tu_correo@ejemplo.com' OR username = 'tu_usuario';
-- ==============================================================
