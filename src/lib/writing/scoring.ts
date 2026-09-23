// Pure writing scoring: essay normalization, sentence spans, VSTEP caps/rounding, error offsets. Type-only imports (runs under node --test).
import type { Criterion, ErrorCategory, Proficiency, WritingError, WritingTask } from './types'

export type Sentence = { text: string; start: number; end: number }
export type RawError = { category: ErrorCategory; sentence_index: number; example: string; suggestion: string; explanation: string }
type Scores = Record<Criterion, number>

const MAX_ERRORS = 20
const OFF_TOPIC_CAPS: Scores = { task_fulfilment: 2, organization: 4, vocabulary: 4, grammar: 4 }
const STRUCTURE_CAPS: Record<WritingTask, Partial<Scores>> = {
  task1: { organization: 5 },
  task2: { task_fulfilment: 2, organization: 2, vocabulary: 4, grammar: 4 },
}

export function normalizeEssay(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/[^\S\n]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim()
}

export const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length

// Splits after .!? + whitespace and at every line break, so no sentence crosses a paragraph. Spans index into `text`.
export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = []
  let start = 0
  const push = (end: number) => {
    if (end > start) out.push({ text: text.slice(start, end), start, end })
  }
  for (const m of text.matchAll(/(?<=[.!?])\s+|\s*\n\s*/g)) {
    push(m.index)
    start = m.index + m[0].length
  }
  push(text.length)
  return out
}

// Python's round(score * 2) / 2 (half-to-even), as examdee does: 6.25 → 6.0, 6.75 → 7.0.
export function roundHalfEven(score: number): number {
  const x = score * 2
  const f = Math.floor(x)
  const d = x - f
  return (d > 0.5 || (d === 0.5 && f % 2 !== 0) ? f + 1 : f) / 2
}

export function proficiencyFor(overall: number): Proficiency {
  if (overall >= 8.5) return { level: 'Bậc 5', cefr: 'C1', certified: true }
  if (overall >= 6) return { level: 'Bậc 4', cefr: 'B2', certified: true }
  if (overall >= 4) return { level: 'Bậc 3', cefr: 'B1', certified: true }
  return { level: 'Dưới Bậc 3', cefr: '<B1', certified: false }
}

// Errors per 100 words → highest score the criterion may keep. The LLM tends to be generous on error-heavy texts,
// so its own error list bounds its score. ponytail: fixed thresholds, tune against real graded essays if needed.
const densityCap = (per100: number) => (per100 >= 6 ? 4 : per100 >= 4 ? 5 : per100 >= 2.5 ? 6 : per100 >= 1.5 ? 7 : 10)

type ExtraCap = { caps: Partial<Scores>; note: string }

// Deterministic caps beyond the LLM's judgement: under-length (VSTEP penalises it in Task Fulfilment) and error density.
function extraCaps(wordCount: number, minWords: number, errors: Pick<WritingError, 'category'>[]): ExtraCap[] {
  const out: ExtraCap[] = []
  if (wordCount > 0 && minWords > 0) {
    const r = wordCount / minWords
    const short = `Bài viết có ${wordCount}/${minWords} từ tối thiểu`
    if (r < 0.5) out.push({ caps: { task_fulfilment: 3, organization: 4 }, note: `${short} — điểm Hoàn thành nhiệm vụ và Tổ chức bài bị giới hạn.` })
    else if (r < 0.8) out.push({ caps: { task_fulfilment: 5 }, note: `${short} — điểm Hoàn thành nhiệm vụ tối đa 5.` })
    else if (r < 1) out.push({ caps: { task_fulfilment: 7 }, note: `${short} — điểm Hoàn thành nhiệm vụ tối đa 7.` })
  }
  if (wordCount > 0) {
    const per100 = (cats: string[]) => (errors.filter((e) => cats.includes(e.category)).length / wordCount) * 100
    const g = per100(['grammar'])
    const v = per100(['vocabulary', 'spelling'])
    if (densityCap(g) < 10)
      out.push({ caps: { grammar: densityCap(g) }, note: `Nhiều lỗi ngữ pháp (${g.toFixed(1)} lỗi/100 từ) — điểm Ngữ pháp tối đa ${densityCap(g)}.` })
    if (densityCap(v) < 10)
      out.push({ caps: { vocabulary: densityCap(v) }, note: `Nhiều lỗi từ vựng/chính tả (${v.toFixed(1)} lỗi/100 từ) — điểm Từ vựng tối đa ${densityCap(v)}.` })
  }
  return out
}

