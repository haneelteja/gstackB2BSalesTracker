import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, sessionId } = await req.json()

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  const conversation = (messages ?? []).map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')

  const extraction = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Based on this conversation between a sales strategist and a human, extract the agreed product intelligence profile as JSON.

Conversation:
${conversation}

Return ONLY valid JSON with these fields:
{
  "target_segments": ["segment1", "segment2"],
  "positioning": "one paragraph positioning statement",
  "value_proposition": "one sentence value prop",
  "pain_points": ["pain1", "pain2"],
  "outreach_strategy": "paragraph describing the outreach approach",
  "email_template": "full draft intro email",
  "whatsapp_template": "WhatsApp intro message (max 150 words)",
  "keywords": ["keyword1", "keyword2"]
}`,
    }],
  })

  const text = extraction.content[0].type === 'text' ? extraction.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return Response.json({ error: 'Failed to extract profile' }, { status: 500 })

  try {
    const profile = JSON.parse(jsonMatch[0])
    await supabase.from('product_profiles').upsert({
      product_id: productId,
      ...profile,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'product_id' })

    await supabase.from('chat_sessions').update({ is_complete: true }).eq('id', sessionId)

    return Response.json({ success: true, profile })
  } catch {
    return Response.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }
}
