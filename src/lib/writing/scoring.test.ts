import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  countWords,
  finalizeScores,
  normalizeEssay,
  proficiencyFor,
  resolveErrors,
  roundHalfEven,
  splitSentences,
  type RawError,
} from './scoring.ts'

const s = (tf: number, org: number, voc: number, gr: number) => ({ task_fulfilment: tf, organization: org, vocabulary: voc, grammar: gr })
const none = { isOffTopic: false, missingStructure: false }
const err = (sentence_index: number, example: string, suggestion = 'fixed'): RawError => ({
  category: 'grammar',
  sentence_index,
  example,
  suggestion,
  explanation: 'Sai.',
})

test('roundHalfEven matches Python round(x * 2) / 2', () => {
  for (const [x, want] of [[6.25, 6], [6.75, 7], [5.25, 5], [4.75, 5], [2.625, 2.5], [6.5, 6.5], [7.1, 7], [7.3, 7.5], [10, 10], [0, 0]])
    assert.equal(roundHalfEven(x), want, `roundHalfEven(${x})`)
})

test('proficiency boundaries', () => {
  assert.deepEqual(proficiencyFor(8.5), { level: 'Bậc 5', cefr: 'C1', certified: true })
  assert.equal(proficiencyFor(8).cefr, 'B2')
  assert.equal(proficiencyFor(6).cefr, 'B2')
  assert.equal(proficiencyFor(5.5).cefr, 'B1')
  assert.equal(proficiencyFor(4).cefr, 'B1')
  assert.deepEqual(proficiencyFor(3.5), { level: 'Dưới Bậc 3', cefr: '<B1', certified: false })
})

test('finalizeScores: mean, half-even rounding, clamping', () => {
  const r = finalizeScores('task1', s(7, 6, 6, 6), none) // 6.25 → 6.0
  assert.equal(r.overall, 6)
  assert.equal(r.proficiency.cefr, 'B2')
  assert.equal(finalizeScores('task2', s(7, 7, 7, 6), none).overall, 7) // 6.75 → 7.0
  assert.deepEqual(finalizeScores('task1', s(14, -3, 7.6, NaN), none).scores, s(10, 0, 8, 0))
})

test('finalizeScores: off-topic caps criteria and overall', () => {
  const r = finalizeScores('task1', s(9, 9, 9, 9), { isOffTopic: true, missingStructure: false })
  assert.deepEqual(r.scores, s(2, 4, 4, 4))
  assert.equal(r.overall, 3) // mean 3.5, capped at 3.0
  assert.equal(r.proficiency.certified, false)
})

test('finalizeScores: structure caps per task', () => {
  const flags = { isOffTopic: false, missingStructure: true }
  assert.deepEqual(finalizeScores('task1', s(9, 9, 9, 9), flags).scores, s(9, 5, 9, 9))
  const t2 = finalizeScores('task2', s(9, 9, 9, 9), flags)
  assert.deepEqual(t2.scores, s(2, 2, 4, 4))
  assert.equal(t2.overall, 3)
  assert.deepEqual(finalizeScores('task1', s(3, 2, 1, 0), flags).scores, s(3, 2, 1, 0)) // caps never raise
})

test('normalizeEssay and countWords', () => {
  assert.equal(normalizeEssay('  Dear Tom,  \r\n\r\n\r\n\r\nI am fine. \t\r\nBye\n\n'), 'Dear Tom,\n\nI am fine.\nBye')
  assert.equal(countWords(' one  two\n\nthree '), 3)
})

test('splitSentences keeps paragraph boundaries and exact spans', () => {
  const text = normalizeEssay('Dear Tom,\nThanks for your letter! How are you? I am fine.\n\nBest wishes\nLan')
  const parts = splitSentences(text)
  assert.deepEqual(
    parts.map((p) => p.text),
    ['Dear Tom,', 'Thanks for your letter!', 'How are you?', 'I am fine.', 'Best wishes', 'Lan'],
  )
  for (const p of parts) assert.equal(text.slice(p.start, p.end), p.text)
  assert.deepEqual(splitSentences('No end punctuation'), [{ text: 'No end punctuation', start: 0, end: 18 }])
  assert.deepEqual(splitSentences(''), [])
})

test('resolveErrors: sentence-scoped, fallback, not found, no-op, overlap', () => {
  const essay = 'This is good. He go to school.\n\nShe go home and he go out.'
  const sentences = splitSentences(essay)
  const out = resolveErrors(essay, sentences, [
    err(3, 'go'), // sentence-scoped: first "go" of S3, not the one in S2
    err(2, 'IS'), // wrong sentence → whole-text fallback, case-insensitive, whole word ("This" is skipped)
    err(1, 'went'), // not found anywhere
    err(2, 'He go', 'he go'), // no-op (same as suggestion ignoring case) → dropped
    err(2, ' '), // empty → dropped
    err(3, 'She go'), // overlaps the S3 "go" located first → unlocated
  ])
  const at = (i: number) => [out[i].start, out[i].end]
  assert.equal(out.length, 4)
  assert.deepEqual(at(0), [essay.indexOf('She go') + 4, essay.indexOf('She go') + 6])
  assert.deepEqual(at(1), [5, 7])
  assert.deepEqual(at(2), [null, null])
  assert.equal(out[3].example, 'She go')
  assert.deepEqual(at(3), [null, null])
  for (const e of out) if (e.start !== null) assert.equal(essay.slice(e.start, e.end!).toLowerCase(), e.example.toLowerCase())
})

test('resolveErrors caps at 20', () => {
  const essay = 'a b c.'
  assert.equal(resolveErrors(essay, splitSentences(essay), Array.from({ length: 30 }, () => err(1, 'zz'))).length, 20)
})
