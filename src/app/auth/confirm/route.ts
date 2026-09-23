import type { EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')

  const supabase = await createClient()
  let ok = false
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error
  }

  if (ok) redirect('/dashboard')
  redirect('/login?error=' + encodeURIComponent('Liên kết xác nhận không hợp lệ hoặc đã hết hạn.'))
}
