'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Mail, MessageSquare, Phone, FileText, RefreshCw, Clock, CheckCircle2, Building2, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

type InteractionType = 'email_sent' | 'email_opened' | 'email_replied' | 'whatsapp_sent' | 'whatsapp_replied' | 'call' | 'note' | 'status_change'

interface Interaction { id: string; type: InteractionType; content?: string; created_at: string }
interface Message { id: string; channel: string; status: string; sent_at?: string; replied_at?: string }

interface Lead {
  id: string
  company_name: string
  contact_name: string
  status: string
  qualification_score?: number
  interactions: Interaction[]
  messages: Message[]
}

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

const interactionIcons: Record<InteractionType, { icon: React.ElementType; color: string }> = {
  email_sent: { icon: Mail, color: 'text-blue-500' },
  email_opened: { icon: Mail, color: 'text-emerald-500' },
  email_replied: { icon: Mail, color: 'text-green-500' },
  whatsapp_sent: { icon: MessageSquare, color: 'text-green-500' },
  whatsapp_replied: { icon: MessageSquare, color: 'text-emerald-500' },
  call: { icon: Phone, color: 'text-violet-500' },
  note: { icon: FileText, color: 'text-amber-500' },
  status_change: { icon: RefreshCw, color: 'text-primary' },
}

export function InteractionTimeline({ leads, productId }: { leads: Lead[]; productId: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(leads.slice(0, 3).map(l => l.id)))
  const [showNote, setShowNote] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function addNote(leadId: string) {
    if (!noteContent.trim()) { toast.error('Note cannot be empty'); return }
    setSavingNote(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const toInsert: { lead_id: string; type: 'note' | 'status_change'; content: string; created_by: string | undefined }[] = [{
      lead_id: leadId,
      type: 'note',
      content: noteContent,
      created_by: user?.id,
    }]

    if (newStatus) {
      await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
      toInsert.push({ lead_id: leadId, type: 'status_change', content: `Status changed to ${newStatus}`, created_by: user?.id })
    }

    const { data, error } = await supabase.from('interactions').insert(toInsert).select()
    if (error) { toast.error('Failed to save note'); setSavingNote(false); return }

    setLocalLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l
      return {
        ...l,
        status: newStatus || l.status,
        interactions: [...(data as Interaction[]), ...l.interactions],
      }
    }))
    setNoteContent('')
    setNewStatus('')
    setShowNote(null)
    toast.success('Note saved')
    setSavingNote(false)
  }

  if (localLeads.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No leads in the pipeline yet. Start outreach to see activity here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {localLeads.map(lead => (
        <Card key={lead.id}>
          <CardHeader className="p-4 cursor-pointer" onClick={() => toggleExpand(lead.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{lead.company_name}</p>
                  <p className="text-xs text-muted-foreground">{lead.contact_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lead.qualification_score != null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lead.qualification_score >= 70 ? 'bg-emerald-500/10 text-emerald-500' : lead.qualification_score >= 40 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                    {lead.qualification_score}/100
                  </span>
                )}
                <Badge className={`text-xs border-0 ${statusColors[lead.status]}`}>{lead.status.replace('_', ' ')}</Badge>
                <span className="text-xs text-muted-foreground">{lead.interactions.length} events</span>
                {expanded.has(lead.id) ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>

          {expanded.has(lead.id) && (
            <CardContent className="px-4 pb-4 pt-0">
              <div className="border-t border-border pt-4">
                {lead.interactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No activity yet</p>
                ) : (
                  <div className="relative space-y-3">
                    <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
                    {[...lead.interactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(interaction => {
                      const { icon: Icon, color } = interactionIcons[interaction.type] ?? { icon: FileText, color: 'text-muted-foreground' }
                      return (
                        <div key={interaction.id} className="flex gap-3 pl-1">
                          <div className={`w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center flex-shrink-0 mt-0.5 z-10 ${color}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-foreground">{interaction.content ?? interaction.type.replace(/_/g, ' ')}</p>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {format(new Date(interaction.created_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setShowNote(lead.id)} className="gap-1.5 text-xs">
                    <Plus className="w-3 h-3" />
                    Add Note
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Add Note Dialog */}
      <Dialog open={!!showNote} onOpenChange={() => setShowNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note &amp; Update Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Note</Label>
              <Textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Spoke with the contact, they're interested in Q3 budget..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Update Status (optional)</Label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(statusColors).map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNote(null)}>Cancel</Button>
            <Button onClick={() => showNote && addNote(showNote)} disabled={savingNote} className="bg-primary hover:bg-primary/90">
              {savingNote ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
