import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db/index";
import { accounts } from "@/db/schema";
import { resolveAccountUuidBySlug } from "./read";

export async function updateAccountBalancesInDb(
  updates: Record<string, number>,
): Promise<number> {
  if (!hasDatabase()) return 0;

  let updated = 0;
  for (const [slug, balance] of Object.entries(updates)) {
    const uuid = await resolveAccountUuidBySlug(slug);
    if (!uuid) continue;

    await db
      .update(accounts)
      .set({ balance: balance.toFixed(2) })
      .where(eq(accounts.id, uuid));
    updated++;
  }
  return updated;
}

export async function updateAccountBalanceBySlug(
  slug: string,
  balance: number,
): Promise<boolean> {
  return (await updateAccountBalancesInDb({ [slug]: balance })) > 0;
}
