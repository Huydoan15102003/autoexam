'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { DeleteQuestionButton, QuestionForm } from '@/components/questions/question-form'
import {
  KIND_LABEL,
  KIND_SHORT,
  LEVELS,
  QUESTION_KINDS,
  isSpeaking,
  practiceHref,
  type BankQuestion,
  type Level,
  type QuestionKind,
} from '@/lib/questions'

type Source = 'all' | 'sample' | 'mine'
type Editing = { kind: QuestionKind; question?: BankQuestion } | null

const KIND_STYLE: Record<QuestionKind, string> = {
  read: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  topic: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  task1: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  task2: 'bg-amber-50 text-amber-800 ring-amber-600/20',
}

const primarySm = 'rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800'
const ghostSm = 'rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
const control =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20'

// accent- and case-insensitive search ("de thi" finds "Đề thi")
const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length

function KindIcon({ kind }: { kind: QuestionKind }) {
  return isSpeaking(kind) ? (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A7 7 0 0 0 19 11Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
      <path d="M16.86 3.49a2.5 2.5 0 0 1 3.54 3.54l-11.2 11.2a2 2 0 0 1-.92.52l-3.66.92a.75.75 0 0 1-.91-.91l.92-3.66a2 2 0 0 1 .52-.92l11.7-11.7Z" />
    </svg>
  )
}

