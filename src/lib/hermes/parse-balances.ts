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

interface ParsedBalanceLine {
  label: string;
  amount: number;
  currency?: string;
}

function pushBalance(
  out: HermesAccountBalance[],
  seen: Set<string>,
  accountId: string,
  balance: number,
  institution?: string,
  kind?: PersonalAccountBucket,
  currency?: string,
): void {
  const key = `${accountId}:${kind ?? "any"}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({
    accountId,
    balance,
    institution,
    kind,
    currency: currency === "USD" || currency === "GBP" ? currency : undefined,
  });
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

function isTotalBankLabel(label: string): boolean {
  const s = label.toLowerCase();
  return (
    s.includes("total balance") ||
    s.includes("total available") ||
    s.includes("total account balance") ||
    (s.includes("total") && (s.includes("balance") || s.includes("available")))
  );
}

function isComponentBalanceLabel(label: string): boolean {
  const s = label.toLowerCase();
  return (
    s.includes("main balance") ||
    s.includes("spending space") ||
    s.includes("in spaces") ||
    s.includes("ring-fenced") ||
    s.includes("set aside") ||
    s.includes("available to spend") && !isTotalBankLabel(label)
  );
}

function isCreditBalanceLabel(label: string): boolean {
  const s = label.toLowerCase();
  if (inferBalanceBucket(s, s) === "credit") return true;
  return (
    s.includes("credit card") ||
    s.includes("card balance") ||
    s.includes("outstanding") ||
    s.includes("amount owed") ||
    s.includes("balance owed") ||
    (s.includes("credit") && !s.includes("current account"))
  );
}

/** Resolves the single bank-cash figure from Hermes balance lines (prefers Total balance). */
function resolveBankTotalAmount(lines: ParsedBalanceLine[]): number | undefined {
  const nonCredit = lines.filter((l) => !isCreditBalanceLabel(l.label));
  if (nonCredit.length === 0) return undefined;

  const totalLine = nonCredit.find((l) => isTotalBankLabel(l.label));
  if (totalLine) return totalLine.amount;

  const components = nonCredit.filter((l) => isComponentBalanceLabel(l.label));
  if (components.length >= 2) {
    return components.reduce((sum, l) => sum + l.amount, 0);
  }

  if (nonCredit.length === 1) return nonCredit[0].amount;

  return Math.max(...nonCredit.map((l) => l.amount));
}

/**
 * Parses Hermes `balances: [{ account_type, balance, currency }]` (e.g. Starling breakdown).
 * Maps Total balance → bank cash; credit lines → card debt; skips duplicate sub-lines when Total exists.
 */
function parseStructuredBalancesArray(
  list: unknown[],
  entity: ResolvedEntity,
  institutionContext: string,
): HermesAccountBalance[] {
  const lines: ParsedBalanceLine[] = [];

  for (const item of list) {
    const obj = asRecord(item);
    if (!obj) continue;

    const amount = parseBalanceValue(obj.balance);
    if (amount === undefined) continue;

    const label =
      pickString(obj, [
        "account_type",
        "accountType",
        "type",
        "label",
        "name",
        "title",
        "description",
      ]) ?? "";

    lines.push({
      label,
      amount,
      currency: pickString(obj, ["currency"]),
    });
  }

  if (lines.length === 0) return [];

  const out: HermesAccountBalance[] = [];
  const seen = new Set<string>();
  const ctx = institutionContext;

  for (const line of lines) {
    if (!isCreditBalanceLabel(line.label)) continue;
    const institution = buildInstitutionContext(ctx, line.label);
    const accountId = resolveAccountForBalance(institution, entity, "credit");
    if (accountId) {
      pushBalance(
        out,
        seen,
        accountId,
        Math.abs(line.amount),
        institution,
        "credit",
        line.currency,
      );
    }
  }

  const bankTotal = resolveBankTotalAmount(lines);
  if (bankTotal !== undefined) {
    const accountId = resolveAccountForBalance(ctx, entity, "bank");
    if (accountId) {
      pushBalance(out, seen, accountId, bankTotal, ctx, "bank", lines[0]?.currency);
    }
  }

  return out;
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
    pickString(obj, ["label", "title", "account_type", "accountType"]),
  );
  const explicitType = pickString(obj, [
    "account_type",
    "accountType",
    "type",
    "kind",
    "category",
    "product_type",
  ]);

  if (explicitType && isTotalBankLabel(explicitType)) {
    const amount = parseBalanceValue(obj.balance);
    if (amount !== undefined) {
      const accountId = resolveAccountForBalance(institution, entity, "bank");
      if (accountId) pushBalance(out, seen, accountId, amount, institution, "bank");
    }
    return;
  }

  if (explicitType && isComponentBalanceLabel(explicitType)) {
    return;
  }

  const bucket = inferBalanceBucket(institution, explicitType);
  const explicitId = pickString(obj, ["accountId", "account_id"]);

  const bankBalance = pickBalanceFromKeys(obj, [
    "bank_balance",
    "current_balance",
    "available_balance",
    "savings_balance",
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
    if (creditId) pushBalance(out, seen, creditId, Math.abs(creditBalance), institution, "credit");
    return;
  }

  const singleBalance =
    bucket === "credit"
      ? (creditBalance ?? pickBalanceFromKeys(obj, ["balance"]))
      : bucket === "bank"
        ? (bankBalance ?? pickBalanceFromKeys(obj, ["balance"]))
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
    const value = resolvedBucket === "credit" ? Math.abs(singleBalance) : singleBalance;
    pushBalance(out, seen, accountId, value, institution, resolvedBucket);
  }
}

function collectBalancesArrays(payload: unknown): unknown[][] {
  const root = asRecord(payload);
  if (!root) return [];

  const arrays: unknown[][] = [];
  const nested = asRecord(root.data) ?? asRecord(root.result);

  for (const source of [root, nested]) {
    if (!source) continue;
    for (const key of ["balances", "account_balances"]) {
      const list = source[key];
      if (Array.isArray(list) && list.length > 0) arrays.push(list);
    }
  }

  return arrays;
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

  for (const list of collectBalancesArrays(payload)) {
    const structured = parseStructuredBalancesArray(list, entity, institutionContext);
    for (const b of structured) {
      pushBalance(out, seen, b.accountId, b.balance, b.institution, b.kind, b.currency);
    }
    if (structured.length > 0) return out;
  }

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
      if (id) pushBalance(out, seen, id, Math.abs(rootCredit), ctx, "credit");
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

/** Strip noisy balance-missing warnings when Hermes did return balances. */
export function filterBalanceWarnings(warnings: string[], hasBalances: boolean): string[] {
  if (!hasBalances) return warnings;
  return warnings.filter((w) => {
    const lower = w.toLowerCase();
    return !(
      lower.includes("no balances found") ||
      lower.includes("no balance found") ||
      lower.includes("bank_balance") ||
      lower.includes("credit_balance") ||
      (lower.includes("balances") && lower.includes("hermes response"))
    );
  });
}
