'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Lock, Shield, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile) {
        setFullName(profile.full_name)
        setEmail(profile.email)
        setRole(profile.role)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { toast.error('Name cannot be empty'); return }
    setSavingProfile(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id)
    if (error) { toast.error('Failed to update profile'); setSavingProfile(false); return }
    toast.success('Profile updated')
    setSavingProfile(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setChangingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { toast.error(error.message); setChangingPassword(false); return }
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Password changed successfully')
    setChangingPassword(false)
  }

  if (loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-48 bg-muted/30 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            Profile
          </CardTitle>
          <CardDescription>Update your display name and view account info</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                className="h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={email} disabled className="h-11 pl-9 opacity-60 cursor-not-allowed bg-muted/30" />
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed after registration</p>
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="flex items-center h-11 px-3 border border-input rounded-md bg-muted/30 gap-3">
                <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1">{role === 'manager' ? 'Manager' : 'Sales Rep'}</span>
                <Badge
                  variant="outline"
                  className={role === 'manager'
                    ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5'
                    : 'border-blue-500/30 text-blue-500 bg-blue-500/5'}
                >
                  {role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Role is assigned at registration and cannot be self-changed</p>
            </div>

            <Button type="submit" disabled={savingProfile} className="bg-primary hover:bg-primary/90 font-medium">
              {savingProfile
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                : 'Save Changes'
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-primary" />
            </div>
            Change Password
          </CardTitle>
          <CardDescription>Update your account password. You will be asked to sign in again.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-11"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="h-11"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={changingPassword} variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
              {changingPassword
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changing...</>
                : 'Change Password'
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-muted">
        <CardContent className="p-5">
          <Separator className="mb-4" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>SalesStack — AI-powered B2B Sales CRM</span>
            <span>v1.0.0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
