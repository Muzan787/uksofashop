// src/app/actions/auth.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

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

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup',
  })

  if (error) {
    return { error: error.message }
  }

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