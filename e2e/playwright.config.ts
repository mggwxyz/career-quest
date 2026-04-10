import { defineConfig, devices } from '@playwright/test'
import { execSync } from 'child_process'
import path from 'path'

// Read Supabase status synchronously at config-load time so webServer
// gets the correct env vars BEFORE Next.js starts. globalSetup runs
// in parallel with webServer, so it can't be relied on for env setup.
function getSupabaseEnv() {
  try {
    const raw = execSync('npx supabase status --output json', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const status = JSON.parse(raw)
    return {
      NEXT_PUBLIC_SUPABASE_URL: status.API_URL ?? 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY ?? '',
      DATABASE_URL: status.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    }
  }
  catch {
    // Supabase not running yet — globalSetup will start it.
    // Use defaults; webServer will be restarted via reuseExistingServer=false in CI.
    return {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    }
  }
}

const supabaseEnv = getSupabaseEnv()

export default defineConfig({
  testDir: './specs',
  fullyParallel: false, // run specs sequentially — they share one DB
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
      ...supabaseEnv,
      OPENAI_API_KEY: 'sk-fake-e2e-not-used',
      TEST_MSW: 'true',
    },
  },
})
