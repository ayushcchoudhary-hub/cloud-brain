-- Quote/approval lifecycle + feedback capture for visible marketplace flow.

create table if not exists public.mock_pull_quotes (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  buyer_wallet text not null,
  contributor_id uuid not null references public.contributors(id) on delete cascade,
  contributor_display_name text not null,
  amount_usdc numeric(12, 2) not null check (amount_usdc >= 0),
  top_page_path text not null,
  top_page_title text not null,
  match_reason text,
  match_score float,
  matched_terms text[] default '{}',
  status text not null default 'quoted' check (status in ('quoted','approved','settled','expired')),
  auto_approvable boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_mock_pull_quotes_created
  on public.mock_pull_quotes (created_at desc);
create index if not exists idx_mock_pull_quotes_buyer
  on public.mock_pull_quotes (buyer_wallet, created_at desc);
create index if not exists idx_mock_pull_quotes_status
  on public.mock_pull_quotes (status, created_at desc);

create table if not exists public.mock_pull_feedback (
  id uuid primary key default gen_random_uuid(),
  tx_hash text not null,
  useful boolean not null,
  rating int check (rating between 1 and 5),
  feedback_text text,
  query text,
  contributor_id uuid references public.contributors(id) on delete set null,
  buyer_wallet text,
  created_at timestamptz default now()
);

create index if not exists idx_mock_pull_feedback_tx
  on public.mock_pull_feedback (tx_hash);
create index if not exists idx_mock_pull_feedback_created
  on public.mock_pull_feedback (created_at desc);

alter table public.mock_pull_quotes enable row level security;
alter table public.mock_pull_feedback enable row level security;

revoke all on table public.mock_pull_quotes from anon, authenticated;
revoke all on table public.mock_pull_feedback from anon, authenticated;

grant select, insert, update, delete on table public.mock_pull_quotes to service_role;
grant select, insert, update, delete on table public.mock_pull_feedback to service_role;
