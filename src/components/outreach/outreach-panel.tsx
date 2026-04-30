'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Mail, MessageSquare, Send, CheckCircle2, Clock, Eye, Loader2, Plus, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Lead { id: string; company_name: string; contact_name: string; contact_email?: string; contact_phone?: string; status: string }
interface Message { id: string; lead_id: string; channel: string; subject?: string; body: string; status: string; sent_at?: string; leads?: { company_name: string; contact_name: string } | null }

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-500',
  pending_review: 'bg-amber-500/15 text-amber-500',
  approved: 'bg-blue-500/15 text-blue-500',
  sent: 'bg-emerald-500/15 text-emerald-500',
  failed: 'bg-red-500/15 text-red-500',
}

interface OutreachPanelProps {
  productId: string
  leads: Lead[]
  messages: Message[]
}

export function OutreachPanel({ productId, leads, messages: initialMessages }: OutreachPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [showCompose, setShowCompose] = useState(false)
  const [composeForm, setComposeForm] = useState({ lead_id: '', channel: 'email', subject: '', body: '' })
  const [composing, setComposing] = useState(false)
  const [sending, setSending] = useState<Set<string>>(new Set())
  const [reviewMsg, setReviewMsg] = useState<Message | null>(null)

  const pending = messages.filter(m => m.status === 'pending_review')
  const sent = messages.filter(m => m.status === 'sent')
  const drafts = messages.filter(m => m.status === 'draft')

  async function handleCompose() {
    if (!composeForm.lead_id || !composeForm.body.trim()) { toast.error('Select a lead and write a message'); return }
    setComposing(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('messages').insert({
      lead_id: composeForm.lead_id,
      product_id: productId,
      channel: composeForm.channel,
      subject: composeForm.subject || null,
      body: composeForm.body,
      status: 'pending_review',
      created_by: user?.id,
    }).select('*, leads(company_name, contact_name)').single()
    if (error) { toast.error('Failed to create message'); setComposing(false); return }
    setMessages(prev => [data as Message, ...prev])
    setComposeForm({ lead_id: '', channel: 'email', subject: '', body: '' })
    setShowCompose(false)
    toast.success('Message saved for review')
    setComposing(false)
  }

  async function handleApproveAndSend(msg: Message) {
    setSending(prev => new Set(prev).add(msg.id))
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msg.id }),
      })
      if (!res.ok) throw new Error('Send failed')
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sent', sent_at: new Date().toISOString() } : m))
      setReviewMsg(null)
      toast.success('Message sent!')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(prev => { const s = new Set(prev); s.delete(msg.id); return s })
    }
  }

  async function handleBulkSend() {
    const approvedMsgs = messages.filter(m => m.status === 'pending_review')
    if (approvedMsgs.length === 0) { toast.error('No messages pending review'); return }
    toast.info(`Sending ${approvedMsgs.length} messages...`)
    for (const msg of approvedMsgs) {
      await handleApproveAndSend(msg)
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Outreach Messages</h3>
        <div className="flex gap-2">
          {pending.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleBulkSend} className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5">
              <Send className="w-3 h-3" />
              Send All ({pending.length})
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCompose(true)} className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
            <Plus className="w-3 h-3" />
            Compose
          </Button>
        </div>
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-400">{pending.length} message{pending.length > 1 ? 's' : ''} awaiting your review before sending</span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1 text-xs">
            Review <Badge variant="secondary" className="ml-1.5 text-xs">{pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex-1 text-xs">
            Drafts <Badge variant="secondary" className="ml-1.5 text-xs">{drafts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 text-xs">
            Sent <Badge variant="secondary" className="ml-1.5 text-xs">{sent.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {['pending', 'drafts', 'sent'].map(tab => {
          const tabMessages = tab === 'pending' ? pending : tab === 'drafts' ? drafts : sent
          return (
            <TabsContent key={tab} value={tab} className="mt-3 space-y-2">
              {tabMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No {tab} messages</p>
                </div>
              ) : (
                tabMessages.map(msg => (
                  <Card key={msg.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setReviewMsg(msg)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {msg.channel === 'email' ? <Mail className="w-3 h-3 text-blue-500 flex-shrink-0" /> : <MessageSquare className="w-3 h-3 text-green-500 flex-shrink-0" />}
                            <span className="text-sm font-medium text-foreground truncate">
                              {(msg.leads as { company_name: string } | null)?.company_name ?? 'Unknown'}
                            </span>
                          </div>
                          {msg.subject && <p className="text-xs text-muted-foreground mb-1 truncate">{msg.subject}</p>}
                          <p className="text-xs text-muted-foreground line-clamp-2">{msg.body}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Badge className={`text-xs border-0 ${statusColors[msg.status]}`}>{msg.status.replace('_', ' ')}</Badge>
                          {msg.status === 'pending_review' && (
                            <Button size="sm" onClick={e => { e.stopPropagation(); handleApproveAndSend(msg) }} disabled={sending.has(msg.id)} className="text-xs h-7 gap-1 bg-primary hover:bg-primary/90">
                              {sending.has(msg.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              Send
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Lead</Label>
                <Select value={composeForm.lead_id} onValueChange={v => setComposeForm(p => ({ ...p, lead_id: v ?? '' }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Channel</Label>
                <Select value={composeForm.channel} onValueChange={v => setComposeForm(p => ({ ...p, channel: v ?? 'email' }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="w-3 h-3" />Email</div></SelectItem>
                    <SelectItem value="whatsapp"><div className="flex items-center gap-2"><MessageSquare className="w-3 h-3" />WhatsApp</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {composeForm.channel === 'email' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input value={composeForm.subject} onChange={e => setComposeForm(p => ({ ...p, subject: e.target.value }))} placeholder="Quick question about your..." className="h-9" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea value={composeForm.body} onChange={e => setComposeForm(p => ({ ...p, body: e.target.value }))} placeholder="Hi [Name], I wanted to reach out..." rows={6} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
            <Button onClick={handleCompose} disabled={composing} className="bg-primary hover:bg-primary/90">
              {composing ? 'Saving...' : 'Save for Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewMsg} onOpenChange={() => setReviewMsg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewMsg?.channel === 'email' ? <Mail className="w-4 h-4 text-blue-500" /> : <MessageSquare className="w-4 h-4 text-green-500" />}
              Review Message
            </DialogTitle>
          </DialogHeader>
          {reviewMsg && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>To: <strong className="text-foreground">{(reviewMsg.leads as { company_name: string; contact_name: string } | null)?.contact_name ?? (reviewMsg.leads as { company_name: string } | null)?.company_name ?? 'Unknown'}</strong></span>
                <Badge className={`text-xs border-0 ml-auto ${statusColors[reviewMsg.status]}`}>{reviewMsg.status.replace('_', ' ')}</Badge>
              </div>
              {reviewMsg.subject && (
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <p className="text-sm font-medium mt-1">{reviewMsg.subject}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <div className="mt-1 bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">{reviewMsg.body}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewMsg(null)}>Close</Button>
            {reviewMsg?.status === 'pending_review' && (
              <Button onClick={() => reviewMsg && handleApproveAndSend(reviewMsg)} disabled={sending.has(reviewMsg?.id ?? '')} className="gap-2 bg-primary hover:bg-primary/90">
                {sending.has(reviewMsg?.id ?? '') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Approve &amp; Send
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
