import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component; the proxy refreshes sessions.
          }
        },
      },
    },
  )
}

// Email of the signed-in user, deduped per request (header + page both ask).
export const getUserEmail = cache(async () => {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    return data?.claims.email
  } catch (e) {
    unstable_rethrow(e) // keep Next's dynamic-rendering signal from cookies()
    return undefined // ponytail: Supabase env missing -> render as logged out
  }
})
