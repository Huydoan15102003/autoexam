import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/practice', '/writing']
const AUTH_PAGES = ['/login', '/signup']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  // ponytail: Supabase not configured yet -> skip session refresh so public pages still render
  if (!url || !key) return supabaseResponse

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
        Object.entries(headers).forEach(([k, v]) => supabaseResponse.headers.set(k, v))
      },
    },
  })

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const { pathname } = request.nextUrl
  let target: string | null = null
  if (!user && PROTECTED.some((p) => pathname.startsWith(p))) target = '/login'
  if (user && AUTH_PAGES.includes(pathname)) target = '/dashboard'
  if (!target) return supabaseResponse

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = target
  redirectUrl.search = ''
  const redirect = NextResponse.redirect(redirectUrl)
  supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}
