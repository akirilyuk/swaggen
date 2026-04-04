import { expect, test } from '@playwright/test';

/**
 * Unknown app routes still go through auth middleware first, so guests see `/login`
 * (302 → 200) rather than Next’s 404 — that is intentional product behavior, not a bug.
 */
test.describe('Public navigation', () => {
  test('landing header navigates to login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('unknown protected path sends unauthenticated users to login', async ({
    page,
  }) => {
    await page.goto('/__e2e_nonexistent_path__');
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });
});
