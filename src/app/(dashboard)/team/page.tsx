import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamManager } from '@/components/dashboard/team-manager'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'manager') redirect('/dashboard')

  const [{ data: products }, { data: members }, { data: assignments }] = await Promise.all([
    supabase.from('products').select('id, name, category, status').eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email, role, avatar_url'),
    supabase.from('user_products').select('id, user_id, product_id, assigned_at'),
  ])

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Team &amp; Products</h1>
        <p className="text-muted-foreground mt-1">Manage team members and assign them to products</p>
      </div>
      <TeamManager
        products={products ?? []}
        members={members ?? []}
        assignments={assignments ?? []}
      />
    </div>
  )
}
