import { buildInstitutionContext } from "@/lib/import/entity-resolution";
import {
  inferBalanceBucket,
  resolveAccountIdFromInstitution,
  resolvePersonalAccountId,
  type PersonalAccountBucket,
} from "@/lib/import/account-resolution";
import type { HermesAccountBalance } from "./types";
import type { ResolvedEntity } from "@/lib/import/entity-resolution";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function parseBalanceValue(raw: unknown): number | undefined {
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[£$€,\s]/g, "").replace(/[^\d.-]/g, "");
    if (!cleaned) return undefined;
    const n = Number(cleaned);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function pickBalanceFromKeys(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = parseBalanceValue(obj[key]);
    if (v !== undefined) return v;
  }
  return undefined;
}

function pushBalance(
  out: HermesAccountBalance[],
  seen: Set<string>,
  accountId: string,
  balance: number,
  institution?: string,
  kind?: PersonalAccountBucket,
): void {
  const key = `${accountId}:${kind ?? "any"}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ accountId, balance, institution, kind });
}

function resolveAccountForBalance(
  institutionText: string,
  entity: ResolvedEntity,
  bucket: PersonalAccountBucket | null,
  explicitAccountId?: string,
): string | null {
  if (explicitAccountId) return explicitAccountId;
  if (entity === "personal") {
    return resolvePersonalAccountId(institutionText, bucket ?? undefined);
  }
  return resolveAccountIdFromInstitution(institutionText, entity, bucket ?? undefined);
}

function parseItemBalance(
  obj: Record<string, unknown>,
  entity: ResolvedEntity,
  institutionContext: string,
  out: HermesAccountBalance[],
  seen: Set<string>,
): void {
  const institution = buildInstitutionContext(
    institutionContext,
    pickString(obj, ["institution", "bank", "name", "account_name", "provider", "app"]),
    pickString(obj, ["label", "title"]),
  );
  const explicitType = pickString(obj, [
    "account_type",
    "accountType",
    "type",
    "kind",
    "category",
    "product_type",
  ]);
  const bucket = inferBalanceBucket(institution, explicitType);
  const explicitId = pickString(obj, ["accountId", "account_id"]);

  const bankBalance = pickBalanceFromKeys(obj, [
    "bank_balance",
    "current_balance",
    "available_balance",
    "savings_balance",
    "balance",
  ]);
  const creditBalance = pickBalanceFromKeys(obj, [
    "credit_balance",
    "credit_card_balance",
    "card_balance",
    "outstanding_balance",
    "amount_owed",
  ]);

  if (entity === "personal" && bankBalance !== undefined && creditBalance !== undefined) {
    const bankId = resolveAccountForBalance(institution, entity, "bank", explicitId);
    const creditId = resolveAccountForBalance(institution, entity, "credit");
    if (bankId) pushBalance(out, seen, bankId, bankBalance, institution, "bank");
    if (creditId) pushBalance(out, seen, creditId, creditBalance, institution, "credit");
    return;
  }

  const singleBalance =
    bucket === "credit"
      ? (creditBalance ?? pickBalanceFromKeys(obj, ["balance", "total_balance"]))
      : bucket === "bank"
        ? (bankBalance ?? pickBalanceFromKeys(obj, ["balance", "total_balance"]))
        : (bankBalance ??
          creditBalance ??
          pickBalanceFromKeys(obj, [
            "balance",
            "account_balance",
            "available_balance",
            "available_balance_gbp",
            "current_balance",
            "total_balance",
            "closing_balance",
            "screen_balance",
            "balance_gbp",
            "total_available",
          ]));

  if (singleBalance === undefined) return;

  const resolvedBucket =
    bucket ?? (creditBalance !== undefined && bankBalance === undefined ? "credit" : "bank");
  const accountId = resolveAccountForBalance(
    institution,
    entity,
    entity === "personal" ? resolvedBucket : null,
    explicitId,
  );
  if (accountId) {
    pushBalance(out, seen, accountId, singleBalance, institution, resolvedBucket);
  }
}

/**
 * Extracts account balance(s) from Hermes analyze JSON (screenshot header / balance line).
 */
export function parseAccountBalancesFromHermes(
  payload: unknown,
  entity: ResolvedEntity,
  institutionContext: string,
): HermesAccountBalance[] {
  const root = asRecord(payload);
  if (!root) return [];

  const out: HermesAccountBalance[] = [];
  const seen = new Set<string>();

  if (entity === "personal") {
    const rootBank = pickBalanceFromKeys(root, ["bank_balance", "bank_balances", "total_bank_balance"]);
    const rootCredit = pickBalanceFromKeys(root, [
      "credit_balance",
      "credit_card_balance",
      "total_credit_balance",
      "card_debt",
    ]);
    const ctx = buildInstitutionContext(
      institutionContext,
      pickString(root, ["institution", "bank", "app"]),
    );

    if (rootBank !== undefined) {
      const id = resolvePersonalAccountId(ctx, "bank");
      if (id) pushBalance(out, seen, id, rootBank, ctx, "bank");
    }
    if (rootCredit !== undefined) {
      const id = resolvePersonalAccountId(ctx, "credit");
      if (id) pushBalance(out, seen, id, rootCredit, ctx, "credit");
    }
  } else {
    const rootBalance = pickBalanceFromKeys(root, ["balance", "account_balance", "available_balance"]);
    if (rootBalance !== undefined) {
      const accountId = resolveAccountIdFromInstitution(institutionContext, entity);
      if (accountId) {
        pushBalance(out, seen, accountId, rootBalance, pickString(root, ["institution", "bank", "app"]));
      }
    }
  }

  const nested = asRecord(root.data) ?? asRecord(root.result);
  if (nested) {
    parseItemBalance(
      nested,
      entity,
      buildInstitutionContext(institutionContext, pickString(nested, ["institution", "bank", "app"])),
      out,
      seen,
    );
  }

  for (const key of ["accounts", "balances", "account_balances"]) {
    const list = root[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const obj = asRecord(item);
      if (obj) parseItemBalance(obj, entity, institutionContext, out, seen);
    }
  }

  return out;
}
