import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-blue-700">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Không tìm thấy trang</h1>
        <p className="mt-2 text-slate-600">
          Trang bạn tìm không tồn tại, đã bị xóa hoặc bạn không có quyền xem.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800">
            Về trang chủ
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Vào Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
