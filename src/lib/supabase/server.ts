import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
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

// Verified JWT claims of the signed-in user (sub, email, user_metadata…), deduped per request so the header
// and the page share one check. The project signs with ES256, so getClaims verifies locally — no Auth round trip.
export const getClaims = cache(async () => {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    return data?.claims ?? null
  } catch (e) {
    unstable_rethrow(e) // keep Next's dynamic-rendering signal from cookies()
    return null // ponytail: Supabase env missing -> render as logged out
  }
})

export const getUserEmail = async () => (await getClaims())?.email
