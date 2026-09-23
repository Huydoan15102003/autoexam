import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { getUserEmail } from '@/lib/supabase/server'

const primary = 'rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 sm:px-4 sm:py-2'
const secondary =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:px-4 sm:py-2'

export async function SiteHeader() {
  const email = await getUserEmail()

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-auto text-lg font-bold tracking-tight text-slate-900">
          Auto<span className="text-blue-700">Exam</span>
        </Link>

        {email ? (
          <>
            <Link href="/practice" className="px-1 text-sm font-medium text-slate-700 hover:text-blue-700">
              Luyện nói
            </Link>
            <Link href="/writing" className="px-1 text-sm font-medium text-slate-700 hover:text-blue-700">
              Luyện viết
            </Link>
            <Link href="/questions" className="px-1 text-sm font-medium text-slate-700 hover:text-blue-700">
              Câu hỏi
            </Link>
            <Link href="/dashboard" className={primary}>
              Dashboard
            </Link>
            <div className="flex w-full min-w-0 items-center justify-between gap-3 border-t border-slate-100 pt-2 sm:w-auto sm:border-0 sm:pt-0">
              <span className="min-w-0 truncate text-sm text-slate-500 sm:max-w-56" title={email}>
                {email}
              </span>
              <form action={signOut}>
                <button type="submit" className={secondary}>
                  Đăng xuất
                </button>
              </form>
            </div>
          </>
        ) : (
          <nav className="flex items-center gap-2">
            <Link href="/login" className={secondary}>
              Đăng nhập
            </Link>
            <Link href="/signup" className={primary}>
              Đăng ký
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
