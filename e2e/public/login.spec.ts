import { expect, test } from '@playwright/test';

test.describe('/login', () => {
  test('shows sign-in mode by default', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: /Swaggen/ })).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  });

  test('signup query shows create-account copy', async ({ page }) => {
    await page.goto('/login?mode=signup');
    await expect(page.getByText('Create a new account')).toBeVisible();
  });

  test('toggle to sign up shows confirm password field', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByText('Create a new account')).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });
});
