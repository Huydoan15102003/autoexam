import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DeleteQuestionButton, QuestionForm } from '@/components/questions/question-form'
import { KIND_LABEL, QUESTION_KINDS, practiceHref, type QuestionKind } from '@/lib/questions'
import { listQuestions } from '@/lib/questions-db'
import { getClaims } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Câu hỏi của tôi' }

const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'

export default async function QuestionsPage({ searchParams }: PageProps<'/questions'>) {
  if (!(await getClaims())) redirect('/login')
  const { kind } = await searchParams
  const defaultKind = QUESTION_KINDS.includes(kind as QuestionKind) ? (kind as QuestionKind) : 'read'
  const questions = await listQuestions(QUESTION_KINDS)

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Câu hỏi của tôi</h1>
      <p className="mt-1 mb-6 text-slate-600">
        Tự tạo đề để luyện nói hoặc luyện viết. Câu hỏi đã lưu sẽ xuất hiện trong mục “Câu hỏi của tôi” khi chọn đề.
      </p>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className={`${card} lg:col-span-2`}>
          <h2 className="mb-4 text-lg font-semibold">Tạo câu hỏi mới</h2>
          <QuestionForm defaultKind={defaultKind} />
        </section>

        <section className={`${card} lg:col-span-3`}>
          <h2 className="text-lg font-semibold">Đã lưu ({questions.length})</h2>
          {questions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Chưa có câu hỏi nào. Hãy tạo câu hỏi đầu tiên ở bên cạnh.</p>
          ) : (
            QUESTION_KINDS.map((k) => {
              const items = questions.filter((q) => q.kind === k)
              if (!items.length) return null
              return (
                <div key={k} className="mt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{KIND_LABEL[k]}</h3>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {items.map((q) => (
                      <li key={q.id} className="flex items-start gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{q.title}</p>
                          <p lang="en" className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-slate-600">
                            {q.content}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Link
                            href={practiceHref(q)}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
                          >
                            Luyện ngay
                          </Link>
                          <DeleteQuestionButton id={q.id} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
