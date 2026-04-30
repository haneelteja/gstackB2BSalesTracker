'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Upload, Building2, Mail, Phone, Globe, Link2, Search, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Lead } from '@/types'

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

interface LeadPipelineProps {
  productId: string
  leads: Lead[]
}

export function LeadPipeline({ productId, leads: initialLeads }: LeadPipelineProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [addForm, setAddForm] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', linkedin_url: '', website: '', industry: '', company_size: '', location: '' })
  const [adding, setAdding] = useState(false)

  const filtered = leads.filter(l => {
    const matchesSearch = !search || l.company_name.toLowerCase().includes(search.toLowerCase()) || l.contact_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  async function handleAddLead() {
    if (!addForm.company_name.trim()) { toast.error('Company name is required'); return }
    setAdding(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('leads').insert({ ...addForm, product_id: productId, source: 'manual' }).select().single()
    if (error) { toast.error('Failed to add lead'); setAdding(false); return }
    setLeads(prev => [data as Lead, ...prev])
    setAddForm({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', linkedin_url: '', website: '', industry: '', company_size: '', location: '' })
    setShowAddDialog(false)
    toast.success('Lead added')
    setAdding(false)
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter(Boolean)
    if (lines.length < 2) { toast.error('CSV must have headers + at least one row'); return }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'))
    const rows = lines.slice(1).map(line => {
      const values = line.split(',')
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = values[i]?.trim() ?? '' })
      return obj
    })
    const supabase = createClient()
    const toInsert = rows.map(r => ({
      product_id: productId,
      company_name: r.company_name || r.company || 'Unknown',
      contact_name: r.contact_name || r.name || '',
      contact_email: r.email || r.contact_email || null,
      contact_phone: r.phone || r.contact_phone || null,
      linkedin_url: r.linkedin || r.linkedin_url || null,
      website: r.website || null,
      industry: r.industry || null,
      company_size: r.company_size || r.size || null,
      location: r.location || r.city || null,
      source: 'csv' as const,
    }))
    const { data, error } = await supabase.from('leads').insert(toInsert).select()
    if (error) { toast.error('Import failed'); return }
    setLeads(prev => [...(data as Lead[]), ...prev])
    setShowImportDialog(false)
    toast.success(`Imported ${data.length} leads`)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Leads</h3>
            <p className="text-xs text-muted-foreground">{leads.length} total</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowImportDialog(true)} className="gap-1.5 text-xs">
              <Upload className="w-3 h-3" />
              Import CSV
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
              <Plus className="w-3 h-3" />
              Add Lead
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="pl-8 h-8 text-sm" />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.keys(statusColors).map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lead list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{leads.length === 0 ? 'No leads yet. Add manually or import CSV.' : 'No leads match the filter.'}</p>
          </div>
        ) : (
          filtered.map(lead => (
            <Card key={lead.id} className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground text-sm truncate">{lead.company_name}</p>
                      {lead.qualification_score != null && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${lead.qualification_score >= 70 ? 'bg-emerald-500/10 text-emerald-500' : lead.qualification_score >= 40 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                          {lead.qualification_score}
                        </span>
                      )}
                    </div>
                    {lead.contact_name && <p className="text-xs text-muted-foreground mb-2">{lead.contact_name}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {lead.contact_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.contact_email}</span>}
                      {lead.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.contact_phone}</span>}
                      {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary"><Link2 className="w-3 h-3" />LinkedIn</a>}
                      {lead.website && <a href={lead.website} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary"><Globe className="w-3 h-3" />Website</a>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge className={`text-xs border-0 ${statusColors[lead.status]}`}>{lead.status.replace('_', ' ')}</Badge>
                    {lead.industry && <span className="text-xs text-muted-foreground">{lead.industry}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Lead Manually</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Company Name *</Label>
              <Input value={addForm.company_name} onChange={e => setAddForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Acme Corp" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Name</Label>
              <Input value={addForm.contact_name} onChange={e => setAddForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="John Smith" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={addForm.contact_email} onChange={e => setAddForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="john@acme.com" className="h-9" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={addForm.contact_phone} onChange={e => setAddForm(p => ({ ...p, contact_phone: e.target.value }))} placeholder="+1 555 000 0000" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Industry</Label>
              <Input value={addForm.industry} onChange={e => setAddForm(p => ({ ...p, industry: e.target.value }))} placeholder="Manufacturing" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">LinkedIn URL</Label>
              <Input value={addForm.linkedin_url} onChange={e => setAddForm(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="linkedin.com/in/..." className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Website</Label>
              <Input value={addForm.website} onChange={e => setAddForm(p => ({ ...p, website: e.target.value }))} placeholder="acme.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company Size</Label>
              <Input value={addForm.company_size} onChange={e => setAddForm(p => ({ ...p, company_size: e.target.value }))} placeholder="50-200" className="h-9" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input value={addForm.location} onChange={e => setAddForm(p => ({ ...p, location: e.target.value }))} placeholder="Mumbai, India" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={adding} className="bg-primary hover:bg-primary/90">
              {adding ? 'Adding...' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Leads from CSV</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Upload a CSV file with columns: <code className="bg-muted px-1 rounded text-xs">company_name, contact_name, email, phone, linkedin_url, website, industry, company_size, location</code></p>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-3">Drop a CSV file or click to browse</p>
              <label className="cursor-pointer inline-block">
                <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-accent cursor-pointer transition-colors">Choose File</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
