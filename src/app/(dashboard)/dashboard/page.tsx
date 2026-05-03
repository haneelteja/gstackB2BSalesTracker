import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Target, Mail, TrendingUp, ArrowRight, Activity, Users, ChevronRight, Zap } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isManager = profile?.role === 'manager'

  const [{ count: productCount }, { count: leadCount }, { count: messageCount }, { count: teamCount }] = await Promise.all([
    isManager
      ? supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active')
      : supabase.from('user_products').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    isManager
      ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'rep')
      : supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified'),
  ])

  const { data: recentLeads } = await supabase
    .from('leads')
    .select('id, company_name, contact_name, status, created_at, products(name)')
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: pendingMessages } = await supabase
    .from('messages')
    .select('id, channel, subject, body, leads(company_name)')
    .eq('status', 'pending_review')
    .limit(3)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = [
    {
      label: isManager ? 'Active Products' : 'My Products',
      value: productCount ?? 0,
      icon: Package,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      href: '/products',
      sub: 'in pipeline',
    },
    {
      label: 'Total Leads',
      value: leadCount ?? 0,
      icon: Target,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      href: '/leads',
      sub: 'across products',
    },
    {
      label: 'Messages Sent',
      value: messageCount ?? 0,
      icon: Mail,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      href: '/outreach',
      sub: 'outreach sent',
    },
    {
      label: isManager ? 'Sales Reps' : 'Qualified Leads',
      value: teamCount ?? 0,
      icon: isManager ? Users : TrendingUp,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      href: isManager ? '/team' : '/leads',
      sub: isManager ? 'on your team' : 'ready to contact',
    },
  ]

  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    new:           { bg: 'bg-slate-500/10',   text: 'text-slate-500',   dot: 'bg-slate-400' },
    qualified:     { bg: 'bg-blue-500/10',    text: 'text-blue-500',    dot: 'bg-blue-400' },
    contacted:     { bg: 'bg-violet-500/10',  text: 'text-violet-500',  dot: 'bg-violet-400' },
    replied:       { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-400' },
    converted:     { bg: 'bg-green-500/10',   text: 'text-green-500',   dot: 'bg-green-400' },
    disqualified:  { bg: 'bg-red-500/10',     text: 'text-red-500',     dot: 'bg-red-400' },
    lost:          { bg: 'bg-red-500/10',     text: 'text-red-500',     dot: 'bg-red-400' },
    follow_up:     { bg: 'bg-amber-500/10',   text: 'text-amber-500',   dot: 'bg-amber-400' },
  }

  const quickActions = [
    { href: '/products/new', label: 'Add new product', desc: 'Start a new sales pipeline', icon: Package, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { href: '/leads', label: 'Manage leads', desc: 'View and qualify your leads', icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { href: '/outreach', label: 'Review outreach', desc: 'Approve pending messages', icon: Mail, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ...(isManager ? [{ href: '/team', label: 'Manage team', desc: 'Assign reps to products', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' }] : []),
  ]

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Live</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {greeting}, {profile?.full_name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening across your sales pipeline.</p>
        </div>
        {pendingMessages && pendingMessages.length > 0 && (
          <Link href="/outreach">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {pendingMessages.length} message{pendingMessages.length > 1 ? 's' : ''} awaiting review
              </span>
              <ChevronRight className="w-4 h-4 text-amber-500" />
            </div>
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href}>
            <Card className={`hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group border ${stat.border} bg-card`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-3xl font-bold text-foreground tabular-nums">{stat.value}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent leads — 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6">
            <CardTitle className="text-base font-semibold flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              Recent Leads
            </CardTitle>
            <Link href="/leads" className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {recentLeads && recentLeads.length > 0 ? (
              <div className="space-y-1">
                {recentLeads.map((lead: { id: string; company_name: string; contact_name: string; status: string; products?: { name: string }[] | { name: string } | null }) => {
                  const st = statusStyles[lead.status] ?? statusStyles.new
                  const productName = Array.isArray(lead.products)
                    ? lead.products[0]?.name
                    : (lead.products as { name: string } | null)?.name
                  return (
                    <div key={lead.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-accent/50 transition-colors -mx-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {lead.company_name[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{lead.company_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.contact_name}{productName ? ` · ${productName}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text} flex-shrink-0 ml-3`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {lead.status.replace('_', ' ')}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 opacity-30" />
                </div>
                <p className="text-sm font-medium">No leads yet</p>
                <p className="text-xs mt-1 opacity-70">Add a product and generate your first leads</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 space-y-1">
              {quickActions.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
                    <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Pending outreach preview */}
          {pendingMessages && pendingMessages.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-3">
                {pendingMessages.map((msg: { id: string; channel: string; subject?: string | null; body: string; leads?: { company_name: string }[] | null }) => (
                  <div key={msg.id} className="text-xs space-y-0.5">
                    <p className="font-medium text-foreground">
                      {msg.leads?.[0]?.company_name ?? 'Lead'}
                    </p>
                    <p className="text-muted-foreground line-clamp-1">
                      {msg.subject ?? msg.body}
                    </p>
                  </div>
                ))}
                <Link href="/outreach" className="block text-center text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-500 pt-1 transition-colors">
                  Review &amp; send →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
