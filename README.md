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
   `supabase/migrations/001_initial_schema.sql` and then `supabase/seed.sql`
   into the Supabase **SQL Editor**, or with the Supabase CLI:

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push              # runs supabase/migrations
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

Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`.

## Project Structure

```
app/
  (app)/            signed-in pages (shared Sidebar / Header / MobileNav)
    dashboard/  portfolio/[symbol]/  transactions/  dividends/
    watchlist/  analysis/  reports/  settings/
  login/            login + sign-up page and server actions
  auth/             email confirm, sign-out, error routes
components/
  layout/  ui/  auth/  stocks/  transactions/
app/api/stocks      GET ?q= stock search
lib/
  supabase/         client.ts (browser), server.ts, middleware.ts (session refresh)
  calculations/     decimal-safe financial math
  utils/            currency.ts, date.ts, decimal.ts, redirect.ts
types/              database.ts (schema types), transaction.ts
proxy.ts            Next.js 16 proxy (formerly middleware.ts): auth guard
supabase/
  migrations/001_initial_schema.sql   tables, RLS, triggers
  seed.sql                           common SET stocks
```

Notes:

- `(app)` is a route group, so URLs stay `/dashboard`, `/portfolio`, ….
- Next.js 16 renamed `middleware.ts` to `proxy.ts`.
- Tailwind 4 is configured in CSS, so there is no `tailwind.config.ts`.

## Roadmap

- [x] **Phase 1** — Next.js + Tailwind + Supabase + Login
- [x] **Phase 2** — Database + RLS + Stocks + Transactions
- [ ] **Phase 3** — Portfolio + Cost Average + Realized / Unrealized P/L
- [ ] **Phase 4** — Dashboard + Charts + Allocation + Performance
- [ ] **Phase 5** — Dividend + Watchlist + Investment Journal
- [ ] **Phase 6** — Stock Price API + Automatic price update + SET data
- [ ] **Phase 7** — PWA + iPhone / iPad + Offline support
