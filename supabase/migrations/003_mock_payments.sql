-- Mock payment ledger for Cloud Brain marketplace demos.
-- Adds purchase tracking and contributor earnings accumulation.

create table if not exists public.mock_payments (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  buyer_wallet text not null,
  seller_contributor_id uuid not null references public.contributors(id) on delete cascade,
  seller_display_name text not null,
  amount_usdc numeric(12, 2) not null check (amount_usdc >= 0),
  tx_hash text not null unique,
  matched_page_path text,
  matched_page_title text,
  created_at timestamptz default now()
);

create index if not exists idx_mock_payments_seller_created
  on public.mock_payments (seller_contributor_id, created_at desc);

create index if not exists idx_mock_payments_created
  on public.mock_payments (created_at desc);

alter table public.mock_payments enable row level security;

revoke all on table public.mock_payments from anon, authenticated;
grant select, insert, update, delete on table public.mock_payments to service_role;
