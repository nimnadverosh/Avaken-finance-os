<div align="center">

# Avaken Finance OS

**A unified personal & company finance dashboard for a UK Limited Company
director running TikTok Shop affiliate accounts.**

</div>

---

## What this is

A single, premium dark-mode dashboard that consolidates:

- **Avaken Ltd** — UK Limited Co., VAT registered, revenue via Stripe → Tide,
  TikTok Shop affiliate marketing across 5–6 accounts.
- **Personal** — Starling, RBS, Barclays, eToro.
- **Consolidated** — both, combined for a true net‑worth view.

Three‑way entity switcher in the top bar live‑swaps every KPI, chart and feed.

## Highlights

- **Tax & VAT reserves vs liability** — gauge widgets that tell you, at a
  glance, if your Tide reserve accounts cover the Q4 VAT bill and the rolling
  corporation tax estimate.
- **UK Corporation Tax engine (FY2026)** — tiered 19% / marginal-relief / 25%
  with the 3/200 standard fraction, not a flat rate (`src/lib/tax/uk-corp-tax.ts`).
- **MTD VAT 9‑box scaffolding** — `src/lib/tax/uk-vat.ts` produces a full
  return shape ready to surface in the dedicated `/vat` view.
- **Entity-aware everything** — every record carries an `entity` enum; the
  query layer in `src/lib/data/queries.ts` filters / unions transparently.
- **TikTok Shop leaderboard** — per-account revenue, conversion, delta and
  sparkline; status pills for `scaling / stable / warming / at‑risk`.
- **AI insights panel** — typed `Insight` objects with severity, ready to wire
  to OpenAI for true categorisation suggestions.

## Tech stack

| Layer        | Choice                                              |
|--------------|------------------------------------------------------|
| Framework    | Next.js **16.2.7** (App Router) + React 19           |
| Language     | TypeScript (strict)                                  |
| Styling      | Tailwind CSS v4 + custom dark design system          |
| Primitives   | Radix UI + shadcn-style local components             |
| Charts       | Recharts                                             |
| Data layer   | Drizzle ORM + Postgres (Supabase / Neon ready)       |
| Icons        | Lucide React                                         |

## Project structure

```
src/
├─ app/
│  ├─ layout.tsx                  Root layout (fonts + EntityProvider)
│  ├─ page.tsx                    Redirects to /dashboard
│  └─ (app)/
│     ├─ layout.tsx               App shell (sidebar + topbar + mobile nav)
│     └─ dashboard/page.tsx       Consolidated dashboard
├─ components/
│  ├─ layout/                     Sidebar · Topbar · EntitySwitcher · MobileNav
│  ├─ ui/                         Card · Button · Badge · Sparkline · Delta
│  ├─ charts/                     Revenue · Cashflow · Networth · ExpenseDonut
│  └─ dashboard/                  KpiCard · ReserveGauge · AccountsStrip
│                                 AffiliatesLeaderboard · TransactionsFeed
│                                 InsightsPanel · PeriodToggle · Dashboard
├─ lib/
│  ├─ entity-context.tsx          Client entity switcher (localStorage)
│  ├─ period.ts                   MTD/QTD/YTD/UK tax year helpers
│  ├─ format.ts                   GBP/UK locale formatters
│  ├─ tax/
│  │  ├─ uk-corp-tax.ts           Tiered + marginal relief engine
│  │  └─ uk-vat.ts                MTD 9-box VAT return builder
│  └─ data/
│     ├─ types.ts                 Domain types (Account, Transaction, …)
│     ├─ mock.ts                  Realistic seed data
│     └─ queries.ts               Entity-aware selectors / KPIs
└─ db/
   ├─ schema.ts                   Drizzle schema (matches domain types)
   └─ index.ts                    Drizzle client (Postgres)
```

## Running locally

```bash
npm install
cp .env.example .env.local   # optional — only needed for DB / Hermes
npm run dev
# → http://localhost:3000  (redirects to /dashboard)
```

The dashboard renders entirely from the typed seed data in `src/lib/data`, so
**zero environment variables are needed** to see the full UI.

### Optional: Postgres + Hermes

