-- Cloud Brain schema for the optional Supabase backend (BACKEND=supabase).
-- Untested since the cleanup. The default in-memory backend does not need this.
-- Payments are simulated: these tables are a ledger of pretend charges, nothing on chain.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.contributors (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  display_name text not null,
  reputation float not null default 3,
  total_pulls int not null default 0,
  total_earnings_usdc numeric(12, 2) not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.contributors(id) on delete cascade,
  page_title text not null,
  page_path text not null,
  summary text not null default '',
  topics text[] default '{}',
  source_count int default 0,
  depth_score float default 0,
  content_hash text not null,
  content text not null,
  -- text-embedding-3-large. No ANN index: pgvector HNSW caps at 2000 dims and the PoC is small.
  embedding vector(3072),
  last_updated timestamptz,
  created_at timestamptz default now(),
  unique (contributor_id, page_path)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  buyer_id text not null,
  contributor_id uuid not null references public.contributors(id) on delete cascade,
  contributor_display_name text not null,
  amount_usdc numeric(12, 2) not null check (amount_usdc >= 0),
  top_page_path text not null,
  top_page_title text not null,
  match_score float,
  status text not null default 'quoted' check (status in ('quoted', 'settled', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  receipt_id text not null unique,
  query text not null,
  buyer_id text not null,
  contributor_id uuid not null references public.contributors(id) on delete cascade,
  contributor_display_name text not null,
  amount_usdc numeric(12, 2) not null check (amount_usdc >= 0),
  matched_page_path text,
  matched_page_title text,
  quote_id uuid references public.quotes(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_payments_buyer_created on public.payments (buyer_id, created_at desc);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  receipt_id text not null unique references public.payments(receipt_id) on delete cascade,
  useful boolean not null,
  rating int check (rating between 1 and 5),
  comment text,
  contributor_id uuid references public.contributors(id) on delete set null,
  buyer_id text,
  created_at timestamptz default now()
);

create or replace function public.match_pages(
  query_embedding vector(3072),
  match_threshold float default 0,
  match_count int default 30
)
returns table (
  id uuid,
  contributor_id uuid,
  page_title text,
  page_path text,
  summary text,
  topics text[],
  source_count int,
  depth_score float,
  content_hash text,
  content text,
  similarity float
)
language sql
stable
as $$
  select p.id, p.contributor_id, p.page_title, p.page_path, p.summary, p.topics,
         p.source_count, p.depth_score, p.content_hash, p.content,
         1 - (p.embedding <=> query_embedding) as similarity
  from public.pages p
  where 1 - (p.embedding <=> query_embedding) >= match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- Server-side access only (service_role). No anon or authenticated access.
alter table public.contributors enable row level security;
alter table public.pages enable row level security;
alter table public.quotes enable row level security;
alter table public.payments enable row level security;
alter table public.feedback enable row level security;

revoke all on table public.contributors, public.pages, public.quotes, public.payments, public.feedback
  from anon, authenticated;
grant select, insert, update, delete
  on table public.contributors, public.pages, public.quotes, public.payments, public.feedback
  to service_role;

revoke all on function public.match_pages(vector, double precision, integer) from public, anon, authenticated;
grant execute on function public.match_pages(vector, double precision, integer) to service_role;
