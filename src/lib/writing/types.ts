// Shared contract between /api/writing/assess and the writing UI. Ported from examdee-ai writing_vstep (VSTEP Writing).

export type WritingTask = 'task1' | 'task2' // task1 = letter/email, task2 = essay

export const CRITERIA = ['task_fulfilment', 'organization', 'vocabulary', 'grammar'] as const
export type Criterion = (typeof CRITERIA)[number]

export type CriterionFeedback = { strengths: string; weaknesses: string; suggestions: string } // Vietnamese

export type ErrorCategory = 'grammar' | 'vocabulary' | 'spelling' | 'punctuation'

export type WritingError = {
  category: ErrorCategory
  example: string // verbatim substring of the essay
  suggestion: string
  explanation: string // Vietnamese
  start: number | null // UTF-16 offsets into WritingResult.essay, end exclusive; null = couldn't locate
  end: number | null
}

export type Proficiency = { level: string; cefr: string; certified: boolean } // e.g. { 'Bậc 4', 'B2', true }

export type WritingResult = {
  task: WritingTask
  prompt: string
  essay: string // normalized text that was graded (offsets refer to this)
  wordCount: number
  scores: Record<Criterion, number> // 0–10 each, after caps
  overall: number // mean of the 4 criteria, rounded to 0.5 (half-even, like examdee)
  proficiency: Proficiency
  isOffTopic: boolean
  missingStructure: boolean // task1: no salutation AND no sign-off; task2: no body paragraphs
  feedback: Record<Criterion, CriterionFeedback>
  errors: WritingError[]
  adjustments?: string[] // Vietnamese notes for code-enforced caps (word count, error density); absent on older rows
}

// Response of POST /api/writing/assess: 200 → WritingAssessResponse, otherwise { error: string } (Vietnamese)
export type WritingAssessResponse = { id: string | null; result: WritingResult }

export const EXPECTED_WORDS: Record<WritingTask, [number, number]> = { task1: [120, 150], task2: [250, 300] }
export const WRITING_MIN_WORDS = 10
export const WRITING_MAX_CHARS = 5000
export const WRITING_PROMPT_MAX_CHARS = 1500
