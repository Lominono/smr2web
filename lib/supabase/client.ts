import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClientInstance: SupabaseClient | null = null;

/**
 * Checks whether Supabase has real, configured credentials
 * (not missing or holding placeholder example values).
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  // Check for common template placeholders
  if (
    supabaseUrl.includes('tu-proyecto') ||
    supabaseUrl.includes('example.com') ||
    supabaseAnonKey.includes('tu-anon') ||
    supabaseAnonKey.includes('placeholder')
  ) {
    return false;
  }

  return true;
}

/**
 * Returns a singleton instance of the Supabase browser client with persistent cookies,
 * or null if credentials are not configured.
 */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 365, // 1 year cookie persistence
        sameSite: 'lax',
        path: '/',
      },
    });
  }

  return browserClientInstance;
}
