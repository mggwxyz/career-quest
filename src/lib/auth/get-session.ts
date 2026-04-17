import 'server-only'
import { auth } from '@/lib/auth/server'

export async function getSession() {
  const { data } = await auth.getSession()
  return data ?? null
}
