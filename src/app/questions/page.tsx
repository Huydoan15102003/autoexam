import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { QuestionBank } from '@/components/questions/question-bank'
import { QUESTION_KINDS, SAMPLE_QUESTIONS, toBank, type QuestionKind } from '@/lib/questions'
import { listQuestions } from '@/lib/questions-db'
import { getClaims } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Kho câu hỏi' }

const asKind = (v: unknown) => (QUESTION_KINDS.includes(v as QuestionKind) ? (v as QuestionKind) : undefined)

export default async function QuestionsPage({ searchParams }: PageProps<'/questions'>) {
  if (!(await getClaims())) redirect('/login')
  const [{ kind, create, edit }, mine] = await Promise.all([searchParams, listQuestions(QUESTION_KINDS)])

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <QuestionBank
        questions={[...mine.map(toBank), ...SAMPLE_QUESTIONS]}
        initialKind={asKind(kind) ?? 'all'}
        createKind={asKind(create)}
        editId={typeof edit === 'string' ? edit : undefined}
      />
    </main>
  )
}
