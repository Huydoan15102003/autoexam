'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { WritingResultView } from '@/components/writing/writing-result'
import { savedId, type SavedQuestion } from '@/lib/questions'
import { TASK1_PROMPTS, TASK2_PROMPTS, type WritingPrompt } from '@/lib/writing/tasks'
import {
  EXPECTED_WORDS,
  WRITING_MAX_CHARS,
  WRITING_MIN_WORDS,
  WRITING_PROMPT_MAX_CHARS,
  type WritingAssessResponse,
  type WritingTask,
} from '@/lib/writing/types'

type Status = 'idle' | 'submitting' | 'done'
type Draft = { promptId: string; customPrompt: string; essay: string }

const CUSTOM = 'custom'
const PROMPTS: Record<WritingTask, WritingPrompt[]> = { task1: TASK1_PROMPTS, task2: TASK2_PROMPTS }
const MINUTES: Record<WritingTask, number> = { task1: 20, task2: 40 }

const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
const primary = 'rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60'
const secondary =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20'

// ponytail: whitespace split for the live counter; the server's wordCount is authoritative
const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length

const draftKey = (t: WritingTask) => `autoexam:writing-draft:${t}`
const emptyDraft = (t: WritingTask): Draft => ({ promptId: PROMPTS[t][0].id, customPrompt: '', essay: '' })

// `ids`: prompt ids still selectable for this task (built-in + saved); a draft pointing elsewhere falls back.
function loadDraft(t: WritingTask, ids: string[]): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(t)) ?? 'null')
    if (!d || typeof d !== 'object') return null
    const known = d.promptId === CUSTOM || ids.includes(d.promptId)
    return {
      promptId: known ? d.promptId : PROMPTS[t][0].id,
      customPrompt: typeof d.customPrompt === 'string' ? d.customPrompt.slice(0, WRITING_PROMPT_MAX_CHARS) : '',
      essay: typeof d.essay === 'string' ? d.essay.slice(0, WRITING_MAX_CHARS) : '',
    }
  } catch {
    return null
  }
}

function saveDraft(t: WritingTask, d: Draft | null) {
  try {
    if (d) localStorage.setItem(draftKey(t), JSON.stringify(d))
    else localStorage.removeItem(draftKey(t))
  } catch {
    // storage blocked or full: drafts are only a convenience
  }
}

const mineFor = (saved: SavedQuestion[], t: WritingTask): WritingPrompt[] =>
  saved.filter((q) => q.kind === t).map((q) => ({ id: savedId(q.id), title: q.title, prompt: q.content }))

