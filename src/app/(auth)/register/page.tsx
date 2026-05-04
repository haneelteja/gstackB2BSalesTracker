'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Zap, Loader2, Brain, Target, Mail, TrendingUp, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'

const features = [
  { icon: Brain, label: 'AI product research & positioning' },
  { icon: Target, label: 'Smart lead scoring at 0–100' },
  { icon: Mail, label: 'Human-reviewed email & WhatsApp outreach' },
  { icon: TrendingUp, label: 'Full interaction timeline per lead' },
]

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'manager' | 'rep'>('manager')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router])

  async function handleRegister(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!fullName.trim()) { toast.error('Full name is required'); return }
    setLoading(true)
    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
    if (signUpError) {
      toast.error(signUpError.message)
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      toast.success('Account created! Please sign in.')
      window.location.assign('/login')
      return
    }

    toast.success('Welcome to SalesStack!')
    window.location.assign('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-[42%] bg-sidebar flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">SalesStack</span>
        </div>

        <div className="relative space-y-10">
          <div>
            <h2 className="text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight">
              Start closing deals<br />with AI on<br />your side.
            </h2>
            <p className="mt-5 text-white/45 text-base leading-relaxed">
              Set up your workspace in minutes. AI guides every step from research to first contact.
            </p>
          </div>
          <div className="space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0 border border-white/10">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-white/60 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/20 text-xs">© 2025 SalesStack. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SalesStack</span>
          </div>

          <div className="mb-8">
            <h1 className="text-[2rem] font-bold text-foreground tracking-tight">Create account</h1>
            <p className="text-muted-foreground mt-1.5">Set up your sales workspace in minutes</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <Input
                id="name"
                placeholder="John Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="h-11 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Your role</Label>
              <Select value={role} onValueChange={v => setRole(v as 'manager' | 'rep')}>
                <SelectTrigger className="h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2.5 py-0.5">
                      <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Manager</p>
                        <p className="text-xs text-muted-foreground">Create products, manage the team</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="rep">
                    <div className="flex items-center gap-2.5 py-0.5">
                      <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Sales Rep</p>
                        <p className="text-xs text-muted-foreground">Work assigned products & leads</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 font-semibold text-sm shadow-md shadow-primary/20 mt-2"
              disabled={loading}
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : 'Create Account'}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
