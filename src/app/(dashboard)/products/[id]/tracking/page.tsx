import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { InteractionTimeline } from '@/components/leads/interaction-timeline'

export default async function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: product } = await supabase.from('products').select('id, name').eq('id', id).single()
  if (!product) notFound()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name, contact_name, status, qualification_score, interactions(*), messages(id, channel, status, sent_at, opened_at, replied_at)')
    .eq('product_id', id)
    .neq('status', 'new')
    .order('updated_at', { ascending: false })

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/products/${id}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {product.name}
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium text-foreground">Tracking</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Follow-up Tracking</h1>
        <p className="text-muted-foreground mt-1">Monitor replies, interactions, and lead progression</p>
      </div>

      <InteractionTimeline leads={leads ?? []} productId={id} />
    </div>
  )
}
