-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null default 'rep' check (role in ('manager', 'rep')),
  avatar_url text,
  created_at timestamptz default now()
);

-- Products
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  category text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Product Intelligence Profile (AI + human agreed)
create table public.product_profiles (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade unique,
  target_segments text[] default '{}',
  positioning text default '',
  value_proposition text default '',
  pain_points text[] default '{}',
  outreach_strategy text default '',
  email_template text default '',
  whatsapp_template text default '',
  keywords text[] default '{}',
  completed_at timestamptz,
  updated_at timestamptz default now()
);

-- User <-> Product mapping
create table public.user_products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  assigned_at timestamptz default now(),
  assigned_by uuid references public.profiles(id) on delete set null,
  unique(user_id, product_id)
);

-- Leads
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade,
  company_name text not null,
  contact_name text not null default '',
  contact_email text,
  contact_phone text,
  linkedin_url text,
  website text,
  industry text,
  company_size text,
  location text,
  source text not null default 'manual' check (source in ('scraped', 'csv', 'api', 'manual')),
  status text not null default 'new' check (status in ('new', 'qualified', 'disqualified', 'contacted', 'replied', 'follow_up', 'converted', 'lost')),
  qualification_score integer check (qualification_score between 0 and 100),
  qualification_notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages (email + WhatsApp)
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references public.leads(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  subject text,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'sent', 'failed')),
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Interaction timeline
create table public.interactions (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references public.leads(id) on delete cascade,
  type text not null check (type in ('email_sent','email_opened','email_replied','whatsapp_sent','whatsapp_replied','call','note','status_change')),
  content text,
  metadata jsonb default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- AI Chat Sessions (one per product per step)
create table public.chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade,
  step text not null check (step in ('research', 'leads', 'qualification', 'outreach', 'tracking')),
  summary text,
  is_complete boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  unique(product_id, step)
);

-- Chat Messages within a session
create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Indexes
create index on public.leads(product_id);
create index on public.leads(status);
create index on public.leads(assigned_to);
create index on public.messages(lead_id);
create index on public.messages(status);
create index on public.interactions(lead_id);
create index on public.chat_messages(session_id);
create index on public.user_products(user_id);
create index on public.user_products(product_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger products_updated_at before update on public.products for each row execute function update_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute function update_updated_at();
create trigger product_profiles_updated_at before update on public.product_profiles for each row execute function update_updated_at();

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_profiles enable row level security;
alter table public.user_products enable row level security;
alter table public.leads enable row level security;
alter table public.messages enable row level security;
alter table public.interactions enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles: users can read all, update own
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Products: managers can do all; reps can read products they're assigned to
create policy "products_manager_all" on public.products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
);
create policy "products_rep_select" on public.products for select using (
  exists (select 1 from public.user_products where user_id = auth.uid() and product_id = products.id)
);

-- Product profiles: same as products
create policy "product_profiles_manager_all" on public.product_profiles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
);
create policy "product_profiles_rep_select" on public.product_profiles for select using (
  exists (select 1 from public.user_products where user_id = auth.uid() and product_id = product_profiles.product_id)
);
create policy "product_profiles_rep_update" on public.product_profiles for update using (
  exists (select 1 from public.user_products where user_id = auth.uid() and product_id = product_profiles.product_id)
);

-- User products: managers can manage all; users can see their own
create policy "user_products_manager_all" on public.user_products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
);
create policy "user_products_rep_select" on public.user_products for select using (user_id = auth.uid());

-- Leads: accessible by assigned reps and managers
create policy "leads_manager_all" on public.leads for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
);
create policy "leads_rep_access" on public.leads for all using (
  exists (select 1 from public.user_products where user_id = auth.uid() and product_id = leads.product_id)
);

-- Messages: same as leads
create policy "messages_manager_all" on public.messages for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
);
create policy "messages_rep_access" on public.messages for all using (
  exists (select 1 from public.user_products where user_id = auth.uid() and product_id = messages.product_id)
);

-- Interactions: same
create policy "interactions_manager_all" on public.interactions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
);
create policy "interactions_rep_access" on public.interactions for all using (
  exists (select 1 from public.leads l join public.user_products up on up.product_id = l.product_id where l.id = interactions.lead_id and up.user_id = auth.uid())
);

-- Chat sessions + messages
create policy "chat_sessions_access" on public.chat_sessions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
  or exists (select 1 from public.user_products where user_id = auth.uid() and product_id = chat_sessions.product_id)
);
create policy "chat_messages_access" on public.chat_messages for all using (
  exists (select 1 from public.chat_sessions cs where cs.id = chat_messages.session_id and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
    or exists (select 1 from public.user_products where user_id = auth.uid() and product_id = cs.product_id)
  ))
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'rep')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
