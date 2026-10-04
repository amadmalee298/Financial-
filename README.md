# Investment Tracker

บัญชีส่วนบุคคล — สมุดบันทึกและติดตามพอร์ตการลงทุนหุ้นไทย

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Supabase (Auth + PostgreSQL)
- Recharts (Phase 4)

## Rules

1. Use TypeScript.
2. Use Server Components by default.
3. Use Client Components only when necessary.
4. Never expose Supabase service role key to the browser.
5. All user data must be protected by Supabase RLS.
6. Every investment record belongs to a user.
7. Financial calculations must use decimal-safe calculations.
8. Use THB as the default currency.
9. Responsive design is required.
10. Mobile-first UI.

## Main Features

- Dashboard
- Portfolio
- Buy/Sell transactions
- Dividend tracking
- Watchlist
- Stock analysis
- Investment journal
- Reports
- Authentication

## Design

Dark financial dashboard. Tokens live in `app/globals.css` (`@theme`), usable as
Tailwind classes such as `bg-primary`, `text-positive`.

| Token      | Color     |
| ---------- | --------- |
| primary    | `#0F172A` |
| secondary  | `#1E293B` |
| positive   | `#16A34A` |
| negative   | `#DC2626` |
| background | `#F8FAFC` |

## Getting Started

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the env file and fill in the values from **Project Settings → API**:

   ```bash
   cp .env.example .env.local
   ```

3. In Supabase **Authentication → URL Configuration**, set Site URL to
   `http://localhost:3000` and add `http://localhost:3000/auth/confirm` to the
   redirect URLs.
4. Create the database. Either paste
   each file in `supabase/migrations/` in order (001, 002, …) and then
   `supabase/seed.sql` into the Supabase **SQL Editor**, or with the Supabase CLI:

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push              # runs every file in supabase/migrations
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

5. Run the app:

   ```bash
   npm install
   npm run dev
   ```

## Database

| Table                 | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `profiles`            | One row per user, created by trigger on sign-up   |
| `stocks`              | Shared list of symbols (SET by default)           |
| `transactions`        | BUY / SELL records                                |
| `dividends`           | Dividends received                                |
| `watchlists`          | Stocks to watch, with target prices               |
| `stock_analysis`      | Investment journal / fundamentals per stock       |
| `cash_transactions`   | Deposits and withdrawals                          |
| `portfolio_snapshots` | Daily portfolio values for performance charts     |
| `manual_prices`       | Current price entered by the user (per user)      |
| `stock_prices`        | Daily market closes, shared; written by server only |

- **RLS is on for every table.** User tables only allow the owner
  (`auth.uid() = user_id`) to read or write; `user_id` defaults to the caller.
  `stocks` can be read and added to by any signed-in user, but not edited or
  deleted from the app.
- `transactions.total_amount` is a generated column, computed with exact
  `numeric` math: BUY = qty × price + costs, SELL = qty × price − costs.
- In TypeScript, money math uses `decimal.js` (`lib/utils/decimal.ts`,
  `lib/calculations/`). Values are sent to Supabase as strings so they are
  stored without float rounding.
- `types/database.ts` mirrors the schema. After linking a project you can
  regenerate it with
  `npx supabase gen types typescript --linked > types/database.ts`
  (the hand-written version also accepts strings for numeric inserts).

## Portfolio calculations

`lib/calculations/` (unit-tested in `portfolio.test.ts`) uses the
**average-cost method**, as Thai brokers do:

| Step | Rule |
| ---- | ---- |
| BUY  | shares += qty; cost += amount paid (price × qty + commission + fees + VAT) |
| SELL | cost of sold = avg cost × qty; realized P/L += net proceeds − cost of sold |
| Unrealized P/L | shares × current price − remaining cost |
| Total return | unrealized + realized + dividends |

- Transactions replay by trade date (BUY before SELL on the same day), and
  saving or deleting is refused if shares would ever go negative.
- Current price: the newest of the user's manual price, the latest market
  close and the last trade price (see Market prices below).

## Dashboard charts (Phase 4)

- **Performance**: portfolio value vs cost over time (Recharts), with
  1M / 3M / 6M / YTD / 1Y / all ranges and a table view. Cost is exact.
  Past values are estimated at the last known trade/manual price on each
  date, and a real snapshot is saved to `portfolio_snapshots` each day the
  dashboard is opened. A snapshot whose cost basis no longer matches (after a
  back-dated entry) is ignored.
- **Allocation**: weight by stock or by sector, top 5 + others.
- **Return per stock**: unrealized + realized + dividends, as bars diverging
  from zero (direction and sign, not only color, show gain vs loss).
- **Reports** page: yearly and monthly buys, sells, realized P/L, dividends
  and fees.
- Chart colors: value `#2a78d6`, cost `#eb6834` (a validated
  colorblind-safe pair).

