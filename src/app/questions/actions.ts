'use server'

import { revalidatePath } from 'next/cache'
import { CONTENT_MAX, QUESTION_KINDS, TITLE_MAX, type QuestionKind } from '@/lib/questions'
import { createClient, getClaims } from '@/lib/supabase/server'

// Entered values come back on error so the form (reset by React after every action) keeps them; on success only `kind`.
export type QuestionState = { error?: string; ok?: boolean; kind?: QuestionKind; title?: string; content?: string } | undefined

// ponytail: flat per-user cap against row spam; paginate the list if real users ever need more.
const MAX_QUESTIONS = 200
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function refresh() {
  revalidatePath('/questions')
  revalidatePath('/practice')
  revalidatePath('/writing')
}

export async function createQuestion(_prev: QuestionState, formData: FormData): Promise<QuestionState> {
  const kind = String(formData.get('kind') ?? '') as QuestionKind
  const title = String(formData.get('title') ?? '').trim()
  const content = String(formData.get('content') ?? '').trim()

  if (!QUESTION_KINDS.includes(kind)) return { error: 'Loại câu hỏi không hợp lệ.' }
  const fail = (error: string): QuestionState => ({ error, kind, title, content })
  if (!title) return fail('Vui lòng nhập tiêu đề.')
  if (title.length > TITLE_MAX) return fail(`Tiêu đề tối đa ${TITLE_MAX} ký tự.`)
  if (!content) return fail('Vui lòng nhập nội dung câu hỏi.')
  if (content.length > CONTENT_MAX[kind]) return fail(`Nội dung tối đa ${CONTENT_MAX[kind]} ký tự.`)
  if (!/\p{L}/u.test(content)) return fail('Nội dung phải chứa chữ.')

  if (!(await getClaims())) return fail('Vui lòng đăng nhập để tạo câu hỏi.')
  const supabase = await createClient()

  const { count } = await supabase.from('custom_questions').select('id', { count: 'exact', head: true })
  if ((count ?? 0) >= MAX_QUESTIONS) return fail(`Bạn đã có ${MAX_QUESTIONS} câu hỏi. Hãy xóa bớt trước khi tạo mới.`)

  const { error } = await supabase.from('custom_questions').insert({ kind, title, content })
  if (error) {
    console.error('custom_questions insert failed:', error.message)
    return fail('Không lưu được câu hỏi. Vui lòng thử lại.')
  }
  refresh()
  return { ok: true, kind }
}

export async function deleteQuestion(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!UUID_RE.test(id) || !(await getClaims())) return
  const supabase = await createClient()
  const { error } = await supabase.from('custom_questions').delete().eq('id', id) // RLS: own rows only
  if (error) console.error('custom_questions delete failed:', error.message)
  refresh()
}
