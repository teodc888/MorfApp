import { defineConfig, devices } from '@playwright/test'

/**
 * Los E2E apuntan por defecto al ambiente PRE (https://pre.morfapp.app).
 * En PRE el proxy reescribe el subdominio `pre` → /store/pre server-side, por lo
 * que el storefront se navega desde `/` (NO desde `/store/pre`, que da 404 por
 * doble rewrite). Ver e2e/helpers.ts.
 */
export default defineConfig({
  testDir:   './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries:   process.env.CI ? 1 : 0,
  workers:   1,
  timeout:   45_000,
  expect:    { timeout: 10_000 },
  reporter:  [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL:     process.env.E2E_BASE_URL ?? 'https://pre.morfapp.app',
    trace:       'on-first-retry',
    screenshot:  'only-on-failure',
    video:       'retain-on-failure',
    storageState: undefined,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'admin-chrome',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testMatch: /e2e\/admin\/.*/,
    },
    {
      name: 'store-chrome',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /e2e\/store\/.*/,
    },
  ],

  // Sin webServer — los E2E apuntan a un ambiente remoto ya desplegado.
  webServer: undefined,
})
