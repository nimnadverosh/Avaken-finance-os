import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL?.replace("-pooler.", ".");
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 20 });

// Load mock data by evaluating the TS export file (plain JSON-like arrays)
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mockPath = join(root, "src/lib/data/mock.ts");
const mockSrc = readFileSync(mockPath, "utf8");

function extractArray(name) {
  const re = new RegExp(`export const ${name}[^=]*=\\s*(\\[[\\s\\S]*?\\n\\]);`);
  const m = mockSrc.match(re);
  if (!m) throw new Error(`Could not parse ${name} from mock.ts`);
  // eslint-disable-next-line no-eval
  return eval(m[1]);
}

const seedAccounts = extractArray("accounts");
const seedTransactions = extractArray("transactions");
const seedSubscriptions = extractArray("subscriptions");
const seedTikTok = extractArray("tiktokAccounts");
const seedVatPeriods = extractArray("vatPeriods");
const portfolio = extractArray("portfolio");

async function countTable(table) {
  const [{ c }] = await sql`SELECT count(*)::int AS c FROM ${sql(table)}`;
  return c;
}

async function main() {
  console.log("Seeding…");

  const slugToUuid = new Map();

  if ((await countTable("accounts")) === 0) {
    for (const a of seedAccounts) {
      const [row] = await sql`
        INSERT INTO accounts (slug, name, institution, type, entity, balance, currency, last4, accent)
        VALUES (${a.id}, ${a.name}, ${a.institution}, ${a.type}, ${a.entity}, ${a.balance}, ${a.currency}, ${a.last4}, ${a.accent})
        RETURNING id, slug
      `;
      slugToUuid.set(row.slug, row.id);
    }
    console.log(`accounts: ${seedAccounts.length}`);
  } else {
    const rows = await sql`SELECT id, slug FROM accounts WHERE slug IS NOT NULL`;
    for (const r of rows) slugToUuid.set(r.slug, r.id);
    console.log("accounts: skip (already seeded)");
  }

  if ((await countTable("transactions")) === 0) {
    for (const t of seedTransactions) {
      await sql`
        INSERT INTO transactions (date, description, counterparty, amount, category, type, entity, account_id, vat, ai_categorised, status)
        VALUES (${t.date}, ${t.description}, ${t.counterparty}, ${t.amount}, ${t.category}, ${t.type}, ${t.entity}, ${slugToUuid.get(t.accountId) ?? null}, ${t.vat}, ${t.aiCategorised}, ${t.status})
      `;
    }
    console.log(`transactions: ${seedTransactions.length}`);
  } else console.log("transactions: skip");

  if ((await countTable("subscriptions")) === 0) {
    for (const s of seedSubscriptions) {
      await sql`
        INSERT INTO subscriptions (name, vendor, amount, cadence, category, ai_category, entity, next_renewal, status, accent)
        VALUES (${s.name}, ${s.vendor}, ${s.amount}, ${s.cadence}, ${s.category}, ${s.aiCategory}, ${s.entity}, ${s.nextRenewal}, ${s.status}, ${s.accent})
      `;
    }
    console.log(`subscriptions: ${seedSubscriptions.length}`);
  } else console.log("subscriptions: skip");

  if ((await countTable("tiktok_accounts")) === 0) {
    for (const tt of seedTikTok) {
      await sql`
        INSERT INTO tiktok_accounts (handle, niche, followers, revenue, commission, orders, conversion, status, pay_to)
        VALUES (${tt.handle}, ${tt.niche}, ${tt.followers}, ${tt.revenue}, ${tt.commission}, ${tt.orders}, ${tt.conversion}, ${tt.status}, ${tt.payTo})
      `;
    }
    console.log(`tiktok_accounts: ${seedTikTok.length}`);
  } else console.log("tiktok_accounts: skip");

  if ((await countTable("vat_periods")) === 0) {
    for (const v of seedVatPeriods) {
      await sql`
        INSERT INTO vat_periods (quarter, period_start, period_end, due_date, sales_ex_vat, vat_on_sales, purchases_ex_vat, vat_on_purchases, status)
        VALUES (${v.quarter}, ${v.periodStart}, ${v.periodEnd}, ${v.dueDate}, ${v.salesExVat}, ${v.vatOnSales}, ${v.purchasesExVat}, ${v.vatOnPurchases}, ${v.status})
      `;
    }
    console.log(`vat_periods: ${seedVatPeriods.length}`);
  } else console.log("vat_periods: skip");

  if ((await countTable("portfolio_positions")) === 0) {
    for (const p of portfolio) {
      await sql`
        INSERT INTO portfolio_positions (symbol, name, value, allocation, pnl, pnl_pct, kind)
        VALUES (${p.symbol}, ${p.name}, ${p.value}, ${p.allocation}, ${p.pnl}, ${p.pnlPct}, ${p.kind})
      `;
    }
    console.log(`portfolio: ${portfolio.length}`);
  } else console.log("portfolio: skip");

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sql.end());
