/**
 * Browser-side Supabase client (carries the user's JWT via cookies).
 *
 * Use this in client components (`'use client'`) and Zustand stores.
 * It is a singleton – calling `createBrowserClient()` multiple times
 * returns the same instance.
 */
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof _createBrowserClient> | null = null;

export function createBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[supabaseBrowser] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.',
    );
  }

  console.log('[supabaseBrowser] Creating browser Supabase client for:', url);
  client = _createBrowserClient(url, key);
  return client;
}
