// src/utils/auth.ts
//
// Authorisation guard for privileged Server Actions.
//
// src/proxy.ts only matches /admin/:path*, which protects admin *pages* but
// NOT Server Actions. A Server Action compiles to a public POST endpoint keyed
// by an action ID, and that ID can be posted to any route on the site - so the
// middleware never sees it. Every action that writes privileged data has to
// check for itself.

import { createClient } from '@/utils/supabase/server'

export const NOT_AUTHORISED = 'You are not authorised to perform this action.'

export class NotAuthorisedError extends Error {
  constructor(message = NOT_AUTHORISED) {
    super(message)
    this.name = 'NotAuthorisedError'
  }
}

/**
 * True when the current session belongs to a row in public.admins.
 *
 * Delegates to the is_admin() database function so there is exactly one
 * definition of "admin" shared by RLS policies, the proxy and these actions.
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase.rpc('is_admin')
  if (error) {
    console.error('Admin check failed:', error.message)
    return false
  }

  return data === true
}

/**
 * Throws unless the caller is an admin. Use at the top of Server Actions that
 * are invoked as `<form action={...}>`, where there is no return value to carry
 * an error. Throwing is the safe default: an action that forgets its guard
 * fails loudly rather than quietly allowing the write.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new NotAuthorisedError()
}

/**
 * Returns an error object for a non-admin, or null to proceed. Use at the top
 * of Server Actions whose callers already read `{ error }`, so an unauthorised
 * attempt surfaces in the UI the same way any other failure does.
 *
 *   const denied = await adminGuard()
 *   if (denied) return denied
 */
export async function adminGuard(): Promise<{ error: string } | null> {
  return (await isAdmin()) ? null : { error: NOT_AUTHORISED }
}
