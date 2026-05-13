import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseBrowserConfig } from '@/lib/supabase/public-env'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { url, anonKey } = getSupabaseBrowserConfig()

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
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

  const { pathname } = request.nextUrl

  function redirectWithSession(to: string) {
    const url = request.nextUrl.clone()
    url.pathname = to
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) =>
      response.cookies.set(name, value, opts as Parameters<typeof response.cookies.set>[2])
    )
    return response
  }

  const isPublicPath = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/'

  if (!user && !isPublicPath) {
    return redirectWithSession('/login')
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
