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
4. Run the app:

   ```bash
   npm install
   npm run dev
   ```

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
  layout/  ui/  auth/
lib/
  supabase/         client.ts (browser), server.ts, middleware.ts (session refresh)
  utils/            currency.ts, date.ts, redirect.ts
proxy.ts            Next.js 16 proxy (formerly middleware.ts): auth guard
supabase/migrations/
```

Notes:

- `(app)` is a route group, so URLs stay `/dashboard`, `/portfolio`, ….
- Next.js 16 renamed `middleware.ts` to `proxy.ts`.
- Tailwind 4 is configured in CSS, so there is no `tailwind.config.ts`.

## Roadmap

- [x] **Phase 1** — Next.js + Tailwind + Supabase + Login
- [ ] **Phase 2** — Database + RLS + Stocks + Transactions
- [ ] **Phase 3** — Portfolio + Cost Average + Realized / Unrealized P/L
- [ ] **Phase 4** — Dashboard + Charts + Allocation + Performance
- [ ] **Phase 5** — Dividend + Watchlist + Investment Journal
- [ ] **Phase 6** — Stock Price API + Automatic price update + SET data
- [ ] **Phase 7** — PWA + iPhone / iPad + Offline support
