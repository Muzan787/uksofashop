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