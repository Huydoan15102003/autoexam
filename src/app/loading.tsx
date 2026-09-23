// Shown instantly on every navigation while the next (dynamic) page renders on the server; the header stays put.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6" aria-busy="true">
      <span className="sr-only" role="status">
        Đang tải…
      </span>
      <div className="h-8 w-64 max-w-full animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-8 h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="mt-4 h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </main>
  )
}
