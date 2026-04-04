import { defineConfig, devices } from '@playwright/test';

const useMockAuth = process.env.PLAYWRIGHT_USE_MOCK_AUTH === '1';

/**
 * Public flows: `npm run test:e2e` (no mock auth).
 * Authenticated flows: `npm run test:e2e:auth` (mock user + in-memory store).
 * First run: `npm run test:e2e:install`
 * Existing server: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e`
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          ...(useMockAuth
            ? {
                E2E_MOCK_AUTH: '1',
                NEXT_PUBLIC_E2E_MOCK_AUTH: '1',
              }
            : {}),
        },
      },
});
