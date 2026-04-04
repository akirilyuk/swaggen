import { expect, test, type Page } from '@playwright/test';

/** PageShell + action log can duplicate labels; target the primary toolbar control. */
function primaryCreatePageButton(page: Page) {
  return page.locator('main').getByRole('button', { name: 'Create Page' }).first();
}

test.describe('Frontend Pages — template gallery (mock auth)', () => {
  test('shows Pages shell and opens template chooser', async ({ page }) => {
    await page.goto('/pages');
    await expect(
      page.getByRole('heading', { name: 'Frontend Pages', level: 1 }),
    ).toBeVisible({ timeout: 20_000 });
    await primaryCreatePageButton(page).click();
    await expect(
      page.getByRole('heading', { name: 'New page', level: 2 }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Templates', level: 3 })).toBeVisible();
    await expect(
      page.getByPlaceholder('Search by name, tag, or try “blank”…'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Blank canvas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Dashboard/i }).first()).toBeVisible();
  });

  test('filters templates by search', async ({ page }) => {
    await page.goto('/pages');
    await primaryCreatePageButton(page).click();
    const search = page.getByPlaceholder('Search by name, tag, or try “blank”…');
    await search.fill('CRUD');
    await expect(page.getByRole('button', { name: /CRUD List/i })).toBeVisible();
    await search.fill('zzzz-no-match-xyz');
    await expect(page.getByText('No templates match.')).toBeVisible();
  });

  test('applies Dashboard starter and shows editor with path', async ({ page }) => {
    await page.goto('/pages');
    await primaryCreatePageButton(page).click();
    await page.getByRole('button', { name: /Dashboard/i }).first().click();
    await expect(page.getByPlaceholder('Page title')).toHaveValue('Dashboard');
    await expect(page.getByPlaceholder('url path (empty = home)')).toHaveValue('/dashboard');
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  });

  test('Cancel closes template chooser', async ({ page }) => {
    await page.goto('/pages');
    await primaryCreatePageButton(page).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'New page', level: 2 })).not.toBeVisible();
    await expect(primaryCreatePageButton(page)).toBeVisible();
  });
});
