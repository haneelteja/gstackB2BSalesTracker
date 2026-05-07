import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Target, Mail, TrendingUp, MessageSquare } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { count: totalLeads },
    { count: qualifiedLeads },
    { count: convertedLeads },
    { count: contactedLeads },
    { count: repliedLeads },
    { count: totalSent },
    { count: emailSent },
    { count: whatsappSent },
    { count: pendingReview },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'contacted'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'replied'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'sent').eq('channel', 'email'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'sent').eq('channel', 'whatsapp'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
  ])

  // Per-product breakdown
  const { data: allLeads } = await supabase.from('leads').select('product_id, status')
  const { data: products } = await supabase.from('products').select('id, name, category').eq('status', 'active').order('created_at', { ascending: false })

  type ProductStat = { id: string; name: string; category: string; total: number; qualified: number; converted: number }
  const statsMap: Record<string, ProductStat> = {}
  for (const p of products ?? []) {
    statsMap[p.id] = { id: p.id, name: p.name, category: p.category, total: 0, qualified: 0, converted: 0 }
  }
  for (const lead of allLeads ?? []) {
    if (!statsMap[lead.product_id]) continue
    statsMap[lead.product_id].total++
    if (['qualified', 'contacted', 'replied', 'converted'].includes(lead.status)) statsMap[lead.product_id].qualified++
    if (lead.status === 'converted') statsMap[lead.product_id].converted++
  }
  const productStats = Object.values(statsMap).sort((a, b) => b.total - a.total)

  const total = totalLeads ?? 0
  const conversionRate = total ? Math.round(((convertedLeads ?? 0) / total) * 100) : 0
  const qualificationRate = total ? Math.round(((qualifiedLeads ?? 0) / total) * 100) : 0

  // Funnel stages with percentage widths
  const funnelStages = [
    { label: 'Total Leads', count: total, pct: 100, color: 'bg-blue-500' },
    { label: 'Qualified', count: qualifiedLeads ?? 0, pct: total ? Math.round(((qualifiedLeads ?? 0) / total) * 100) : 0, color: 'bg-violet-500' },
    { label: 'Contacted', count: contactedLeads ?? 0, pct: total ? Math.round(((contactedLeads ?? 0) / total) * 100) : 0, color: 'bg-amber-500' },
    { label: 'Replied', count: repliedLeads ?? 0, pct: total ? Math.round(((repliedLeads ?? 0) / total) * 100) : 0, color: 'bg-emerald-400' },
    { label: 'Converted', count: convertedLeads ?? 0, pct: total ? Math.round(((convertedLeads ?? 0) / total) * 100) : 0, color: 'bg-green-500' },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Sales pipeline performance overview</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: total, icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Converted', value: convertedLeads ?? 0, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Messages Sent', value: totalSent ?? 0, icon: Mail, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Pending Review', value: pendingReview ?? 0, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            Pipeline Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No leads yet — add products and generate leads to see funnel data.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {funnelStages.map(stage => (
                <div key={stage.label} className="flex items-center gap-4">
                  <div className="w-20 text-xs text-right text-muted-foreground flex-shrink-0">{stage.label}</div>
                  <div className="flex-1 h-8 bg-muted/40 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-lg flex items-center px-3 transition-all duration-700`}
                      style={{ width: `${Math.max(stage.pct, stage.count > 0 ? 4 : 0)}%` }}
                    >
                      {stage.pct > 12 && (
                        <span className="text-xs font-semibold text-white">{stage.count}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-16 flex items-center gap-1.5 flex-shrink-0">
                    {stage.pct <= 12 && stage.count > 0 && (
                      <span className="text-xs font-medium text-foreground">{stage.count}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{stage.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rates + Message channel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Qualification Rate</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary tabular-nums">{qualificationRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">{qualifiedLeads ?? 0} of {total} leads qualified</p>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${qualificationRate}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Conversion Rate</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-emerald-500 tabular-nums">{conversionRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">{convertedLeads ?? 0} of {total} leads converted</p>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${conversionRate}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Messages by Channel</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-3 h-3 text-blue-500" />
                </div>
                Email
              </div>
              <span className="font-semibold text-foreground tabular-nums">{emailSent ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-green-500/10 flex items-center justify-center">
                  <MessageSquare className="w-3 h-3 text-green-500" />
                </div>
                WhatsApp
              </div>
              <span className="font-semibold text-foreground tabular-nums">{whatsappSent ?? 0}</span>
            </div>
            {(totalSent ?? 0) > 0 && (
              <div className="h-2 rounded-full bg-muted overflow-hidden flex gap-px">
                <div
                  className="h-full bg-blue-500 rounded-l-full transition-all duration-700"
                  style={{ width: `${Math.round(((emailSent ?? 0) / (totalSent ?? 1)) * 100)}%` }}
                />
                <div className="h-full bg-green-500 flex-1 rounded-r-full" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-product table */}
      {productStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
              </div>
              Per-Product Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                    <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leads</th>
                    <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qualified</th>
                    <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Converted</th>
                    <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rate</th>
                    <th className="pb-3 pl-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {productStats.map(p => {
                    const rate = p.total ? Math.round((p.converted / p.total) * 100) : 0
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground">{p.name}</p>
                          {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                        </td>
                        <td className="py-3 text-right font-semibold tabular-nums">{p.total}</td>
                        <td className="py-3 text-right text-violet-500 tabular-nums">{p.qualified}</td>
                        <td className="py-3 text-right text-emerald-500 tabular-nums">{p.converted}</td>
                        <td className="py-3 text-right">
                          <Badge className={`text-xs border-0 tabular-nums ${
                            rate > 20 ? 'bg-emerald-500/10 text-emerald-500'
                            : rate > 5 ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-muted text-muted-foreground'
                          }`}>
                            {rate}%
                          </Badge>
                        </td>
                        <td className="py-3 pl-6">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
