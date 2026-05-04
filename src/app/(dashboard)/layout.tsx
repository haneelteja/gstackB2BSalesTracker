import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Toaster } from '@/components/ui/sonner'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service role for profile operations so RLS never blocks this critical path
  const admin = await createServiceClient()
  let { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const { data: created } = await admin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name ?? user.email!.split('@')[0],
        role: (user.user_metadata?.role as 'manager' | 'rep') ?? 'rep',
      })
      .select()
      .single()
    profile = created
  }

  if (!profile) {
    // Profile creation failed but user IS authenticated — use metadata fallback
    // Redirecting to /login here would cause an infinite loop with the middleware
    profile = {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name ?? user.email!.split('@')[0],
      role: (user.user_metadata?.role as 'manager' | 'rep') ?? 'rep',
      created_at: new Date().toISOString(),
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar profile={profile as Profile} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
