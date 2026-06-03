import type { ResolvedEntity } from "./entity-resolution";

/** Personal current + savings (excludes credit cards and investments). */
export const PERSONAL_BANK_ACCOUNT_IDS = ["starling", "rbs", "barclays"] as const;

/** Personal credit cards tracked for debt summary. */
export const PERSONAL_CREDIT_ACCOUNT_IDS = ["amex", "rbs-credit", "barclays-credit"] as const;

export type PersonalAccountBucket = "bank" | "credit";

function isCreditContext(text: string): boolean {
  const s = text.toLowerCase();
  if (s.includes("credit card") || s.includes("creditcard")) return true;
  if (s.includes("amex") || s.includes("american express")) return true;
  if (s.includes("barclaycard")) return true;
  if (s.includes("outstanding") && s.includes("card")) return true;
  if (s.includes("card balance") || s.includes("card_balance")) return true;
  if (
    s.includes("credit") &&
    !s.includes("current account") &&
    !s.includes("current balance") &&
    !s.includes("savings")
  ) {
    return true;
  }
  if (s.includes("card") && !s.includes("debit") && !s.includes("gift card")) return true;
  return false;
}

function isBankContext(text: string): boolean {
  const s = text.toLowerCase();
  if (isCreditContext(text)) return false;
  if (
    s.includes("current") ||
    s.includes("saver") ||
    s.includes("savings") ||
    s.includes("space") ||
    s.includes("bank balance") ||
    s.includes("available balance")
  ) {
    return true;
  }
  return false;
}

/** Maps Hermes institution text to a personal account id, splitting bank vs credit. */
export function resolvePersonalAccountId(
  text: string,
  bucket?: PersonalAccountBucket,
): string | null {
  const s = text.toLowerCase();
  const credit =
    bucket === "credit" || (bucket !== "bank" && isCreditContext(text));
  const bank = bucket === "bank" || (!credit && isBankContext(text));

  if (s.includes("amex") || s.includes("american express")) return "amex";

  if (s.includes("rbs") || s.includes("royal bank")) {
    return credit ? "rbs-credit" : "rbs";
  }

  if (s.includes("barclays")) {
    return credit ? "barclays-credit" : "barclays";
  }

  if (s.includes("starling")) return "starling";

  if (s.includes("apple pay") || s.includes("applepay")) return "starling";

  if (credit) {
    if (s.includes("visa") || s.includes("mastercard")) return "barclays-credit";
    return null;
  }

  if (bank || !s.trim()) return "starling";

  return null;
}

/** Maps bank/app names from Hermes to Finance OS account ids in mock seed data. */
export function resolveAccountIdFromInstitution(
  text: string,
  entity: ResolvedEntity,
  bucket?: PersonalAccountBucket,
): string | null {
  if (entity === "personal") {
    return resolvePersonalAccountId(text, bucket);
  }

  const s = text.toLowerCase();
  if (!s.trim()) return "tide";

  if (s.includes("vat reserve") || s.includes("tide-vat")) return "tide-vat";
  if (s.includes("corp tax") || s.includes("tax reserve") || s.includes("tide-tax")) {
    return "tide-tax";
  }
  if (s.includes("tide")) return "tide";
  if (s.includes("etoro")) return "etoro";

  return "tide";
}

export function inferBalanceBucket(
  institutionText: string,
  explicitType?: string,
): PersonalAccountBucket | null {
  const type = (explicitType ?? "").toLowerCase();
  if (
    type.includes("credit") ||
    type.includes("card") ||
    type === "amex" ||
    type.includes("liability")
  ) {
    return "credit";
  }
  if (
    type.includes("current") ||
    type.includes("saving") ||
    type.includes("bank") ||
    type.includes("debit") ||
    type.includes("main balance") ||
    type.includes("spending space") ||
    type.includes("total balance") ||
    type.includes("total available")
  ) {
    return "bank";
  }
  if (isCreditContext(institutionText)) return "credit";
  if (isBankContext(institutionText)) return "bank";
  return null;
}
