'use client'

import Link from 'next/link'
import { use, useActionState } from 'react'
import { signIn } from '@/app/auth/actions'

const label = 'mb-1 block text-sm font-medium text-slate-700'
const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const { message, error } = use(searchParams)
  const [state, formAction, pending] = useActionState(signIn, undefined)
  const errorText = state?.error ?? error

  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-600">Chào mừng bạn quay lại AutoExam.</p>

        {message && !errorText && (
          <p role="status" className="mt-6 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {message}
          </p>
        )}
        {errorText && (
          <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorText}
          </p>
        )}

        <form action={formAction} className="mt-6 space-y-4">
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
              autoComplete="current-password"
              required
              className={input}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Chưa có tài khoản?{' '}
          <Link href="/signup" className="font-medium text-blue-700 hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </main>
  )
}
