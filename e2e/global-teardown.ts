import { unlinkSync, existsSync } from 'fs'
import path from 'path'

export default async function globalTeardown() {
  // Clean up .env.test — it's generated fresh each run
  const envPath = path.resolve(__dirname, '..', '.env.test')
  if (existsSync(envPath)) {
    unlinkSync(envPath)
    console.log('[e2e] Cleaned up .env.test')
  }

  // Note: we intentionally leave Supabase running between test runs
  // to avoid the ~30s startup cost. Run `npx supabase stop` manually
  // when you're done developing.
}
