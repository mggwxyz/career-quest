'use client'

/**
 * Neon Auth (@neondatabase/auth@0.2.0-beta.1) does NOT expose
 * `authClient.signIn.anonymous()`. The Better Auth `anonymousClient()` plugin
 * is not registered by `NeonAuthAdapterCore` (only `jwtClient`, `adminClient`,
 * `organizationClient`, `emailOTPClient`, and `anonymousTokenClient` are), and
 * `createAuthClient()` from `@neondatabase/auth/next` accepts no `plugins`
 * config to opt in.
 *
 * Neon Auth's anonymous-access model is fundamentally different: instead of
 * creating an "anonymous user session" with an `id`, it issues an anonymous
 * JWT (via `getAnonymousToken()` / `allowAnonymous: true` in the vanilla
 * adapter) for RLS-based DB access without a user record. There is no
 * anonymous user to sign in as.
 *
 * This component is currently not mounted anywhere in the app — kept as a
 * no-op placeholder so existing imports (if any) keep compiling. Task 10 may
 * delete it outright, or a follow-up can replace it with anonymous-JWT
 * plumbing if the consuming feature is reintroduced.
 */
export function AnonymousAuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
