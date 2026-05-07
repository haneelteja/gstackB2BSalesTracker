import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, Target, Users, ChevronRight, CheckCircle2 } from 'lucide-react'

const stepDefs = [
  { key: 'research', label: 'Research' },
  { key: 'leads', label: 'Leads' },
  { key: 'qualification', label: 'Qualify' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'tracking', label: 'Track' },
]

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isManager = profile?.role === 'manager'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let products: any[] = []

  if (isManager) {
    const { data } = await supabase
      .from('products')
      .select('id, name, description, category, status, leads(count), user_products(count)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    products = (data ?? []).map((p: { id: string; name: string; description: string; category: string; status: string; leads?: { count: number }[]; user_products?: { count: number }[] }) => ({
      ...p,
      lead_count: p.leads?.[0]?.count ?? 0,
      rep_count: p.user_products?.[0]?.count ?? 0,
    }))
  } else {
    const { data } = await supabase
      .from('user_products')
      .select('product:products(id, name, description, category, status, leads(count))')
      .eq('user_id', user.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    products = (data ?? []).map((up: any) => {
      const p = Array.isArray(up.product) ? up.product[0] : up.product
      return { ...p, lead_count: p?.leads?.[0]?.count ?? 0 }
    })
  }

  // Fetch completed chat sessions for all products
  const productIds = products.map((p: { id: string }) => p.id)
  const completedStepsMap: Record<string, string[]> = {}

  if (productIds.length > 0) {
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('product_id, step, is_complete')
      .in('product_id', productIds)

    for (const s of sessions ?? []) {
      if (!completedStepsMap[s.product_id]) completedStepsMap[s.product_id] = []
      if (s.is_complete) completedStepsMap[s.product_id].push(s.step)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your sales products and pipelines</p>
        </div>
        {isManager && (
          <Link href="/products/new">
            <Button className="gap-2 bg-primary hover:bg-primary/90 font-semibold">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No products yet</h2>
          <p className="text-muted-foreground mb-6">
            {isManager
              ? 'Create your first product to start building a sales pipeline.'
              : "You haven't been assigned to any products yet."}
          </p>
          {isManager && (
            <Link href="/products/new">
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                Create First Product
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {products.map((product: { id: string; name: string; description: string; category: string; lead_count?: number; rep_count?: number }) => {
            const completedSteps = new Set(completedStepsMap[product.id] ?? [])
            const completedCount = stepDefs.filter(s => completedSteps.has(s.key)).length
            const nextStep = stepDefs.find(s => !completedSteps.has(s.key))

            return (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card className="group hover:border-primary/40 hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      {completedCount === 5 ? (
                        <Badge className="text-xs border-0 bg-emerald-500/10 text-emerald-500 gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                          Active
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-semibold text-foreground text-lg mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">
                      {product.description || 'No description'}
                    </p>

                    {product.category && (
                      <Badge variant="secondary" className="text-xs mb-4 self-start">{product.category}</Badge>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {product.lead_count ?? 0} leads
                      </span>
                      {isManager && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {product.rep_count ?? 0} reps
                        </span>
                      )}
                      <span className="ml-auto">{completedCount}/5 steps</span>
                    </div>

                    {/* Pipeline step progress */}
                    <div className="flex gap-1">
                      {stepDefs.map(step => {
                        const done = completedSteps.has(step.key)
                        return (
                          <div key={step.key} className="flex-1 text-center">
                            <div className={`h-1 rounded-full mb-1 transition-colors ${done ? 'bg-emerald-500' : 'bg-border'}`} />
                            <span className={`text-[10px] ${done ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
                              {step.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {nextStep && (
                        <span className="text-xs text-muted-foreground/60">
                          Next: {nextStep.label}
                        </span>
                      )}
                      <span className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                        Open pipeline <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {isManager && products.length > 0 && (
        <div className="flex justify-center pt-4">
          <Link href="/products/new">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Another Product
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
