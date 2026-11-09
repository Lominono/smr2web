import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://ehzekojovbxdkcmfbugc.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoemVrb2pvdmJ4ZGtjbWZidWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODkzMTQsImV4cCI6MjEwNDk2NTMxNH0.1NscprWIKsOCCXP_InWiPZNT_m36KeToY4TcCpAhWvQ';

let browserClientInstance: SupabaseClient | null = null;

/**
 * Checks whether Supabase has real, configured credentials
 * (not missing or holding placeholder example values).
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL)?.trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY)?.trim();

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

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY).trim();

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 730, // 2 years permanent session persistence
        sameSite: 'lax',
        path: '/',
      },
    });
  }

  return browserClientInstance;
}
