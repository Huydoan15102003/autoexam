import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { WritingResultView } from '@/components/writing/writing-result'
import { createClient, getClaims } from '@/lib/supabase/server'
import type { WritingResult } from '@/lib/writing/types'

export const metadata: Metadata = { title: 'Kết quả bài viết' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function WritingAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!(await getClaims())) redirect('/login')
  if (!UUID.test(id)) notFound()
  const supabase = await createClient()

  // ponytail: RLS limits rows to the owner; a query error (e.g. table not migrated) also renders 404
  const { data: row } = await supabase
    .from('writing_attempts')
    .select('task, created_at, result')
    .eq('id', id)
    .maybeSingle()
  if (!row?.result) notFound()

  const result = row.result as WritingResult
  const date = new Date(row.created_at).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/writing" className="text-sm font-medium text-blue-700 hover:underline">
        ← Quay lại luyện viết
      </Link>

      <div className="mt-4 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Kết quả bài viết</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.task === 'task2' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}
          >
            {row.task === 'task2' ? 'Task 2 — Bài luận' : 'Task 1 — Thư/Email'}
          </span>
          <time dateTime={row.created_at}>{date}</time>
        </div>
      </div>

      <WritingResultView result={result} />
    </main>
  )
}
