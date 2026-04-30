import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Target, Mail, TrendingUp, ArrowRight, Activity } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const isManager = profile?.role === 'manager'

  const [{ count: productCount }, { count: leadCount }, { count: messageCount }] = await Promise.all([
    isManager
      ? supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active')
      : supabase.from('user_products').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
  ])

  const { data: recentLeads } = await supabase
    .from('leads')
    .select('id, company_name, contact_name, status, created_at, products(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    { label: 'Active Products', value: productCount ?? 0, icon: Package, color: 'text-violet-500', bg: 'bg-violet-500/10', href: '/products' },
    { label: 'Total Leads', value: leadCount ?? 0, icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10', href: '/leads' },
    { label: 'Messages Sent', value: messageCount ?? 0, icon: Mail, color: 'text-emerald-500', bg: 'bg-emerald-500/10', href: '/outreach' },
    { label: 'Conversion Rate', value: '—', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10', href: '/analytics' },
  ]

  const statusColors: Record<string, string> = {
    new: 'bg-slate-500/15 text-slate-400',
    qualified: 'bg-blue-500/15 text-blue-400',
    contacted: 'bg-violet-500/15 text-violet-400',
    replied: 'bg-emerald-500/15 text-emerald-400',
    converted: 'bg-green-500/15 text-green-400',
    disqualified: 'bg-red-500/15 text-red-400',
    lost: 'bg-red-500/15 text-red-400',
    follow_up: 'bg-amber-500/15 text-amber-400',
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your sales pipeline today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Leads
            </CardTitle>
            <Link href="/leads" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentLeads && recentLeads.length > 0 ? (
              <div className="space-y-3">
                {recentLeads.map((lead: { id: string; company_name: string; contact_name: string; status: string; products?: { name: string }[] | { name: string } | null }) => (
                  <div key={lead.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{lead.company_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.contact_name} · {(Array.isArray(lead.products) ? lead.products[0]?.name : (lead.products as { name: string } | null)?.name) ?? '—'}</p>
                    </div>
                    <Badge className={`text-xs font-medium border-0 ${statusColors[lead.status] ?? 'bg-slate-500/15 text-slate-400'}`}>
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No leads yet. Add a product and generate leads.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: '/products/new', label: 'Add new product', icon: Package, color: 'text-violet-500' },
              { href: '/leads', label: 'Manage leads', icon: Target, color: 'text-blue-500' },
              { href: '/outreach', label: 'Review messages', icon: Mail, color: 'text-emerald-500' },
              ...(isManager ? [{ href: '/team', label: 'Manage team', icon: Package, color: 'text-amber-500' }] : []),
            ].map(action => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <action.icon className={`w-4 h-4 ${action.color}`} />
                <span className="text-sm font-medium text-foreground">{action.label}</span>
                <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
