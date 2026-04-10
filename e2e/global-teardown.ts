import { unlinkSync, existsSync } from 'fs'
import path from 'path'

export default async function globalTeardown() {
  // Clean up .env.development.local — it's generated fresh each run
  const envPath = path.resolve(__dirname, '..', '.env.development.local')
  if (existsSync(envPath)) {
    unlinkSync(envPath)
    console.log('[e2e] Cleaned up .env.development.local')
  }

  // Note: we intentionally leave Supabase running between test runs
  // to avoid the ~30s startup cost. Run `npx supabase stop` manually
  // when you're done developing.
}
