'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signUp } from '@/app/auth/actions'

const label = 'mb-1 block text-sm font-medium text-slate-700'
const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20'

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, undefined)

  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-slate-600">Bắt đầu luyện nói tiếng Anh cùng AutoExam.</p>

        {state?.error && (
          <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="full_name" className={label}>
              Họ và tên
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              defaultValue={state?.fullName}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="email" className={label}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state?.email}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="password" className={label}>
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              aria-describedby="password-hint"
              className={input}
            />
            <p id="password-hint" className="mt-1 text-xs text-slate-500">
              Tối thiểu 6 ký tự. Nên kết hợp chữ và số.
            </p>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-medium text-blue-700 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  )
}
