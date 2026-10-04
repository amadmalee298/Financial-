-- ==============================================================
-- Investment Tracker: complete database setup in ONE file.
-- Paste all of this into Supabase -> SQL Editor and press Run, once,
-- on a new project. (Equivalent to running supabase/migrations/001,
-- 002, 003 and then supabase/seed.sql in order.)
-- Do NOT run it twice: the tables would already exist.
-- ==============================================================


-- ---------- supabase/migrations/001_initial_schema.sql ----------
-- =============================================================
-- Investment Tracker — initial schema (Phase 2)
--
-- Every user-owned table:
--   * has user_id → auth.users (defaults to the caller, cascades on delete)
--   * has Row Level Security enabled with owner-only policies
-- `stocks` is shared reference data: any signed-in user can read it and
-- add a missing symbol, but nobody can edit or delete it from the client.
-- =============================================================

-- -------------------------------------------------------------
-- Helpers
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- profiles (1:1 with auth.users, created automatically on sign-up)
-- -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_currency text not null default 'THB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- stocks (shared reference data)
-- -------------------------------------------------------------
create table public.stocks (
  id uuid primary key default gen_random_uuid(),
  symbol text not null check (symbol = upper(btrim(symbol)) and symbol <> ''),
  name text,
  market text not null default 'SET',
  sector text,
  currency text not null default 'THB',
  created_at timestamptz not null default now(),
  unique (symbol, market)
);

-- -------------------------------------------------------------
-- transactions (BUY / SELL)
-- total_amount is computed by the database with exact numeric math:
--   BUY  = quantity × price + commission + fees + vat   (cash paid)
--   SELL = quantity × price − commission − fees − vat   (cash received)
-- -------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id),
  transaction_type text not null check (transaction_type in ('BUY', 'SELL')),
  trade_date date not null,
  quantity numeric(18,4) not null check (quantity > 0),
  price numeric(18,4) not null check (price >= 0),
  commission numeric(18,2) not null default 0 check (commission >= 0),
  fees numeric(18,2) not null default 0 check (fees >= 0),
  vat numeric(18,2) not null default 0 check (vat >= 0),
  total_amount numeric(18,2) generated always as (
    round(
      case transaction_type
        when 'BUY'  then quantity * price + commission + fees + vat
        else             quantity * price - commission - fees - vat
      end,
      2
    )
  ) stored,
  broker text,
  note text,
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, trade_date desc);
create index transactions_user_stock_idx on public.transactions (user_id, stock_id);

-- -------------------------------------------------------------
-- dividends
-- -------------------------------------------------------------
create table public.dividends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id),
  xd_date date,
  payment_date date,
  shares numeric(18,4) check (shares >= 0),
  dividend_per_share numeric(18,4) check (dividend_per_share >= 0),
  gross_amount numeric(18,2) check (gross_amount >= 0),
  withholding_tax numeric(18,2) check (withholding_tax >= 0),
  net_amount numeric(18,2) check (net_amount >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index dividends_user_payment_idx on public.dividends (user_id, payment_date desc);
create index dividends_user_stock_idx on public.dividends (user_id, stock_id);

-- -------------------------------------------------------------
-- watchlists
-- -------------------------------------------------------------
create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id),
  target_price numeric(18,4) check (target_price >= 0),
  buy_price numeric(18,4) check (buy_price >= 0),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, stock_id)
);

-- -------------------------------------------------------------
-- stock_analysis (investment journal, one per user per stock)
-- -------------------------------------------------------------
create table public.stock_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id),
  investment_thesis text,
  strengths text,
  risks text,
  revenue numeric(18,2),
  net_profit numeric(18,2),
  eps numeric(18,4),
  pe numeric(18,4),
  pbv numeric(18,4),
  roe numeric(18,4),
  roa numeric(18,4),
  debt_equity numeric(18,4),
  dividend_yield numeric(18,4),
  fair_value numeric(18,4),
  target_price numeric(18,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, stock_id)
);