function Badges({ q }: { q: BankQuestion }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${KIND_STYLE[q.kind]}`}
      >
        <KindIcon kind={q.kind} />
        {KIND_SHORT[q.kind]}
      </span>
      {q.level && (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{q.level}</span>
      )}
      <span
        className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${q.source === 'mine' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
      >
        {q.source === 'mine' ? 'Của tôi' : 'Đề mẫu'}
      </span>
    </div>
  )
}

// Native <dialog>: focus trap, Esc to close and a backdrop for free.
function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // click on the backdrop
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50"
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <button type="button" onClick={onClose} className={ghostSm} aria-label="Đóng">
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function QuestionBank({
  questions,
  initialKind,
  createKind,
  editId,
}: {
  questions: BankQuestion[] // the user's own first (newest first), then the samples
  initialKind: QuestionKind | 'all'
  createKind?: QuestionKind // from ?create=<kind>: open the create dialog on arrival
  editId?: string // from ?edit=<id>: open that question in the editor on arrival
}) {
  const [kind, setKind] = useState<QuestionKind | 'all'>(initialKind)
  const [source, setSource] = useState<Source>('all')
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<BankQuestion | null>(null)
  const [editing, setEditing] = useState<Editing>(() => {
    if (createKind) return { kind: createKind }
    const q = editId ? questions.find((x) => x.id === editId) : undefined
    return q ? { kind: q.kind, question: q } : null
  })

  // drop ?create= / ?edit= so a reload doesn't reopen the dialog
  useEffect(() => {
    if (!createKind && !editId) return
    const url = new URL(window.location.href)
    url.searchParams.delete('create')
    url.searchParams.delete('edit')
    window.history.replaceState(null, '', url)
  }, [createKind, editId])

  const closeEditor = useCallback(() => setEditing(null), [])

  const counts = useMemo(() => {
    const c = { all: questions.length, read: 0, topic: 0, task1: 0, task2: 0 }
    for (const q of questions) c[q.kind]++
    return c
  }, [questions])
  const mineCount = questions.filter((q) => q.source === 'mine').length

  const shown = useMemo(() => {
    const needle = norm(search.trim())
    return questions.filter(
      (q) =>
        (kind === 'all' || q.kind === kind) &&
        (source === 'all' || q.source === source) &&
        (level === 'all' || q.level === level) &&
        (!needle || norm(`${q.title}\n${q.content}`).includes(needle)),
    )
  }, [questions, kind, source, level, search])

  const filtered = kind !== 'all' || source !== 'all' || level !== 'all' || search.trim() !== ''
  const clearFilters = () => {
    setKind('all')
    setSource('all')
    setLevel('all')
    setSearch('')
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kho câu hỏi</h1>
          <p className="mt-1 text-slate-600">
            {questions.length - mineCount} đề mẫu · {mineCount} câu hỏi của bạn — chọn một câu để luyện nói hoặc luyện viết.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ kind: kind === 'all' ? 'read' : kind })}
          className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-800"
        >
          + Tạo câu hỏi
        </button>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <label className="relative col-span-2 flex-1">
            <span className="sr-only">Tìm kiếm câu hỏi</span>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc nội dung…"
              className={`${control} w-full pl-9`}
            />
          </label>
          <select
            aria-label="Nguồn"
            value={source}
            onChange={(e) => setSource(e.target.value as Source)}
            className={control}
          >
            <option value="all">Mọi nguồn</option>
            <option value="sample">Đề mẫu</option>
            <option value="mine">Của tôi</option>
          </select>
          <select
            aria-label="Trình độ"
            value={level}
            onChange={(e) => setLevel(e.target.value as Level | 'all')}
            className={control}
          >
            <option value="all">Mọi trình độ</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div role="tablist" aria-label="Loại câu hỏi" className="mt-3 flex flex-wrap gap-1">
          {(['all', ...QUESTION_KINDS] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${kind === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {k === 'all' ? 'Tất cả' : KIND_SHORT[k]}
              <span className={`ml-1.5 tabular-nums ${kind === k ? 'text-slate-300' : 'text-slate-400'}`}>
                {counts[k]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500" aria-live="polite">
        <span>Hiển thị {shown.length} câu hỏi</span>
        {filtered && (
          <button type="button" onClick={clearFilters} className="font-medium text-blue-700 hover:underline">
            Xóa bộ lọc
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-slate-800">Không có câu hỏi phù hợp</p>
          <p className="mt-1 text-sm text-slate-500">
            {source === 'mine' && mineCount === 0
              ? 'Bạn chưa tạo câu hỏi nào.'
              : 'Thử đổi từ khóa hoặc bộ lọc.'}
          </p>
          <button
            type="button"
            onClick={() => setEditing({ kind: kind === 'all' ? 'read' : kind })}
            className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Tạo câu hỏi mới
          </button>
        </div>
      ) : (
        <ul className="mt-3 grid gap-4 md:grid-cols-2">
          {shown.map((q) => (
            <li
              key={`${q.source}:${q.id}`}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <Badges q={q} />
              <button type="button" onClick={() => setViewing(q)} className="mt-3 mb-4 text-left">
                <h3 className="line-clamp-2 font-semibold text-slate-900 hover:text-blue-700">{q.title}</h3>
                <p lang="en" className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {q.content}
                </p>
              </button>
              <div className="mt-auto flex items-center gap-1 border-t border-slate-100 pt-3">
                <span className="mr-auto text-xs text-slate-400 tabular-nums">{wordCount(q.content)} từ</span>
                <button type="button" onClick={() => setViewing(q)} className={ghostSm}>
                  Xem
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({ kind: q.kind, question: q })}
                  className={ghostSm}
                  title={q.source === 'sample' ? 'Sửa và lưu thành câu hỏi của bạn' : undefined}
                >
                  Sửa
                </button>
                {q.source === 'mine' && <DeleteQuestionButton id={q.id} />}
                <Link href={practiceHref(q)} className={primarySm}>
                  Luyện ngay
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={viewing !== null} title={viewing?.title ?? ''} onClose={() => setViewing(null)}>
        {viewing && (
          <>
            <Badges q={viewing} />
            <p className="mt-2 text-xs text-slate-500">{KIND_LABEL[viewing.kind]}</p>
            <div
              lang="en"
              className="mt-4 whitespace-pre-line rounded-xl bg-slate-50 p-4 leading-relaxed text-slate-800"
            >
              {viewing.content}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <span className="mr-auto text-xs text-slate-400 tabular-nums">{wordCount(viewing.content)} từ</span>
              <button
                type="button"
                onClick={() => {
                  setEditing({ kind: viewing.kind, question: viewing })
                  setViewing(null)
                }}
                className={ghostSm}
              >
                Sửa
              </button>
              <Link href={practiceHref(viewing)} className={primarySm}>
                Luyện ngay
              </Link>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={editing !== null}
        title={
          editing?.question ? (editing.question.source === 'sample' ? 'Sửa đề mẫu' : 'Sửa câu hỏi') : 'Tạo câu hỏi mới'
        }
        onClose={closeEditor}
      >
        {editing && (
          <QuestionForm
            key={editing.question ? `${editing.question.source}:${editing.question.id}` : 'new'}
            question={editing.question}
            defaultKind={editing.kind}
            onSaved={closeEditor}
            onCancel={closeEditor}
          />
        )}
      </Modal>
    </>
  )
}
