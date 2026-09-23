'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AssessmentResultView } from '@/components/speaking/assessment-result'
import { savedId, type SavedQuestion } from '@/lib/questions'
import { READ_PASSAGES, TOPICS } from '@/lib/speaking/tasks'
import { MAX_RECORDING_SEC, MIN_RECORDING_SEC, type AssessResponse, type Mode } from '@/lib/speaking/types'
import { toWav16k } from '@/lib/speaking/wav'

type Status = 'idle' | 'recording' | 'recorded' | 'submitting' | 'done'

const CUSTOM = 'custom'
const MAX_CHARS: Record<Mode, number> = { read: 1500, topic: 500 }
const UNSUPPORTED = 'Trình duyệt không hỗ trợ ghi âm hoặc trang không chạy trên HTTPS.'

const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
const primary = 'rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60'
const secondary =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20'

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function micError(e: unknown) {
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Bạn chưa cấp quyền micro. Hãy cho phép truy cập micro trong trình duyệt.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy micro.'
  if (name === 'NotReadableError') return 'Micro đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó và thử lại.'
  return 'Không thể bắt đầu ghi âm. Vui lòng thử lại.'
}

// `saved`: the user's own read/topic questions. `initialId` (from ?q=) preselects a saved question (uuid)
// or a built-in passage/topic (slug) — both come from the question bank's "Luyện ngay".
export function SpeakingPractice({ saved, initialId }: { saved: SavedQuestion[]; initialId?: string }) {
  const router = useRouter()
  const init = saved.find((q) => q.id === initialId)
  const initRead = init?.kind === 'read' ? savedId(init.id) : READ_PASSAGES.find((p) => p.id === initialId)?.id
  const initTopic = init?.kind === 'topic' ? savedId(init.id) : TOPICS.find((t) => t.id === initialId)?.id

  const [mode, setMode] = useState<Mode>(initTopic ? 'topic' : 'read')
  const [taskId, setTaskId] = useState<Record<Mode, string>>({
    read: initRead ?? READ_PASSAGES[0].id,
    topic: initTopic ?? TOPICS[0].id,
  })
  const [custom, setCustom] = useState<Record<Mode, string>>({ read: '', topic: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [recSec, setRecSec] = useState(0)
  const [audio, setAudio] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<{ message: string; login?: boolean } | null>(null)
  const [response, setResponse] = useState<AssessResponse | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const startedAtRef = useRef(0)

  const isCustom = taskId[mode] === CUSTOM
  const mine = saved.filter((q) => q.kind === mode)
  const own = mine.find((q) => savedId(q.id) === taskId[mode])
  const passage = READ_PASSAGES.find((p) => p.id === taskId.read)
  const topic = TOPICS.find((t) => t.id === taskId.topic)
  const prompt = isCustom
    ? custom[mode].trim()
    : own
      ? own.content.trim()
      : mode === 'read'
      ? (passage?.text ?? '')
      : topic
        ? [topic.question, ...(topic.hints ?? []).map((h) => `- ${h}`)].join('\n')
        : ''
  const busy = status === 'recording' || status === 'submitting'

  // revoke the previous object URL whenever the recording is replaced, and on unmount
  useEffect(() => () => void (audio && URL.revokeObjectURL(audio.url)), [audio])

  // stop mic if the user leaves mid-recording
  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    },
    [],
  )

  useEffect(() => {
    if (status !== 'recording') return
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - startedAtRef.current) / 1000)
      setRecSec(Math.min(sec, MAX_RECORDING_SEC))
      if (sec >= MAX_RECORDING_SEC && recorderRef.current?.state === 'recording') recorderRef.current.stop()
    }, 250)
    return () => clearInterval(id)
  }, [status])

  function reset() {
    setAudio(null)
    setResponse(null)
    setError(null)
    setRecSec(0)
    setStatus('idle')
  }

  function switchMode(m: Mode) {
    if (m === mode || busy) return
    setMode(m)
    reset()
  }

  async function startRecording() {
    setError(null)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError({ message: UNSUPPORTED })
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      })
    } catch (e) {
      setError({ message: micError(e) })
      return
    }

    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(stream) // browser picks the mime type
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      setError({ message: UNSUPPORTED })
      return
    }
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      recorderRef.current = null
      const duration = (Date.now() - startedAtRef.current) / 1000
      const blob = new Blob(chunks, { type: rec.mimeType || chunks[0]?.type })
      if (duration < MIN_RECORDING_SEC || !blob.size) {
        setStatus('idle')
        setRecSec(0)
        setError({ message: `Bản ghi quá ngắn (tối thiểu ${MIN_RECORDING_SEC} giây). Hãy ghi âm lại.` })
        return
      }
      setAudio({ blob, url: URL.createObjectURL(blob) })
      setStatus('recorded')
    }

    recorderRef.current = rec
    startedAtRef.current = Date.now()
    setAudio(null)
    setRecSec(0)
    rec.start(1000)
    setStatus('recording')
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  async function submit() {
    if (!audio) return
    if (!prompt) {
      setError({ message: mode === 'read' ? 'Hãy nhập đoạn văn cần đọc.' : 'Hãy nhập câu hỏi hoặc chủ đề.' })
      return
    }
    setError(null)
    setStatus('submitting')

    let wav: Blob
    try {
      wav = (await toWav16k(audio.blob)).wav
    } catch {
      setError({ message: 'Không thể xử lý bản ghi âm. Hãy ghi âm lại hoặc thử trình duyệt khác.' })
      setStatus('recorded')
      return
    }

    try {
      const fd = new FormData()
      fd.append('audio', wav, 'answer.wav')
      fd.append('mode', mode)
      fd.append('prompt', prompt)
      const res = await fetch('/api/speaking/assess', { method: 'POST', body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.result) {
        setError({
          message: data?.error ?? `Có lỗi xảy ra (mã ${res.status}). Vui lòng thử lại.`,
          login: res.status === 401,
        })
        setStatus('recorded')
        return
      }
      setResponse(data as AssessResponse)
      setStatus('done')
      router.refresh()
    } catch {
      setError({ message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.' })
      setStatus('recorded')
    }
  }

  const tasks = mode === 'read' ? READ_PASSAGES : TOPICS

  return (
    <div className="space-y-4">
      <section className={card}>
        <div role="tablist" aria-label="Chế độ luyện" className="inline-flex rounded-xl bg-slate-100 p-1">
          {(
            [
              ['read', 'Đọc to'],
              ['topic', 'Nói theo chủ đề'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              disabled={busy}
              onClick={() => switchMode(m)}
              className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${mode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {mode === 'read'
            ? 'Đọc to đoạn văn tiếng Anh. Hệ thống chấm phát âm, độ chính xác, độ trôi chảy, ngữ điệu và độ đầy đủ so với văn bản mẫu.'
            : 'Trả lời câu hỏi theo chủ đề (kiểu IELTS Speaking). Hệ thống chấm phát âm và dùng GPT-5 mini chấm nội dung: từ vựng, ngữ pháp và mức độ bám sát chủ đề.'}
        </p>

        <div className="mt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor="task" className="text-sm font-medium text-slate-700">
              {mode === 'read' ? 'Chọn đoạn văn' : 'Chọn chủ đề'}
            </label>
            <span className="flex gap-3 text-sm font-medium">
              <Link href={`/questions?kind=${mode}`} className="text-blue-700 hover:underline">
                Kho câu hỏi
              </Link>
              <Link href={`/questions?create=${mode}`} className="text-blue-700 hover:underline">
                + Tạo mới
              </Link>
            </span>
          </div>
          <select
            id="task"
            className={`${input} mt-1 bg-white`}
            value={taskId[mode]}
            disabled={busy}
            onChange={(e) => {
              setTaskId({ ...taskId, [mode]: e.target.value })
              reset()
            }}
          >
            <optgroup label="Đề mẫu">
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.level}] {t.title}
                </option>
              ))}
            </optgroup>
            {mine.length > 0 && (
              <optgroup label="Câu hỏi của tôi">
                {mine.map((q) => (
                  <option key={q.id} value={savedId(q.id)}>
                    {q.title}
                  </option>
                ))}
              </optgroup>
            )}
            <option value={CUSTOM}>Tự nhập (không lưu)…</option>
          </select>
        </div>

        {isCustom ? (
          <div className="mt-4">
            <label htmlFor="custom" className="text-sm font-medium text-slate-700">
              {mode === 'read' ? 'Đoạn văn tiếng Anh bạn muốn đọc' : 'Câu hỏi hoặc chủ đề (tiếng Anh)'}
            </label>
            <textarea
              id="custom"
              rows={mode === 'read' ? 5 : 3}
              maxLength={MAX_CHARS[mode]}
              disabled={busy}
              value={custom[mode]}
              onChange={(e) => setCustom({ ...custom, [mode]: e.target.value })}
              placeholder={mode === 'read' ? 'Dán hoặc gõ đoạn văn tiếng Anh…' : 'Ví dụ: Describe your favourite book.'}
              className={`${input} mt-1`}
              lang="en"
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {custom[mode].length}/{MAX_CHARS[mode]}
            </p>
          </div>
        ) : own ? (
          <div className="mt-4 rounded-xl bg-blue-50 p-5">
            <p lang="en" className={`whitespace-pre-line text-lg leading-relaxed text-slate-800 ${mode === 'topic' ? 'font-semibold' : ''}`}>
              {own.content}
            </p>
          </div>
        ) : mode === 'read' ? (
          passage && (
            <div className="mt-4 rounded-xl bg-blue-50 p-5">
              <p lang="en" className="text-lg leading-relaxed text-slate-800">
                {passage.text}
              </p>
            </div>
          )
        ) : (
          topic && (
            <div className="mt-4 rounded-xl bg-blue-50 p-5" lang="en">
              <p className="text-lg font-semibold text-slate-800">{topic.question}</p>
              {topic.hints?.length ? (
                <>
                  <p className="mt-3 text-sm font-medium text-slate-600" lang="vi">
                    Gợi ý — bạn nên nói về:
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
                    {topic.hints.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          )
        )}
      </section>

      {status === 'done' && response ? (
        <>
          <AssessmentResultView result={response.result} />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={reset} className={primary}>
              Luyện tiếp
            </button>
            {response.id && (
              <Link href={`/practice/${response.id}`} className={secondary}>
                Xem chi tiết
              </Link>
            )}
          </div>
        </>
      ) : (
        <section className={card}>
          <h2 className="text-lg font-semibold">Ghi âm</h2>
          <div className="mt-4 flex flex-col items-center gap-3">
            {status === 'recording' ? (
              <button
                type="button"
                onClick={stopRecording}
                aria-label="Dừng ghi âm"
                className="relative flex size-20 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-40" aria-hidden />
                <span className="relative size-7 rounded-md bg-white" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={status === 'submitting'}
                aria-label={audio ? 'Ghi âm lại' : 'Bắt đầu ghi âm'}
                className="flex size-20 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300 disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="size-9" fill="currentColor" aria-hidden>
                  <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
                  <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A7 7 0 0 0 19 11Z" />
                </svg>
              </button>
            )}

            <p className="font-mono text-2xl tabular-nums text-slate-800" aria-hidden>
              {mmss(recSec)} <span className="text-base text-slate-400">/ {mmss(MAX_RECORDING_SEC)}</span>
            </p>
            <p className="text-sm text-slate-600" aria-live="polite">
              {status === 'recording'
                ? 'Đang ghi âm… Bấm nút để dừng.'
                : status === 'submitting'
                  ? ''
                  : audio
                    ? 'Nghe lại bản ghi, sau đó nộp bài hoặc ghi âm lại.'
                    : `Bấm nút micro để bắt đầu (tối đa ${MAX_RECORDING_SEC / 60} phút).`}
            </p>
          </div>

          {audio && status !== 'recording' && (
            <div className="mt-4 space-y-4">
              <audio controls src={audio.url} className="w-full" />
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" onClick={startRecording} disabled={status === 'submitting'} className={secondary}>
                  Ghi âm lại
                </button>
                <button type="button" onClick={submit} disabled={status === 'submitting'} className={primary}>
                  Nộp bài chấm điểm
                </button>
              </div>
            </div>
          )}

          {status === 'submitting' && (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 flex items-center justify-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800"
            >
              <span
                className="size-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700"
                aria-hidden
              />
              <span>
                Đang chấm điểm phát âm{mode === 'topic' ? ' và nội dung' : ''}…
                <span className="block text-xs text-blue-700/80">Quá trình này có thể mất 10–60 giây.</span>
              </span>
            </div>
          )}
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
          {error.login && (
            <>
              {' '}
              <Link href="/login" className="font-medium underline">
                Đăng nhập
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
