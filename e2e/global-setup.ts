import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import path from 'path'

function run(cmd: string): string {
  return execSync(cmd, { cwd: path.resolve(__dirname, '..'), encoding: 'utf-8' }).trim()
}

export default async function globalSetup() {
  console.log('[e2e] Checking Supabase status...')

  let status: Record<string, string>
  try {
    const raw = run('npx supabase status --output json')
    status = JSON.parse(raw)
  }
  catch {
    console.log('[e2e] Supabase not running. Starting...')
    run('npx supabase start')
    const raw = run('npx supabase status --output json')
    status = JSON.parse(raw)
  }

  const apiUrl = status.API_URL ?? 'http://127.0.0.1:54321'
  const anonKey = status.ANON_KEY
  const dbUrl = status.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

  if (!anonKey) {
    throw new Error('Could not get ANON_KEY from supabase status')
  }

  console.log('[e2e] Resetting database...')
  run('npx supabase db reset')

  const envContent = [
    `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    `DATABASE_URL=${dbUrl}`,
    `OPENAI_API_KEY=sk-fake-e2e-not-used`,
    `TEST_MSW=true`,
  ].join('\n')

  const envPath = path.resolve(__dirname, '..', '.env.test')
  writeFileSync(envPath, envContent + '\n')
  console.log(`[e2e] Wrote ${envPath}`)

  // Also set in process.env so Playwright's webServer inherits them
  process.env.NEXT_PUBLIC_SUPABASE_URL = apiUrl
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey
  process.env.DATABASE_URL = dbUrl
  process.env.OPENAI_API_KEY = 'sk-fake-e2e-not-used'
  process.env.TEST_MSW = 'true'
}
