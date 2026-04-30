import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getResearchSystemPrompt, getLeadsSystemPrompt, getQualificationSystemPrompt, getOutreachSystemPrompt } from '@/lib/ai/prompts'
import type { ProductStep } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { productId, step, message, sessionId } = await req.json() as {
    productId: string
    step: ProductStep
    message: string
    sessionId?: string
  }

  const { data: product } = await supabase
    .from('products')
    .select('*, product_profiles(*)')
    .eq('id', productId)
    .single()

  if (!product) return new Response('Product not found', { status: 404 })

  let session = sessionId
    ? { id: sessionId }
    : null

  if (!session) {
    const { data: existing } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('product_id', productId)
      .eq('step', step)
      .single()

    if (existing) {
      session = existing
    } else {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({ product_id: productId, step, created_by: user.id })
        .select('id')
        .single()
      session = newSession
    }
  }

  if (!session) return new Response('Failed to create session', { status: 500 })

  await supabase.from('chat_messages').insert({
    session_id: session.id,
    role: 'user',
    content: message,
  })

  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })

  const profile = product.product_profiles ?? {}
  const systemPrompt = step === 'research'
    ? getResearchSystemPrompt(product.name, product.description)
    : step === 'leads'
    ? getLeadsSystemPrompt(product.name, profile)
    : step === 'qualification'
    ? getQualificationSystemPrompt(product.name, profile)
    : getOutreachSystemPrompt(product.name, profile)

  const messages = (history ?? []).map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()
  let fullContent = ''

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text
          fullContent += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text, sessionId: session!.id })}\n\n`))
        }
      }
      await supabase.from('chat_messages').insert({
        session_id: session!.id,
        role: 'assistant',
        content: fullContent,
      })
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