// `saved`: the user's own task1/task2 questions. `initialId` (from ?q=) preselects a saved question (uuid)
// or a built-in prompt (slug) — both come from the question bank's "Luyện ngay".
export function WritingPractice({ saved, initialId }: { saved: SavedQuestion[]; initialId?: string }) {
  const router = useRouter()

  // frozen at mount: the draft restore below runs once against these
  const [boot] = useState(() => {
    const init = saved.find((q) => q.id === initialId)
    const builtin = (['task1', 'task2'] as const).find((t) => PROMPTS[t].some((p) => p.id === initialId))
    const task: WritingTask = init ? (init.kind === 'task2' ? 'task2' : 'task1') : (builtin ?? 'task1')
    const pick = init ? savedId(init.id) : builtin && initialId ? initialId : null
    const ids = (t: WritingTask) => [...PROMPTS[t], ...mineFor(saved, t)].map((p) => p.id)
    return { task, pick, ids: { task1: ids('task1'), task2: ids('task2') } }
  })
  const [task, setTask] = useState<WritingTask>(boot.task)
  const [drafts, setDrafts] = useState<Record<WritingTask, Draft>>(() => {
    const d = { task1: emptyDraft('task1'), task2: emptyDraft('task2') }
    if (boot.pick) d[boot.task].promptId = boot.pick
    return d
  })
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<{ message: string; login?: boolean } | null>(null)
  const [response, setResponse] = useState<WritingAssessResponse | null>(null)

  const draft = drafts[task]
  const isCustom = draft.promptId === CUSTOM
  const mine = mineFor(saved, task)
  const picked = [...PROMPTS[task], ...mine].find((p) => p.id === draft.promptId)
  const prompt = isCustom ? draft.customPrompt.trim() : (picked?.prompt ?? '')
  const words = countWords(draft.essay)
  const [min, max] = EXPECTED_WORDS[task]
  const busy = status === 'submitting'

  // restore drafts after mount: localStorage doesn't exist during SSR, reading it in render would break hydration
  useEffect(() => {
    const t1 = loadDraft('task1', boot.ids.task1)
    const t2 = loadDraft('task2', boot.ids.task2)
    // a ?q= link wins over the stored draft's prompt choice (the essay text is kept)
    if (boot.pick) {
      const t = boot.task === 'task1' ? t1 : t2
      if (t) t.promptId = boot.pick
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from an external store
    if (t1 || t2) setDrafts((d) => ({ task1: t1 ?? d.task1, task2: t2 ?? d.task2 }))
  }, [boot])

  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch }
    setDrafts({ ...drafts, [task]: next })
    saveDraft(task, next)
  }

  function reset() {
    setResponse(null)
    setError(null)
    setStatus('idle')
  }

  function again() {
    reset()
  }

  function switchTask(t: WritingTask) {
    if (t === task || busy) return
    setTask(t)
    again()
  }

  async function submit() {
    if (!prompt) {
      setError({ message: 'Hãy nhập đề bài.' })
      return
    }
    if (words < min && !window.confirm('Bài viết chưa đủ số từ khuyến nghị. Vẫn nộp?')) return
    const t = task
    setError(null)
    setStatus('submitting')

    try {
      const res = await fetch('/api/writing/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: t, prompt, essay: draft.essay }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.result) {
        setError({
          message: data?.error ?? `Có lỗi xảy ra (mã ${res.status}). Vui lòng thử lại.`,
          login: res.status === 401,
        })
        setStatus('idle')
        return
      }
      setResponse(data as WritingAssessResponse)
      setStatus('done')
      setDrafts((d) => ({ ...d, [t]: { ...d[t], essay: '' } }))
      saveDraft(t, null)
      router.refresh()
    } catch {
      setError({ message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.' })
      setStatus('idle')
    }
  }

  const wordTone = words < min ? 'text-amber-600' : words <= max ? 'text-emerald-600' : 'text-slate-500'

  return (
    <div className="space-y-4">
      <section className={card}>
        <div role="tablist" aria-label="Dạng bài" className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 sm:inline-grid">
          {(
            [
              ['task1', 'Task 1', 'Thư/Email'],
              ['task2', 'Task 2', 'Bài luận'],
            ] as const
          ).map(([t, label, sub]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={task === t}
              disabled={busy}
              onClick={() => switchTask(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${task === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {label}
              <span className="block text-xs font-normal opacity-80 sm:ml-1 sm:inline sm:text-sm">{sub}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {task === 'task1' ? 'Viết thư/email' : 'Viết bài luận'} {min}–{max} từ (khoảng {MINUTES[task]} phút). Chấm theo 4
          tiêu chí: Hoàn thành nhiệm vụ, Tổ chức bài, Từ vựng, Ngữ pháp — thang 0–10, quy đổi Bậc VSTEP.
        </p>

        <div className="mt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor="prompt-id" className="text-sm font-medium text-slate-700">
              Chọn đề bài
            </label>
            <span className="flex gap-3 text-sm font-medium">
              <Link href={`/questions?kind=${task}`} className="text-blue-700 hover:underline">
                Kho câu hỏi
              </Link>
              <Link href={`/questions?create=${task}`} className="text-blue-700 hover:underline">
                + Tạo mới
              </Link>
              {draft.promptId !== CUSTOM && (
                <Link
                  href={`/questions?edit=${encodeURIComponent(draft.promptId.replace(/^q:/, ''))}`}
                  className="text-blue-700 hover:underline"
                >
                  Sửa câu này
                </Link>
              )}
            </span>
          </div>
          <select
            id="prompt-id"
            className={`${input} mt-1 bg-white`}
            value={draft.promptId}
            disabled={busy}
            onChange={(e) => {
              update({ promptId: e.target.value })
              reset()
            }}
          >
            <optgroup label="Đề mẫu">
              {PROMPTS[task].map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </optgroup>
            {mine.length > 0 && (
              <optgroup label="Câu hỏi của tôi">
                {mine.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </optgroup>
            )}
            <option value={CUSTOM}>Tự nhập (không lưu)…</option>
          </select>
        </div>

        {isCustom ? (
          <div className="mt-4">
            <label htmlFor="custom-prompt" className="text-sm font-medium text-slate-700">
              Đề bài (tiếng Anh)
            </label>
            <textarea
              id="custom-prompt"
              rows={5}
              maxLength={WRITING_PROMPT_MAX_CHARS}
              disabled={busy}
              value={draft.customPrompt}
              onChange={(e) => update({ customPrompt: e.target.value })}
              placeholder={
                task === 'task1'
                  ? 'Dán đề thư/email, ví dụ: Write an email to your friend to…'
                  : 'Dán đề bài luận, ví dụ: Some people think that… To what extent do you agree or disagree?'
              }
              className={`${input} mt-1`}
              lang="en"
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {draft.customPrompt.length}/{WRITING_PROMPT_MAX_CHARS}
            </p>
          </div>
        ) : (
          picked && (
            <div className="mt-4 rounded-xl bg-blue-50 p-5">
              <p lang="en" className="whitespace-pre-line leading-relaxed text-slate-800">
                {picked.prompt}
              </p>
            </div>
          )
        )}
      </section>

      {status === 'done' && response ? (
        <>
          <WritingResultView result={response.result} />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={again} className={primary}>
              Luyện tiếp
            </button>
            {response.id && (
              <Link href={`/writing/${response.id}`} className={secondary}>
                Xem chi tiết
              </Link>
            )}
          </div>
        </>
      ) : (
        <section className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor="essay" className="text-lg font-semibold">
              Bài viết
            </label>
            <span className={`text-sm font-medium tabular-nums ${wordTone}`}>
              {words} / {min}–{max} từ
            </span>
          </div>
          <textarea
            id="essay"
            rows={16}
            maxLength={WRITING_MAX_CHARS}
            disabled={busy}
            value={draft.essay}
            onChange={(e) => update({ essay: e.target.value })}
            placeholder="Viết bài của bạn bằng tiếng Anh…"
            className={`${input} mt-3 leading-relaxed`}
            lang="en"
            spellCheck={false}
            autoCorrect="off"
          />
          <p className="mt-1 text-xs text-slate-500">Bản nháp được tự động lưu trên trình duyệt này.</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={submit} disabled={busy || words < WRITING_MIN_WORDS} className={primary}>
              Nộp bài chấm điểm
            </button>
            {words < WRITING_MIN_WORDS && (
              <span className="text-sm text-slate-500">Cần ít nhất {WRITING_MIN_WORDS} từ để nộp bài.</span>
            )}
          </div>

          {busy && (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 flex items-center justify-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800"
            >
              <span
                className="size-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700"
                aria-hidden
              />
              <span>
                Đang chấm bài viết…
                <span className="block text-xs text-blue-700/80">Quá trình này có thể mất 10–40 giây.</span>
              </span>
            </div>
          )}
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
          {error.login && (
            <>
              {' '}
              <Link href="/login" className="font-medium underline">
                Đăng nhập
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
