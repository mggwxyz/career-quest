import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const TEST_USER_EMAIL = 'test@example.com'
const TEST_USER_PASSWORD = 'testpassword123'

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
  const serviceRoleKey = status.SERVICE_ROLE_KEY
  const dbUrl = status.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

  if (!anonKey || !serviceRoleKey) {
    throw new Error('Could not get ANON_KEY or SERVICE_ROLE_KEY from supabase status')
  }

  console.log('[e2e] Resetting database...')
  run('npx supabase db reset')

  // Create the test user via Supabase Admin API.
  // Using the admin API ensures the password is hashed correctly
  // for Supabase's auth system (rather than relying on raw bcrypt in seed.sql).
  console.log('[e2e] Creating test user via Admin API...')
  const adminClient = createClient(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === TEST_USER_EMAIL)
  if (existing) {
    await adminClient.auth.admin.deleteUser(existing.id)
  }

  const { error: createError } = await adminClient.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  })
  if (createError) {
    throw new Error(`Failed to create test user: ${createError.message}`)
  }
  console.log(`[e2e] Test user created: ${TEST_USER_EMAIL}`)

  const envContent = [
    `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    `DATABASE_URL=${dbUrl}`,
    `OPENAI_API_KEY=sk-fake-e2e-not-used`,
    `TEST_MSW=true`,
  ].join('\n')

  // Write to .env.development.local — this is loaded by Next.js dev mode
  // and takes precedence over .env. We need this because Playwright's
  // webServer starts BEFORE globalSetup completes, so process.env-based
  // injection doesn't work — the file must exist on disk.
  const envPath = path.resolve(__dirname, '..', '.env.development.local')
  writeFileSync(envPath, envContent + '\n')
  console.log(`[e2e] Wrote ${envPath}`)

  // Also set in process.env so Playwright's webServer inherits them
  process.env.NEXT_PUBLIC_SUPABASE_URL = apiUrl
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey
  process.env.DATABASE_URL = dbUrl
  process.env.OPENAI_API_KEY = 'sk-fake-e2e-not-used'
  process.env.TEST_MSW = 'true'
}
