-- Enrich payment records with quote linkage, settlement metadata, safety, and eval metrics.

alter table public.mock_payments
  add column if not exists quote_id uuid references public.mock_pull_quotes(id) on delete set null,
  add column if not exists settlement_ms int,
  add column if not exists prompt_injection_flagged boolean,
  add column if not exists content_hash_verified boolean,
  add column if not exists eval_relevance_score float,
  add column if not exists eval_citation_coverage float,
  add column if not exists eval_overall_score float,
  add column if not exists pii_flagged boolean;

create index if not exists idx_mock_payments_quote_id
  on public.mock_payments (quote_id);
create index if not exists idx_mock_payments_buyer_created
  on public.mock_payments (buyer_wallet, created_at desc);

create unique index if not exists idx_mock_pull_feedback_tx_unique
  on public.mock_pull_feedback (tx_hash);
