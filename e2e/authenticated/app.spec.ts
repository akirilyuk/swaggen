import { expect, test } from '@playwright/test';

/**
 * Requires `npm run test:e2e:auth` (mock auth). Project/entity copy matches
 * `buildE2eMockProject()` in `src/lib/e2eMockProjectSeed.ts`.
 */
test.describe('Authenticated app (mock user + in-memory project seed)', () => {
  test('dashboard loads shell and seeded project', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
    const select = page.locator('#project-select');
    await expect(select).toContainText('E2E Mock API');
  });

  test('entities page lists seeded models', async ({ page }) => {
    await page.goto('/entities');
    await expect(page.getByRole('heading', { name: 'Entities', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Author', { exact: true })).toBeVisible();
    await expect(page.getByText('Post', { exact: true })).toBeVisible();
  });

  test('relations page shows seeded relation', async ({ page }) => {
    await page.goto('/relations');
    await expect(page.getByRole('heading', { name: 'Relations', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('author', { exact: true })).toBeVisible();
  });

  test('pipelines page lists seeded pipeline', async ({ page }) => {
    await page.goto('/pipelines');
    await expect(
      page.getByRole('heading', { name: 'Middleware pipelines', level: 1 }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('E2E Sample Pipeline')).toBeVisible();
  });

  test('bots page exposes create-bot action in the shell', async ({ page }) => {
    await page.goto('/bots');
    await expect(page.getByRole('heading', { name: 'Bots', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole('button', { name: 'Add Bot' }).first(),
    ).toBeVisible();
  });

  test('spec editor renders for active project', async ({ page }) => {
    await page.goto('/editor');
    await expect(
      page.getByRole('heading', { name: 'OpenAPI Spec Editor', level: 1 }),
    ).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText('Valid')).toBeVisible();
  });

  test('sidebar navigates between sections', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Entities' }).click();
    await expect(page).toHaveURL(/\/entities$/);
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
