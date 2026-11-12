import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * SEGURIDAD: ya no se admiten credenciales hardcodeadas en el código fuente.
 * 
 * 1. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`: credenciales
 *    públicas del proyecto (client + server con cookies).
 * 2. `SUPABASE_SERVICE_ROLE_KEY`: credencial ADMINISTRATIVA. Solo existe en el
 *    servidor, jamás se expone al navegador y WITHOUT ella no hay cliente admin
 *    (antes caía silenciosamente a la anon key, degradando todas las acciones
 *    "admin" a permisos de visitante anónimo).
 */

function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
}

function getAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
}

function getServiceRoleKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

function looksLikePlaceholder(value: string | undefined | null): boolean {
  if (!value || value.length < 10) return true;
  return (
    value.includes('tu-proyecto') ||
    value.includes('example.com') ||
    value.includes('tu-anon') ||
    value.includes('placeholder') ||
    value.includes('SENSITIVE')
  );
}

/**
 * Checks whether Supabase environment variables are real, valid credentials
 */
export function isServerSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey() || getAnonKey();

  if (!url || !key) return false;
  if (looksLikePlaceholder(url) || looksLikePlaceholder(key)) return false;

  return true;
}

/** Indica si existe la credencial administrativa (service role). */
export function isServiceRoleConfigured(): boolean {
  const key = getServiceRoleKey();
  return Boolean(key) && !looksLikePlaceholder(key);
}

/**
 * Server client with cookie handling for authenticated SSR requests
 */
export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getAnonKey();

  if (!supabaseUrl || !supabaseAnonKey || looksLikePlaceholder(supabaseAnonKey)) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  });
}

/**
 * Admin server client. SEGURIDAD:
 * - SOLO utiliza `SUPABASE_SERVICE_ROLE_KEY` (credencial con bypass de RLS).
 * - Sin service role devuelve `null`; las rutas responden 503 y NUNCA se
 *   degradan a la anon key (antes permitía ejecutar tareas destructivas con
 *   permisos de anónimo).
 */
export function createAdminClient() {
  if (!isServerSupabaseConfigured()) return null;

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  if (!serviceKey || looksLikePlaceholder(serviceKey)) {
    return null;
  }

  return createSupabaseAdminClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
