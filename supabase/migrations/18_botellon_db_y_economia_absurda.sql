-- ============================================================================
-- MIGRACIÓN 18: BASE DE DATOS DEDICADA PARA EL BOTELLÓN + AUDITORÍA + RLS
-- ============================================================================
-- 1. Crea `public.botellon_states` (estado normalizado e indexado por usuario)
-- 2. Crea `public.botellon_events` (historial/auditoría de mejoras, perks, afters y redadas)
-- 3. Migra automáticamente los datos existentes desde `public.profiles.party_farm_data`
-- 4. Bloquea escrituras directas desde navegador (anon/authenticated) para evitar
--    manipulación de niveles, perks o renacimientos; todo pasa por API servidor.
-- ============================================================================

-- 1. Tabla principal de estado del Botellón
CREATE TABLE IF NOT EXISTS public.botellon_states (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  levels jsonb NOT NULL DEFAULT '{"litronas":0,"hielos":0,"chupitos":0,"botellas":0,"altavoz":0,"barra_libre":0,"vip":0}'::jsonb,
  pending_vault numeric NOT NULL DEFAULT 0 CHECK (pending_vault >= 0),
  current_run_produced numeric NOT NULL DEFAULT 0 CHECK (current_run_produced >= 0),
  total_lifetime_produced numeric NOT NULL DEFAULT 0 CHECK (total_lifetime_produced >= 0),
  after_prestige_count bigint NOT NULL DEFAULT 0 CHECK (after_prestige_count >= 0),
  current_zone_id text NOT NULL DEFAULT 'parque',
  purchased_perks text[] NOT NULL DEFAULT '{}'::text[],
  total_drinks_taken bigint NOT NULL DEFAULT 0 CHECK (total_drinks_taken >= 0),
  beer_pong_wins bigint NOT NULL DEFAULT 0 CHECK (beer_pong_wins >= 0),
  hangover_level bigint NOT NULL DEFAULT 0 CHECK (hangover_level >= 0),
  after_suspicion_level bigint NOT NULL DEFAULT 0 CHECK (after_suspicion_level >= 0),
  guard_active_until_ms bigint NOT NULL DEFAULT 0,
  last_after_ms bigint NOT NULL DEFAULT 0,
  last_subsidio_ms bigint NOT NULL DEFAULT 0,
  last_tick_ms bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_botellon_states_ranking
  ON public.botellon_states (after_prestige_count DESC, total_lifetime_produced DESC);

CREATE INDEX IF NOT EXISTS idx_botellon_states_updated
  ON public.botellon_states (updated_at DESC);

-- 2. Tabla de eventos y auditoría del Botellón
CREATE TABLE IF NOT EXISTS public.botellon_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  coins_delta numeric NOT NULL DEFAULT 0,
  fichas_delta numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_botellon_events_user_created
  ON public.botellon_events (user_id, created_at DESC);

-- 3. Trigger para mantener updated_at actualizado
CREATE OR REPLACE FUNCTION private.touch_botellon_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_botellon_states_updated_at
  BEFORE UPDATE ON public.botellon_states
  FOR EACH ROW
  EXECUTE FUNCTION private.touch_botellon_updated_at();

-- 4. Backfill idempotente desde `public.profiles.party_farm_data`
INSERT INTO public.botellon_states (
  user_id,
  levels,
  pending_vault,
  current_run_produced,
  total_lifetime_produced,
  after_prestige_count,
  current_zone_id,
  purchased_perks,
  total_drinks_taken,
  beer_pong_wins,
  hangover_level,
  after_suspicion_level,
  guard_active_until_ms,
  last_after_ms,
  last_subsidio_ms,
  last_tick_ms
)
SELECT
  p.id,
  COALESCE(p.party_farm_data->'levels', '{"litronas":0,"hielos":0,"chupitos":0,"botellas":0,"altavoz":0,"barra_libre":0,"vip":0}'::jsonb),
  GREATEST(0, COALESCE((p.party_farm_data->>'pendingVault')::numeric, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'currentRunProduced')::numeric, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'totalLifetimeProduced')::numeric, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'afterPrestigeCount')::numeric::bigint, (p.party_farm_data->>'rebirths')::numeric::bigint, 0)),
  COALESCE(NULLIF(p.party_farm_data->>'currentZoneId', ''), 'parque'),
  COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(p.party_farm_data->'purchasedPerks')),
    '{}'::text[]
  ),
  GREATEST(0, COALESCE((p.party_farm_data->>'totalDrinksTaken')::numeric::bigint, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'beerPongWins')::numeric::bigint, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'hangoverLevel')::numeric::bigint, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'afterSuspicionLevel')::numeric::bigint, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'guardActiveUntilMs')::numeric::bigint, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'lastAfterTimestamp')::numeric::bigint, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'lastSubsidioClaimMs')::numeric::bigint, 0)),
  GREATEST(0, COALESCE((p.party_farm_data->>'lastTickMs')::numeric::bigint, 0))
FROM public.profiles p
WHERE p.party_farm_data IS NOT NULL
  AND p.party_farm_data <> '{}'::jsonb
ON CONFLICT (user_id) DO NOTHING;

-- 5. RLS estricto: lectura propia o staff; cero escrituras directas desde cliente
ALTER TABLE public.botellon_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.botellon_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.botellon_states FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.botellon_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.botellon_states TO authenticated;
GRANT SELECT ON TABLE public.botellon_events TO authenticated;
GRANT ALL ON TABLE public.botellon_states TO service_role;
GRANT ALL ON TABLE public.botellon_events TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'botellon_states' AND policyname = 'botellon_states_select_own_or_staff'
  ) THEN
    CREATE POLICY botellon_states_select_own_or_staff
      ON public.botellon_states
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR private.is_admin_or_delegado());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'botellon_events' AND policyname = 'botellon_events_select_own_or_staff'
  ) THEN
    CREATE POLICY botellon_events_select_own_or_staff
      ON public.botellon_events
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR private.is_admin_or_delegado());
  END IF;
END $$;

-- 6. Revocar UPDATE directo de `party_farm_data` en `profiles` desde navegador
REVOKE UPDATE (party_farm_data) ON public.profiles FROM authenticated;
