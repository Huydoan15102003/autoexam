import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { WritingHistory } from '@/components/writing/writing-history'
import { WritingPractice } from '@/components/writing/writing-practice'
import { listQuestions } from '@/lib/questions-db'
import { getClaims } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Luyện viết tiếng Anh' }

export default async function WritingPage({ searchParams }: PageProps<'/writing'>) {
  if (!(await getClaims())) redirect('/login')
  const [{ q }, saved] = await Promise.all([searchParams, listQuestions(['task1', 'task2'])])
  const initialId = typeof q === 'string' ? q : undefined // saved uuid or built-in slug, resolved by the picker

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Luyện viết tiếng Anh</h1>
      <p className="mt-1 mb-6 text-slate-600">
        Viết thư, bài luận theo dạng đề VSTEP và nhận điểm, nhận xét, sửa lỗi chi tiết ngay lập tức.
      </p>

      <WritingPractice saved={saved} initialId={initialId} key={initialId} />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Lịch sử bài viết</h2>
        <Suspense fallback={<p className="text-sm text-slate-500">Đang tải lịch sử…</p>}>
          <WritingHistory />
        </Suspense>
      </section>
    </main>
  )
}
