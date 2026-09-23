'use client'

import { useId, useState } from 'react'
import { Bar, Ring } from '@/components/speaking/assessment-result'
import {
  CRITERIA,
  EXPECTED_WORDS,
  type Criterion,
  type ErrorCategory,
  type WritingError,
  type WritingResult,
} from '@/lib/writing/types'

const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
const banner = 'mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800'

const CRITERION_LABEL: Record<Criterion, string> = {
  task_fulfilment: 'Hoàn thành nhiệm vụ',
  organization: 'Tổ chức bài',
  vocabulary: 'Từ vựng',
  grammar: 'Ngữ pháp',
}

const FEEDBACK = [
  ['strengths', 'Điểm mạnh', 'bg-emerald-50 text-emerald-900', 'text-emerald-800'],
  ['weaknesses', 'Điểm yếu', 'bg-amber-50 text-amber-900', 'text-amber-800'],
  ['suggestions', 'Gợi ý cải thiện', 'bg-blue-50 text-blue-900', 'text-blue-800'],
] as const

const CATEGORY: Record<ErrorCategory, { label: string; mark: string; pill: string }> = {
  grammar: { label: 'Ngữ pháp', mark: 'decoration-red-500', pill: 'bg-red-50 text-red-700' },
  vocabulary: { label: 'Từ vựng', mark: 'decoration-amber-500', pill: 'bg-amber-50 text-amber-700' },
  spelling: { label: 'Chính tả', mark: 'decoration-purple-500', pill: 'bg-purple-50 text-purple-700' },
  punctuation: { label: 'Dấu câu', mark: 'decoration-sky-500', pill: 'bg-sky-50 text-sky-700' },
}
const cat = (c: ErrorCategory) => CATEGORY[c] ?? CATEGORY.grammar // tolerate unexpected values in stored rows

const fmt = (s: number) => (Number(s) || 0).toFixed(1)

type Segment = { text: string; err: number | null }

// Split the essay into plain text and error spans (index into errors). Skips spans that are
// unlocated, out of bounds or overlap an earlier one.
function segments(essay: string, errors: WritingError[]): Segment[] {
  const spans = errors
    .map((e, i) => ({ i, start: e.start ?? -1, end: e.end ?? -1 }))
    .filter((s) => Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 0 && s.end > s.start && s.end <= essay.length)
    .sort((a, b) => a.start - b.start)
  const out: Segment[] = []
  let pos = 0
  for (const s of spans) {
    if (s.start < pos) continue
    if (s.start > pos) out.push({ text: essay.slice(pos, s.start), err: null })
    out.push({ text: essay.slice(s.start, s.end), err: s.i })
    pos = s.end
  }
  if (pos < essay.length) out.push({ text: essay.slice(pos), err: null })
  return out
}

