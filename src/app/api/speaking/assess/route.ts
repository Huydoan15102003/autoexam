import { createClient } from '@/lib/supabase/server'
import { assessPronunciation } from '@/lib/speaking/azure'
import { assessContent } from '@/lib/speaking/content'
import { aggregate, overallScore } from '@/lib/speaking/scoring'
import {
  MAX_RECORDING_SEC,
  MIN_RECORDING_SEC,
  type AssessmentResult,
  type AssessResponse,
  type ContentResult,
} from '@/lib/speaking/types'

// Vercel Hobby with Fluid compute: default = max = 300 s. Azure (≤ 2 min audio) + OpenAI (≤ 60 s × 2 tries) fit.
export const maxDuration = 300

const MAX_AUDIO_BYTES = 4_000_000
const GENERIC_ERROR = 'Đã xảy ra lỗi khi chấm bài, vui lòng thử lại sau'
const fail = (status: number, error: string) => Response.json({ error }, { status })

// PCM payload of a 16 kHz mono 16-bit PCM WAV, or null. Walks chunks so extra ones (LIST, fact…) are tolerated.
function wavPcm(b: Uint8Array): Uint8Array | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const tag = (o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3])
  if (b.length < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null
  let fmtOk = false
  for (let o = 12; o + 8 <= b.length; ) {
    const size = v.getUint32(o + 4, true)
    const body = o + 8
    if (tag(o) === 'fmt ') {
      if (size < 16 || body + 16 > b.length) return null
      fmtOk =
        v.getUint16(body, true) === 1 && // PCM
        v.getUint16(body + 2, true) === 1 && // mono
        v.getUint32(body + 4, true) === 16000 &&
        v.getUint16(body + 14, true) === 16
      if (!fmtOk) return null
    } else if (tag(o) === 'data') {
      return fmtOk ? b.subarray(body, Math.min(body + size, b.length)) : null
    }
    o = body + size + (size & 1)
  }
  return null
}

export async function POST(request: Request) {
  try {
    return await assess(request)
  } catch (e) {
    console.error('speaking/assess failed:', e instanceof Error ? e.message : e)
    return fail(500, GENERIC_ERROR)
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
  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) return fail(503, 'Chưa cấu hình Azure Speech')

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail(400, 'Dữ liệu gửi lên không hợp lệ')
  }
  const mode = form.get('mode')
  if (mode !== 'read' && mode !== 'topic') return fail(400, 'Chế độ luyện tập không hợp lệ')
  if (mode === 'topic' && !process.env.OPENAI_API_KEY) return fail(503, 'Chưa cấu hình OpenAI')

  const rawPrompt = form.get('prompt')
  const prompt = typeof rawPrompt === 'string' ? rawPrompt.trim() : ''
  const maxLen = mode === 'read' ? 1500 : 500
  if (!prompt || prompt.length > maxLen) return fail(400, `Đề bài phải dài từ 1 đến ${maxLen} ký tự`)
  if (mode === 'read' && !/\p{L}/u.test(prompt)) return fail(400, 'Đoạn văn cần đọc phải chứa chữ')

  const audio = form.get('audio')
  if (!(audio instanceof File) || audio.size === 0) return fail(400, 'Thiếu tệp ghi âm')
  if (audio.size > MAX_AUDIO_BYTES) return fail(400, 'Tệp ghi âm quá lớn')
  const pcm = wavPcm(new Uint8Array(await audio.arrayBuffer()))
  if (!pcm) return fail(400, 'Tệp ghi âm không hợp lệ (cần WAV PCM 16 kHz, mono, 16-bit)')
  const durationSec = pcm.length / 32000
  if (durationSec < MIN_RECORDING_SEC) return fail(400, 'Bản ghi quá ngắn, hãy nói ít nhất 1 giây')
  if (durationSec > MAX_RECORDING_SEC + 2) return fail(400, `Bản ghi quá dài, tối đa ${MAX_RECORDING_SEC} giây`)

  // ponytail: per-user DB count as the daily cap; move to a real rate limiter if the public URL gets abused.
  const limit = Number(process.env.SPEAKING_DAILY_LIMIT || 30)
  const { count, error: countError } = await supabase
    .from('speaking_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
  if (countError) console.error('speaking_attempts count failed:', countError.message)
  else if ((count ?? 0) >= limit) return fail(429, 'Bạn đã đạt giới hạn luyện tập hôm nay, vui lòng quay lại sau')

  let segments: unknown[]
  try {
    segments = await assessPronunciation(pcm, { referenceText: mode === 'read' ? prompt : '' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Azure Speech failed:', msg)
    // ponytail: in Node the SDK reports a bad key or region as WebSocket 1006 (it also covers rare network drops).
    if (/AuthenticationFailure|Forbidden|\b40[13]\b|StatusCode: 1006/.test(msg)) return fail(502,'Lỗi xác thực Azure Speech — kiểm tra khóa và vùng')
    if (/TooManyRequests|\b429\b/.test(msg)) return fail(503, 'Dịch vụ chấm phát âm đang quá tải, vui lòng thử lại sau')
    return fail(500, GENERIC_ERROR)
  }
  const pronunciation = aggregate(segments, { mode, referenceText: prompt, durationSec })
  if (!pronunciation.words.some((w) => w.errorType !== 'Omission'))
    return fail(422, 'Không nhận diện được giọng nói. Hãy nói to, rõ và thử lại.')

  let content: ContentResult | null = null
  if (mode === 'topic') {
    try {
      content = await assessContent(prompt, pronunciation.transcript)
    } catch (e) {
      console.error('OpenAI content assessment failed:', e instanceof Error ? e.message : e)
      return fail(502, 'Không chấm được nội dung, vui lòng thử lại')
    }
  }

  const result: AssessmentResult = {
    mode,
    prompt,
    overall: overallScore(mode, pronunciation.pronunciation, content?.content ?? null),
    pronunciation,
    content,
  }
  const { data: row, error: insertError } = await supabase
    .from('speaking_attempts')
    .insert({
      mode,
      prompt,
      transcript: pronunciation.transcript,
      overall_score: result.overall,
      pronunciation_score: pronunciation.pronunciation,
      content_score: content?.content ?? null,
      result,
    })
    .select('id')
    .single()
  if (insertError) console.error('speaking_attempts insert failed:', insertError.message)

  return Response.json({ id: (row?.id as string | undefined) ?? null, result } satisfies AssessResponse)
}
