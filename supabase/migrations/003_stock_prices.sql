-- =============================================================
-- Phase 6: market prices
--
-- Daily closing prices fetched from a market-data provider, shared by all
-- users (like `stocks`). Signed-in users can read them but can NOT write:
-- prices are inserted only by server code using the service role key
-- (which bypasses RLS), so nobody can plant a price that another user's
-- portfolio would then be valued at.
-- =============================================================

create table public.stock_prices (
  stock_id uuid not null references public.stocks(id) on delete cascade,
  price_date date not null,
  close numeric(18,4) not null check (close >= 0),
  source text not null,
  fetched_at timestamptz not null default now(),
  primary key (stock_id, price_date)
);

-- Latest price per stock is read often (dashboard, watchlist).
create index stock_prices_stock_date_idx on public.stock_prices (stock_id, price_date desc);

alter table public.stock_prices enable row level security;

create policy "stock_prices_select_authenticated" on public.stock_prices
  for select to authenticated using (true);

-- Defense in depth: even if a write policy were added by mistake later,
-- the client roles hold no write privileges on this table.
revoke insert, update, delete, truncate on public.stock_prices from anon, authenticated;