function ErrorInfo({ e }: { e: WritingError }) {
  const c = cat(e.category)
  return (
    <>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.pill}`}>{c.label}</span>
      <span className="mt-1 block" lang="en">
        <del className="text-red-600">{e.example}</del> <span aria-hidden>→</span>{' '}
        <ins className="font-semibold text-emerald-700 no-underline">{e.suggestion}</ins>
      </span>
      <span className="mt-0.5 block text-sm text-slate-600">{e.explanation}</span>
    </>
  )
}

export function WritingResultView({ result }: { result: WritingResult }) {
  const uid = useId()
  const [selected, setSelected] = useState<number | null>(null)

  const errors = result.errors ?? []
  const segs = segments(result.essay ?? '', errors)
  const located = new Set(segs.flatMap((s) => (s.err === null ? [] : [s.err])))
  const sel = selected === null ? null : errors[selected]
  const [min, max] = EXPECTED_WORDS[result.task] ?? EXPECTED_WORDS.task2
  const p = result.proficiency

  function focusError(i: number) {
    setSelected(i)
    document.getElementById(`${uid}-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="space-y-4">
      <details className={card}>
        <summary className="cursor-pointer font-semibold">
          Đề bài · {result.task === 'task1' ? 'Task 1 — Thư/Email' : 'Task 2 — Bài luận'}
        </summary>
        <p lang="en" className="mt-3 whitespace-pre-line leading-relaxed text-slate-800">
          {result.prompt}
        </p>
      </details>

      <section className={card}>
        <h2 className="text-lg font-semibold">Kết quả</h2>
        {result.isOffTopic && (
          <p role="alert" className={banner}>
            ⚠ Bài viết chưa đúng chủ đề / có dấu hiệu học thuộc — điểm bị giới hạn
          </p>
        )}
        {result.missingStructure && (
          <p role="alert" className={banner}>
            ⚠ {result.task === 'task1' ? 'Thiếu phần mở đầu/kết thư' : 'Thiếu thân bài'}
          </p>
        )}
        {result.adjustments?.map((note) => (
          <p key={note} className={banner}>
            ⚠ {note}
          </p>
        ))}
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <Ring score={result.overall} max={10} label="Tổng điểm" size={128} />
            <span
              className={`rounded-full px-3 py-0.5 text-sm font-semibold ${p?.certified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
            >
              {[p?.level, p?.cefr].filter(Boolean).join(' · ') || 'Dưới Bậc 3'}
            </span>
            <span className="text-sm text-slate-500">
              {result.wordCount} từ (khuyến nghị {min}–{max})
            </span>
          </div>
          <div className="grid w-full flex-1 gap-4 sm:grid-cols-2">
            {CRITERIA.map((c) => (
              <Bar key={c} score={result.scores?.[c]} max={10} label={CRITERION_LABEL[c]} />
            ))}
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Nhận xét chi tiết</h2>
        <div className="mt-4 space-y-6">
          {CRITERIA.map((c) => (
            <div key={c}>
              <h3 className="font-semibold text-slate-800">
                {CRITERION_LABEL[c]}{' '}
                <span className="text-sm font-normal text-slate-500">· {fmt(result.scores?.[c])}/10</span>
              </h3>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {FEEDBACK.map(([key, label, box, head]) => (
                  <div key={key} className={`rounded-xl p-4 ${box}`}>
                    <h4 className={`text-sm font-semibold ${head}`}>{label}</h4>
                    <p className="mt-1 whitespace-pre-line text-sm">{result.feedback?.[c]?.[key] || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Bài viết của bạn</h2>
        {located.size > 0 && (
          <>
            <p className="mt-1 text-sm text-slate-500">Bấm vào phần được gạch chân để xem lỗi và gợi ý sửa.</p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {Object.values(CATEGORY).map((c) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  <span className={`underline decoration-2 underline-offset-4 ${c.mark}`}>abc</span> {c.label}
                </li>
              ))}
            </ul>
          </>
        )}

        <div lang="en" className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 leading-8 text-slate-800">
          {segs.map(({ text, err }, k) =>
            err === null ? (
              <span key={k}>{text}</span>
            ) : (
              <button
                key={k}
                id={`${uid}-${err}`}
                type="button"
                onClick={() => setSelected(selected === err ? null : err)}
                aria-pressed={selected === err}
                aria-label={`${text} — lỗi ${cat(errors[err].category).label}`}
                className={`inline whitespace-pre-wrap rounded-sm underline decoration-2 underline-offset-4 hover:bg-yellow-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${cat(errors[err].category).mark} ${selected === err ? 'bg-yellow-100 ring-2 ring-blue-600' : ''}`}
              >
                {text}
              </button>
            ),
          )}
        </div>

        {sel && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
            <ErrorInfo e={sel} />
          </div>
        )}

        <h3 className="mt-6 font-semibold">Danh sách lỗi ({errors.length})</h3>
        {errors.length ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {errors.map((e, i) => (
              <li key={i}>
                {located.has(i) ? (
                  <button
                    type="button"
                    onClick={() => focusError(i)}
                    className={`-mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${selected === i ? 'bg-blue-50' : ''}`}
                  >
                    <ErrorInfo e={e} />
                  </button>
                ) : (
                  <div className="py-3">
                    <ErrorInfo e={e} />
                    <span className="mt-0.5 block text-xs text-slate-400">Không xác định được vị trí trong bài.</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Không phát hiện lỗi nào.</p>
        )}
      </section>
    </div>
  )
}
