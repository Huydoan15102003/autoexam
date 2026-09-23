'use client'

import { useState, useSyncExternalStore } from 'react'
import type { AssessmentResult, ErrorType, WordResult } from '@/lib/speaking/types'

const noopSubscribe = () => () => {}

// false on the server and first hydration pass, so SSR markup always matches
export function useCanSpeak() {
  return useSyncExternalStore(noopSubscribe, () => 'speechSynthesis' in window, () => false)
}

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}

const tone = (s: number) => (s >= 80 ? 0 : s >= 60 ? 1 : 2)
const STROKE = ['stroke-emerald-500', 'stroke-amber-500', 'stroke-red-500']
const TEXT = ['text-emerald-600', 'text-amber-600', 'text-red-600']
const BAR = ['bg-emerald-500', 'bg-amber-500', 'bg-red-500']
const PILL = ['bg-emerald-50 text-emerald-700', 'bg-amber-50 text-amber-700', 'bg-red-50 text-red-700']

const clamp = (s: number) => Math.round(Math.max(0, Math.min(100, Number(s) || 0)))
// score on a 0–max scale → 0–100 for colour/length; `* (100 / max)` is exact for max = 100, so speaking is unchanged
const pct = (s: number, max: number) => clamp((Number(s) || 0) * (100 / max))
// number shown: integer on the 0–100 scale, one decimal otherwise (e.g. 6.5 on the 0–10 writing scale)
const shown = (s: number, max: number) =>
  max === 100 ? clamp(s) : Math.max(0, Math.min(max, Number(s) || 0)).toFixed(1)

const levelLabel = (s: number) =>
  s >= 90 ? 'Xuất sắc' : s >= 70 ? 'Tốt' : s >= 50 ? 'Khá' : s >= 30 ? 'Trung bình' : 'Cần cải thiện'

const ERROR_LABEL: Record<ErrorType, string> = {
  None: 'Đúng',
  Mispronunciation: 'Phát âm sai',
  Omission: 'Bỏ sót',
  Insertion: 'Thừa từ',
}

const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
const smallBtn =
  'rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50'

export function Ring({
  score,
  label,
  size = 84,
  max = 100,
}: {
  score: number
  label: string
  size?: number
  max?: number
}) {
  const v = pct(score, max)
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <div className="flex w-24 flex-col items-center gap-1.5" role="img" aria-label={`${label}: ${shown(score, max)}/${max}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-slate-200" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            className={`${STROKE[tone(v)]} transition-[stroke-dasharray] duration-700`}
            strokeDasharray={`${(c * v) / 100} ${c}`}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-bold ${TEXT[tone(v)]}`}
          style={{ fontSize: size * 0.3 }}
        >
          {shown(score, max)}
        </span>
      </div>
      <span className="text-center text-xs font-medium text-slate-600">{label}</span>
    </div>
  )
}