create trigger stock_analysis_set_updated_at
  before update on public.stock_analysis
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- cash_transactions (deposits / withdrawals to the brokerage account)
-- -------------------------------------------------------------
create table public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('DEPOSIT', 'WITHDRAW')),
  transaction_date date not null,
  amount numeric(18,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index cash_transactions_user_date_idx on public.cash_transactions (user_id, transaction_date desc);

-- -------------------------------------------------------------
-- portfolio_snapshots (daily values for the performance chart)
-- -------------------------------------------------------------
create table public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  snapshot_date date not null,
  market_value numeric(18,2) not null default 0,
  cost_basis numeric(18,2) not null default 0,
  cash_balance numeric(18,2) not null default 0,
  realized_pl numeric(18,2) not null default 0,
  dividends numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles            enable row level security;
alter table public.stocks              enable row level security;
alter table public.transactions        enable row level security;
alter table public.dividends           enable row level security;
alter table public.watchlists          enable row level security;
alter table public.stock_analysis      enable row level security;
alter table public.cash_transactions   enable row level security;
alter table public.portfolio_snapshots enable row level security;

-- profiles: a user sees and edits only their own row (created by trigger).
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- stocks: readable by all signed-in users; they may add missing symbols.
create policy "stocks_select_authenticated" on public.stocks
  for select to authenticated using (true);
create policy "stocks_insert_authenticated" on public.stocks
  for insert to authenticated with check (true);

-- Owner-only CRUD for every user-owned table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'transactions', 'dividends', 'watchlists', 'stock_analysis',
    'cash_transactions', 'portfolio_snapshots'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- ---------- supabase/migrations/002_manual_prices.sql ----------
-- =============================================================
-- Phase 3: manual prices
--
-- Until automatic prices arrive (Phase 6), each user can set the current
-- price of a stock themselves. Prices are per user, so one user's entry
-- never changes another user's portfolio value.
-- =============================================================

create table public.manual_prices (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id),
  price numeric(18,4) not null check (price >= 0),
  price_date date not null default current_date,
  updated_at timestamptz not null default now(),
  primary key (user_id, stock_id)
);

create trigger manual_prices_set_updated_at
  before update on public.manual_prices
  for each row execute function public.set_updated_at();

alter table public.manual_prices enable row level security;

create policy "manual_prices_select_own" on public.manual_prices
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "manual_prices_insert_own" on public.manual_prices
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "manual_prices_update_own" on public.manual_prices
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "manual_prices_delete_own" on public.manual_prices
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- supabase/migrations/003_stock_prices.sql ----------
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

-- ---------- supabase/seed.sql ----------
-- Common SET stocks. Safe to run more than once.
insert into public.stocks (symbol, name, market, sector) values
  ('PTT',    'PTT Public Company Limited',                 'SET', 'Energy & Utilities'),
  ('AOT',    'Airports of Thailand',                       'SET', 'Transportation & Logistics'),
  ('CPALL',  'CP ALL',                                     'SET', 'Commerce'),
  ('ADVANC', 'Advanced Info Service',                      'SET', 'Information & Communication Technology'),
  ('KBANK',  'Kasikornbank',                               'SET', 'Banking'),
  ('SCB',    'SCB X',                                      'SET', 'Banking'),
  ('BDMS',   'Bangkok Dusit Medical Services',             'SET', 'Health Care Services'),
  ('DELTA',  'Delta Electronics (Thailand)',               'SET', 'Electronic Components'),
  ('BBL',    'Bangkok Bank',                               'SET', 'Banking'),
  ('KTB',    'Krung Thai Bank',                            'SET', 'Banking'),
  ('GULF',   'Gulf Development',                           'SET', 'Energy & Utilities'),
  ('PTTEP',  'PTT Exploration and Production',             'SET', 'Energy & Utilities'),
  ('SCC',    'The Siam Cement',                            'SET', 'Construction Materials'),
  ('CPN',    'Central Pattana',                            'SET', 'Property Development'),
  ('TRUE',   'True Corporation',                           'SET', 'Information & Communication Technology'),
  ('BH',     'Bumrungrad Hospital',                        'SET', 'Health Care Services'),
  ('MINT',   'Minor International',                        'SET', 'Tourism & Leisure'),
  ('CRC',    'Central Retail Corporation',                 'SET', 'Commerce'),
  ('TISCO',  'TISCO Financial Group',                      'SET', 'Banking'),
  ('LH',     'Land and Houses',                            'SET', 'Property Development')
on conflict (symbol, market) do nothing;
