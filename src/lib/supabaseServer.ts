/**
 * Server-side Supabase client (uses cookies for session management).
 *
 * Use this inside Server Components, Route Handlers, and Server Actions.
 * Each call creates a fresh instance bound to the current request cookies.
 */
import { createServerClient as _createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[supabaseServer] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.',
    );
  }

  const cookieStore = await cookies();

  console.log('[supabaseServer] Creating server Supabase client for:', url);
  return _createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` can fail when called from a Server Component.
          // This is expected — session refresh will be picked up by
          // the middleware on the next request.
        }
      },
    },
  });
}
