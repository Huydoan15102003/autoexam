import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregate, contentScore, overallScore } from './scoring.ts'

const w = (Word: string, AccuracyScore: number, Duration = 1e6, extra: object = {}) => ({
  Word,
  Duration,
  PronunciationAssessment: { AccuracyScore, ErrorType: 'None', ...extra },
})
const seg = (DisplayText: string, pa: object, Words: object[]) => ({
  DisplayText,
  NBest: [{ PronunciationAssessment: pa, Words }],
})

test('scripted: alignment, completeness, accuracy, weighted pronunciation', () => {
  const segments = [
    seg('The quick.', { FluencyScore: 80, ProsodyScore: 70 }, [
      { ...w('the', 95, 1e6, { Feedback: { Prosody: { Break: { MissingBreak: { Confidence: 1 } } } } }), Phonemes: [{ Phoneme: 'ð', PronunciationAssessment: { AccuracyScore: 90 } }] },
      w('quick', 50, 1e6, { Feedback: { Prosody: { Break: { ErrorTypes: ['UnexpectedBreak'] } } } }),
      { Word: 'brown', Duration: 0, PronunciationAssessment: { AccuracyScore: 0, ErrorType: 'Omission' } },
    ]),
    seg('Fox jumps.', { FluencyScore: 50 }, [
      w('fox', 90, 3e6, { Feedback: { Prosody: { Break: { MissingBreak: { Confidence: 0.9 } } } } }),
      w('jumps', 80, 3e6),
    ]),
  ]
  const r = aggregate(segments, { mode: 'read', referenceText: 'The quick, brown fox.', durationSec: 3.04 })
  assert.deepEqual(
    r.words.map((x) => [x.word, x.errorType, x.accuracy]),
    [['the', 'None', 95], ['quick', 'Mispronunciation', 50], ['brown', 'Omission', 0], ['fox', 'None', 90], ['jumps', 'Insertion', 80]],
  )
  assert.deepEqual(r.words[0].phonemes, [{ phoneme: 'ð', accuracy: 90 }])
  assert.equal(r.words[1].unexpectedBreak, true)
  assert.equal(r.words[3].missingBreak, true)
  assert.equal(r.words[0].missingBreak, false)
  assert.equal(r.completeness, 75) // 3 of 4 reference words
  assert.equal(r.accuracy, 58.8) // (95+50+0+90)/4, insertion excluded
  assert.equal(r.fluency, 57.5) // (80*2 + 50*6) / 8, duration-weighted
  assert.equal(r.prosody, 70)
  // sorted [57.5, 58.75, 70, 75] · [0.45, 0.35, 0.15, 0.05]
  assert.equal(r.pronunciation, 60.7)
  assert.equal(r.transcript, 'The quick. Fox jumps.')
  assert.equal(r.durationSec, 3)
})

test('scripted without prosody', () => {
  const r = aggregate([seg('Hello world.', { FluencyScore: 40 }, [w('hello', 100), w('world', 100)])], {
    mode: 'read',
    referenceText: 'Hello world',
    durationSec: 2,
  })
  assert.equal(r.prosody, null)
  assert.equal(r.pronunciation, 64) // sorted [40, 100, 100] · [0.6, 0.2, 0.2]
})

test('unscripted: weighted pronunciation with and without prosody', () => {
  const words = [w('i', 80), w('think', 40)]
  const withP = aggregate([seg('I think.', { FluencyScore: 90, ProsodyScore: 60 }, words)], { mode: 'topic', referenceText: '', durationSec: 2 })
  assert.equal(withP.completeness, null)
  assert.equal(withP.words[1].errorType, 'Mispronunciation')
  assert.equal(withP.pronunciation, 66) // sorted [60, 60, 90] · [0.5, 0.3, 0.2]
  const noP = aggregate([seg('I think.', { FluencyScore: 90 }, words)], { mode: 'topic', referenceText: '', durationSec: 2 })
  assert.equal(noP.pronunciation, 72) // sorted [60, 90] · [0.6, 0.4]
})

test('overall dynamic weights and content score', () => {
  assert.equal(overallScore('read', 77.7, null), 77.7)
  assert.equal(overallScore('topic', 80, 0), 0)
  assert.equal(overallScore('topic', 80, 30), 40)
  assert.equal(overallScore('topic', 80, 31), 45.7)
  assert.equal(overallScore('topic', 80, 50), 59)
  assert.equal(overallScore('topic', 80, 70), 75)
  assert.equal(overallScore('topic', 80, 90), 83)
  assert.equal(contentScore(80, 85, 85), 83.5)
})

test('garbage input does not throw', () => {
  const junk = [null, 5, 'x', {}, { NBest: 'no' }, { NBest: [null] }, { NBest: [{ Words: [null, { Word: 3 }, { Phonemes: [null] }] }] }]
  for (const mode of ['read', 'topic'] as const) {
    const r = aggregate(junk, { mode, referenceText: 'Some text', durationSec: NaN })
    assert.equal(Number.isFinite(r.pronunciation), true)
  }
  assert.doesNotThrow(() => aggregate(null as unknown as unknown[], { mode: 'read', referenceText: '', durationSec: 0 }))
})
