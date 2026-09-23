import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AttemptHistory } from '@/components/speaking/attempt-history'
import { SpeakingPractice } from '@/components/speaking/speaking-practice'
import { listQuestions } from '@/lib/questions-db'
import { getClaims } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Luyện nói tiếng Anh' }

export default async function PracticePage({ searchParams }: PageProps<'/practice'>) {
  if (!(await getClaims())) redirect('/login')
  const [{ q }, saved] = await Promise.all([searchParams, listQuestions(['read', 'topic'])])
  const initial = saved.find((s) => s.id === q)

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Luyện nói tiếng Anh</h1>
      <p className="mt-1 mb-6 text-slate-600">Ghi âm câu trả lời và nhận điểm phát âm, nội dung ngay lập tức.</p>

      <SpeakingPractice saved={saved} initialId={initial?.id} key={initial?.id} />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Lịch sử luyện tập</h2>
        <Suspense fallback={<p className="text-sm text-slate-500">Đang tải lịch sử…</p>}>
          <AttemptHistory />
        </Suspense>
      </section>
    </main>
  )
}
