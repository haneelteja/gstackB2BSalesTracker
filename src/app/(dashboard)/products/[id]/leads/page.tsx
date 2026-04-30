import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ChatInterface } from '@/components/chat/chat-interface'
import { LeadPipeline } from '@/components/leads/lead-pipeline'

export default async function LeadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: product } = await supabase.from('products').select('id, name').eq('id', id).single()
  if (!product) notFound()

  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, is_complete')
    .eq('product_id', id)
    .eq('step', 'leads')
    .single()

  const { data: messages } = session
    ? await supabase.from('chat_messages').select('role, content').eq('session_id', session.id).order('created_at', { ascending: true })
    : { data: [] }

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('product_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <Link href={`/products/${id}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {product.name}
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium text-foreground">Lead Generation</span>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left: AI Chat */}
        <div className="w-1/2 border-r border-border overflow-hidden flex flex-col">
          <ChatInterface
            productId={id}
            productName={product.name}
            step="leads"
            stepLabel="Lead Generation Strategy"
            initialMessages={(messages ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))}
            initialSessionId={session?.id}
            isComplete={session?.is_complete ?? false}
            placeholder="Ask about search strategies, target industries, or specific lead sources..."
          />
        </div>

        {/* Right: Lead list */}
        <div className="w-1/2 overflow-y-auto">
          <LeadPipeline productId={id} leads={leads ?? []} />
        </div>
      </div>
    </div>
  )
}
