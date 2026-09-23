'use client'

import { useActionState, useState } from 'react'
import { createQuestion, deleteQuestion } from '@/app/questions/actions'
import { CONTENT_MAX, KIND_LABEL, QUESTION_KINDS, TITLE_MAX, type QuestionKind } from '@/lib/questions'

const label = 'mb-1 block text-sm font-medium text-slate-700'
const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20'

const PLACEHOLDER: Record<QuestionKind, string> = {
  read: 'Dán đoạn văn tiếng Anh bạn muốn luyện đọc to…',
  topic: 'Ví dụ: Describe a book you recently read. You should say what it is about and why you liked it.',
  task1: 'Ví dụ: Your friend is visiting your city next month. Write an email to… You should write at least 120 words.',
  task2: 'Ví dụ: Some people think that… To what extent do you agree or disagree? You should write at least 250 words.',
}

export function QuestionForm({ defaultKind }: { defaultKind: QuestionKind }) {
  const [state, formAction, pending] = useActionState(createQuestion, undefined)
  const [kind, setKind] = useState<QuestionKind>(state?.kind ?? defaultKind)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Đã lưu câu hỏi. Bạn có thể luyện ngay ở danh sách bên dưới.
        </p>
      )}
      <div>
        <label htmlFor="kind" className={label}>
          Loại câu hỏi
        </label>
        <select
          id="kind"
          name="kind"
          defaultValue={state?.kind ?? defaultKind}
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
        <label htmlFor="title" className={label}>
          Tiêu đề
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={TITLE_MAX}
          defaultValue={state?.title}
          placeholder="Ví dụ: Đề thi thử số 1"
          className={input}
        />
      </div>
      <div>
        <label htmlFor="content" className={label}>
          Nội dung (tiếng Anh)
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={6}
          maxLength={CONTENT_MAX[kind]}
          defaultValue={state?.content}
          placeholder={PLACEHOLDER[kind]}
          className={input}
          lang="en"
        />
        <p className="mt-1 text-xs text-slate-500">Tối đa {CONTENT_MAX[kind]} ký tự.</p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? 'Đang lưu…' : 'Lưu câu hỏi'}
      </button>
    </form>
  )
}

export function DeleteQuestionButton({ id }: { id: string }) {
  return (
    <form
      action={deleteQuestion}
      onSubmit={(e) => {
        if (!window.confirm('Xóa câu hỏi này?')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
        Xóa
      </button>
    </form>
  )
}
