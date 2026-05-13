'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, MessageSquare, Send, Clock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type Message = {
  id: string
  channel: string
  subject?: string | null
  body: string
  status: string
  sent_at?: string | null
  leads?: { company_name: string; contact_name: string } | { company_name: string; contact_name: string }[] | null
  products?: { name: string } | null
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-500',
  pending_review: 'bg-amber-500/15 text-amber-500',
  approved: 'bg-blue-500/15 text-blue-500',
  sent: 'bg-emerald-500/15 text-emerald-500',
  failed: 'bg-red-500/15 text-red-500',
}

function getLeadName(msg: Message) {
  const leads = msg.leads
  if (!leads) return 'Unknown'
  if (Array.isArray(leads)) return leads[0]?.company_name ?? 'Unknown'
  return leads.company_name
}

export default function OutreachOverviewPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<Set<string>>(new Set())
  const [sendingAll, setSendingAll] = useState(false)
  const [reviewMsg, setReviewMsg] = useState<Message | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('messages')
        .select('id, channel, subject, body, status, sent_at, leads(company_name, contact_name), products(name)')
        .order('created_at', { ascending: false })
        .limit(100)
      setMessages((data as unknown as Message[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSend(msg: Message) {
    setSending(prev => new Set(prev).add(msg.id))
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msg.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Send failed' }))
        throw new Error(err.error ?? 'Send failed')
      }
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sent', sent_at: new Date().toISOString() } : m))
      setReviewMsg(null)
      toast.success('Message sent!')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSending(prev => { const s = new Set(prev); s.delete(msg.id); return s })
    }
  }

  async function handleSendAll() {
    const pending = messages.filter(m => m.status === 'pending_review')
    if (pending.length === 0) return
    setSendingAll(true)
    let sent = 0
    for (const msg of pending) {
      try {
        const res = await fetch('/api/outreach/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: msg.id }),
        })
        if (res.ok) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sent', sent_at: new Date().toISOString() } : m))
          sent++
        }
      } catch {
        // continue with others
      }
    }
    toast.success(`Sent ${sent} of ${pending.length} messages`)
    setSendingAll(false)
  }

  const pending = messages.filter(m => m.status === 'pending_review')
  const sent = messages.filter(m => m.status === 'sent')
  const drafts = messages.filter(m => m.status === 'draft')
  const failed = messages.filter(m => m.status === 'failed')

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 bg-muted/30 rounded w-40 animate-pulse mb-6" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Outreach</h1>
          <p className="text-muted-foreground mt-1">All messages across products</p>
        </div>
        {pending.length > 0 && (
          <Button
            onClick={handleSendAll}
            disabled={sendingAll}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {sendingAll
              ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
              : <><Send className="w-4 h-4" />Send All ({pending.length})</>
            }
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', count: pending.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Sent', count: sent.length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Total', count: messages.length, icon: Mail, color: 'text-primary', bg: 'bg-primary/10' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{stat.count}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending review alert */}
      {pending.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
              {pending.length} message{pending.length > 1 ? 's' : ''} awaiting your review and approval before sending
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue={pending.length > 0 ? 'pending' : 'sent'}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1 gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5" />
            Review
            {pending.length > 0 && (
              <Badge className="ml-0.5 text-xs border-0 bg-amber-500/15 text-amber-600">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sent
            <Badge variant="secondary" className="ml-0.5 text-xs">{sent.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex-1 gap-1.5 text-xs">
            Drafts
            <Badge variant="secondary" className="ml-0.5 text-xs">{drafts.length}</Badge>
          </TabsTrigger>
          {failed.length > 0 && (
            <TabsTrigger value="failed" className="flex-1 gap-1.5 text-xs text-red-500">
              Failed
              <Badge className="ml-0.5 text-xs border-0 bg-red-500/15 text-red-500">{failed.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {[
          { tab: 'pending', msgs: pending },
          { tab: 'sent', msgs: sent },
          { tab: 'drafts', msgs: drafts },
          { tab: 'failed', msgs: failed },
        ].map(({ tab, msgs }) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-2">
            {msgs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No {tab} messages</p>
                {tab === 'pending' && (
                  <p className="text-xs mt-1 opacity-70">Go to a product&apos;s Outreach tab to compose messages</p>
                )}
              </div>
            ) : (
              msgs.map(msg => (
                <Card
                  key={msg.id}
                  className="hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setReviewMsg(msg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.channel === 'email' ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                          {msg.channel === 'email'
                            ? <Mail className="w-4 h-4 text-blue-500" />
                            : <MessageSquare className="w-4 h-4 text-green-500" />
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm truncate">{getLeadName(msg)}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {msg.subject ?? msg.body.slice(0, 80)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(msg.products as { name: string } | null)?.name && (
                          <Badge variant="secondary" className="text-xs">
                            {(msg.products as { name: string }).name}
                          </Badge>
                        )}
                        <Badge className={`text-xs border-0 ${statusColors[msg.status] ?? ''}`}>
                          {msg.status.replace('_', ' ')}
                        </Badge>
                        {msg.status === 'pending_review' && (
                          <Button
                            size="sm"
                            onClick={e => { e.stopPropagation(); handleSend(msg) }}
                            disabled={sending.has(msg.id)}
                            className="text-xs h-7 gap-1 bg-primary hover:bg-primary/90"
                          >
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
        ))}
      </Tabs>

      {messages.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs mt-1 opacity-70">Go to a product&apos;s Outreach tab to compose messages</p>
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={!!reviewMsg} onOpenChange={() => setReviewMsg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewMsg?.channel === 'email'
                ? <Mail className="w-4 h-4 text-blue-500" />
                : <MessageSquare className="w-4 h-4 text-green-500" />
              }
              Review Message
            </DialogTitle>
          </DialogHeader>
          {reviewMsg && (
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  To: <strong className="text-foreground">{getLeadName(reviewMsg)}</strong>
                </span>
                <Badge className={`text-xs border-0 ${statusColors[reviewMsg.status] ?? ''}`}>
                  {reviewMsg.status.replace('_', ' ')}
                </Badge>
              </div>
              {reviewMsg.subject && (
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <p className="text-sm font-medium mt-1">{reviewMsg.subject}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <div className="mt-1.5 bg-muted/40 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {reviewMsg.body}
                </div>
              </div>
              {reviewMsg.sent_at && (
                <p className="text-xs text-muted-foreground">
                  Sent: {new Date(reviewMsg.sent_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewMsg(null)}>Close</Button>
            {reviewMsg?.status === 'pending_review' && (
              <Button
                onClick={() => reviewMsg && handleSend(reviewMsg)}
                disabled={sending.has(reviewMsg?.id ?? '')}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
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