// The prompt asks the LLM for the off-topic/structure caps too; they are enforced here so the flags always bite.
// `notes` explains (in Vietnamese) every extra cap that actually lowered a score.
export function finalizeScores(
  task: WritingTask,
  raw: Scores,
  flags: {
    isOffTopic: boolean
    missingStructure: boolean
    wordCount?: number
    minWords?: number
    errors?: Pick<WritingError, 'category'>[]
  },
): { scores: Scores; overall: number; proficiency: Proficiency; notes: string[] } {
  const extra = extraCaps(flags.wordCount ?? 0, flags.minWords ?? 0, flags.errors ?? [])
  const caps: Partial<Scores>[] = [
    flags.isOffTopic ? OFF_TOPIC_CAPS : {},
    flags.missingStructure ? STRUCTURE_CAPS[task] : {},
    ...extra.map((e) => e.caps),
  ]
  const base = (c: Criterion) => Math.min(10, Math.max(0, Math.round(raw[c]) || 0))
  const score = (c: Criterion) => Math.min(base(c), ...caps.map((k) => k[c] ?? 10))
  const scores: Scores = {
    task_fulfilment: score('task_fulfilment'),
    organization: score('organization'),
    vocabulary: score('vocabulary'),
    grammar: score('grammar'),
  }
  const mean = (scores.task_fulfilment + scores.organization + scores.vocabulary + scores.grammar) / 4
  const overall = flags.isOffTopic ? Math.min(3, roundHalfEven(mean)) : roundHalfEven(mean)
  const notes = extra
    .filter((e) => (Object.keys(e.caps) as Criterion[]).some((c) => (e.caps[c] ?? 10) < base(c)))
    .map((e) => e.note)
  return { scores, overall, proficiency: proficiencyFor(overall), notes }
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch)

// Case-insensitive, whole-word at word-character edges ("is" must not hit "This"). Returns [start, end) in `text` or null.
function find(text: string, example: string, from: number, to: number): [number, number] | null {
  const escaped = example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const before = isWordChar(example[0]) ? '(?<![\\p{L}\\p{N}])' : ''
  const after = isWordChar(example.at(-1)) ? '(?![\\p{L}\\p{N}])' : ''
  const m = new RegExp(before + escaped + after, 'iu').exec(text.slice(from, to))
  return m ? [from + m.index, from + m.index + m[0].length] : null
}

// ponytail: exact (case-insensitive) match only; add fuzzy matching if many errors come back unlocated.
export function resolveErrors(essay: string, sentences: Sentence[], raw: RawError[]): WritingError[] {
  const out: WritingError[] = []
  const located: [number, number][] = []
  for (const e of raw) {
    if (out.length === MAX_ERRORS) break
    const example = e.example.trim()
    if (!example || squash(example) === squash(e.suggestion)) continue
    const s = sentences[e.sentence_index - 1]
    const found = (s && find(essay, example, s.start, s.end)) || find(essay, example, 0, essay.length)
    // Later errors overlapping an earlier highlight stay unlocated so the UI never nests highlights.
    const span = found && !located.some(([a, b]) => found[0] < b && a < found[1]) ? found : null
    if (span) located.push(span)
    out.push({
      category: e.category,
      example,
      suggestion: e.suggestion.trim(),
      explanation: e.explanation.trim(),
      start: span?.[0] ?? null,
      end: span?.[1] ?? null,
    })
  }
  return out
}
