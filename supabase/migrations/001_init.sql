create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.contributors (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  display_name text,
  reputation_score float default 0,
  total_pulls int default 0,
  total_earnings_usdc float default 0,
  created_at timestamptz default now()
);

create table if not exists public.knowledge_indexes (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.contributors(id) on delete cascade,
  topics jsonb not null default '[]'::jsonb,
  depth_scores jsonb not null default '{}'::jsonb,
  page_count int default 0,
  last_updated timestamptz,
  summary text,
  embedding vector(3072),
  created_at timestamptz default now(),
  unique (contributor_id)
);

create table if not exists public.content_artifacts (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.contributors(id) on delete cascade,
  page_title text not null,
  page_path text not null,
  topics text[] default '{}',
  source_count int default 0,
  depth_score float default 0,
  content_hash text not null,
  pii_scrubbed_content text not null,
  embedding vector(3072),
  last_updated timestamptz,
  created_at timestamptz default now(),
  unique (contributor_id, page_path)
);

-- For PoC scale (tens/hundreds of pages), we skip ANN indexes to avoid
-- pgvector HNSW dimensional limits with 3072-dim embeddings.

create or replace function public.match_pages(
  query_embedding vector(3072),
  match_threshold float default 0.45,
  match_count int default 10
)
returns table (
  id uuid,
  contributor_id uuid,
  page_title text,
  page_path text,
  topics text[],
  source_count int,
  depth_score float,
  pii_scrubbed_content text,
  similarity float
)
language sql
stable
as $$
  select
    ca.id,
    ca.contributor_id,
    ca.page_title,
    ca.page_path,
    ca.topics,
    ca.source_count,
    ca.depth_score,
    ca.pii_scrubbed_content,
    1 - (ca.embedding <=> query_embedding) as similarity
  from public.content_artifacts ca
  where 1 - (ca.embedding <=> query_embedding) >= match_threshold
  order by ca.embedding <=> query_embedding
  limit match_count;
$$;
