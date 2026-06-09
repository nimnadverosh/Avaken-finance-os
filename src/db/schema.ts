import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/*  Enums                                                              */
/* ------------------------------------------------------------------ */

export const entityEnum = pgEnum("entity", ["personal", "avaken"]);
export const accountTypeEnum = pgEnum("account_type", [
  "business",
  "current",
  "savings",
  "investment",
  "credit",
]);
export const txnTypeEnum = pgEnum("txn_type", [
  "income",
  "expense",
  "payout",
  "transfer",
  "vat",
  "tax",
]);
export const cadenceEnum = pgEnum("cadence", ["monthly", "annual", "weekly"]);
export const subStatusEnum = pgEnum("sub_status", ["active", "trial", "paused"]);
export const vatStatusEnum = pgEnum("vat_status", ["open", "filed", "due"]);
export const payToEnum = pgEnum("pay_to", ["company", "personal"]);

const money = (name: string) => numeric(name, { precision: 14, scale: 2 });

/* ------------------------------------------------------------------ */
/*  Tables                                                             */
/* ------------------------------------------------------------------ */

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  institution: text("institution").notNull(),
  type: accountTypeEnum("type").notNull(),
  entity: entityEnum("entity").notNull(),
  balance: money("balance").notNull().default("0"),
  currency: text("currency").notNull().default("GBP"),
  last4: text("last4"),
  accent: text("accent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull(),
  description: text("description").notNull(),
  counterparty: text("counterparty"),
  amount: money("amount").notNull(),
  category: text("category").notNull(),
  type: txnTypeEnum("type").notNull(),
  entity: entityEnum("entity").notNull(),
  accountId: uuid("account_id").references(() => accounts.id),
  vat: money("vat").notNull().default("0"),
  aiCategorised: boolean("ai_categorised").notNull().default(false),
  status: text("status").notNull().default("cleared"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  vendor: text("vendor").notNull(),
  amount: money("amount").notNull(),
  cadence: cadenceEnum("cadence").notNull().default("monthly"),
  category: text("category").notNull(),
  aiCategory: text("ai_category"),
  entity: entityEnum("entity").notNull(),
  nextRenewal: date("next_renewal"),
  status: subStatusEnum("status").notNull().default("active"),
  accent: text("accent"),
});

export const tiktokAccounts = pgTable("tiktok_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  handle: text("handle").notNull(),
  niche: text("niche"),
  followers: integer("followers").notNull().default(0),
  revenue: money("revenue").notNull().default("0"),
  commission: numeric("commission", { precision: 5, scale: 2 }),
  orders: integer("orders").notNull().default(0),
  conversion: numeric("conversion", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("stable"),
  payTo: payToEnum("pay_to").notNull().default("company"),
});

export const vatPeriods = pgTable("vat_periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  quarter: text("quarter").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  dueDate: date("due_date").notNull(),
  salesExVat: money("sales_ex_vat").notNull().default("0"),
  vatOnSales: money("vat_on_sales").notNull().default("0"),
  purchasesExVat: money("purchases_ex_vat").notNull().default("0"),
  vatOnPurchases: money("vat_on_purchases").notNull().default("0"),
  status: vatStatusEnum("status").notNull().default("open"),
});

export const portfolioPositions = pgTable("portfolio_positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  value: money("value").notNull().default("0"),
  allocation: numeric("allocation", { precision: 5, scale: 2 }),
  pnl: money("pnl").notNull().default("0"),
  pnlPct: numeric("pnl_pct", { precision: 6, scale: 2 }),
  kind: text("kind").notNull().default("stock"),
});
