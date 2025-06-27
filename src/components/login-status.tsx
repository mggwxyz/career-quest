import { createClient } from '@/utils/supabase/serverClient'
import { LogoutButton } from './logout-button'
import { CurrentUserAvatar } from './current-user-avatar'

export const LoginStatus = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <>
      {isLoggedIn
        ? (
          <div className="max-h-7 flex flex-row items-center gap-2">
            <CurrentUserAvatar />
            <LogoutButton />
          </div>
        )
        : null}
    </>
  )
}
