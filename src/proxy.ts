import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Signed out: to the sign-in page, which brings them back here after.
    // The sign-in action only honours `next` when it is a path on this site.
    if (!user) {
      const login = new URL('/login', request.url)
      login.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(login)
    }

    // The same definition of "admin" the RLS policies, the admin layout and
    // every admin action use: a linked, active row on the allowlist. This
    // used to read public.admins itself, which stopped being the whole rule
    // once rows could be switched off.
    const { data: admin } = await supabase.rpc('is_admin')

    // Signed in but not an admin - a customer account. They get the shop's
    // ordinary "page not found", so the panel's existence is not confirmed to
    // anyone who isn't on the list. A rewrite to a path no route matches
    // renders app/not-found.tsx with a 404, at the URL they asked for.
    if (admin !== true) {
      const hidden = NextResponse.rewrite(new URL('/__not-found', request.url))
      supabaseResponse.cookies.getAll().forEach(cookie => hidden.cookies.set(cookie))
      return hidden
    }
  }

  return supabaseResponse
}

export const config = {
  // Everything under /admin except the admin PWA manifest. A manifest is
  // fetched by the browser before any session is established, so redirecting
  // it to the login page means the install prompt never appears. It contains
  // nothing sensitive - a name, an icon and a start URL.
  // Two entries on purpose. The second pattern requires a path segment after
  // /admin, so on its own it would leave the bare /admin dashboard unmatched
  // and reachable without a session.
  matcher: ['/admin', '/admin/((?!manifest.webmanifest).*)'],
}