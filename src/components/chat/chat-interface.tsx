'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, Bot, User, CheckCircle2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { ProductStep } from '@/types'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  productId: string
  productName: string
  step: ProductStep
  stepLabel: string
  initialMessages?: Message[]
  initialSessionId?: string
  isComplete?: boolean
  onComplete?: () => void
  placeholder?: string
}

export function ChatInterface({
  productId,
  productName,
  step,
  stepLabel,
  initialMessages = [],
  initialSessionId,
  isComplete: initialComplete = false,
  onComplete,
  placeholder = 'Add your thoughts, corrections, or ask questions...',
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId)
  const [isComplete, setIsComplete] = useState(initialComplete)
  const [finalizing, setFinalizing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  async function startSession() {
    setLoading(true)
    setStreaming(true)
    const userMsg = 'Please start by sharing your research and initial recommendations for this product.'

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, step, message: userMsg, sessionId }),
      })

      if (!res.ok) throw new Error('Failed to start session')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let newSessionId = sessionId

      setMessages([{ role: 'assistant', content: '' }])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6))
              assistantContent += data.text
              if (data.sessionId && !newSessionId) {
                newSessionId = data.sessionId
                setSessionId(data.sessionId)
              }
              setMessages([{ role: 'assistant', content: assistantContent }])
            } catch {}
          }
        }
      }
    } catch {
      toast.error('Failed to connect to AI')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    setStreaming(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, step, message: userMessage, sessionId }),
      })

      if (!res.ok) throw new Error('Failed to send')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let newSessionId = sessionId

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6))
              assistantContent += data.text
              if (data.sessionId && !newSessionId) {
                newSessionId = data.sessionId
                setSessionId(data.sessionId)
              }
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                return updated
              })
            } catch {}
          }
        }
      }
    } catch {
      toast.error('Failed to send message')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  async function handleFinalize() {
    if (!sessionId) { toast.error('No session to finalize'); return }
    setFinalizing(true)
    try {
      const res = await fetch('/api/ai/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, sessionId }),
      })
      if (!res.ok) throw new Error('Failed to finalize')
      setIsComplete(true)
      toast.success(`${stepLabel} completed and saved!`)
      onComplete?.()
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setFinalizing(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{stepLabel}</h3>
            <p className="text-xs text-muted-foreground">{productName} · AI Collaboration</p>
          </div>
        </div>
        {isComplete && (
          <Badge className="border-0 bg-emerald-500/10 text-emerald-500 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Complete
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Start the AI Research Session</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              The AI will research your product, propose target segments, positioning, and outreach strategy. You&apos;ll discuss and agree on a final profile together.
            </p>
            <Button onClick={startSession} disabled={loading} className="gap-2 bg-primary hover:bg-primary/90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Begin AI Research
            </Button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === 'assistant' ? 'bg-primary/10' : 'bg-secondary'
            }`}>
              {msg.role === 'assistant'
                ? <Bot className="w-4 h-4 text-primary" />
                : <User className="w-4 h-4 text-foreground" />
              }
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'assistant'
                ? 'bg-card border border-border text-foreground'
                : 'bg-primary text-primary-foreground'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-foreground prose-headings:font-semibold">
                  <ReactMarkdown>{msg.content || (streaming && i === messages.length - 1 ? '▋' : '')}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isComplete && messages.length > 0 && (
        <div className="px-6 py-4 border-t border-border bg-card/50 space-y-3">
          <div className="flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={2}
              disabled={loading}
              className="flex-1 resize-none min-h-0 text-sm"
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon" className="h-10 w-10 flex-shrink-0 bg-primary hover:bg-primary/90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Press Enter to send, Shift+Enter for new line</p>
            {messages.length >= 3 && (
              <Button onClick={handleFinalize} disabled={finalizing} variant="outline" size="sm" className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5">
                {finalizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Save &amp; Complete Step
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
