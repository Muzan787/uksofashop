// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 1. Get the current user session
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Protect the /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      // Not logged in at all? Redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check if the user exists in the `admins` table
    const { data: adminRecord } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!adminRecord) {
      // Logged in, but NOT an admin? Redirect to the home page
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

// Only run middleware on specific routes to save performance
export const config = {
  matcher: ['/admin/:path*'],
}