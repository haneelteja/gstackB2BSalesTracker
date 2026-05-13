'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Loader2, Package, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const categories = ['Physical Product', 'SaaS / Software', 'Consulting / Services', 'Real Estate', 'Financial Services', 'Healthcare', 'Education', 'Other']

export default function NewProductPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Product name is required'); return }
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: product, error } = await supabase
      .from('products')
      .insert({ name: name.trim(), description: description.trim(), category, created_by: user.id })
      .select()
      .single()

    if (error) {
      toast.error(error.message || 'Failed to create product')
      setLoading(false)
      return
    }

    await supabase.from('product_profiles').insert({ product_id: product.id })

    toast.success('Product created! Let\'s start with AI research.')
    router.push(`/products/${product.id}/research`)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/products" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div className="mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Add New Product</h1>
        <p className="text-muted-foreground mt-2">
          Once created, our AI will research your target market, ideal customer profile, and build a complete outreach strategy.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Product Details</CardTitle>
          <CardDescription>Basic information about the product you&apos;re selling</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. Customised Water Bottles"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe the product, its key features, and what makes it unique..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                      category === cat
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button type="submit" className="flex-1 h-11 bg-primary hover:bg-primary/90 font-semibold gap-2" disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
                  : <><Sparkles className="w-4 h-4" />Create &amp; Start AI Research</>
                }
              </Button>
              <Link href="/products">
                <Button type="button" variant="outline" className="h-11">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-6">
        After creation, you&apos;ll enter a collaborative AI session to define your target market, positioning, and outreach strategy.
      </p>
    </div>
  )
}
