import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Target, Mail, TrendingUp } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ count: totalLeads }, { count: qualifiedLeads }, { count: convertedLeads }, { count: sentMessages }] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
  ])

  const conversionRate = totalLeads ? Math.round(((convertedLeads ?? 0) / totalLeads) * 100) : 0
  const qualificationRate = totalLeads ? Math.round(((qualifiedLeads ?? 0) / totalLeads) * 100) : 0

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Sales pipeline performance overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: totalLeads ?? 0, icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Qualified', value: qualifiedLeads ?? 0, icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10' },
          { label: 'Converted', value: convertedLeads ?? 0, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Msgs Sent', value: sentMessages ?? 0, icon: Mail, color: 'text-primary', bg: 'bg-primary/10' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Qualification Rate</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{qualificationRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">{qualifiedLeads ?? 0} of {totalLeads ?? 0} leads qualified</p>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${qualificationRate}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Conversion Rate</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-emerald-500">{conversionRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">{convertedLeads ?? 0} of {totalLeads ?? 0} leads converted</p>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${conversionRate}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
