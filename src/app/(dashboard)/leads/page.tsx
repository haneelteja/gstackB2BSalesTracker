'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Mail, Phone, Search, Filter, Globe, Link2 } from 'lucide-react'
import { toast } from 'sonner'

const statusColors: Record<string, string> = {
  new: 'bg-slate-500/15 text-slate-500',
  qualified: 'bg-blue-500/15 text-blue-500',
  disqualified: 'bg-red-500/15 text-red-500',
  contacted: 'bg-violet-500/15 text-violet-500',
  replied: 'bg-emerald-500/15 text-emerald-500',
  follow_up: 'bg-amber-500/15 text-amber-500',
  converted: 'bg-green-500/15 text-green-500',
  lost: 'bg-red-500/15 text-red-500',
}

type Lead = {
  id: string
  company_name: string
  contact_name: string
  contact_email?: string
  contact_phone?: string
  linkedin_url?: string
  website?: string
  status: string
  qualification_score?: number
  products?: { name: string } | null
}

export default function AllLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('leads')
        .select('id, company_name, contact_name, contact_email, contact_phone, linkedin_url, website, status, qualification_score, products(name)')
        .order('created_at', { ascending: false })
      setLeads((data as unknown as Lead[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(leadId: string, newStatus: string) {
    setUpdatingId(leadId)
    const supabase = createClient()
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
    if (error) { toast.error('Failed to update status'); setUpdatingId(null); return }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    toast.success('Status updated')
    setUpdatingId(null)
  }

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchesSearch = !q || l.company_name.toLowerCase().includes(q) || l.contact_name.toLowerCase().includes(q) || (l.contact_email ?? '').toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-3">
        <div className="h-8 bg-muted/30 rounded w-40 animate-pulse mb-6" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Leads</h1>
          <p className="text-muted-foreground mt-1">{leads.length} total leads across all products</p>
        </div>
      </div>

      {/* Status summary */}
      {leads.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  statusFilter === status
                    ? 'ring-2 ring-primary/30 border-primary/30'
                    : 'border-transparent hover:border-border'
                } ${statusColors[status] ?? 'bg-muted text-muted-foreground'}`}
              >
                {status.replace('_', ' ')}
                <span className="font-bold">{count}</span>
              </button>
            ))}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by company, name, or email..."
            className="pl-10 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-40 h-10">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.keys(statusColors).map(s => (
              <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">
              {leads.length === 0 ? 'No leads yet' : 'No leads match the current filter'}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {leads.length === 0 ? 'Add products and generate leads to see them here.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          filtered.map(lead => (
            <Card key={lead.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm">{lead.company_name}</p>
                          {lead.qualification_score != null && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                              lead.qualification_score >= 70 ? 'bg-emerald-500/10 text-emerald-500'
                              : lead.qualification_score >= 40 ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500'
                            }`}>
                              {lead.qualification_score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          {lead.contact_name && <span>{lead.contact_name}</span>}
                          {lead.contact_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />{lead.contact_email}
                            </span>
                          )}
                          {lead.contact_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />{lead.contact_phone}
                            </span>
                          )}
                          {lead.linkedin_url && (
                            <a href={lead.linkedin_url} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-primary transition-colors">
                              <Link2 className="w-3 h-3" />LinkedIn
                            </a>
                          )}
                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-primary transition-colors">
                              <Globe className="w-3 h-3" />Website
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(lead.products as { name: string } | null)?.name && (
                          <Badge variant="secondary" className="text-xs">
                            {(lead.products as { name: string }).name}
                          </Badge>
                        )}
                        <Select
                          value={lead.status}
                          onValueChange={v => v && updateStatus(lead.id, v)}
                          disabled={updatingId === lead.id}
                        >
                          <SelectTrigger className={`h-7 text-xs border-0 px-2.5 py-1 rounded-full w-auto gap-1.5 font-medium ${statusColors[lead.status] ?? 'bg-muted text-muted-foreground'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(statusColors).map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{s.replace('_', ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
