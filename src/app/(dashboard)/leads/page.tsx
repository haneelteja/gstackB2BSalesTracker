import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Mail, Phone } from 'lucide-react'

const statusColors: Record<string, string> = {
  new: 'bg-slate-500/15 text-slate-500', qualified: 'bg-blue-500/15 text-blue-500',
  disqualified: 'bg-red-500/15 text-red-500', contacted: 'bg-violet-500/15 text-violet-500',
  replied: 'bg-emerald-500/15 text-emerald-500', follow_up: 'bg-amber-500/15 text-amber-500',
  converted: 'bg-green-500/15 text-green-500', lost: 'bg-red-500/15 text-red-500',
}

export default async function AllLeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: leads } = await supabase.from('leads').select('*, products(name)').order('created_at', { ascending: false })
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-3xl font-bold text-foreground">All Leads</h1><p className="text-muted-foreground mt-1">{leads?.length ?? 0} total leads across all products</p></div>
      <div className="space-y-2">
        {(leads ?? []).map((lead: { id: string; company_name: string; contact_name: string; contact_email?: string; contact_phone?: string; status: string; products?: { name: string } | null }) => (
          <Card key={lead.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4 text-primary" /></div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">{lead.company_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {lead.contact_name && <span>{lead.contact_name}</span>}
                      {lead.contact_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.contact_email}</span>}
                      {lead.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.contact_phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(lead.products as { name: string } | null)?.name && <Badge variant="secondary" className="text-xs">{(lead.products as { name: string }).name}</Badge>}
                  <Badge className={`text-xs border-0 ${statusColors[lead.status]}`}>{lead.status.replace('_',' ')}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!leads || leads.length === 0) && <div className="text-center py-16 text-muted-foreground"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No leads yet. Add products and generate leads.</p></div>}
      </div>
    </div>
  )
}
