-- =============================================================================
-- VendorLens AI - Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- User profiles (extends Supabase Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'employee' check (role in ('admin', 'finance', 'department_head', 'employee')),
  department text,
  company_domain text not null default '',
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Helper function to get current user's role without triggering recursive RLS
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create policy "Admins can read all profiles" on profiles
  for select using (
    auth.uid() = id or get_my_role() = 'admin'
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, company_domain)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    split_part(new.email, '@', 2)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vendors
create table vendors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  canonical_name text,
  aliases jsonb default '[]'::jsonb,          -- AI-merged variant names (e.g. ["salesforce.com"])
  category text,
  description text,
  department text,                             -- comma-separated, derived from spend_records
  owner_id uuid references profiles(id),
  owner_name text,
  total_spend numeric default 0,
  annual_spend numeric default 0,
  is_active boolean default true,
  website text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table vendors enable row level security;

create policy "Authenticated users can read vendors" on vendors
  for select using (auth.role() = 'authenticated');

create policy "Admin and finance can insert vendors" on vendors
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'finance'))
  );

create policy "Admin and finance can update vendors" on vendors
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'finance'))
  );

-- Contracts
create table contracts (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references vendors(id) on delete cascade,
  file_name text not null,
  file_url text,
  start_date date,
  renewal_date date,
  auto_renew boolean,
  notice_period_days integer,
  contract_value numeric,
  pricing_escalation text,
  summary text,
  key_terms jsonb default '[]'::jsonb,
  full_text text,
  status text default 'pending_review' check (status in ('pending_review', 'confirmed', 'expired')),
  extracted_at timestamptz,
  confirmed_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table contracts enable row level security;

create policy "Authenticated users can read contracts" on contracts
  for select using (auth.role() = 'authenticated');

create policy "Admin and finance can manage contracts" on contracts
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'finance'))
  );

-- Spend records
create table spend_records (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references vendors(id) on delete cascade,
  amount numeric not null,
  department text not null,
  period text not null,
  description text,
  created_at timestamptz default now()
);

alter table spend_records enable row level security;

create policy "Authenticated users can read spend" on spend_records
  for select using (auth.role() = 'authenticated');

create policy "Admin and finance can manage spend" on spend_records
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'finance'))
  );

-- Access requests
create table access_requests (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references vendors(id) on delete cascade,
  requester_id uuid references profiles(id),
  requester_name text,
  requester_email text,
  approver_id uuid references profiles(id),
  approver_name text,
  status text default 'pending' check (status in ('pending', 'approved', 'denied')),
  reason text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table access_requests enable row level security;

create policy "Users can read own requests" on access_requests
  for select using (auth.uid() = requester_id or auth.uid() = approver_id);

create policy "Admins can read all requests" on access_requests
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'department_head'))
  );

create policy "Authenticated users can create requests" on access_requests
  for insert with check (auth.role() = 'authenticated');

create policy "Approvers can update requests" on access_requests
  for update using (
    auth.uid() = approver_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Duplicate groups
create table duplicate_groups (
  id uuid default gen_random_uuid() primary key,
  group_name text not null,
  vendor_ids jsonb not null default '[]'::jsonb,
  vendor_names jsonb not null default '[]'::jsonb,
  reason text,
  estimated_overlap_pct numeric default 0,
  total_combined_spend numeric default 0,
  status text default 'flagged' check (status in ('flagged', 'reviewed', 'dismissed')),
  created_at timestamptz default now()
);

alter table duplicate_groups enable row level security;

create policy "Authenticated users can read duplicates" on duplicate_groups
  for select using (auth.role() = 'authenticated');

create policy "Admin can manage duplicates" on duplicate_groups
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'finance'))
  );

-- Vendor embeddings (legacy; prefer knowledge_chunks)
create table vendor_embeddings (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references vendors(id) on delete cascade,
  content text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

alter table vendor_embeddings enable row level security;

create policy "Authenticated users can read embeddings" on vendor_embeddings
  for select using (auth.role() = 'authenticated');

-- Knowledge chunks for RAG (vendors + contracts)
create table knowledge_chunks (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references vendors(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  content text not null,
  embedding vector(768),
  chunk_index int default 0,
  source_type text not null check (source_type in ('vendor', 'contract')),
  created_at timestamptz default now()
);

alter table knowledge_chunks enable row level security;

create policy "Authenticated users can read knowledge chunks" on knowledge_chunks
  for select using (auth.role() = 'authenticated');

-- Similarity search (legacy)
create or replace function match_vendors(
  query_embedding vector(768),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  vendor_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    vendor_embeddings.id,
    vendor_embeddings.vendor_id,
    vendor_embeddings.content,
    1 - (vendor_embeddings.embedding <=> query_embedding) as similarity
  from vendor_embeddings
  where 1 - (vendor_embeddings.embedding <=> query_embedding) > match_threshold
  order by vendor_embeddings.embedding <=> query_embedding
  limit match_count;
$$;

-- RAG similarity search across all knowledge chunks
create or replace function match_knowledge_chunks(
  query_embedding vector(768),
  match_threshold float default 0.55,
  match_count int default 12
)
returns table (
  id uuid,
  vendor_id uuid,
  contract_id uuid,
  content text,
  source_type text,
  similarity float
)
language sql stable
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.vendor_id,
    knowledge_chunks.contract_id,
    knowledge_chunks.content,
    knowledge_chunks.source_type,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where knowledge_chunks.embedding is not null
    and 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- Create storage bucket for contract PDFs
-- Run this separately or via Supabase Dashboard:
-- insert into storage.buckets (id, name, public) values ('contracts', 'contracts', false);

-- Indexes
create unique index idx_vendors_name on vendors(name);
create index idx_vendors_department on vendors(department);
create index idx_contracts_vendor on contracts(vendor_id);
create index idx_contracts_renewal on contracts(renewal_date);
create index idx_spend_vendor on spend_records(vendor_id);
create index idx_access_requests_vendor on access_requests(vendor_id);
create index idx_access_requests_status on access_requests(status);
create index idx_vendor_embeddings_vendor on vendor_embeddings(vendor_id);
create index idx_knowledge_chunks_vendor on knowledge_chunks(vendor_id);
create index idx_knowledge_chunks_contract on knowledge_chunks(contract_id);
create index idx_knowledge_chunks_source on knowledge_chunks(source_type);
