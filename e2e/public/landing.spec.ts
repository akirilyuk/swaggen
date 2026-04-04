import { expect, test } from '@playwright/test';

/**
 * Unauthenticated UX: `AppShell` renders `LandingPage` on `/` (public in `proxy.ts`).
 * We use the full h1 accessible name — a looser `/Build APIs/i` regex also matched the
 * features section heading (“…build APIs fast”) and broke strict expectations.
 */
test.describe('Marketing landing (logged out)', () => {
  test('home shows hero and primary CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Build APIs without code' }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Everything you need to build APIs fast' }),
    ).toBeVisible();
  });

  // `/entities` is not in `PUBLIC_ROUTES`; `proxy.ts` redirects before RSC render.
  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/entities');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fentities/);
    await expect(page.getByText('Sign in to your account')).toBeVisible({
      timeout: 20_000,
    });
  });
});
