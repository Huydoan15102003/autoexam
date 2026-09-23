import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import { SiteHeader } from '@/components/site-header'
import './globals.css'

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: { default: 'AutoExam — Luyện nói & viết tiếng Anh với AI', template: '%s | AutoExam' },
  description:
    'Luyện nói & viết tiếng Anh với AI: phát âm chấm bằng Azure Speech, bài nói và bài viết VSTEP chấm bằng GPT-5 mini.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className="h-full">
      <body className={`${font.className} flex min-h-full flex-col bg-slate-50 text-slate-900 antialiased`}>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  )
}
