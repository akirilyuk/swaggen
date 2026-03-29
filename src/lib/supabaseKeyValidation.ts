/**
 * Shared checks for Supabase URL + public (anon) API key.
 * NEXT_PUBLIC_* must never carry the service_role secret.
 */

function decodeJwtPayloadRole(jwt: string): string | undefined {
  try {
    const parts = jwt.split('.');
    const seg = parts[1];
    if (!seg) return undefined;
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(json) as { role?: string };
    return typeof payload.role === 'string' ? payload.role : undefined;
  } catch {
    return undefined;
  }
}

/** Supabase anon keys are JWTs starting with eyJ and are typically long. */
export function isValidSupabaseJwtShape(key: string): boolean {
  return key.startsWith('eyJ') && key.length > 100;
}

/**
 * The key paired with NEXT_PUBLIC_* must be the anon (public) key, not service_role.
 */
export function isAcceptablePublicSupabaseKey(key: string): boolean {
  if (!isValidSupabaseJwtShape(key)) return false;
  const role = decodeJwtPayloadRole(key);
  if (role === 'service_role') return false;
  return true;
}

export function publicSupabaseKeyRejectionReason(key: string): string | null {
  if (!key) return 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set';
  if (!isValidSupabaseJwtShape(key))
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a valid Supabase JWT (expected a long token starting with eyJ)';
  const role = decodeJwtPayloadRole(key);
  if (role === 'service_role')
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be the anon (public) key from Supabase Settings → API, not the service_role key. Never expose service_role to the browser.';
  return null;
}
