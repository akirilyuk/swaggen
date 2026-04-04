/**
 * Playwright-only mock auth. Lets e2e hit protected routes and the full app shell
 * without real Supabase cookies or signing JWTs.
 *
 * We use two flags on purpose:
 * - `E2E_MOCK_AUTH` — server / Edge (`proxy.ts`). Not exposed to the browser so
 *   we do not advertise an “auth bypass” knob in client bundles.
 * - `NEXT_PUBLIC_E2E_MOCK_AUTH` — bundled for `authStore` + `projectStore` so the
 *   client immediately sees a signed-in user and skips Supabase on init.
 *
 * Set both only for the Playwright-managed dev server (`PLAYWRIGHT_USE_MOCK_AUTH=1`).
 * Never enable in production.
 */
import type { Session, User } from '@supabase/supabase-js';

/** Stable id so any code that keys off `user.id` (e.g. meta rows) stays deterministic in tests. */
export const E2E_MOCK_USER_ID = '00000000-0000-4000-8000-00000000e2e1';

export function isE2eMockAuthServer(): boolean {
  return process.env.E2E_MOCK_AUTH === '1';
}

export function isE2eMockAuthClient(): boolean {
  return process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === '1';
}

export const E2E_MOCK_USER = {
  id: E2E_MOCK_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'e2e-mock@example.test',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_anonymous: false,
} as unknown as User;

/** Tokens are dummies; nothing in mock mode calls Supabase with them. */
export const E2E_MOCK_SESSION = {
  access_token: 'e2e-mock-access-token',
  refresh_token: 'e2e-mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 7200,
  token_type: 'bearer',
  user: E2E_MOCK_USER,
} as unknown as Session;
