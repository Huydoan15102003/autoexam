import Link from 'next/link'
import { unstable_rethrow } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Row = { id: string; task: string; prompt: string; overall_score: number; created_at: string }

const pill = (s: number) =>
  s >= 8 ? 'bg-emerald-50 text-emerald-700' : s >= 6 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'

export async function WritingHistory({ limit = 10 }: { limit?: number }) {
  let rows: Row[]
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('writing_attempts')
      .select('id, task, prompt, overall_score, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    rows = data ?? []
  } catch (e) {
    unstable_rethrow(e) // keep Next's dynamic-rendering signal from cookies()
    return <p className="text-sm text-slate-500">Chưa thể tải lịch sử bài viết lúc này.</p>
  }

  if (!rows.length)
    return (
      <p className="text-sm text-slate-600">
        Chưa có bài viết nào.{' '}
        <Link href="/writing" className="font-medium text-blue-700 hover:underline">
          Hãy viết bài đầu tiên!
        </Link>
      </p>
    )

  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => {
        const score = Number(r.overall_score) || 0
        return (
          <li key={r.id}>
            <Link
              href={`/writing/${r.id}`}
              className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${r.task === 'task2' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}
                  >
                    {r.task === 'task2' ? 'Task 2' : 'Task 1'}
                  </span>
                  <time dateTime={r.created_at}>
                    {new Date(r.created_at).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </time>
                </div>
                <p className="mt-1 truncate text-sm text-slate-800">{r.prompt}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${pill(score)}`}>
                {score.toFixed(1)}/10
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
