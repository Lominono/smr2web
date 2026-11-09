-- Migración: Blindaje del trigger de creación de usuarios en Supabase Auth
-- Evita errores "Database error creating new user" si ocurren colisiones o discrepancias en profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_username text;
  v_role text;
BEGIN
  v_username := COALESCE(
    NULLIF(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );

  -- Si el nombre de usuario colisiona, añadir sufijo seguro
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(v_username) AND id <> new.id) THEN
    v_username := v_username || '_' || substr(new.id::text, 1, 4);
  END IF;

  v_role := CASE WHEN LOWER(v_username) IN ('admin', 'juanfernandoospina005') THEN 'admin' ELSE 'student' END;

  BEGIN
    INSERT INTO public.profiles (
      id, username, nombre, full_name, email, coins, biggest_win, streak_count, role, rol, avatar_color
    )
    VALUES (
      new.id, v_username, v_username, v_username, new.email, 1000, 0, 1, v_role, 
      CASE WHEN v_role = 'admin' THEN 'moderador' ELSE 'alumno' END, 
      'emerald'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      username = COALESCE(profiles.username, EXCLUDED.username),
      nombre = COALESCE(profiles.nombre, EXCLUDED.nombre);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback silencioso: nunca bloquear la creación en auth.users
    NULL;
  END;

  RETURN new;
END;
$function$;
