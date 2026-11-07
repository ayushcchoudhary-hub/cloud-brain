-- Security hardening for Cloud Brain PoC.
-- Goal: make tables and RPC inaccessible to anon/authenticated by default,
-- while keeping server-side access via service_role.

-- 1) Enable RLS on app tables.
alter table public.contributors enable row level security;
alter table public.knowledge_indexes enable row level security;
alter table public.content_artifacts enable row level security;

-- 2) Remove broad table privileges from client roles.
revoke all on table public.contributors from anon, authenticated;
revoke all on table public.knowledge_indexes from anon, authenticated;
revoke all on table public.content_artifacts from anon, authenticated;

-- 3) Remove broad function execute from client/public roles.
revoke all on function public.match_pages(vector, double precision, integer)
  from public, anon, authenticated;

-- 4) Grant only service_role access needed by this PoC backend.
grant select, insert, update, delete on table public.contributors to service_role;
grant select, insert, update, delete on table public.knowledge_indexes to service_role;
grant select, insert, update, delete on table public.content_artifacts to service_role;
grant execute on function public.match_pages(vector, double precision, integer)
  to service_role;

-- 5) Prevent future objects from inheriting broad privileges.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

