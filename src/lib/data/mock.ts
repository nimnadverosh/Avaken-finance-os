import type {
  Account,
  AuditEntry,
  CategorySlice,
  Insight,
  PayrollPlan,
  PortfolioPosition,
  SeriesPoint,
  Subscription,
  TikTokAccount,
  Transaction,
  VatPeriod,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Accounts                                                           */
/* ------------------------------------------------------------------ */

export const accounts: Account[] = [
  { id: "tide", name: "Tide Business", institution: "Tide", type: "business", entity: "avaken", balance: 84230.55, currency: "GBP", last4: "8841", accent: "#10b981" },
  { id: "tide-vat", name: "VAT Reserve", institution: "Tide", type: "savings", entity: "avaken", balance: 31870.0, currency: "GBP", last4: "8842", accent: "#f59e0b" },
  { id: "tide-tax", name: "Corp Tax Reserve", institution: "Tide", type: "savings", entity: "avaken", balance: 24500.0, currency: "GBP", last4: "8843", accent: "#a78bfa" },
  { id: "starling", name: "Starling Personal", institution: "Starling", type: "current", entity: "personal", balance: 12450.18, currency: "GBP", last4: "2207", accent: "#7c5cff" },
  { id: "rbs", name: "RBS Current", institution: "RBS", type: "current", entity: "personal", balance: 4380.92, currency: "GBP", last4: "0098", accent: "#3b82f6" },
  { id: "barclays", name: "Barclays Saver", institution: "Barclays", type: "savings", entity: "personal", balance: 22600.0, currency: "GBP", last4: "5512", accent: "#38bdf8" },
  { id: "amex", name: "Amex", institution: "American Express", type: "credit", entity: "personal", balance: 2840.5, currency: "GBP", last4: "1004", accent: "#f43f5e" },
  { id: "rbs-credit", name: "RBS Credit Card", institution: "RBS", type: "credit", entity: "personal", balance: 1562.3, currency: "GBP", last4: "4421", accent: "#ef4444" },
  { id: "barclays-credit", name: "Barclays Credit Card", institution: "Barclays", type: "credit", entity: "personal", balance: 920.0, currency: "GBP", last4: "7788", accent: "#dc2626" },
  { id: "etoro", name: "eToro Portfolio", institution: "eToro", type: "investment", entity: "personal", balance: 38942.71, currency: "USD", last4: "—", accent: "#22c55e" },
];

/* ------------------------------------------------------------------ */
/*  TikTok affiliate accounts                                          */
/* ------------------------------------------------------------------ */

export const tiktokAccounts: TikTokAccount[] = [
  { id: "tt1", handle: "@avaken.tech", niche: "AI & Gadgets", followers: 184200, revenue: 14820, commission: 12, orders: 1340, conversion: 4.8, status: "scaling", delta: 18.4, spark: [6, 7, 9, 8, 11, 13, 14.8], payTo: "company" },
  { id: "tt2", handle: "@avaken.home", niche: "Home & Living", followers: 96400, revenue: 9650, commission: 10, orders: 980, conversion: 3.9, status: "stable", delta: 4.2, spark: [8, 8.4, 9.1, 8.8, 9.2, 9.4, 9.65], payTo: "company" },
  { id: "tt3", handle: "@avaken.beauty", niche: "Beauty", followers: 142800, revenue: 11230, commission: 14, orders: 1510, conversion: 5.2, status: "scaling", delta: 11.7, spark: [7, 8, 9, 9.5, 10, 10.6, 11.2], payTo: "company" },
  { id: "tt4", handle: "@avaken.fit", niche: "Fitness", followers: 61300, revenue: 5210, commission: 11, orders: 540, conversion: 3.1, status: "warming", delta: 27.5, spark: [2.8, 3.2, 3.6, 4.1, 4.5, 4.9, 5.2], payTo: "personal" },
  { id: "tt5", handle: "@avaken.deals", niche: "Daily Deals", followers: 210500, revenue: 8740, commission: 9, orders: 1620, conversion: 2.7, status: "at-risk", delta: -6.3, spark: [11, 10.6, 10.1, 9.6, 9.2, 9.0, 8.74], payTo: "personal" },
  { id: "tt6", handle: "@avaken.pets", niche: "Pets", followers: 44900, revenue: 3980, commission: 13, orders: 410, conversion: 3.4, status: "warming", delta: 33.1, spark: [1.9, 2.3, 2.7, 3.0, 3.4, 3.7, 3.98], payTo: "personal" },
];

/* ------------------------------------------------------------------ */
/*  Subscriptions (15+)                                                */
/* ------------------------------------------------------------------ */

export const subscriptions: Subscription[] = [
  { id: "s1", name: "ChatGPT Pro", vendor: "OpenAI", amount: 200, cadence: "monthly", category: "AI Tools", aiCategory: "AI Tools", entity: "avaken", nextRenewal: "2026-06-14", status: "active", accent: "#10a37f" },
  { id: "s2", name: "Claude Max", vendor: "Anthropic", amount: 90, cadence: "monthly", category: "AI Tools", aiCategory: "AI Tools", entity: "avaken", nextRenewal: "2026-06-09", status: "active", accent: "#d97757" },
  { id: "s3", name: "Cursor", vendor: "Anysphere", amount: 16, cadence: "monthly", category: "AI Tools", aiCategory: "Software", entity: "avaken", nextRenewal: "2026-06-21", status: "active", accent: "#7c5cff" },
  { id: "s4", name: "ElevenLabs", vendor: "ElevenLabs", amount: 79, cadence: "monthly", category: "AI Tools", aiCategory: "Content Production", entity: "avaken", nextRenewal: "2026-06-12", status: "active", accent: "#e879f9" },
  { id: "s5", name: "CapCut Pro", vendor: "ByteDance", amount: 17.99, cadence: "monthly", category: "Video", aiCategory: "Content Production", entity: "avaken", nextRenewal: "2026-06-08", status: "active", accent: "#22d3ee" },
  { id: "s6", name: "Adobe Creative Cloud", vendor: "Adobe", amount: 56.98, cadence: "monthly", category: "Video", aiCategory: "Content Production", entity: "avaken", nextRenewal: "2026-06-19", status: "active", accent: "#fa0f00" },
  { id: "s7", name: "Midjourney", vendor: "Midjourney", amount: 48, cadence: "monthly", category: "AI Tools", aiCategory: "Content Production", entity: "avaken", nextRenewal: "2026-06-15", status: "active", accent: "#4f46e5" },
  { id: "s8", name: "Notion Business", vendor: "Notion", amount: 24, cadence: "monthly", category: "Productivity", aiCategory: "Software", entity: "avaken", nextRenewal: "2026-06-23", status: "active", accent: "#ffffff" },
  { id: "s9", name: "Google Workspace", vendor: "Google", amount: 13.8, cadence: "monthly", category: "Productivity", aiCategory: "Software", entity: "avaken", nextRenewal: "2026-06-05", status: "active", accent: "#34a853" },
  { id: "s10", name: "Vercel Pro", vendor: "Vercel", amount: 20, cadence: "monthly", category: "Hosting", aiCategory: "Software", entity: "avaken", nextRenewal: "2026-06-27", status: "active", accent: "#ffffff" },
  { id: "s11", name: "Stripe", vendor: "Stripe", amount: 0, cadence: "monthly", category: "Payments", aiCategory: "Financial", entity: "avaken", nextRenewal: "2026-06-30", status: "active", accent: "#635bff" },
  { id: "s12", name: "Canva Teams", vendor: "Canva", amount: 30, cadence: "monthly", category: "Video", aiCategory: "Content Production", entity: "avaken", nextRenewal: "2026-06-11", status: "active", accent: "#00c4cc" },
  { id: "s13", name: "Business Internet", vendor: "BT Business", amount: 45, cadence: "monthly", category: "Utilities", aiCategory: "Office & Utilities", entity: "avaken", nextRenewal: "2026-06-03", status: "active", accent: "#5514b4" },
  { id: "s14", name: "Calendly", vendor: "Calendly", amount: 12, cadence: "monthly", category: "Productivity", aiCategory: "Software", entity: "avaken", nextRenewal: "2026-06-18", status: "active", accent: "#006bff" },
  { id: "s15", name: "Linear", vendor: "Linear", amount: 14, cadence: "monthly", category: "Productivity", aiCategory: "Software", entity: "avaken", nextRenewal: "2026-06-22", status: "active", accent: "#5e6ad2" },
  { id: "s16", name: "Netflix", vendor: "Netflix", amount: 17.99, cadence: "monthly", category: "Entertainment", aiCategory: "Personal", entity: "personal", nextRenewal: "2026-06-16", status: "active", accent: "#e50914" },
  { id: "s17", name: "Spotify", vendor: "Spotify", amount: 11.99, cadence: "monthly", category: "Entertainment", aiCategory: "Personal", entity: "personal", nextRenewal: "2026-06-07", status: "active", accent: "#1db954" },
  { id: "s18", name: "iCloud+ 2TB", vendor: "Apple", amount: 8.99, cadence: "monthly", category: "Storage", aiCategory: "Personal", entity: "personal", nextRenewal: "2026-06-20", status: "active", accent: "#ffffff" },
  { id: "s19", name: "PureGym", vendor: "PureGym", amount: 32.99, cadence: "monthly", category: "Health", aiCategory: "Personal", entity: "personal", nextRenewal: "2026-06-02", status: "active", accent: "#e2ff3d" },
];

/* ------------------------------------------------------------------ */
/*  12-month time series                                               */
/* ------------------------------------------------------------------ */

const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export const revenueSeries: SeriesPoint[] = [
  { label: "Jul", revenue: 38200, expenses: 11400, net: 26800 },
  { label: "Aug", revenue: 41500, expenses: 12100, net: 29400 },
  { label: "Sep", revenue: 39800, expenses: 11900, net: 27900 },
  { label: "Oct", revenue: 44600, expenses: 13200, net: 31400 },
  { label: "Nov", revenue: 51200, expenses: 14800, net: 36400 },
  { label: "Dec", revenue: 58900, expenses: 16100, net: 42800 },
  { label: "Jan", revenue: 47300, expenses: 13900, net: 33400 },
  { label: "Feb", revenue: 49800, expenses: 14200, net: 35600 },
  { label: "Mar", revenue: 53600, expenses: 15100, net: 38500 },
  { label: "Apr", revenue: 56200, expenses: 15600, net: 40600 },
  { label: "May", revenue: 59400, expenses: 16400, net: 43000 },
  { label: "Jun", revenue: 53630, expenses: 15240, net: 38390 },
];

export const cashflowSeries: SeriesPoint[] = MONTHS.map((label, i) => ({
  label,
  inflow: revenueSeries[i].revenue! + (i % 2 === 0 ? 2400 : 1800),
  outflow: -(revenueSeries[i].expenses! + 2200 + (i % 3) * 600),
}));

export const netWorthSeries: SeriesPoint[] = [
  { label: "Jul", personal: 58200, avaken: 62000 },
  { label: "Aug", personal: 61400, avaken: 71500 },
  { label: "Sep", personal: 63100, avaken: 78900 },
  { label: "Oct", personal: 66800, avaken: 89400 },
  { label: "Nov", personal: 69200, avaken: 103200 },
  { label: "Dec", personal: 72600, avaken: 121800 },
  { label: "Jan", personal: 74100, avaken: 118300 },
  { label: "Feb", personal: 76900, avaken: 124600 },
  { label: "Mar", personal: 78200, avaken: 131900 },
  { label: "Apr", personal: 80100, avaken: 138400 },
  { label: "May", personal: 81700, avaken: 144800 },
  { label: "Jun", personal: 78374, avaken: 140600 },
];

/* ------------------------------------------------------------------ */
/*  Expense / category breakdown                                       */
/* ------------------------------------------------------------------ */

export const avakenExpenseBreakdown: CategorySlice[] = [
  { name: "Content Production", value: 4820, color: "#10b981" },
  { name: "AI Tools", value: 3540, color: "#34d399" },
  { name: "Software", value: 1880, color: "#38bdf8" },
  { name: "Ad Spend", value: 3200, color: "#a78bfa" },
  { name: "Office & Utilities", value: 980, color: "#f59e0b" },
  { name: "Professional Fees", value: 820, color: "#f43f5e" },
];

export const personalExpenseBreakdown: CategorySlice[] = [
  { name: "Housing", value: 2100, color: "#38bdf8" },
  { name: "Lifestyle", value: 940, color: "#a78bfa" },
  { name: "Subscriptions", value: 72, color: "#10b981" },
  { name: "Transport", value: 380, color: "#f59e0b" },
  { name: "Health", value: 240, color: "#f43f5e" },
];

/* ------------------------------------------------------------------ */
/*  VAT periods (quarterly)                                            */
/* ------------------------------------------------------------------ */

export const vatPeriods: VatPeriod[] = [
  { quarter: "Q1 2025/26", periodStart: "2025-04-01", periodEnd: "2025-06-30", dueDate: "2025-08-07", salesExVat: 138400, vatOnSales: 27680, purchasesExVat: 34200, vatOnPurchases: 6840, status: "filed" },
  { quarter: "Q2 2025/26", periodStart: "2025-07-01", periodEnd: "2025-09-30", dueDate: "2025-11-07", salesExVat: 119500, vatOnSales: 23900, purchasesExVat: 35400, vatOnPurchases: 7080, status: "filed" },
  { quarter: "Q3 2025/26", periodStart: "2025-10-01", periodEnd: "2025-12-31", dueDate: "2026-02-07", salesExVat: 154700, vatOnSales: 30940, purchasesExVat: 44100, vatOnPurchases: 8820, status: "filed" },
  { quarter: "Q4 2025/26", periodStart: "2026-04-01", periodEnd: "2026-06-30", dueDate: "2026-08-07", salesExVat: 166630, vatOnSales: 33326, purchasesExVat: 46800, vatOnPurchases: 9360, status: "open" },
];

/* ------------------------------------------------------------------ */
/*  eToro portfolio                                                    */
/* ------------------------------------------------------------------ */

export const portfolio: PortfolioPosition[] = [
  { symbol: "NVDA", name: "NVIDIA", value: 9840, allocation: 25.3, pnl: 3120, pnlPct: 46.5, kind: "stock" },
  { symbol: "AAPL", name: "Apple", value: 6420, allocation: 16.5, pnl: 880, pnlPct: 15.9, kind: "stock" },
  { symbol: "BTC", name: "Bitcoin", value: 7210, allocation: 18.5, pnl: 2640, pnlPct: 57.8, kind: "crypto" },
  { symbol: "VUSA", name: "S&P 500 ETF", value: 8120, allocation: 20.9, pnl: 1340, pnlPct: 19.8, kind: "etf" },
  { symbol: "TSLA", name: "Tesla", value: 3960, allocation: 10.2, pnl: -420, pnlPct: -9.6, kind: "stock" },
  { symbol: "ETH", name: "Ethereum", value: 3392, allocation: 8.6, pnl: 712, pnlPct: 26.6, kind: "crypto" },
];

/* ------------------------------------------------------------------ */
/*  Transactions ledger                                                */
/* ------------------------------------------------------------------ */

export const transactions: Transaction[] = [
  { id: "t1", date: "2026-06-02", description: "Stripe payout", counterparty: "Stripe → Tide", amount: 11840.0, category: "Affiliate Revenue", type: "payout", entity: "avaken", accountId: "tide", vat: 1973.33, aiCategorised: true, status: "cleared" },
  { id: "t2", date: "2026-06-01", description: "OpenAI ChatGPT Pro", counterparty: "OpenAI", amount: -200.0, category: "AI Tools", type: "expense", entity: "avaken", accountId: "tide", vat: -33.33, aiCategorised: true, status: "cleared" },
  { id: "t3", date: "2026-06-01", description: "Rent — flat", counterparty: "Landlord", amount: -1450.0, category: "Housing", type: "expense", entity: "personal", accountId: "starling", vat: 0, aiCategorised: true, status: "cleared" },
  { id: "t4", date: "2026-05-30", description: "Stripe payout", counterparty: "Stripe → Tide", amount: 9620.5, category: "Affiliate Revenue", type: "payout", entity: "avaken", accountId: "tide", vat: 1603.42, aiCategorised: true, status: "cleared" },
  { id: "t5", date: "2026-05-29", description: "Adobe Creative Cloud", counterparty: "Adobe", amount: -56.98, category: "Content Production", type: "expense", entity: "avaken", accountId: "tide", vat: -9.5, aiCategorised: true, status: "cleared" },
  { id: "t6", date: "2026-05-28", description: "Meta Ads", counterparty: "Meta", amount: -820.0, category: "Ad Spend", type: "expense", entity: "avaken", accountId: "tide", vat: -136.67, aiCategorised: true, status: "cleared" },
  { id: "t7", date: "2026-05-27", description: "Salary — Director", counterparty: "Avaken Ltd", amount: 1100.0, category: "Salary", type: "transfer", entity: "personal", accountId: "starling", vat: 0, aiCategorised: false, status: "cleared" },
  { id: "t8", date: "2026-05-26", description: "Stripe payout", counterparty: "Stripe → Tide", amount: 13210.75, category: "Affiliate Revenue", type: "payout", entity: "avaken", accountId: "tide", vat: 2201.79, aiCategorised: true, status: "cleared" },
  { id: "t9", date: "2026-05-25", description: "ElevenLabs", counterparty: "ElevenLabs", amount: -79.0, category: "Content Production", type: "expense", entity: "avaken", accountId: "tide", vat: -13.17, aiCategorised: true, status: "cleared" },
  { id: "t10", date: "2026-05-24", description: "Tesco groceries", counterparty: "Tesco", amount: -86.4, category: "Lifestyle", type: "expense", entity: "personal", accountId: "rbs", vat: 0, aiCategorised: true, status: "cleared" },
  { id: "t11", date: "2026-05-23", description: "eToro deposit", counterparty: "eToro", amount: -1000.0, category: "Investment", type: "transfer", entity: "personal", accountId: "barclays", vat: 0, aiCategorised: false, status: "cleared" },
  { id: "t12", date: "2026-05-22", description: "VAT reserve transfer", counterparty: "Internal", amount: -2640.0, category: "VAT", type: "vat", entity: "avaken", accountId: "tide", vat: 0, aiCategorised: false, status: "cleared" },
  { id: "t13", date: "2026-05-21", description: "Midjourney", counterparty: "Midjourney", amount: -48.0, category: "Content Production", type: "expense", entity: "avaken", accountId: "tide", vat: -8.0, aiCategorised: true, status: "cleared" },
  { id: "t14", date: "2026-05-20", description: "Stripe payout", counterparty: "Stripe → Tide", amount: 8940.2, category: "Affiliate Revenue", type: "payout", entity: "avaken", accountId: "tide", vat: 1490.03, aiCategorised: true, status: "pending" },
  { id: "t15", date: "2026-05-19", description: "Accountant fee", counterparty: "Crunch", amount: -180.0, category: "Professional Fees", type: "expense", entity: "avaken", accountId: "tide", vat: -30.0, aiCategorised: true, status: "cleared" },
];

/* ------------------------------------------------------------------ */
/*  AI insights                                                        */
/* ------------------------------------------------------------------ */

export const insights: Insight[] = [
  { id: "i1", title: "VAT set-aside on track", body: "You've reserved £31,870 against an estimated £23,966 Q4 liability — a healthy 33% buffer. Consider moving £4k back to operating cash.", severity: "positive", tag: "VAT" },
  { id: "i2", title: "@avaken.deals momentum slowing", body: "Revenue down 6.3% MoM with conversion at 2.7%. Lowest ROAS of your accounts — review creative or reallocate ad spend.", severity: "warning", tag: "Affiliates" },
  { id: "i3", title: "Subscription overlap detected", body: "Midjourney, Adobe Firefly and Canva all cover image generation. Consolidating could save ~£86/mo (£1,032/yr).", severity: "info", tag: "Subscriptions" },
  { id: "i4", title: "Corp tax estimate updated", body: "Based on YTD profit of £142,300, projected corporation tax is £35,575 (25%). Reserve currently covers 69%.", severity: "info", tag: "Tax" },
  { id: "i5", title: "Strong month for @avaken.pets", body: "Up 33.1% MoM — your fastest-growing account. Niche is under-saturated; worth doubling content cadence.", severity: "positive", tag: "Affiliates" },
];

/* ------------------------------------------------------------------ */
/*  Director's payroll plan                                            */
/* ------------------------------------------------------------------ */

export const payrollPlan: PayrollPlan = {
  salary: 12_570, // tax-efficient PA salary
  dividends: 60_000,
};

/* ------------------------------------------------------------------ */
/*  Audit log (immutable)                                              */
/* ------------------------------------------------------------------ */

export const auditLog: AuditEntry[] = [
  { id: "a1", at: "2026-06-02T08:14:00Z", actor: "system", action: "txn.import", entity: "avaken", ref: "stripe_payout_2026-06-02", summary: "Imported Stripe payout £11,840.00 → Tide ••8841" },
  { id: "a2", at: "2026-06-01T16:02:00Z", actor: "ai", action: "txn.categorise", entity: "avaken", ref: "t2", summary: "Categorised OpenAI ChatGPT Pro as AI Tools (confidence 0.96)" },
  { id: "a3", at: "2026-06-01T09:30:00Z", actor: "Director", action: "txn.edit", entity: "personal", ref: "t3", summary: "Re-tagged Rent as personal (was unassigned)" },
  { id: "a4", at: "2026-05-31T23:59:00Z", actor: "system", action: "vat.reserve", entity: "avaken", ref: "Q4-2025/26", summary: "Auto-set aside £2,640.00 to VAT reserve account" },
  { id: "a5", at: "2026-05-30T18:14:00Z", actor: "ai", action: "insight.created", entity: "avaken", ref: "i2", summary: "Detected @avaken.deals momentum slowing (warning)" },
  { id: "a6", at: "2026-05-29T11:08:00Z", actor: "Director", action: "subscription.cancel", entity: "avaken", ref: "s_canva_pro", summary: "Cancelled Canva Pro (replaced by Canva Teams)" },
  { id: "a7", at: "2026-05-28T07:42:00Z", actor: "system", action: "etoro.sync", entity: "personal", ref: "etoro", summary: "Synced eToro portfolio (6 positions, value £38,942.71)" },
  { id: "a8", at: "2026-05-27T15:20:00Z", actor: "system", action: "payroll.run", entity: "avaken", ref: "PAYE-2026-05", summary: "Director salary £1,047.50 (May) — PAYE filed" },
];
