'use client'

import { useActionState } from 'react'
import { updatePassword, updateProfile } from '@/app/auth/actions'

const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
const label = 'mb-1 block text-sm font-medium text-slate-700'
const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20'
const primary = 'rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60'

function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (error)
    return (
      <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    )
  if (ok)
    return (
      <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
        {ok}
      </p>
    )
  return null
}

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined)
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">Hồ sơ</h2>
      <p className="mt-1 mb-4 text-sm text-slate-600">Họ tên hiển thị trên Dashboard.</p>
      <Notice ok={state?.ok} error={state?.error} />
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="full_name" className={label}>
            Họ và tên
          </label>
          <input
            id="full_name"
            name="full_name"
            autoComplete="name"
            required
            maxLength={100}
            defaultValue={state?.fullName ?? fullName}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Email
          </label>
          <input id="email" value={email} readOnly disabled className={`${input} bg-slate-50 text-slate-500`} />
          <p className="mt-1 text-xs text-slate-500">Email dùng để đăng nhập, không thể thay đổi.</p>
        </div>
        <button type="submit" disabled={pending} className={primary}>
          {pending ? 'Đang lưu…' : 'Lưu hồ sơ'}
        </button>
      </form>
    </section>
  )
}

export function PasswordForm({ reset }: { reset: boolean }) {
  const [state, formAction, pending] = useActionState(updatePassword, undefined)
  return (
    <section className={`${card} ${reset ? 'ring-2 ring-blue-600' : ''}`} id="password">
      <h2 className="text-lg font-semibold">{reset ? 'Đặt mật khẩu mới' : 'Đổi mật khẩu'}</h2>
      <p className="mt-1 mb-4 text-sm text-slate-600">
        {reset
          ? 'Bạn đã mở liên kết đặt lại mật khẩu. Hãy nhập mật khẩu mới cho tài khoản.'
          : 'Tối thiểu 6 ký tự. Nên kết hợp chữ và số.'}
      </p>
      <Notice ok={state?.ok} error={state?.error} />
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className={label}>
            Mật khẩu mới
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            autoFocus={reset}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="confirm" className={label}>
            Nhập lại mật khẩu mới
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className={input}
          />
        </div>
        <button type="submit" disabled={pending} className={primary}>
          {pending ? 'Đang lưu…' : 'Đổi mật khẩu'}
        </button>
      </form>
    </section>
  )
}
