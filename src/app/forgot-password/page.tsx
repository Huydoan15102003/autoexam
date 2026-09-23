'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { requestPasswordReset } from '@/app/auth/actions'

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20'

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined)

  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-600">Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết để bạn đặt mật khẩu mới.</p>

        {state?.ok && (
          <p role="status" className="mt-6 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {state.ok}
          </p>
        )}
        {state?.error && (
          <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
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
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? 'Đang gửi…' : 'Gửi liên kết đặt lại mật khẩu'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Nhớ ra mật khẩu?{' '}
          <Link href="/login" className="font-medium text-blue-700 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  )
}
