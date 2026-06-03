import type { HermesAnalyzeResponse, HermesEntityHint, HermesScreenshotSource } from "./types";

const DEMO_BANKS = ["Starling", "RBS", "Barclays", "Amex", "Apple Pay"] as const;

const DEMO_POOL = [
  {
    description: "Amazon Marketplace",
    counterparty: "Amazon",
    amount: -34.99,
    category: "Office & Supplies",
    type: "expense" as const,
    entity: "avaken" as const,
  },
  {
    description: "Uber trip",
    counterparty: "Uber",
    amount: -18.4,
    category: "Travel",
    type: "expense" as const,
    entity: "personal" as const,
  },
  {
    description: "TikTok Shop commission",
    counterparty: "TikTok",
    amount: 412.5,
    category: "Affiliate Revenue",
    type: "income" as const,
    entity: "avaken" as const,
  },
  {
    description: "Waitrose",
    counterparty: "Waitrose",
    amount: -62.15,
    category: "Lifestyle",
    type: "expense" as const,
    entity: "personal" as const,
  },
  {
    description: "Vercel invoice",
    counterparty: "Vercel",
    amount: -20.0,
    category: "Software",
    type: "expense" as const,
    entity: "avaken" as const,
  },
];

function pickEntity(hint: HermesEntityHint, index: number): "personal" | "avaken" {
  if (hint === "personal") return "personal";
  if (hint === "avaken") return "avaken";
  return index % 2 === 0 ? "avaken" : "personal";
}

/** Demo extraction when Hermes VPS is not configured — still returns structured JSON. */
export function mockHermesAnalyze(
  imageCount: number,
  entityHint: HermesEntityHint,
): HermesAnalyzeResponse {
  const batchId = crypto.randomUUID();
  const count = Math.max(imageCount, 1);
  const screenshotSources: HermesScreenshotSource[] = Array.from(
    { length: imageCount },
    (_, i) => ({
      index: i,
      bank: DEMO_BANKS[i % DEMO_BANKS.length],
      bankId: DEMO_BANKS[i % DEMO_BANKS.length].toLowerCase().replace(/\s+/g, "-"),
      transactionCount: i < count ? 1 : 0,
      confidence: 0.88,
    }),
  );

  const transactions = Array.from({ length: count }, (_, i) => {
    const base = DEMO_POOL[i % DEMO_POOL.length];
    const entity = entityHint === "auto" ? base.entity : pickEntity(entityHint, i);
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      id: `preview-${batchId.slice(0, 8)}-${i}`,
      date: d.toISOString().slice(0, 10),
      description: base.description,
      counterparty: base.counterparty,
      amount: base.amount,
      category: base.category,
      type: base.type,
      entity,
      vat: entity === "avaken" && base.amount < 0 ? Math.round((base.amount / 1.2) * 0.2 * 100) / 100 : 0,
      confidence: 0.82 + (i % 3) * 0.05,
      sourceImageIndex: i % imageCount,
      sourceBank: DEMO_BANKS[i % DEMO_BANKS.length],
    };
  });

  for (const src of screenshotSources) {
    src.transactionCount = transactions.filter(
      (t) => (t.sourceImageIndex ?? 0) === src.index,
    ).length;
  }

  const entities = new Set(transactions.map((t) => t.entity));
  const resolvedEntity =
    entities.size > 1 ? ("mixed" as const) : (transactions[0]?.entity ?? "avaken");

  return {
    success: true,
    batchId,
    entity: resolvedEntity,
    confidence: 0.87,
    transactions,
    screenshotSources,
    warnings: [
      "Demo mode: connect HERMES_AGENT_URL on your VPS for live vision extraction.",
    ],
    processedAt: new Date().toISOString(),
    demo: true,
  };
}
