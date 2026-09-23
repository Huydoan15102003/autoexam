// Pure scoring: raw Azure pronunciation-assessment JSON → PronunciationResult. No runtime imports (runs under node --test).
import type { Mode, PronunciationResult, WordResult } from './types'

type AzureBreak = {
  ErrorTypes?: unknown
  UnexpectedBreak?: { Confidence?: unknown }
  MissingBreak?: { Confidence?: unknown }
}
type AzureWord = {
  Word?: unknown
  Duration?: unknown
  PronunciationAssessment?: { AccuracyScore?: unknown; ErrorType?: unknown; Feedback?: { Prosody?: { Break?: AzureBreak } } }
  Phonemes?: unknown
}
type AzurePhoneme = { Phoneme?: unknown; PronunciationAssessment?: { AccuracyScore?: unknown } }
type AzureSegment = {
  DisplayText?: unknown
  NBest?: unknown
}
type AzureBest = { PronunciationAssessment?: { FluencyScore?: unknown; ProsodyScore?: unknown }; Words?: unknown }

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const r1 = (n: number) => Math.round(n * 10) / 10
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const objects = <T>(v: unknown) => (Array.isArray(v) ? v.filter((x): x is T => !!x && typeof x === 'object') : [])
const key = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const clean = (w: string) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

// examdee formula: sort sub-scores ascending, the weakest gets the biggest weight.
const weighted = (scores: number[], weights: number[]) =>
  [...scores].sort((a, b) => a - b).reduce((s, x, i) => s + x * weights[i], 0)

function toWord(w: AzureWord): WordResult {
  const pa = w.PronunciationAssessment
  const brk = pa?.Feedback?.Prosody?.Break
  const types = Array.isArray(brk?.ErrorTypes) ? (brk.ErrorTypes as unknown[]) : []
  const missing = num(brk?.MissingBreak?.Confidence)
  const accuracy = r1(num(pa?.AccuracyScore))
  return {
    word: str(w.Word),
    accuracy,
    // Omission/Insertion come from our alignment; Azure prosody types (Monotone, breaks…) aren't word errors.
    errorType: pa?.ErrorType === 'Mispronunciation' || accuracy < 60 ? 'Mispronunciation' : 'None',
    phonemes: objects<AzurePhoneme>(w.Phonemes).map((p) => ({
      phoneme: str(p.Phoneme),
      accuracy: r1(num(p.PronunciationAssessment?.AccuracyScore)),
    })),
    unexpectedBreak: types.includes('UnexpectedBreak') || num(brk?.UnexpectedBreak?.Confidence) > 0.75,
    missingBreak: types.includes('MissingBreak') || (missing > 0.75 && missing < 1),
  }
}

// LCS alignment → [refIndex, hypIndex] pairs in reference order, -1 = missing on that side.
// ponytail: O(n·m) DP table, fine for ≤ ~1000 words (prompts ≤ 1500 chars, ≤ 2 min audio); Myers diff if texts grow.
function align(a: string[], b: string[]): [number, number][] {
  const n = a.length, m = b.length, w = m + 1
  const dp = new Uint32Array((n + 1) * w) // dp[i][j] = LCS of a[i..], b[j..]
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i * w + j] = a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1])
  const out: [number, number][] = []
  let i = 0, j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) out.push([i++, j++])
    else if (i < n && (j === m || dp[(i + 1) * w + j] >= dp[i * w + j + 1])) out.push([i++, -1])
    else out.push([-1, j++])
  }
  return out
}

export function aggregate(
  segments: unknown[],
  opts: { mode: Mode; referenceText: string; durationSec: number },
): PronunciationResult {
  const hyp: { key: string; word: WordResult }[] = []
  const fluency: { score: number; dur: number }[] = []
  const prosodies: number[] = []
  const texts: string[] = []

  for (const seg of objects<AzureSegment>(segments)) {
    const text = str(seg.DisplayText).trim()
    if (text) texts.push(text)
    const best = objects<AzureBest>(seg.NBest)[0]
    if (!best) continue
    const words = objects<AzureWord>(best.Words)
    const pa = best.PronunciationAssessment
    if (typeof pa?.FluencyScore === 'number')
      fluency.push({ score: pa.FluencyScore, dur: words.reduce((d, w) => d + num(w.Duration), 0) })
    if (typeof pa?.ProsodyScore === 'number') prosodies.push(pa.ProsodyScore)
    for (const w of words) {
      if (w.PronunciationAssessment?.ErrorType === 'Omission') continue // omissions are recomputed globally
      const word = toWord(w)
      const k = key(word.word)
      if (k) hyp.push({ key: k, word })
    }
  }

  const read = opts.mode === 'read'
  let words = hyp.map((h) => h.word)
  let completeness: number | null = null
  if (read) {
    const ref = str(opts.referenceText).split(/\s+/).map((t) => ({ key: key(t), word: clean(t) })).filter((r) => r.key)
    words = align(ref.map((r) => r.key), hyp.map((h) => h.key)).map(([i, j]): WordResult =>
      j < 0
        ? { word: ref[i].word, accuracy: 0, errorType: 'Omission', phonemes: [], unexpectedBreak: false, missingBreak: false }
        : i < 0
          ? { ...hyp[j].word, errorType: 'Insertion' }
          : hyp[j].word,
    )
    const omitted = words.filter((w) => w.errorType === 'Omission').length
    completeness = ref.length ? Math.min(100, ((ref.length - omitted) / ref.length) * 100) : 0
  }

  const accuracy = mean(words.filter((w) => w.errorType !== 'Insertion').map((w) => w.accuracy))
  const totalDur = fluency.reduce((d, f) => d + f.dur, 0)
  const flu = totalDur
    ? fluency.reduce((s, f) => s + f.score * f.dur, 0) / totalDur
    : mean(fluency.map((f) => f.score))
  const prosody = prosodies.length ? mean(prosodies) : null

  const subs = read ? [accuracy, completeness ?? 0, flu] : [accuracy, flu]
  if (prosody !== null) subs.push(prosody)
  const weights =
    prosody === null
      ? read ? [0.6, 0.2, 0.2] : [0.6, 0.4]
      : read ? [0.45, 0.35, 0.15, 0.05] : [0.5, 0.3, 0.2]

  return {
    pronunciation: r1(weighted(subs, weights)),
    accuracy: r1(accuracy),
    fluency: r1(flu),
    prosody: prosody === null ? null : r1(prosody),
    completeness: completeness === null ? null : r1(completeness),
    words,
    transcript: texts.join(' '),
    durationSec: r1(num(opts.durationSec)),
  }
}

export function contentScore(vocabulary: number, topic: number, grammar: number): number {
  return r1(vocabulary * 0.3 + topic * 0.4 + grammar * 0.3)
}

// examdee dynamic weights: weak content leans on content, strong content leans on pronunciation.
export function overallScore(mode: Mode, pronunciation: number, content: number | null): number {
  if (mode === 'read' || content === null) return r1(pronunciation)
  const c = content, p = pronunciation
  if (c <= 0) return 0
  if (c <= 30) return r1(0.8 * c + 0.2 * p)
  if (c <= 50) return r1(0.7 * c + 0.3 * p)
  if (c <= 70) return r1(0.5 * c + 0.5 * p)
  return r1(0.3 * c + 0.7 * p)
}
