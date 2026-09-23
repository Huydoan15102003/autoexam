// User-created practice questions ("Câu hỏi của tôi"). Shared by server pages and client components — no server imports.

export type QuestionKind = 'read' | 'topic' | 'task1' | 'task2'
export type SavedQuestion = { id: string; kind: QuestionKind; title: string; content: string }

export const QUESTION_KINDS: QuestionKind[] = ['read', 'topic', 'task1', 'task2']

export const KIND_LABEL: Record<QuestionKind, string> = {
  read: 'Nói — Đọc to (đoạn văn)',
  topic: 'Nói — Theo chủ đề (câu hỏi)',
  task1: 'Viết — Task 1 (thư/email)',
  task2: 'Viết — Task 2 (bài luận)',
}

// Same limits the assess APIs enforce on `prompt`.
export const CONTENT_MAX: Record<QuestionKind, number> = { read: 1500, topic: 500, task1: 1500, task2: 1500 }
export const TITLE_MAX = 120

// Option value of a saved question in the practice pickers (built-in ids never contain ':').
export const savedId = (id: string) => `q:${id}`

export const practiceHref = (q: Pick<SavedQuestion, 'id' | 'kind'>) =>
  `${q.kind === 'read' || q.kind === 'topic' ? '/practice' : '/writing'}?q=${q.id}`