Edit `.env.local` (never commit this file):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres (Supabase / Neon). Unset = mock ledger. |
| `HERMES_AGENT_URL` | Your VPS base URL for screenshot analysis. |
| `HERMES_AGENT_API_KEY` | Bearer token for Hermes. |
| `IMPORT_JSON_API_KEY` | Key for `POST /api/import/json` (falls back to Hermes key). |

Push the schema:

```bash
npx drizzle-kit push
```

…then swap the selectors in `src/lib/data/queries.ts` to call `db.select…`
against the Drizzle client in `src/db`.

In **development**, if `IMPORT_JSON_API_KEY` is unset, JSON import allows
unauthenticated requests for easier local testing. **Production always requires
a key.**

---

## Deploying to Vercel

### Prerequisites

- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (Hobby is fine for the UI; see note below on screenshot timeouts)
- (Optional) A Postgres database URL for persisted imports
- (Optional) A Hermes Agent VPS reachable from the public internet

### 1. Push to GitHub

From the project folder (first time only):

```bash
cd path/to/avaken-finance-os

# Confirm secrets are not tracked
git status
# .env.local must NOT appear in "Changes to be committed"

git add .
git commit -m "Prepare Avaken Finance OS for deployment"
```

Create a new empty repository on GitHub (e.g. `avaken-finance-os`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/avaken-finance-os.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and repo name with yours. Use SSH instead of HTTPS if you prefer:

```bash
git remote add origin git@github.com:YOUR_USERNAME/avaken-finance-os.git
```

### 2. Import the project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `.` (default)
5. Build command: `npm run build` (default)
6. Click **Deploy** (you can add env vars before or right after the first deploy)

`vercel.json` in the repo sets a **60s** serverless timeout for screenshot
upload. On Vercel **Hobby**, function duration is capped at **10s** — screenshot
analysis may time out unless you upgrade to **Pro** or shorten Hermes response time.

### 3. Environment variables on Vercel

In the Vercel dashboard: **Project → Settings → Environment Variables**.

Add each variable for **Production** (and **Preview** if you use preview deployments):

| Name | Required | Notes |
|------|----------|-------|
| `DATABASE_URL` | For DB imports | Pooled URL recommended on serverless. Include `?sslmode=require` if your host requires SSL. |
| `HERMES_AGENT_URL` | For live screenshots | Public URL your VPS allows from Vercel (not `localhost`). |
| `HERMES_AGENT_API_KEY` | With Hermes URL | Same value as on your Hermes server. |
| `IMPORT_JSON_API_KEY` | **Yes in production** | Use a long random string; Hermes VPS sends this on `POST /api/import/json`. |

Leave variables **empty** to keep mock/demo behaviour where the code supports it
(dashboard UI works without any vars).

**Security checklist**

- Never add `.env.local` to Git — it is in `.gitignore`
- Use different API keys for production vs local
- Rotate keys if they were ever committed or shared

### 4. Database migrations after deploy

Run from your machine (uses `.env.local` or paste production `DATABASE_URL` once):

```bash
npx drizzle-kit push
```

Use your host’s SQL editor or migration workflow for production schema changes.

### 5. Verify production

- Open your `*.vercel.app` URL → `/dashboard` loads
- `POST /api/import/json` with `Authorization: Bearer <IMPORT_JSON_API_KEY>` returns 200 when configured
- Screenshot import: upload flow works only if `HERMES_AGENT_URL` points to a reachable VPS

### Deploy from the CLI (optional)

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.vercel.local   # optional: pull remote env for local testing
vercel --prod
```

---

## Roadmap

Already on the board:

- `/transactions` — filterable ledger with entity tags + AI categorisation
- `/subscriptions` — renewal calendar for the 19 active subs
- `/affiliates` — drill-down per TikTok account
- `/vat` — MTD return preview (9 boxes)
- `/tax` — corp tax + personal income tax breakdown
- `/portfolio` — eToro positions
- `/reports` — P&L · VAT · audit log exports
- `/insights` — AI insights feed
- Director's Loan Account tracking
- Salary vs dividends split
- Audit log table
- Connections table (Stripe, Tide, TrueLayer, eToro, TikTok Shop)
