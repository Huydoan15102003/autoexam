'use server'

import { isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient, getClaims } from '@/lib/supabase/server'

export type AuthState = { error?: string; ok?: string; email?: string; fullName?: string } | undefined

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NETWORK_ERROR = 'Không kết nối được máy chủ xác thực. Vui lòng thử lại sau.'
const EMAIL_TAKEN = 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.'
const RATE_LIMIT = 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.'
const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email hoặc mật khẩu không đúng.',
  user_already_exists: EMAIL_TAKEN,
  email_exists: EMAIL_TAKEN,
  email_not_confirmed: 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư (cả mục Spam).',
  weak_password: 'Mật khẩu quá yếu. Hãy dùng ít nhất 6 ký tự, kết hợp chữ và số.',
  email_address_invalid: 'Email không hợp lệ hoặc không được chấp nhận. Vui lòng dùng email khác.',
  email_address_not_authorized: 'Hệ thống chưa gửi được email tới địa chỉ này. Vui lòng dùng email khác.',
  over_email_send_rate_limit: RATE_LIMIT,
  over_request_rate_limit: RATE_LIMIT,
  signup_disabled: 'Hệ thống tạm thời không cho phép đăng ký tài khoản mới.',
  same_password: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  reauthentication_needed: 'Vui lòng đăng nhập lại trước khi đổi mật khẩu.',
  session_not_found: SESSION_EXPIRED,
  session_expired: SESSION_EXPIRED,
}

function authMessage(error: AuthError) {
  if (isAuthRetryableFetchError(error)) return NETWORK_ERROR
  return (error.code && AUTH_MESSAGES[error.code]) || 'Đã có lỗi xảy ra. Vui lòng thử lại.'
}

// createServerClient throws when Supabase env vars are missing.
async function getAuth() {
  try {
    return (await createClient()).auth
  } catch {
    return null
  }
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '').trim()

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = text(formData, 'full_name')
  const email = text(formData, 'email').toLowerCase()
  const password = String(formData.get('password') ?? '')
  const fail = (error: string) => ({ error, email, fullName })

  if (!fullName) return fail('Vui lòng nhập họ và tên.')
  if (fullName.length > 100) return fail('Họ và tên tối đa 100 ký tự.')
  if (!EMAIL_RE.test(email)) return fail('Email không hợp lệ.')
  if (password.length < 6) return fail('Mật khẩu phải có ít nhất 6 ký tự.')

  const auth = await getAuth()
  if (!auth) return fail(NETWORK_ERROR)

  const origin = (await headers()).get('origin') ?? process.env.SITE_URL
  const { data, error } = await auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
    },
  })
  if (error) return fail(authMessage(error))
  // With email confirmation on, Supabase returns an obfuscated user (no identities) for a taken email.
  if (data.user?.identities?.length === 0) return fail(EMAIL_TAKEN)

  revalidatePath('/', 'layout')
  if (data.session) redirect('/dashboard')
  redirect(
    '/login?message=' +
      encodeURIComponent('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản, sau đó đăng nhập.'),
  )
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, 'email').toLowerCase()
  const password = String(formData.get('password') ?? '')
  const fail = (error: string) => ({ error, email })

  if (!EMAIL_RE.test(email)) return fail('Email không hợp lệ.')
  if (!password) return fail('Vui lòng nhập mật khẩu.')

  const auth = await getAuth()
  if (!auth) return fail(NETWORK_ERROR)

  const { error } = await auth.signInWithPassword({ email, password })
  if (error) return fail(authMessage(error))

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

// Always the same answer, whether or not the email has an account (no user enumeration).
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, 'email').toLowerCase()
  if (!EMAIL_RE.test(email)) return { error: 'Email không hợp lệ.', email }

  const auth = await getAuth()
  if (!auth) return { error: NETWORK_ERROR, email }

  const origin = (await headers()).get('origin') ?? process.env.SITE_URL
  const { error } = await auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}/auth/confirm?next=${encodeURIComponent('/account?reset=1')}` : undefined,
  })
  if (error) return { error: authMessage(error), email }
  return {
    ok: 'Nếu email này đã đăng ký, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (cả mục Spam).',
  }
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password.length < 6) return { error: 'Mật khẩu phải có ít nhất 6 ký tự.' }
  if (password !== confirm) return { error: 'Mật khẩu nhập lại không khớp.' }

  if (!(await getClaims())) return { error: SESSION_EXPIRED }
  const auth = await getAuth()
  if (!auth) return { error: NETWORK_ERROR }

  const { error } = await auth.updateUser({ password })
  if (error) return { error: authMessage(error) }
  return { ok: 'Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.' }
}

export async function updateProfile(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = text(formData, 'full_name')
  if (!fullName) return { error: 'Vui lòng nhập họ và tên.', fullName }
  if (fullName.length > 100) return { error: 'Họ và tên tối đa 100 ký tự.', fullName }

  const claims = await getClaims()
  if (!claims) return { error: SESSION_EXPIRED, fullName }
  const supabase = await createClient()
  // RLS + column grant: users may only rename themselves
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', claims.sub)
    .select('id')
  if (error || !data?.length) {
    if (error) console.error('profiles update failed:', error.message)
    return { error: 'Không cập nhật được hồ sơ. Vui lòng thử lại.', fullName }
  }
  revalidatePath('/', 'layout')
  return { ok: 'Đã cập nhật họ và tên.', fullName }
}
