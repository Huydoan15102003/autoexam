// Shared contract between /api/speaking/assess and the practice UI. All scores are 0–100.

export type Mode = 'read' | 'topic' // read = scripted (reference text), topic = unscripted + GPT content

export type ErrorType = 'None' | 'Mispronunciation' | 'Omission' | 'Insertion'

export type PhonemeResult = { phoneme: string; accuracy: number } // IPA

export type WordResult = {
  word: string
  accuracy: number // 0 for omissions
  errorType: ErrorType
  phonemes: PhonemeResult[]
  unexpectedBreak: boolean
  missingBreak: boolean
}

export type PronunciationResult = {
  pronunciation: number
  accuracy: number
  fluency: number
  prosody: number | null
  completeness: number | null // null in topic mode
  words: WordResult[]
  transcript: string
  durationSec: number
}

export type Correction = { original: string; corrected: string; explanation: string }

export type ContentResult = {
  vocabulary: number
  topic: number
  grammar: number
  content: number // vocabulary*0.3 + topic*0.4 + grammar*0.3, computed server-side
  isOffTopic: boolean
  strengths: string // Vietnamese
  improvements: string // Vietnamese
  corrections: Correction[]
  improvedAnswer: string // English
}

export type AssessmentResult = {
  mode: Mode
  prompt: string // reference text (read) or topic/question (topic)
  overall: number
  pronunciation: PronunciationResult
  content: ContentResult | null
}

// Response of POST /api/speaking/assess: 200 → AssessResponse, otherwise { error: string } (Vietnamese)
export type AssessResponse = { id: string | null; result: AssessmentResult }

export const MAX_RECORDING_SEC = 120 // 16 kHz mono 16-bit = 32 KB/s → ~3.84 MB, under Vercel's 4.5 MB body limit
export const MIN_RECORDING_SEC = 1
