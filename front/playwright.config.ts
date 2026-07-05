import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:   './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries:   process.env.CI ? 1 : 0,
  workers:   1,
  reporter:  [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL:     process.env.E2E_BASE_URL ?? 'https://dev.morfapp.app',
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

  // Sin webServer — los E2E apuntan a dev.morfapp.app (ambiente remoto)
  webServer: undefined,
})
