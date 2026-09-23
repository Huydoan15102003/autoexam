'use client'

import { useActionState, useEffect, useState } from 'react'
import { deleteQuestion, saveQuestion } from '@/app/questions/actions'
import { CONTENT_MAX, KIND_LABEL, LEVELS, QUESTION_KINDS, TITLE_MAX, type BankQuestion, type QuestionKind } from '@/lib/questions'

const label = 'mb-1 block text-sm font-medium text-slate-700'
const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20'

const PLACEHOLDER: Record<QuestionKind, string> = {
  read: 'Dán đoạn văn tiếng Anh bạn muốn luyện đọc to…',
  topic: 'Ví dụ: Describe a book you recently read.\n- What is it about?\n- Why did you like it?',
  task1: 'Ví dụ: Your friend is visiting your city next month. Write an email to… You should write at least 120 words.',
  task2: 'Ví dụ: Some people think that… To what extent do you agree or disagree? You should write at least 250 words.',
}

// Create (no `question`) or edit the user's own question. Calls onSaved once the server confirms.
export function QuestionForm({
  question,
  defaultKind,
  onSaved,
  onCancel,
}: {
  question?: BankQuestion
  defaultKind: QuestionKind
  onSaved: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState(saveQuestion, undefined)
  const initialKind = state?.kind ?? question?.kind ?? defaultKind
  const [kind, setKind] = useState<QuestionKind>(initialKind)
  const [length, setLength] = useState((state?.content ?? question?.content ?? '').length)

  useEffect(() => {
    if (state?.ok) onSaved()
  }, [state, onSaved])

  return (
    <form action={formAction} className="space-y-4">
      {question && <input type="hidden" name="id" value={question.id} />}
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="q-kind" className={label}>
            Loại câu hỏi
          </label>
          <select
            id="q-kind"
            name="kind"
            defaultValue={initialKind}
            onChange={(e) => setKind(e.target.value as QuestionKind)}
            className={`${input} bg-white`}
          >
            {QUESTION_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="q-level" className={label}>
            Trình độ
          </label>
          <select
            id="q-level"
            name="level"
            defaultValue={state?.level ?? question?.level ?? ''}
            className={`${input} bg-white`}
          >
            <option value="">Không chọn</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="q-title" className={label}>
          Tiêu đề
        </label>
        <input
          id="q-title"
          name="title"
          required
          maxLength={TITLE_MAX}
          defaultValue={state?.title ?? question?.title}
          placeholder="Ví dụ: Đề thi thử số 1"
          className={input}
        />
      </div>
      <div>
        <label htmlFor="q-content" className={label}>
          Nội dung (tiếng Anh)
        </label>
        <textarea
          id="q-content"
          name="content"
          required
          rows={8}
          maxLength={CONTENT_MAX[kind]}
          defaultValue={state?.content ?? question?.content}
          onChange={(e) => setLength(e.target.value.length)}
          placeholder={PLACEHOLDER[kind]}
          className={`${input} leading-relaxed`}
          lang="en"
        />
        <p className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{kind === 'topic' ? 'Mỗi gợi ý một dòng, bắt đầu bằng “- ”.' : ' '}</span>
          <span className="tabular-nums">
            {length}/{CONTENT_MAX[kind]}
          </span>
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? 'Đang lưu…' : question ? 'Lưu thay đổi' : 'Tạo câu hỏi'}
        </button>
      </div>
    </form>
  )
}

export function DeleteQuestionButton({ id }: { id: string }) {
  return (
    <form
      action={deleteQuestion}
      onSubmit={(e) => {
        if (!window.confirm('Xóa câu hỏi này khỏi kho?')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        aria-label="Xóa câu hỏi"
      >
        Xóa
      </button>
    </form>
  )
}
