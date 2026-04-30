import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId } = await req.json()

  const { data: message } = await supabase
    .from('messages')
    .select('*, leads(contact_name, contact_email, contact_phone)')
    .eq('id', messageId)
    .single()

  if (!message) return Response.json({ error: 'Message not found' }, { status: 404 })
  if (message.status === 'sent') return Response.json({ error: 'Already sent' }, { status: 400 })

  const lead = message.leads as { contact_name: string; contact_email?: string; contact_phone?: string } | null

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    if (message.channel === 'email') {
      if (!lead?.contact_email) return Response.json({ error: 'No email address for lead' }, { status: 400 })

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: lead.contact_email,
        subject: message.subject ?? 'Hello from our team',
        text: message.body,
      })
    } else if (message.channel === 'whatsapp') {
      if (!lead?.contact_phone) return Response.json({ error: 'No phone number for lead' }, { status: 400 })

      const res = await fetch('https://api.360messager.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.THREESIXTY_MESSAGER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: process.env.THREESIXTY_MESSAGER_CHANNEL_ID,
          to: lead.contact_phone,
          type: 'text',
          text: { body: message.body },
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`360 Messager error: ${err}`)
      }
    }

    await supabase
      .from('messages')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', messageId)

    await supabase.from('interactions').insert({
      lead_id: message.lead_id,
      type: message.channel === 'email' ? 'email_sent' : 'whatsapp_sent',
      content: message.channel === 'email' ? `Email sent: ${message.subject}` : 'WhatsApp message sent',
      created_by: user.id,
    })

    return Response.json({ success: true })
  } catch (err) {
    await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
