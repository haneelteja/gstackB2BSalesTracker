'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, Users, Target, Mail, BarChart3,
  Zap, LogOut, ChevronRight, Settings
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/products', icon: Package, label: 'Products' },
  { href: '/leads', icon: Target, label: 'All Leads' },
  { href: '/outreach', icon: Mail, label: 'Outreach' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
]

const managerItems = [
  { href: '/team', icon: Users, label: 'Team & Products' },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="w-64 min-h-screen flex flex-col bg-sidebar border-r border-sidebar-border"
      style={{ backgroundColor: 'var(--sidebar)', color: 'var(--sidebar-foreground)', borderColor: 'var(--sidebar-border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-sidebar-foreground tracking-tight">SalesStack</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          )
        })}

        {profile.role === 'manager' && (
          <>
            <Separator className="my-3 bg-sidebar-border" />
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/30 uppercase tracking-wider mb-1">Manager</p>
            {managerItems.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1" style={{ borderColor: 'var(--sidebar-border)' }}>
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
            <Badge variant="outline" className={cn('text-xs border-0 px-0 font-normal', profile.role === 'manager' ? 'text-yellow-400' : 'text-blue-400')}>
              {profile.role === 'manager' ? 'Manager' : 'Sales Rep'}
            </Badge>
          </div>
          <button onClick={handleLogout} className="text-sidebar-foreground/30 hover:text-destructive transition-colors ml-auto" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
