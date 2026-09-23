import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PasswordForm, ProfileForm } from '@/components/account-forms'
import { createClient, getClaims } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Tài khoản' }

export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const claims = await getClaims()
  if (!claims) redirect('/login')
  const { reset } = await searchParams

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', claims.sub).single()
  const fullName: string = profile?.full_name || claims.user_metadata?.full_name || ''

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm font-medium text-blue-700 hover:underline">
        ← Quay lại Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Tài khoản</h1>
      <p className="mt-1 mb-6 text-slate-600">Cập nhật họ tên và mật khẩu đăng nhập.</p>

      <div className="space-y-4">
        {reset === '1' ? (
          <>
            <PasswordForm reset />
            <ProfileForm fullName={fullName} email={claims.email ?? ''} />
          </>
        ) : (
          <>
            <ProfileForm fullName={fullName} email={claims.email ?? ''} />
            <PasswordForm reset={false} />
          </>
        )}
      </div>
    </main>
  )
}
