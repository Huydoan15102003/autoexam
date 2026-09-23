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

test('finalizeScores: under-length caps task fulfilment', () => {
  const at = (wordCount: number) => finalizeScores('task2', s(9, 9, 9, 9), { ...none, wordCount, minWords: 250 })
  assert.deepEqual(at(260).scores, s(9, 9, 9, 9))
  assert.deepEqual(at(260).notes, [])
  assert.equal(at(230).scores.task_fulfilment, 7) // < 100%
  assert.equal(at(180).scores.task_fulfilment, 5) // < 80%
  assert.deepEqual(at(100).scores, s(3, 4, 9, 9)) // < 50%: organization too
  assert.equal(at(100).notes.length, 1)
  assert.match(at(100).notes[0], /100\/250 từ/)
})

test('finalizeScores: error density caps grammar / vocabulary, notes only when a score drops', () => {
  const errs = (n: number, category: 'grammar' | 'vocabulary' | 'spelling' | 'punctuation') =>
    Array.from({ length: n }, () => ({ category }))
  const run = (raw: ReturnType<typeof s>, errors: ReturnType<typeof errs>) =>
    finalizeScores('task2', raw, { ...none, wordCount: 200, minWords: 150, errors })
  // 200 words: 13 grammar errors = 6.5/100 → ≤4; 9 = 4.5 → ≤5; 5 = 2.5 → ≤6; 3 = 1.5 → ≤7; 2 = 1.0 → no cap
  assert.equal(run(s(8, 8, 8, 8), errs(13, 'grammar')).scores.grammar, 4)
  assert.equal(run(s(8, 8, 8, 8), errs(9, 'grammar')).scores.grammar, 5)
  assert.equal(run(s(8, 8, 8, 8), errs(5, 'grammar')).scores.grammar, 6)
  assert.equal(run(s(8, 8, 8, 8), errs(3, 'grammar')).scores.grammar, 7)
  assert.equal(run(s(8, 8, 8, 8), errs(2, 'grammar')).scores.grammar, 8)
  // vocabulary + spelling share one density; punctuation is ignored
  const mixed = run(s(8, 8, 8, 8), [...errs(3, 'vocabulary'), ...errs(2, 'spelling'), ...errs(9, 'punctuation')])
  assert.deepEqual(mixed.scores, s(8, 8, 6, 8))
  assert.equal(mixed.notes.length, 1)
  assert.match(mixed.notes[0], /Từ vựng tối đa 6/)
  // a cap above the model's own score changes nothing and adds no note
  assert.deepEqual(run(s(5, 5, 5, 5), errs(5, 'grammar')).notes, [])
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
