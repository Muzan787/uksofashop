// src/app/actions/auth.ts
'use server'

import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { redirect } from 'next/navigation'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { isAdminPath, safeNextPath } from '@/utils/safeRedirect'

/**
 * The one thing a failed sign-in says, whatever went wrong.
 *
 * Supabase distinguishes a wrong password from an address it has never seen
 * and from one that has not been confirmed. Repeating that difference tells a
 * stranger which addresses have accounts here - the admin's included - so
 * every failure reads the same.
 */
const SIGN_IN_FAILED =
  "That email and password don't match an account. Check them and try again. If you've only just signed up, confirm your email first."

/** Ten tries per quarter hour, counted per device and per address. */
const SIGN_IN_LIMIT = 10
const SIGN_IN_WINDOW_MS = 15 * 60 * 1000

/**
 * Link an allowlisted address to this account the first time it signs in.
 * claim_admin() reads the address and its confirmation from auth.users, so
 * nothing the browser sends decides it. A failure only means the link waits
 * for the next sign-in, so it never blocks one.
 */
async function claimAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.rpc('claim_admin')
  if (error) console.error('claim_admin failed:', error.message)
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  // Both buckets are spent on every attempt, so neither a run of addresses
  // from one device nor one address from many devices gets past ten.
  const requestHeaders = await headers()
  const byDevice = rateLimit(callerKey(requestHeaders, 'sign-in'), SIGN_IN_LIMIT, SIGN_IN_WINDOW_MS)
  const byAddress = rateLimit(`sign-in-email:${email.toLowerCase()}`, SIGN_IN_LIMIT, SIGN_IN_WINDOW_MS)
  if (!byDevice.ok || !byAddress.ok) {
    const seconds = Math.max(byDevice.retryAfter, byAddress.retryAfter)
    const minutes = Math.max(1, Math.ceil(seconds / 60))
    return {
      error: `Too many attempts. Please wait about ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`,
    }
  }

  // Authenticate with Supabase
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: SIGN_IN_FAILED }
  }

  await claimAdmin(supabase)

  // Back to the page that sent them here, when that is a page on this site.
  // A customer is never sent into the admin panel by it.
  const next = safeNextPath(formData.get('next'))

  // Where to send them is decided by the admins table, via is_admin() -
  // the same source proxy.ts and requireAdmin() use. This used to compare the
  // signed-in address against the ADMIN_EMAIL environment variable, which is a
  // second definition of 'who is an admin' that can silently disagree with the
  // table.
  if (await isAdmin()) {
    // The page loads the admin itself, in full, rather than this redirecting
    // inside the page: the shop's Meta and Google tags may have loaded on the
    // sign-in page, and carried across they would see the admin, which they
    // never should (Muaz, 16 Oct 2026).
    return { admin: next ?? '/admin' };
  } else {
    redirect(next && !isAdminPath(next) ? next : '/account');
  }
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function verifySignupOtp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const otp = formData.get('otp') as string

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup',
  })

  if (error) {
    return { error: error.message }
  }

  // A brand-new account on an allowlisted address becomes the admin here,
  // now that its email is confirmed.
  await claimAdmin(supabase)

  // Where to send them is decided by the admins table, via is_admin() -
  // the same source proxy.ts and requireAdmin() use. This used to compare the
  // signed-in address against the ADMIN_EMAIL environment variable, which is a
  // second definition of 'who is an admin' that can silently disagree with the
  // table.
  if (await isAdmin()) {
    redirect('/admin');
  } else {
    redirect('/account');
  }
}

// Add this to the bottom of src/app/actions/auth.ts
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}