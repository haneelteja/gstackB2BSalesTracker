import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, MessageSquare, Send, Clock } from 'lucide-react'

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-500',
  pending_review: 'bg-amber-500/15 text-amber-500',
  approved: 'bg-blue-500/15 text-blue-500',
  sent: 'bg-emerald-500/15 text-emerald-500',
  failed: 'bg-red-500/15 text-red-500',
}

export default async function OutreachOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: messages } = await supabase
    .from('messages')
    .select('*, leads(company_name, contact_name), products(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  const pending = messages?.filter(m => m.status === 'pending_review') ?? []
  const sent = messages?.filter(m => m.status === 'sent') ?? []

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Outreach</h1>
        <p className="text-muted-foreground mt-1">All messages across products</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', count: pending.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Sent', count: sent.length, icon: Send, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Total', count: messages?.length ?? 0, icon: Mail, color: 'text-primary', bg: 'bg-primary/10' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.count}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {(messages ?? []).map((msg: { id: string; channel: string; subject?: string; body: string; status: string; sent_at?: string; leads?: { company_name: string; contact_name: string } | null; products?: { name: string } | null }) => (
          <Card key={msg.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {msg.channel === 'email'
                    ? <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    : <MessageSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {(msg.leads as { company_name: string } | null)?.company_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{msg.subject ?? msg.body.slice(0, 60)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(msg.products as { name: string } | null)?.name && <Badge variant="secondary" className="text-xs">{(msg.products as { name: string }).name}</Badge>}
                  <Badge className={`text-xs border-0 ${statusColors[msg.status]}`}>{msg.status.replace('_', ' ')}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!messages || messages.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No messages yet. Go to a product&apos;s Outreach tab to compose messages.</p>
          </div>
        )}
      </div>
    </div>
  )
}
