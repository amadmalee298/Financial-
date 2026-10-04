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
