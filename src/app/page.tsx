import Link from 'next/link'
import { getUserEmail } from '@/lib/supabase/server'

const primary = 'rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800'
const secondary = 'rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50'

const features = [
  {
    tag: 'Azure Speech',
    title: 'Chấm phát âm chi tiết',
    desc: 'Điểm Accuracy, Fluency, Completeness và Prosody, kèm lỗi phát âm của từng từ để bạn biết chính xác cần sửa ở đâu.',
  },
  {
    tag: 'GPT-5 mini',
    title: 'Chấm nội dung bài nói',
    desc: 'Chấm từ vựng, ngữ pháp và mức độ bám sát chủ đề, kèm lỗi cần sửa và câu trả lời gợi ý tốt hơn.',
  },
  {
    tag: 'VSTEP Writing',
    title: 'Chấm bài viết theo chuẩn VSTEP',
    desc: 'Task 1 (thư/email) và Task 2 (bài luận) được chấm theo 4 tiêu chí, thang 0–10, quy đổi Bậc 3–5 (B1–C1).',
  },
  {
    tag: 'Sửa lỗi',
    title: 'Lỗi được đánh dấu ngay trong bài',
    desc: 'Lỗi ngữ pháp, từ vựng, chính tả được tô sáng trong bài viết, kèm gợi ý sửa và giải thích bằng tiếng Việt.',
  },
  {
    tag: 'Lịch sử',
    title: 'Theo dõi tiến bộ',
    desc: 'Mỗi bài nói và bài viết đều được lưu lại để bạn xem lại điểm số và thấy mình tiến bộ qua từng ngày.',
  },
  {
    tag: 'Supabase RLS',
    title: 'Dữ liệu được bảo vệ',
    desc: 'Row Level Security đảm bảo chỉ chính bạn mới xem được hồ sơ và các bài luyện của mình.',
  },
]

const steps = [
  { title: 'Tạo tài khoản', desc: 'Đăng ký miễn phí bằng email chỉ trong chưa đầy một phút.' },
  { title: 'Nói hoặc viết', desc: 'Chọn đề, ghi âm câu trả lời hoặc viết bài tiếng Anh ngay trên trình duyệt.' },
  { title: 'Nhận điểm & góp ý', desc: 'Xem điểm, lỗi được đánh dấu chi tiết và nhận xét sau vài giây.' },
]

const sampleScores = [
  { label: 'Accuracy', value: 88 },
  { label: 'Fluency', value: 81 },
  { label: 'Completeness', value: 95 },
  { label: 'Prosody', value: 76 },
]

export default async function HomePage() {
  const email = await getUserEmail()

  return (
    <main className="flex-1">
      <section className="bg-linear-to-b from-white to-slate-50">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2">
          <div>
            <p className="inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              AI English speaking & writing practice
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Luyện nói & viết tiếng Anh, <span className="text-blue-700">chấm điểm ngay</span> bằng AI
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              AutoExam chấm phát âm bằng Azure Speech, chấm nội dung bài nói và bài viết VSTEP bằng GPT-5 mini — biết
              ngay mình sai ở đâu và cần cải thiện gì.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {email ? (
                <>
                  <Link href="/dashboard" className={`${primary} text-center`}>
                    Vào Dashboard
                  </Link>
                  <Link href="/practice" className={`${secondary} text-center`}>
                    Luyện nói ngay
                  </Link>
                  <Link href="/writing" className={`${secondary} text-center`}>
                    Luyện viết
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup" className={`${primary} text-center`}>
                    Đăng ký miễn phí
                  </Link>
                  <Link href="/login" className={`${secondary} text-center`}>
                    Đăng nhập
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-label="Ví dụ kết quả chấm điểm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kết quả mẫu</p>
            <p className="mt-1 text-sm text-slate-600">“Describe a place where you like to relax.”</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {sampleScores.map((s) => (
                <div key={s.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${s.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-700">
              I usually go to a small{' '}
              <span className="rounded bg-amber-100 px-1 text-amber-800" title="Phát âm chưa chuẩn">
                café
              </span>{' '}
              near my house to{' '}
              <span className="rounded bg-red-100 px-1 text-red-700 line-through" title="Bỏ sót từ">
                relax
              </span>{' '}
              and read books.
            </p>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
              <span className="text-sm font-medium text-blue-900">Nội dung (GPT-5 mini)</span>
              <span className="text-lg font-bold text-blue-800">Band 6.5</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tính năng nổi bật</h2>
        <p className="mt-2 text-slate-600">Mọi thứ bạn cần để tự luyện nói và viết hiệu quả mỗi ngày.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{f.tag}</span>
              <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Cách hoạt động</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 sm:flex-col">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          {!email && (
            <Link href="/signup" className={`${primary} mt-10 inline-block`}>
              Bắt đầu miễn phí
            </Link>
          )}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6">
        <p>© 2026 AutoExam — Luyện nói & viết tiếng Anh với AI.</p>
        <p>Next.js · Supabase · Azure Speech · OpenAI</p>
      </footer>
    </main>
  )
}
