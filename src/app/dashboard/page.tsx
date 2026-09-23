import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { AttemptHistory } from '@/components/speaking/attempt-history'
import { WritingHistory } from '@/components/writing/writing-history'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const fullName: string = profile?.full_name || user.user_metadata.full_name || ''
  const createdAt = new Date(user.created_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Xin chào, {fullName || 'bạn'}!</h1>
          <p className="mt-1 text-slate-600">Sẵn sàng luyện nói tiếng Anh hôm nay chưa?</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Đăng xuất
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
          <h2 className="text-lg font-semibold">Thông tin tài khoản</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Họ và tên</dt>
              <dd className="font-medium">{fullName || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="break-all font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Ngày tạo tài khoản</dt>
              <dd className="font-medium">{createdAt}</dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col justify-between gap-6 rounded-2xl bg-blue-700 p-6 text-white shadow-sm md:col-span-3">
          <div>
            <h2 className="text-xl font-semibold">Luyện nói & viết với AI</h2>
            <p className="mt-2 text-blue-100">
              Ghi âm câu trả lời để nhận điểm phát âm từ Azure, hoặc viết thư/bài luận VSTEP để GPT-5 mini chấm và sửa
              lỗi chỉ trong vài giây.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/practice" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-blue-800 hover:bg-blue-50">
              Bắt đầu luyện nói
            </Link>
            <Link
              href="/writing"
              className="rounded-lg border border-white/60 px-5 py-2.5 font-semibold text-white hover:bg-white/10"
            >
              Bắt đầu luyện viết
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Bài nói gần đây</h2>
            <Link href="/practice" className="text-sm font-medium text-blue-700 hover:underline">
              Xem tất cả
            </Link>
          </div>
          <div className="mt-4">
            <AttemptHistory limit={5} />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Bài viết gần đây</h2>
            <Link href="/writing" className="text-sm font-medium text-blue-700 hover:underline">
              Xem tất cả
            </Link>
          </div>
          <div className="mt-4">
            <WritingHistory limit={5} />
          </div>
        </section>
      </div>
    </main>
  )
}
