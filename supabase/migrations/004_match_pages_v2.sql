-- Backward-compatible search RPC with content hash included for integrity checks.

create or replace function public.match_pages_v2(
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
  content_hash text,
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
    ca.content_hash,
    ca.pii_scrubbed_content,
    1 - (ca.embedding <=> query_embedding) as similarity
  from public.content_artifacts ca
  where 1 - (ca.embedding <=> query_embedding) >= match_threshold
  order by ca.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_pages_v2(vector, double precision, integer)
  from public, anon, authenticated;
grant execute on function public.match_pages_v2(vector, double precision, integer)
  to service_role;
