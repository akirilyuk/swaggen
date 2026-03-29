/**
 * Resolve `public.accounts.id` for a Supabase Auth user (`auth.users.id`).
 * Used for FK columns (`projects.account_id`, `store_state_meta.account_id`).
 */
import { createBrowserClient } from '@/lib/supabaseBrowser';

/**
 * Includes a 5-second timeout so callers never hang indefinitely.
 */
export async function fetchAccountIdForUser(
  userId: string,
): Promise<string | null> {
  const supabase = createBrowserClient();

  try {
    const result = await Promise.race([
      supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('fetchAccountIdForUser timed out')), 5000),
      ),
    ]);

    if (result.error) {
      console.error(
        '[accountLookup] fetchAccountIdForUser error:',
        result.error.message,
      );
      return null;
    }

    return result.data?.id ?? null;
  } catch (err) {
    console.error('[accountLookup] fetchAccountIdForUser failed:', err);
    return null;
  }
}
