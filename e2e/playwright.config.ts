import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
import path from 'path'

// Load .env.local so DATABASE_URL / NEON_AUTH_BASE_URL / NEON_AUTH_COOKIE_SECRET
// are available both for our globalSetup (which talks to Neon directly) and for
// the spawned dev server. Playwright reads this file at config-load time, before
// either webServer or globalSetup is started.
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') })

const requiredEnv = ['DATABASE_URL', 'NEON_AUTH_BASE_URL', 'NEON_AUTH_COOKIE_SECRET'] as const
const missing = requiredEnv.filter(name => !process.env[name])
if (missing.length > 0) {
  throw new Error(
    `[e2e] Missing required env vars in .env.local: ${missing.join(', ')}. `
    + `Populate them before running the Playwright suite.`,
  )
}

export default defineConfig({
  testDir: './specs',
  fullyParallel: false, // run specs sequentially — they share one test user
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'list',
  timeout: 60_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  globalSetup: path.resolve(__dirname, 'global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'global-teardown.ts'),

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL!,
      NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL!,
      NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET!,
      OPENAI_API_KEY: 'sk-fake-e2e-not-used',
      TEST_MSW: 'true',
    },
  },
})
