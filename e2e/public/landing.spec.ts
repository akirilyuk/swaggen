import { expect, test } from '@playwright/test';

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

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/entities');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fentities/);
    await expect(page.getByText('Sign in to your account')).toBeVisible({
      timeout: 20_000,
    });
  });
});
