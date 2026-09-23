import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { WritingHistory } from '@/components/writing/writing-history'
import { WritingPractice } from '@/components/writing/writing-practice'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Luyện viết tiếng Anh' }

export default async function WritingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Luyện viết tiếng Anh</h1>
      <p className="mt-1 mb-6 text-slate-600">
        Viết thư, bài luận theo dạng đề VSTEP và nhận điểm, nhận xét, sửa lỗi chi tiết ngay lập tức.
      </p>

      <WritingPractice />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Lịch sử bài viết</h2>
        <WritingHistory />
      </section>
    </main>
  )
}
