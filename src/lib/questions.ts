// Question bank ("Kho câu hỏi"): built-in sample questions + the user's own. Shared by server pages and client
// components — pure data, no server imports.
import { READ_PASSAGES, TOPICS, type Level } from '@/lib/speaking/tasks'
import { TASK1_PROMPTS, TASK2_PROMPTS } from '@/lib/writing/tasks'

export type { Level }
export type QuestionKind = 'read' | 'topic' | 'task1' | 'task2'

// A row of custom_questions (the user's own question).
export type SavedQuestion = {
  id: string
  kind: QuestionKind
  title: string
  content: string
  level: Level | null
  created_at: string
}

export type BankQuestion = {
  id: string // built-in slug or custom_questions uuid — both work in /practice?q= and /writing?q=
  kind: QuestionKind
  title: string
  content: string
  level: Level | null
  source: 'sample' | 'mine'
  createdAt: string | null
}

export const QUESTION_KINDS: QuestionKind[] = ['read', 'topic', 'task1', 'task2']
export const LEVELS: Level[] = ['A2', 'B1', 'B2', 'C1']

export const KIND_LABEL: Record<QuestionKind, string> = {
  read: 'Nói — Đọc to (đoạn văn)',
  topic: 'Nói — Theo chủ đề (câu hỏi)',
  task1: 'Viết — Task 1 (thư/email)',
  task2: 'Viết — Task 2 (bài luận)',
}

export const KIND_SHORT: Record<QuestionKind, string> = {
  read: 'Đọc to',
  topic: 'Nói theo chủ đề',
  task1: 'Viết Task 1',
  task2: 'Viết Task 2',
}

// Same limits the assess APIs enforce on `prompt`.
export const CONTENT_MAX: Record<QuestionKind, number> = { read: 1500, topic: 500, task1: 1500, task2: 1500 }
export const TITLE_MAX = 120

// Option value of a saved question in the practice pickers (built-in ids never contain ':').
export const savedId = (id: string) => `q:${id}`

export const isSpeaking = (k: QuestionKind) => k === 'read' || k === 'topic'

export const practiceHref = (q: Pick<BankQuestion, 'id' | 'kind'>) =>
  `${isSpeaking(q.kind) ? '/practice' : '/writing'}?q=${encodeURIComponent(q.id)}`

const sample = (kind: QuestionKind, id: string, title: string, content: string, level: Level): BankQuestion => ({
  id,
  kind,
  title,
  content,
  level,
  source: 'sample',
  createdAt: null,
})

// ponytail: writing samples carry no level of their own; they're tagged with the VSTEP target of each task
export const SAMPLE_QUESTIONS: BankQuestion[] = [
  ...READ_PASSAGES.map((p) => sample('read', p.id, p.title, p.text, p.level)),
  ...TOPICS.map((t) =>
    sample('topic', t.id, t.title, [t.question, ...(t.hints ?? []).map((h) => `- ${h}`)].join('\n'), t.level),
  ),
  ...TASK1_PROMPTS.map((p) => sample('task1', p.id, p.title, p.prompt, 'B1')),
  ...TASK2_PROMPTS.map((p) => sample('task2', p.id, p.title, p.prompt, 'B2')),
]

export const toBank = (q: SavedQuestion): BankQuestion => ({
  id: q.id,
  kind: q.kind,
  title: q.title,
  content: q.content,
  level: q.level,
  source: 'mine',
  createdAt: q.created_at,
})
