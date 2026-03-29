/**
 * Shared Supabase client instance.
 *
 * On the browser this is the auth-aware SSR browser client.
 * On the server at startup (instrumentation) it falls back to a plain client
 * (no cookie support outside of a request context).
 *
 * Consumers that need a per-request server client should import
 * `createServerClient` from `./supabaseServer` instead.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  isAcceptablePublicSupabaseKey,
  publicSupabaseKeyRejectionReason,
} from './supabaseKeyValidation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
} else {
  const reason = publicSupabaseKeyRejectionReason(supabaseAnonKey);
  if (reason) {
    console.warn('[supabase]', reason);
  }
}

/** Shared Supabase client. `null` when credentials are not configured. */
export const supabase: SupabaseClient | null = (() => {
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !isAcceptablePublicSupabaseKey(supabaseAnonKey)
  ) {
    console.warn(
      '[supabase] Supabase client not created — credentials invalid or missing.',
    );
    return null;
  }

  // In the browser, use the SSR browser client (auth-aware, cookie-based)
  if (typeof window !== 'undefined') {
    try {
      // Dynamic require to avoid circular dependency at module init time
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createBrowserClient } = require('./supabaseBrowser');
      return createBrowserClient() as SupabaseClient;
    } catch {
      // Fallback to plain client if SSR module fails
    }
  }

  // Server-side (instrumentation, build) — plain client without cookie support
  console.log('[supabase] Creating server Supabase client for:', supabaseUrl);
  return createClient(supabaseUrl, supabaseAnonKey);
})();

/**
 * Preferred entry point for DB access. In the browser always returns the
 * cookie-backed SSR client so the user session is sent and RLS policies work.
 * Falls back to the module singleton on the server (API routes, etc.).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !isAcceptablePublicSupabaseKey(supabaseAnonKey)
  ) {
    return null;
  }
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createBrowserClient } = require('./supabaseBrowser');
      return createBrowserClient() as SupabaseClient;
    } catch (err) {
      console.error(
        '[supabase] getSupabaseClient: createBrowserClient failed, using plain client',
        err,
      );
      return createClient(supabaseUrl, supabaseAnonKey);
    }
  }
  return supabase;
}
