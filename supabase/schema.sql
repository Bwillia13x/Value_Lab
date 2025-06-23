-- Supabase schema for Value Lab

create table if not exists fund_prices (
  id bigserial primary key,
  ticker text not null,
  raw_json jsonb not null,
  fetched_at timestamptz not null default now()
);

create index if not exists fund_prices_ticker_fetched_at_idx
  on fund_prices (ticker, fetched_at desc); 