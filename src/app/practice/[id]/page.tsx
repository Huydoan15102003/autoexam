import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AssessmentResultView } from '@/components/speaking/assessment-result'
import { createClient } from '@/lib/supabase/server'
import type { AssessmentResult } from '@/lib/speaking/types'

export const metadata: Metadata = { title: 'Kết quả luyện nói' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!UUID.test(id)) notFound()

  // ponytail: RLS limits rows to the owner; a query error (e.g. table not migrated) also renders 404
  const { data: row } = await supabase
    .from('speaking_attempts')
    .select('mode, prompt, created_at, result')
    .eq('id', id)
    .maybeSingle()
  if (!row?.result) notFound()

  const result = row.result as AssessmentResult
  const date = new Date(row.created_at).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/practice" className="text-sm font-medium text-blue-700 hover:underline">
        ← Quay lại luyện nói
      </Link>

      <section className="mt-4 mb-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.mode === 'topic' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}
          >
            {row.mode === 'topic' ? 'Nói theo chủ đề' : 'Đọc to'}
          </span>
          <time dateTime={row.created_at}>{date}</time>
        </div>
        <h1 className="mt-3 text-sm font-semibold text-slate-700">{row.mode === 'topic' ? 'Câu hỏi' : 'Đoạn văn'}</h1>
        <p lang="en" className="mt-1 whitespace-pre-line text-lg leading-relaxed text-slate-800">
          {row.prompt}
        </p>
      </section>

      <AssessmentResultView result={result} />
    </main>
  )
}
