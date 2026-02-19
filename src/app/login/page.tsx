// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { login } from '@/app/actions/auth'
import { Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  async function handleLogin(formData: FormData) {
    setIsPending(true)
    setError('')
    
    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col items-center">
          <div className="p-3 bg-slate-900 rounded-full mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-center text-3xl font-bold text-slate-900 tracking-tight">
            Admin Access
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Sign in to manage your store
          </p>
        </div>

        <form action={handleLogin} className="mt-8 space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={isPending}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                placeholder="admin@uksofashop.co.uk"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={isPending}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-white bg-slate-900 hover:bg-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70"
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in to Dashboard'}
          </button>
        </form>
      </div>
    </main>
  )
}