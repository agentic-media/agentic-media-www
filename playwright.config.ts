import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for agentic-media-www e2e tests.
 *
 * All tests run against production (https://agenticmedia.cc) by default.
 * Override with BASE_URL env var for staging/preview deploys.
 *
 * The happy-path test intercepts /api/beta-invite with page.route() to
 * bypass Cloudflare Turnstile — we can't solve a real CAPTCHA in CI.
 * Turnstile widget errors in the iframe are expected; they are isolated
 * to the sandboxed challenge frame and do not affect page functionality.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL || 'https://agenticmedia.cc',
    // Capture trace on first retry so failures are diagnosable in CI
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
