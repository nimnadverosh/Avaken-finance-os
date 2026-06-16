import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db/index";
import { accounts } from "@/db/schema";
import type { AccountType } from "@/lib/data/types";
import { mapAccount } from "./mappers";
import { resolveAccountUuidBySlug } from "./read";

export interface InsertAccountInput {
  slug: string;
  name: string;
  institution: string;
  type: AccountType;
  entity: "personal" | "avaken";
  balance: number;
  currency: "GBP" | "USD";
  last4: string;
  accent: string;
}

export async function insertAccount(input: InsertAccountInput) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is not configured");

  const [row] = await db
    .insert(accounts)
    .values({
      slug: input.slug,
      name: input.name,
      institution: input.institution,
      type: input.type,
      entity: input.entity,
      balance: input.balance.toFixed(2),
      currency: input.currency,
      last4: input.last4,
      accent: input.accent,
    })
    .returning();

  return mapAccount(row);
}

export async function updateAccountBySlug(
  slug: string,
  patch: Partial<
    Pick<InsertAccountInput, "name" | "institution" | "balance" | "currency" | "last4">
  >,
) {
  if (!hasDatabase()) throw new Error("DATABASE_URL is not configured");

  const uuid = await resolveAccountUuidBySlug(slug);
  if (!uuid) return null;

  const values: Record<string, string> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.institution !== undefined) values.institution = patch.institution;
  if (patch.balance !== undefined) values.balance = patch.balance.toFixed(2);
  if (patch.currency !== undefined) values.currency = patch.currency;
  if (patch.last4 !== undefined) values.last4 = patch.last4;

  if (Object.keys(values).length === 0) return null;

  const [row] = await db.update(accounts).set(values).where(eq(accounts.id, uuid)).returning();
  return row ? mapAccount(row) : null;
}

export async function deleteAccountBySlug(slug: string): Promise<boolean> {
  if (!hasDatabase()) return false;

  const uuid = await resolveAccountUuidBySlug(slug);
  if (!uuid) return false;

  await db.delete(accounts).where(eq(accounts.id, uuid));
  return true;
}

export async function accountSlugExists(slug: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  const uuid = await resolveAccountUuidBySlug(slug);
  return Boolean(uuid);
}
