import { createClient } from '@/lib/supabase/server'
import { gradeWriting } from '@/lib/writing/grade'
import { countWords, normalizeEssay } from '@/lib/writing/scoring'
import {
  WRITING_MAX_CHARS,
  WRITING_MIN_WORDS,
  WRITING_PROMPT_MAX_CHARS,
  type WritingAssessResponse,
  type WritingResult,
} from '@/lib/writing/types'

// One OpenAI call: 90 s timeout × 2 tries (maxRetries: 1) + auth/DB must fit.
export const maxDuration = 200

const MAX_BODY_CHARS = 20_000
const fail = (status: number, error: string) => Response.json({ error }, { status })

export async function POST(request: Request) {
  try {
    return await assess(request)
  } catch (e) {
    console.error('writing/assess failed:', e instanceof Error ? e.message : e)
    return fail(500, 'Đã xảy ra lỗi khi chấm bài, vui lòng thử lại sau')
  }
}

async function assess(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return fail(503, 'Hệ thống chưa được cấu hình Supabase')
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(401, 'Vui lòng đăng nhập để sử dụng tính năng này')
  if (!process.env.OPENAI_API_KEY) return fail(503, 'Chưa cấu hình OpenAI')

  const raw = await request.text()
  if (raw.length > MAX_BODY_CHARS) return fail(413, 'Dữ liệu gửi lên quá lớn')
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return fail(400, 'Dữ liệu gửi lên không hợp lệ')
  }
  if (typeof body !== 'object' || body === null) return fail(400, 'Dữ liệu gửi lên không hợp lệ')
  const { task, prompt: rawPrompt, essay: rawEssay } = body as Record<string, unknown>

  if (task !== 'task1' && task !== 'task2') return fail(400, 'Dạng bài không hợp lệ')
  const prompt = typeof rawPrompt === 'string' ? rawPrompt.trim() : ''
  if (!prompt || prompt.length > WRITING_PROMPT_MAX_CHARS)
    return fail(400, `Đề bài phải dài từ 1 đến ${WRITING_PROMPT_MAX_CHARS} ký tự`)
  const essay = typeof rawEssay === 'string' ? normalizeEssay(rawEssay) : ''
  if (essay.length > WRITING_MAX_CHARS) return fail(400, `Bài viết quá dài, tối đa ${WRITING_MAX_CHARS} ký tự`)
  const wordCount = countWords(essay)
  if (wordCount < WRITING_MIN_WORDS) return fail(400, `Bài viết quá ngắn để chấm (tối thiểu ${WRITING_MIN_WORDS} từ)`)

  // ponytail: per-user DB count as the daily cap; move to a real rate limiter if the public URL gets abused.
  const limit = Number(process.env.WRITING_DAILY_LIMIT || 30)
  const { count, error: countError } = await supabase
    .from('writing_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
  if (countError) console.error('writing_attempts count failed:', countError.message)
  else if ((count ?? 0) >= limit) return fail(429, 'Bạn đã đạt giới hạn luyện tập hôm nay, vui lòng quay lại sau')

  let result: WritingResult
  try {
    result = await gradeWriting(task, prompt, essay)
  } catch (e) {
    console.error('OpenAI writing assessment failed:', e instanceof Error ? e.message : e)
    return fail(502, 'Không chấm được bài viết, vui lòng thử lại')
  }

  const { data: row, error: insertError } = await supabase
    .from('writing_attempts')
    .insert({ task, prompt, essay, word_count: wordCount, overall_score: result.overall, result })
    .select('id')
    .single()
  if (insertError) console.error('writing_attempts insert failed:', insertError.message)

  return Response.json({ id: (row?.id as string | undefined) ?? null, result } satisfies WritingAssessResponse)
}
