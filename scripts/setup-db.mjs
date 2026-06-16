import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL?.replace("-pooler.", ".");
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 20 });

const ENUMS = [
  `CREATE TYPE entity AS ENUM ('personal', 'avaken')`,
  `CREATE TYPE account_type AS ENUM ('business', 'current', 'savings', 'investment', 'credit')`,
  `CREATE TYPE txn_type AS ENUM ('income', 'expense', 'payout', 'transfer', 'vat', 'tax')`,
  `CREATE TYPE cadence AS ENUM ('monthly', 'annual', 'weekly')`,
  `CREATE TYPE sub_status AS ENUM ('active', 'trial', 'paused')`,
  `CREATE TYPE vat_status AS ENUM ('open', 'filed', 'due')`,
  `CREATE TYPE pay_to AS ENUM ('company', 'personal')`,
];

const TABLES = `
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  name text NOT NULL,
  institution text NOT NULL,
  type account_type NOT NULL,
  entity entity NOT NULL,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  last4 text,
  accent text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  description text NOT NULL,
  counterparty text,
  amount numeric(14,2) NOT NULL,
  category text NOT NULL,
  type txn_type NOT NULL,
  entity entity NOT NULL,
  account_id uuid REFERENCES accounts(id),
  vat numeric(14,2) NOT NULL DEFAULT 0,
  ai_categorised boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'cleared',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vendor text NOT NULL,
  amount numeric(14,2) NOT NULL,
  cadence cadence NOT NULL DEFAULT 'monthly',
  category text NOT NULL,
  ai_category text,
  entity entity NOT NULL,
  next_renewal date,
  status sub_status NOT NULL DEFAULT 'active',
  accent text
);

CREATE TABLE IF NOT EXISTS tiktok_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,
  niche text,
  followers integer NOT NULL DEFAULT 0,
  revenue numeric(14,2) NOT NULL DEFAULT 0,
  commission numeric(5,2),
  orders integer NOT NULL DEFAULT 0,
  conversion numeric(5,2),
  status text NOT NULL DEFAULT 'stable',
  pay_to pay_to NOT NULL DEFAULT 'company'
);

CREATE TABLE IF NOT EXISTS vat_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  sales_ex_vat numeric(14,2) NOT NULL DEFAULT 0,
  vat_on_sales numeric(14,2) NOT NULL DEFAULT 0,
  purchases_ex_vat numeric(14,2) NOT NULL DEFAULT 0,
  vat_on_purchases numeric(14,2) NOT NULL DEFAULT 0,
  status vat_status NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS portfolio_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  name text NOT NULL,
  value numeric(14,2) NOT NULL DEFAULT 0,
  allocation numeric(5,2),
  pnl numeric(14,2) NOT NULL DEFAULT 0,
  pnl_pct numeric(6,2),
  kind text NOT NULL DEFAULT 'stock'
);

CREATE TABLE IF NOT EXISTS affiliate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  handle text NOT NULL,
  niche text NOT NULL DEFAULT 'TikTok Shop',
  pay_to pay_to NOT NULL DEFAULT 'personal',
  accent text NOT NULL DEFAULT '#10b981',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tiktok_uploads (
  id text PRIMARY KEY,
  account_slug text NOT NULL,
  month_key text NOT NULL,
  file_name text NOT NULL,
  uploaded_at timestamp NOT NULL,
  split_json jsonb NOT NULL,
  report_json jsonb NOT NULL,
  summary_json jsonb NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tiktok_uploads_account_month_idx
  ON tiktok_uploads (account_slug, month_key);

CREATE TABLE IF NOT EXISTS planner_tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  duration integer,
  day text,
  "order" integer NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  completed_at bigint
);
`;

async function safe(stmt) {
  try {
    await sql.unsafe(stmt);
  } catch (err) {
    if (err.code === "42710" || err.code === "42P07") return; // already exists
    throw err;
  }
}

try {
  console.log("Connecting…");
  await sql`SELECT 1`;
  console.log("Connected.");

  for (const e of ENUMS) await safe(e);
  for (const t of TABLES.split(";").map((s) => s.trim()).filter(Boolean)) await safe(t);
  await safe(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS slug text UNIQUE`);

  console.log("Schema ready.");
} catch (err) {
  console.error("Setup failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
