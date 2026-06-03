import { and, eq, ilike, or } from "drizzle-orm";
import { db, hasDatabase } from "@/db/index";
import { accounts, transactions } from "@/db/schema";
import type { HermesExtractedTransaction } from "@/lib/hermes/types";
import type { Transaction, TxnType } from "@/lib/data/types";

const TXN_TYPES = new Set<TxnType>(["income", "expense", "payout", "transfer", "vat", "tax"]);

function vatForEntity(amount: number, entity: "personal" | "avaken", vat?: number): string {
  if (typeof vat === "number" && !Number.isNaN(vat)) return vat.toFixed(2);
  if (entity === "personal" || amount >= 0) return "0";
  return (Math.round((amount / 1.2) * 0.2 * 100) / 100).toFixed(2);
}

async function resolveAccountId(entity: "personal" | "avaken"): Promise<string | null> {
  if (!hasDatabase()) return null;

  const preferred =
    entity === "personal"
      ? or(ilike(accounts.name, "%starling%"), ilike(accounts.institution, "%starling%"))
      : or(ilike(accounts.name, "%tide%"), ilike(accounts.institution, "%tide%"));

  const [match] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.entity, entity), preferred))
    .limit(1);

  if (match) return match.id;

  const [fallback] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.entity, entity))
    .limit(1);

  return fallback?.id ?? null;
}

export async function importTransactionsToDatabase(
  rows: HermesExtractedTransaction[],
): Promise<Transaction[]> {
  if (!hasDatabase()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const created: Transaction[] = [];

  for (const row of rows) {
    const entity = row.entity;
    const accountId = await resolveAccountId(entity);
    const type = TXN_TYPES.has(row.type) ? row.type : row.amount >= 0 ? "income" : "expense";

    const [inserted] = await db
      .insert(transactions)
      .values({
        date: row.date,
        description: row.description.trim() || "Imported transaction",
        counterparty: row.counterparty.trim() || "Unknown",
        amount: row.amount.toFixed(2),
        category: row.category.trim() || "Uncategorised",
        type,
        entity,
        accountId: accountId ?? undefined,
        vat: vatForEntity(row.amount, entity, row.vat),
        aiCategorised: true,
        status: "cleared",
      })
      .returning();

    created.push({
      id: inserted.id,
      date: inserted.date,
      description: inserted.description,
      counterparty: inserted.counterparty ?? "Unknown",
      amount: Number(inserted.amount),
      category: inserted.category,
      type: inserted.type as TxnType,
      entity: inserted.entity,
      accountId: inserted.accountId ?? "",
      vat: Number(inserted.vat),
      aiCategorised: inserted.aiCategorised,
      status: (inserted.status as Transaction["status"]) ?? "cleared",
    });
  }

  return created;
}