export function Bar({ score, label, max = 100 }: { score: number; label: string; max?: number }) {
  const v = pct(score, max)
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className={`font-semibold ${TEXT[tone(v)]}`}>{shown(score, max)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${BAR[tone(v)]}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

function wordClass(w: WordResult) {
  switch (w.errorType) {
    case 'Mispronunciation':
      return 'border-transparent bg-red-50 text-red-600 underline decoration-red-500 decoration-2 underline-offset-4'
    case 'Omission':
      return 'border-dashed border-emerald-400 bg-emerald-50 text-emerald-700'
    case 'Insertion':
      return 'border-dashed border-slate-400 bg-slate-100 text-slate-500 line-through'
    default:
      return `border-transparent ${w.accuracy >= 80 ? 'text-slate-800' : w.accuracy >= 60 ? 'text-amber-600' : 'text-red-600'}`
  }
}

function Words({ words, canSpeak }: { words: WordResult[]; canSpeak: boolean }) {
  const [selected, setSelected] = useState<number | null>(null)
  const sel = selected === null ? null : words[selected]

  if (!words.length) return <p className="text-sm text-slate-500">Không nhận diện được từ nào.</p>

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-lg">
        {words.map((w, i) => (
          <span key={i} className="inline-flex items-center">
            {w.unexpectedBreak && (
              <span className="mr-0.5 font-bold text-violet-600" aria-hidden>
                —
              </span>
            )}
            <button
              type="button"
              onClick={() => setSelected(selected === i ? null : i)}
              aria-pressed={selected === i}
              aria-label={`${w.word}: ${ERROR_LABEL[w.errorType]}, ${clamp(w.accuracy)} điểm${w.unexpectedBreak ? ', ngắt nghỉ bất thường' : ''}${w.missingBreak ? ', thiếu ngắt nghỉ' : ''}`}
              className={`rounded-md border px-1 py-0.5 hover:ring-2 hover:ring-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${wordClass(w)} ${selected === i ? 'ring-2 ring-blue-600' : ''}`}
            >
              {w.word}
            </button>
            {w.missingBreak && (
              <span className="ml-0.5 font-bold text-red-600" aria-hidden>
                |
              </span>
            )}
          </span>
        ))}
      </div>

      {sel && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xl font-semibold">{sel.word}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${PILL[tone(sel.accuracy)]}`}>
              {clamp(sel.accuracy)}/100
            </span>
            <span className="text-sm text-slate-500">{ERROR_LABEL[sel.errorType]}</span>
            {canSpeak && (
              <button type="button" onClick={() => speak(sel.word)} className={`${smallBtn} ml-auto`}>
                🔊 Nghe
              </button>
            )}
          </div>
          {sel.phonemes.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sel.phonemes.map((p, i) => (
                <span
                  key={i}
                  className={`flex flex-col items-center rounded-md px-2 py-1 ${PILL[tone(p.accuracy)]}`}
                  title={`${clamp(p.accuracy)}/100`}
                >
                  <span className="font-mono">/{p.phoneme}/</span>
                  <span className="text-xs">{clamp(p.accuracy)}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              {sel.errorType === 'Omission' ? 'Bạn đã bỏ sót từ này.' : 'Không có dữ liệu âm vị cho từ này.'}
            </p>
          )}
        </div>
      )}
    </>
  )
}

export function AssessmentResultView({ result }: { result: AssessmentResult }) {
  const canSpeak = useCanSpeak()
  const p = result.pronunciation
  const c = result.content

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="text-lg font-semibold">Kết quả</h2>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center">
            <Ring score={result.overall} label="Tổng điểm" size={128} />
            <span className={`mt-1 rounded-full px-3 py-0.5 text-sm font-semibold ${PILL[tone(result.overall)]}`}>
              {levelLabel(result.overall)}
            </span>
          </div>
          <div className="flex flex-1 flex-wrap justify-center gap-4 sm:justify-start">
            <Ring score={p.pronunciation} label="Phát âm" />
            <Ring score={p.accuracy} label="Độ chính xác" />
            <Ring score={p.fluency} label="Độ trôi chảy" />
            {p.prosody !== null && <Ring score={p.prosody} label="Ngữ điệu" />}
            {p.completeness !== null && <Ring score={p.completeness} label="Độ đầy đủ" />}
            {c && <Ring score={c.content} label="Nội dung" />}
          </div>
        </div>
        {c && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Bar score={c.vocabulary} label="Từ vựng" />
            <Bar score={c.topic} label="Bám sát chủ đề" />
            <Bar score={c.grammar} label="Ngữ pháp" />
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Chi tiết phát âm từng từ</h2>
        <p className="mt-1 text-sm text-slate-500">Bấm vào một từ để xem điểm từng âm và nghe phát âm mẫu.</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <li className="flex items-center gap-1.5">
            <span className="rounded bg-red-50 px-1 text-red-600 underline decoration-red-500">abc</span> Phát âm sai
          </li>
          <li className="flex items-center gap-1.5">
            <span className="rounded border border-dashed border-emerald-400 bg-emerald-50 px-1 text-emerald-700">abc</span>{' '}
            Bỏ sót
          </li>
          <li className="flex items-center gap-1.5">
            <span className="rounded border border-dashed border-slate-400 bg-slate-100 px-1 text-slate-500 line-through">
              abc
            </span>{' '}
            Thừa từ
          </li>
          <li className="flex items-center gap-1.5">
            <span className="font-bold text-violet-600">—</span> Ngắt nghỉ bất thường
          </li>
          <li className="flex items-center gap-1.5">
            <span className="font-bold text-red-600">|</span> Thiếu ngắt nghỉ
          </li>
        </ul>
        <div className="mt-4">
          <Words words={p.words} canSpeak={canSpeak} />
        </div>
        <div className="mt-6 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700">Bạn đã nói</h3>
          <p className="mt-1 text-slate-700 italic">{p.transcript || '(Không nhận diện được giọng nói)'}</p>
        </div>
      </section>

      {c && (
        <section className={card}>
          <h2 className="text-lg font-semibold">Nhận xét nội dung</h2>
          {c.isOffTopic && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
            >
              ⚠ Câu trả lời chưa bám sát chủ đề
            </p>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-4">
              <h3 className="font-semibold text-emerald-800">Điểm mạnh</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-emerald-900">{c.strengths || '—'}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-800">Cần cải thiện</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-amber-900">{c.improvements || '—'}</p>
            </div>
          </div>

          {c.corrections.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold">Sửa lỗi</h3>
              <ul className="mt-2 divide-y divide-slate-100">
                {c.corrections.map((x, i) => (
                  <li key={i} className="py-3">
                    <p>
                      <del className="text-red-600">{x.original}</del> <span aria-hidden>→</span>{' '}
                      <ins className="font-medium text-emerald-700 no-underline">{x.corrected}</ins>
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{x.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.improvedAnswer && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Câu trả lời gợi ý</h3>
                {canSpeak && (
                  <button type="button" onClick={() => speak(c.improvedAnswer)} className={smallBtn}>
                    🔊 Nghe
                  </button>
                )}
              </div>
              <p lang="en" className="mt-2 whitespace-pre-line rounded-xl bg-blue-50 p-4 leading-relaxed text-slate-800">
                {c.improvedAnswer}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
