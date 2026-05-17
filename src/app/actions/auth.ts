// src/app/actions/auth.ts
'use server'

import { createClient } from '@/utils/supabase/server'
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

  // Role-based redirection logic
  const userEmail = data.user?.email;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (userEmail && adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase()) {
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

  // Once verified, automatically route them based on email
  const userEmail = data.user?.email;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (userEmail && adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase()) {
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