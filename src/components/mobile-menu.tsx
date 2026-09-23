'use client'

import { useId } from 'react'

// Native popover: light-dismiss (outside tap, Esc) for free. The header lives in the root layout and survives
// client navigations, so close it explicitly when a link or button inside is tapped.
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const id = useId()
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label="Menu"
        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
      <div
        id={id}
        popover="auto"
        onClick={(e) => {
          if ((e.target as Element).closest('a, button')) e.currentTarget.hidePopover()
        }}
        className="inset-auto top-[4.5rem] right-4 m-0 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-lg"
      >
        {children}
      </div>
    </>
  )
}
