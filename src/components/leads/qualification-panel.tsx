'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Building2, Edit2, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Lead {
  id: string
  company_name: string
  contact_name: string
  industry?: string
  company_size?: string
  location?: string
  status: string
  qualification_score?: number
  qualification_notes?: string
}

export function QualificationPanel({ productId, leads: initialLeads }: { productId: string; leads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [score, setScore] = useState('')
  const [notes, setNotes] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const hot = leads.filter(l => (l.qualification_score ?? 0) >= 70)
  const warm = leads.filter(l => (l.qualification_score ?? 0) >= 40 && (l.qualification_score ?? 0) < 70)
  const cold = leads.filter(l => l.qualification_score != null && (l.qualification_score ?? 0) < 40)
  const unscored = leads.filter(l => l.qualification_score == null)

  async function saveQualification() {
    if (!editLead) return
    const scoreNum = parseInt(score)
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) { toast.error('Score must be 0-100'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('leads').update({
      qualification_score: scoreNum,
      qualification_notes: notes,
      status: newStatus || (scoreNum >= 40 ? 'qualified' : 'disqualified'),
    }).eq('id', editLead.id)
    if (error) { toast.error('Failed to save'); setSaving(false); return }
    setLeads(prev => prev.map(l => l.id === editLead.id ? {
      ...l,
      qualification_score: scoreNum,
      qualification_notes: notes,
      status: newStatus || (scoreNum >= 40 ? 'qualified' : 'disqualified'),
    } : l))
    setEditLead(null)
    toast.success('Lead qualified')
    setSaving(false)
  }

  function openEdit(lead: Lead) {
    setEditLead(lead)
    setScore(lead.qualification_score?.toString() ?? '')
    setNotes(lead.qualification_notes ?? '')
    setNewStatus(lead.status)
  }

  const sections = [
    { label: 'Hot (70-100)', leads: hot, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Warm (40-69)', leads: warm, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Cold (0-39)', leads: cold, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Not scored yet', leads: unscored, color: 'text-muted-foreground', bg: 'bg-muted' },
  ]

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Lead Scoring</h3>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{hot.length} hot</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />{warm.length} warm</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{cold.length} cold</span>
        </div>
      </div>

      {sections.map(section => (
        section.leads.length > 0 && (
          <div key={section.label}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${section.color}`}>{section.label} — {section.leads.length}</p>
            <div className="space-y-2">
              {section.leads.map(lead => (
                <Card key={lead.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center flex-shrink-0`}>
                          <Building2 className={`w-4 h-4 ${section.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{lead.company_name}</p>
                          <p className="text-xs text-muted-foreground">{lead.contact_name}{lead.industry ? ` · ${lead.industry}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {lead.qualification_score != null && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className={`w-3 h-3 ${section.color}`} />
                            <span className={`text-sm font-bold ${section.color}`}>{lead.qualification_score}</span>
                          </div>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(lead)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {lead.qualification_notes && (
                      <p className="text-xs text-muted-foreground mt-2 ml-11 line-clamp-2">{lead.qualification_notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      ))}

      <Dialog open={!!editLead} onOpenChange={() => setEditLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Qualify: {editLead?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Qualification Score (0-100)</Label>
              <Input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} placeholder="e.g. 75" className="h-9" />
              <p className="text-xs text-muted-foreground">70+ = Hot, 40-69 = Warm, 0-39 = Cold</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why this score? Key signals observed..." rows={3} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Auto-set based on score" /></SelectTrigger>
                <SelectContent>
                  {['qualified', 'disqualified', 'new', 'contacted', 'follow_up'].map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLead(null)}>Cancel</Button>
            <Button onClick={saveQualification} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? 'Saving...' : 'Save Score'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
