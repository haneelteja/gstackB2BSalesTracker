'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Package, UserPlus, UserMinus, Users, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Product { id: string; name: string; category: string; status: string }
interface Member { id: string; full_name: string; email: string; role: string }
interface Assignment { id: string; user_id: string; product_id: string; assigned_at: string }

interface TeamManagerProps {
  products: Product[]
  members: Member[]
  assignments: Assignment[]
}

export function TeamManager({ products, members, assignments: initialAssignments }: TeamManagerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [selectedProduct, setSelectedProduct] = useState<string>(products[0]?.id ?? '')
  const [loading, setLoading] = useState<string | null>(null)

  const productAssignments = assignments.filter(a => a.product_id === selectedProduct)
  const assignedUserIds = new Set(productAssignments.map(a => a.user_id))
  const reps = members.filter(m => m.role === 'rep')

  async function toggleAssignment(userId: string) {
    setLoading(userId)
    const supabase = createClient()

    if (assignedUserIds.has(userId)) {
      const { error } = await supabase
        .from('user_products')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', selectedProduct)
      if (error) { toast.error('Failed to remove assignment'); setLoading(null); return }
      setAssignments(prev => prev.filter(a => !(a.user_id === userId && a.product_id === selectedProduct)))
      toast.success('Rep removed from product')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('user_products')
        .insert({ user_id: userId, product_id: selectedProduct, assigned_by: user?.id })
        .select()
        .single()
      if (error) { toast.error('Failed to assign rep'); setLoading(null); return }
      setAssignments(prev => [...prev, data as Assignment])
      toast.success('Rep assigned to product')
    }
    setLoading(null)
  }

  const selectedProductData = products.find(p => p.id === selectedProduct)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product selector */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-3">
          {products.map(product => {
            const repCount = assignments.filter(a => a.product_id === product.id).length
            return (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-all',
                  selectedProduct === product.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-accent border border-transparent'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn('text-sm font-medium', selectedProduct === product.id ? 'text-primary' : 'text-foreground')}>{product.name}</p>
                  <Badge variant="secondary" className="text-xs">{repCount} rep{repCount !== 1 ? 's' : ''}</Badge>
                </div>
                {product.category && <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>}
              </button>
            )
          })}
          {products.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No products yet</p>
          )}
        </CardContent>
      </Card>

      {/* Rep assignment */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {selectedProductData ? `Reps for "${selectedProductData.name}"` : 'Select a product'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedProduct ? (
            <p className="text-sm text-muted-foreground text-center py-8">Select a product to manage rep assignments</p>
          ) : (
            <div className="space-y-4">
              {/* Assigned reps */}
              {assignedUserIds.size > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned ({assignedUserIds.size})</p>
                  <div className="space-y-2">
                    {reps.filter(m => assignedUserIds.has(m.id)).map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-emerald-500/20 text-emerald-600 text-xs font-bold">
                              {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAssignment(member.id)}
                            disabled={loading === member.id}
                            className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
                          >
                            <UserMinus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </>
              )}

              {/* Unassigned reps */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Reps</p>
              <div className="space-y-2">
                {reps.filter(m => !assignedUserIds.has(m.id)).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent border border-transparent hover:border-border transition-all">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                          {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleAssignment(member.id)}
                      disabled={loading === member.id}
                      className="gap-1.5 text-xs h-7 bg-primary hover:bg-primary/90"
                    >
                      <UserPlus className="w-3 h-3" />
                      Assign
                    </Button>
                  </div>
                ))}
                {reps.filter(m => !assignedUserIds.has(m.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">All reps are assigned to this product</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
