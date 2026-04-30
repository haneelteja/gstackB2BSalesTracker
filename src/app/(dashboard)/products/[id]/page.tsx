import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Package, MessageSquare, Target, Mail, BarChart3, ChevronRight, CheckCircle2, Circle } from 'lucide-react'

const steps = [
  { key: 'research', label: 'AI Research', icon: MessageSquare, description: 'Define target market, positioning, and strategy with AI' },
  { key: 'leads', label: 'Lead Generation', icon: Target, description: 'Generate and import qualified leads' },
  { key: 'qualification', label: 'Qualification', icon: CheckCircle2, description: 'Score and qualify your lead list' },
  { key: 'outreach', label: 'Outreach', icon: Mail, description: 'Draft, review, and send emails & WhatsApp messages' },
  { key: 'tracking', label: 'Tracking', icon: BarChart3, description: 'Monitor replies, follow-ups, and conversions' },
]

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: product } = await supabase
    .from('products')
    .select('*, product_profiles(*)')
    .eq('id', id)
    .single()

  if (!product) notFound()

  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('step, is_complete')
    .eq('product_id', id)

  const completedSteps = new Set(sessions?.filter(s => s.is_complete).map(s => s.step) ?? [])
  const hasResearch = completedSteps.has('research')

  const { count: leadCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', id)

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <Link href="/products" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        All Products
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {product.category && <Badge variant="secondary">{product.category}</Badge>}
              <Badge className="border-0 bg-emerald-500/10 text-emerald-500 text-xs">Active</Badge>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-sm text-muted-foreground">{leadCount ?? 0} leads</span>
            </div>
          </div>
        </div>
      </div>

      {product.description && (
        <p className="text-muted-foreground">{product.description}</p>
      )}

      {/* Pipeline Steps */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Sales Pipeline</h2>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const done = completedSteps.has(step.key)
            const isNext = !done && (i === 0 || completedSteps.has(steps[i - 1].key))
            const locked = !done && !isNext

            return (
              <Card key={step.key} className={`transition-all duration-200 ${locked ? 'opacity-50' : 'hover:border-primary/40 hover:shadow-sm'}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500/10' : isNext ? 'bg-primary/10' : 'bg-muted'}`}>
                      {done
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <step.icon className={`w-5 h-5 ${isNext ? 'text-primary' : 'text-muted-foreground'}`} />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{step.label}</h3>
                        {done && <Badge className="text-xs border-0 bg-emerald-500/10 text-emerald-500">Complete</Badge>}
                        {isNext && <Badge className="text-xs border-0 bg-primary/10 text-primary">Next Step</Badge>}
                        {locked && <Circle className="w-3 h-3 text-muted-foreground/40" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                    {!locked && (
                      <Link href={`/products/${id}/${step.key}`}>
                        <Button variant={isNext ? 'default' : 'outline'} size="sm" className="gap-1.5 flex-shrink-0">
                          {done ? 'Review' : 'Start'}
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Product Profile Summary (if research done) */}
      {hasResearch && product.product_profiles && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Product Intelligence Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {product.product_profiles.target_segments?.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Target Segments</p>
                  <div className="flex flex-wrap gap-1">
                    {product.product_profiles.target_segments.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {product.product_profiles.positioning && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Positioning</p>
                  <p className="text-foreground line-clamp-2">{product.product_profiles.positioning}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