## Market prices (Phase 6)

Daily closing prices for the stocks you hold or watch are stored in
`stock_prices` (migration `003_stock_prices.sql`) and used for portfolio value,
the watchlist and the performance chart.

- **Update prices** button on Portfolio and Watchlist, plus
  `GET /api/cron/prices` for a scheduler. Both fetch from each stock's first
  trade date the first time, then only the latest days.
- **Which price is shown**: the newest by date. On the same day: your manual
  price, then the market close, then your last trade. A manual price therefore
  holds only until the market has a newer close.
- **Safety**: prices are shared by all users, so clients can read the table
  but not write it. Only server code with the service role key writes, which
  also prevents anyone planting a price that changes other users' portfolios.
  Stocks refreshed in the last 10 minutes are skipped and a call fetches at
  most 60 symbols, 5 at a time.
- **Setup**: set `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` (see
  `.env.example`), run migration 003, then call the cron route on a schedule,
  e.g. daily after the SET close (17:00 Bangkok = `0 10 * * *` UTC):

  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/prices
  ```

  On Vercel, add a cron entry for `/api/cron/prices` in `vercel.json`; Vercel
  sends the `Authorization` header automatically when `CRON_SECRET` is set.
- **Source**: Yahoo Finance (`SYMBOL.BK`), which is free but **unofficial**: it
  gives end-of-day closes (not real time), may be delayed, rate-limited or
  changed without notice, and was written against its documented response
  shape and tested with a mock server. Symbols it does not know are reported
  as "not found". To switch to an official feed, implement `PriceProvider`
  (`lib/prices/provider.ts`), register it in `lib/prices/index.ts` and set
  `PRICE_PROVIDER`; nothing else changes.
- **Known limits**: closes are split-adjusted by Yahoo but your recorded
  quantities are not, so after a stock split, history before the split will not
  line up. Only SET and mai are quoted.

## Dividends, Watchlist, Journal (Phase 5)

- **Dividends** (`/dividends`): gross = shares × dividend per share, 10%
  withholding tax by default (editable), net = gross − tax. The form suggests
  the shares held before the XD date from your transactions. Dividends count
  toward portfolio total return and the reports, including dividends on
  stocks with no recorded buys.
- **Watchlist** (`/watchlist`): buy price and target per stock, with distance
  to the buy price, upside to target, and a "reached buy price" flag. Prices
  come from the market, manual entry or your last trade.
- **Investment journal** (`/analysis`): one analysis per stock with thesis,
  strengths, risks and key figures (EPS, P/E, P/BV, ROE, ROA, D/E, yield,
  fair value, target). Shows P/E at the current price, margin of safety
  ((fair − price) ÷ fair) and upside.

Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`,
`npm test`.

## Project Structure

```
app/
  (app)/            signed-in pages (shared Sidebar / Header / MobileNav)
    dashboard/  portfolio/[symbol]/  transactions/  dividends/
    watchlist/  analysis/  reports/  settings/
  login/            login + sign-up page and server actions
  auth/             email confirm, sign-out, error routes
components/
  layout/  ui/  auth/  stocks/  transactions/  portfolio/  dashboard/
  dividends/  watchlist/  analysis/
app/api/stocks      GET ?q= stock search
lib/
  supabase/         client.ts (browser), server.ts, middleware.ts (session refresh)
  calculations/     decimal-safe financial math (average cost, P/L)
  data/             server-side loaders (portfolio, performance, reports, stocks)
  prices/           price providers (Yahoo), refresh job, fetch ranges
  utils/            currency.ts, date.ts, decimal.ts, form.ts, format.ts, redirect.ts
types/              database.ts (schema types), transaction.ts, portfolio.ts
proxy.ts            Next.js 16 proxy (formerly middleware.ts): auth guard
supabase/
  migrations/001_initial_schema.sql   tables, RLS, triggers
  migrations/002_manual_prices.sql    per-user manual prices
  migrations/003_stock_prices.sql     shared market closes (server-written)
  seed.sql                           common SET stocks
```

Notes:

- `(app)` is a route group, so URLs stay `/dashboard`, `/portfolio`, ….
- Next.js 16 renamed `middleware.ts` to `proxy.ts`.
- Tailwind 4 is configured in CSS, so there is no `tailwind.config.ts`.

## Roadmap

- [x] **Phase 1** — Next.js + Tailwind + Supabase + Login
- [x] **Phase 2** — Database + RLS + Stocks + Transactions
- [x] **Phase 3** — Portfolio + Cost Average + Realized / Unrealized P/L
- [x] **Phase 4** — Dashboard + Charts + Allocation + Performance
- [x] **Phase 5** — Dividend + Watchlist + Investment Journal
- [x] **Phase 6** — Stock Price API + Automatic price update + SET data
- [ ] **Phase 7** — PWA + iPhone / iPad + Offline support
