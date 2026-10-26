-- ==============================================================
-- SMR2 WEB · LIMPIAR TODOS LOS USUARIOS Y ASIGNAR ADMINISTRADOR
-- ==============================================================
-- Ejecuta este script en el SQL Editor de tu panel de Supabase:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================

BEGIN;

-- 1. Eliminar datos asociados a partidas, turnos, transacciones y chat
DELETE FROM public.chat_messages;
DELETE FROM public.balance_transactions;
DELETE FROM public.event_logs;
DELETE FROM public.rr_turns;
DELETE FROM public.rr_games;
DELETE FROM public.rr_room_players;
DELETE FROM public.rr_rooms;
DELETE FROM public.calendar_events WHERE is_personal = true;

-- 2. Eliminar todas las cuentas y perfiles de alumnos
DELETE FROM public.profiles;

-- 3. Si utilizas el sistema de autenticación de Supabase (Email/Password),
-- vaciar también auth.users para que las cuentas queden 100% limpias:
DELETE FROM auth.users;

-- 4. Aviso de confirmación
INSERT INTO public.chat_messages (username, text, created_at)
VALUES (
  'Sistema SMR2',
  'Base de datos limpiada con éxito. Ya puedes registrar tu cuenta y acceder como administrador.',
  now()
);

COMMIT;

-- ==============================================================
-- DESPUÉS DE EJECUTAR ESTO:
-- ==============================================================
-- 1. Entra a tu web y crea/inicia sesión con tu nuevo usuario.
-- 2. Ve a /admin e introduce la clave: 2026papu
--    ¡Tu cuenta pasará a ser Administrador automáticamente!
--
-- O si prefieres hacerlo directamente por SQL tras registrarte:
-- UPDATE public.profiles
-- SET role = 'admin', coins = 50000
-- WHERE username = 'tu_usuario';
-- ==============================================================
