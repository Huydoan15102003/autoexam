import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AttemptHistory } from '@/components/speaking/attempt-history'
import { SpeakingPractice } from '@/components/speaking/speaking-practice'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Luyện nói tiếng Anh' }

export default async function PracticePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Luyện nói tiếng Anh</h1>
      <p className="mt-1 mb-6 text-slate-600">Ghi âm câu trả lời và nhận điểm phát âm, nội dung ngay lập tức.</p>

      <SpeakingPractice />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Lịch sử luyện tập</h2>
        <AttemptHistory />
      </section>
    </main>
  )
}
