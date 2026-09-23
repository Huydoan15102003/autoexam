import Link from 'next/link'
import { unstable_rethrow } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Row = { id: string; mode: string; prompt: string; overall_score: number; created_at: string }

const pill = (s: number) =>
  s >= 80 ? 'bg-emerald-50 text-emerald-700' : s >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'

export async function AttemptHistory({ limit = 10 }: { limit?: number }) {
  let rows: Row[]
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('speaking_attempts')
      .select('id, mode, prompt, overall_score, pronunciation_score, content_score, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    rows = data ?? []
  } catch (e) {
    unstable_rethrow(e) // keep Next's dynamic-rendering signal from cookies()
    return <p className="text-sm text-slate-500">Chưa thể tải lịch sử luyện tập lúc này.</p>
  }

  if (!rows.length)
    return (
      <p className="text-sm text-slate-600">
        Chưa có bài luyện nào.{' '}
        <Link href="/practice" className="font-medium text-blue-700 hover:underline">
          Hãy bắt đầu bài đầu tiên!
        </Link>
      </p>
    )

  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => {
        const score = Math.round(Number(r.overall_score) || 0)
        return (
          <li key={r.id}>
            <Link
              href={`/practice/${r.id}`}
              className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${r.mode === 'topic' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}
                  >
                    {r.mode === 'topic' ? 'Theo chủ đề' : 'Đọc to'}
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
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${pill(score)}`}>{score}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
