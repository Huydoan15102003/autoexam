'use client'

// Catches unexpected render errors (e.g. Supabase unreachable) instead of Next's blank default screen.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Đã có lỗi xảy ra</h1>
        <p className="mt-2 text-slate-600">Hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
        >
          Thử lại
        </button>
      </div>
    </main>
  )
}
