import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { MobileMenu } from '@/components/mobile-menu'
import { getUserEmail } from '@/lib/supabase/server'

const primary = 'rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 sm:px-4'
const secondary =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-slate-50 sm:px-4'
const NAV = [
  ['/practice', 'Luyện nói'],
  ['/writing', 'Luyện viết'],
  ['/questions', 'Kho câu hỏi'],
] as const
const menuItem = 'block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-100'

export async function SiteHeader() {
  const email = await getUserEmail()

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <div className="mr-auto min-w-0">
          <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
            Auto<span className="text-blue-700">Exam</span>
          </Link>
          {/* Below lg the email sits under the logo so it stays visible without the menu */}
          {email && (
            <Link href="/account" className="block truncate text-xs text-slate-500 hover:text-blue-700 lg:hidden">
              {email}
            </Link>
          )}
        </div>

        {email ? (
          <>
            <nav className="hidden items-center gap-4 lg:flex">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="text-sm font-medium text-slate-700 hover:text-blue-700">
                  {label}
                </Link>
              ))}
            </nav>
            <Link href="/dashboard" className={primary}>
              Dashboard
            </Link>
            <Link
              href="/account"
              className="hidden max-w-56 truncate text-sm text-slate-500 hover:text-blue-700 lg:block"
              title={`${email} — Tài khoản`}
            >
              {email}
            </Link>
            <form action={signOut} className="hidden lg:block">
              <button type="submit" className={secondary}>
                Đăng xuất
              </button>
            </form>
            <MobileMenu>
              <nav>
                {NAV.map(([href, label]) => (
                  <Link key={href} href={href} className={`${menuItem} text-slate-700`}>
                    {label}
                  </Link>
                ))}
                <Link href="/account" className={`${menuItem} text-slate-700`}>
                  Tài khoản
                </Link>
              </nav>
              <form action={signOut} className="mt-1 border-t border-slate-100 pt-1">
                <button type="submit" className={`${menuItem} text-red-700`}>
                  Đăng xuất
                </button>
              </form>
            </MobileMenu>
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
