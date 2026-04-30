export type UserRole = 'manager' | 'rep'

export type LeadStatus = 'new' | 'qualified' | 'disqualified' | 'contacted' | 'replied' | 'follow_up' | 'converted' | 'lost'

export type MessageStatus = 'draft' | 'pending_review' | 'approved' | 'sent' | 'failed'

export type MessageChannel = 'email' | 'whatsapp'

export type ProductStep = 'research' | 'leads' | 'qualification' | 'outreach' | 'tracking'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string
  category: string
  status: 'active' | 'archived'
  created_by: string
  created_at: string
  updated_at: string
  profile?: ProductProfile
  rep_count?: number
  lead_count?: number
}

export interface ProductProfile {
  id: string
  product_id: string
  target_segments: string[]
  positioning: string
  value_proposition: string
  pain_points: string[]
  outreach_strategy: string
  email_template: string
  whatsapp_template: string
  keywords: string[]
  completed_at?: string
  updated_at: string
}

export interface UserProduct {
  id: string
  user_id: string
  product_id: string
  assigned_at: string
  assigned_by: string
  profile?: Profile
  product?: Product
}

export interface Lead {
  id: string
  product_id: string
  company_name: string
  contact_name: string
  contact_email?: string
  contact_phone?: string
  linkedin_url?: string
  website?: string
  industry?: string
  company_size?: string
  location?: string
  source: 'scraped' | 'csv' | 'api' | 'manual'
  status: LeadStatus
  qualification_score?: number
  qualification_notes?: string
  assigned_to?: string
  created_at: string
  updated_at: string
  messages?: Message[]
  interactions?: Interaction[]
}

export interface Message {
  id: string
  lead_id: string
  product_id: string
  channel: MessageChannel
  subject?: string
  body: string
  status: MessageStatus
  sent_at?: string
  opened_at?: string
  replied_at?: string
  created_by: string
  created_at: string
}

export interface Interaction {
  id: string
  lead_id: string
  type: 'email_sent' | 'email_opened' | 'email_replied' | 'whatsapp_sent' | 'whatsapp_replied' | 'call' | 'note' | 'status_change'
  content?: string
  metadata?: Record<string, unknown>
  created_by?: string
  created_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ChatSession {
  id: string
  product_id: string
  step: ProductStep
  summary?: string
  is_complete: boolean
  created_by: string
  created_at: string
  messages?: ChatMessage[]
}
