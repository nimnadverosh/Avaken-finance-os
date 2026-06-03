import {
  buildInstitutionContext,
  resolveFromDetectedEntity,
  resolveTransactionEntity,
  type ResolvedEntity,
} from "@/lib/import/entity-resolution";
import { filterBalanceWarnings, parseAccountBalancesFromHermes } from "./parse-balances";
import { detectBankFromText } from "@/lib/screenshots/detect-bank";
import type {
  HermesAnalyzeResponse,
  HermesEntityHint,
  HermesExtractedTransaction,
  HermesScreenshotSource,
} from "./types";
import type { TxnType } from "@/lib/data/types";

const TXN_TYPES = new Set<TxnType>(["income", "expense", "payout", "transfer", "vat", "tax"]);

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

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

function normalizeType(raw: unknown, amount: number): TxnType {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (TXN_TYPES.has(s as TxnType)) return s as TxnType;
  if (s.includes("payout")) return "payout";
  if (s.includes("transfer")) return "transfer";
  if (s.includes("vat")) return "vat";
  if (s.includes("tax")) return "tax";
  if (amount >= 0) return "income";
  return "expense";
}

function normalizeDate(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) {
    const d = raw.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function extractTransactionList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const root = asRecord(payload);
  if (!root) return [];

  if (Array.isArray(root.transactions)) return root.transactions;
  if (Array.isArray(root.results)) return root.results;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.data)) return root.data;

  const data = asRecord(root.data);
  if (data) {
    if (Array.isArray(data.transactions)) return data.transactions;
    if (Array.isArray(data.results)) return data.results;
  }

  return [];
}

function mapRow(
  raw: unknown,
  index: number,
  batchId: string,
  hint: HermesEntityHint,
): HermesExtractedTransaction | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const amount = pickNumber(obj, ["amount", "value", "total", "sum", "transaction_amount"]);
  if (amount === undefined) return null;

  const description =
    pickString(obj, ["description", "memo", "narrative", "details", "name", "title"]) ??
    "Imported transaction";
  const counterparty =
    pickString(obj, ["counterparty", "merchant", "payee", "vendor", "recipient", "from_to"]) ??
    "Unknown";

  const rowContext = buildInstitutionContext(
    pickString(obj, ["institution", "bank", "account", "source", "provider", "app"]),
    pickString(obj, ["account_name", "accountName"]),
    description,
    counterparty,
  );

  const entity = resolveTransactionEntity(
    obj.entity ?? obj.entity_type ?? obj.account_entity,
    hint,
    rowContext,
  );

  const bankRaw = pickString(obj, [
    "bank",
    "institution",
    "source_bank",
    "sourceBank",
    "provider",
    "app",
  ]);
  const sourceBank = detectBankFromText(
    bankRaw ?? rowContext,
  ).name;

  return {
    id:
      pickString(obj, ["id", "transaction_id", "txn_id"]) ??
      `preview-${batchId.slice(0, 8)}-${index}`,
    date: normalizeDate(obj.date ?? obj.transaction_date ?? obj.posted_date ?? obj.created_at),
    description,
    counterparty,
    amount,
    category: pickString(obj, ["category", "category_name", "type_label"]) ?? "Uncategorised",
    type: normalizeType(obj.type ?? obj.transaction_type ?? obj.txn_type, amount),
    entity,
    vat: pickNumber(obj, ["vat", "vat_amount", "tax_amount"]),
    confidence: pickNumber(obj, ["confidence", "score", "certainty"]),
    sourceImageIndex:
      typeof obj.source_image_index === "number"
        ? obj.source_image_index
        : typeof obj.image_index === "number"
          ? obj.image_index
          : undefined,
    sourceBank: sourceBank !== "Bank app" ? sourceBank : undefined,
  };
}

function extractScreenshotSources(
  payload: unknown,
  transactions: HermesExtractedTransaction[],
): HermesScreenshotSource[] {
  const root = asRecord(payload);
  const candidates: unknown[] = [];

  if (root) {
    if (Array.isArray(root.screenshots)) candidates.push(...root.screenshots);
    if (Array.isArray(root.sources)) candidates.push(...root.sources);
    if (Array.isArray(root.images)) candidates.push(...root.images);
    const data = asRecord(root.data);
    if (data && Array.isArray(data.screenshots)) candidates.push(...data.screenshots);
  }

  if (candidates.length > 0) {
    return candidates.map((item, index) => {
      const obj = asRecord(item) ?? {};
      const bankRaw = pickString(obj, [
        "bank",
        "institution",
        "detected_bank",
        "source",
        "provider",
        "app",
        "name",
      ]);
      const detected = detectBankFromText(bankRaw ?? "");
      const idx =
        typeof obj.index === "number"
          ? obj.index
          : typeof obj.image_index === "number"
            ? obj.image_index
            : index;
      return {
        index: idx,
        bank: bankRaw && detected.name !== "Bank app" ? detected.name : detected.name,
        bankId: pickString(obj, ["bank_id", "bankId"]) ?? detected.id,
        fileName: pickString(obj, ["file_name", "fileName", "filename"]),
        transactionCount:
          pickNumber(obj, ["transaction_count", "transactionCount", "count"]) ??
          transactions.filter((t) => (t.sourceImageIndex ?? 0) === idx).length,
        confidence: pickNumber(obj, ["confidence", "score"]),
      };
    });
  }

  const byIndex = new Map<number, HermesExtractedTransaction[]>();
  for (const t of transactions) {
    const i = t.sourceImageIndex ?? 0;
    const list = byIndex.get(i) ?? [];
    list.push(t);
    byIndex.set(i, list);
  }

  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, txns]) => {
      const bankCounts = new Map<string, number>();
      for (const t of txns) {
        const b = t.sourceBank ?? "Bank app";
        bankCounts.set(b, (bankCounts.get(b) ?? 0) + 1);
      }
      const bank = [...bankCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Bank app";
      const detected = detectBankFromText(bank);
      return {
        index,
        bank,
        bankId: detected.id,
        transactionCount: txns.length,
      };
    });
}

function extractErrorMessage(payload: unknown): string | null {
  const root = asRecord(payload);
  if (!root) return null;
  if (root.success === false) {
    return (
      pickString(root, ["error", "message", "detail"]) ??
      (typeof root.detail === "string" ? root.detail : "Hermes analysis failed")
    );
  }
  const err = pickString(root, ["error", "message"]);
  if (err) return err;
  if (typeof root.detail === "string") return root.detail;
  if (Array.isArray(root.detail)) {
    const first = root.detail[0];
    const d = asRecord(first);
    if (d && typeof d.msg === "string") return d.msg;
  }
  return null;
}

/**
 * Normalizes live Hermes JSON into Finance OS preview shape.
 */
export function parseHermesResponse(
  payload: unknown,
  entityHint: HermesEntityHint,
): { ok: true; data: HermesAnalyzeResponse } | { ok: false; error: string } {
  const err = extractErrorMessage(payload);
  if (err) return { ok: false, error: err };

  const root = asRecord(payload) ?? {};
  const batchId =
    pickString(root, ["batchId", "batch_id", "id", "request_id"]) ?? crypto.randomUUID();

  const rawList = extractTransactionList(payload);
  let transactions = rawList
    .map((row, i) => mapRow(row, i, batchId, entityHint))
    .filter((t): t is HermesExtractedTransaction => t !== null);

  const detectedEntityRaw = pickString(root, [
    "detected_entity",
    "detectedEntity",
    "primary_entity",
    "primaryEntity",
  ]);
  const batchInstitutionContext = buildInstitutionContext(
    detectedEntityRaw,
    pickString(root, ["entity", "institution", "bank", "source", "provider", "app"]),
    pickString(root, ["account_name", "accountName"]),
    ...rawList.map((row) => {
      const obj = asRecord(row);
      if (!obj) return "";
      return buildInstitutionContext(
        pickString(obj, ["institution", "bank", "source", "provider", "app"]),
        pickString(obj, ["description", "memo", "narrative"]),
      );
    }),
  );

  if (detectedEntityRaw) {
    const batchEntity = resolveFromDetectedEntity(
      detectedEntityRaw,
      entityHint,
      batchInstitutionContext,
    );
    transactions = transactions.map((t) => ({ ...t, entity: batchEntity }));
  }

  if (transactions.length === 0) {
    return {
      ok: false,
      error:
        "Hermes returned no transactions. Try clearer screenshots or a different entity setting.",
    };
  }

  const entities = new Set(transactions.map((t) => t.entity));
  const entityField = pickString(root, ["entity", "detected_entity", "primary_entity"]);
  let entity: HermesAnalyzeResponse["entity"] =
    entities.size > 1 ? "mixed" : (transactions[0]?.entity ?? "personal");

  if (entityField) {
    const e = resolveFromDetectedEntity(entityField, entityHint, batchInstitutionContext);
    entity = entities.size > 1 ? "mixed" : e;
  }

  const warnings: string[] = [];
  if (Array.isArray(root.warnings)) {
    for (const w of root.warnings) {
      if (typeof w === "string") warnings.push(w);
    }
  }
  if (Array.isArray(root.messages)) {
    for (const m of root.messages) {
      if (typeof m === "string") warnings.push(m);
    }
  }

  const confidence =
    pickNumber(root, ["confidence", "overall_confidence", "score"]) ?? 0.85;

  const balanceEntity: ResolvedEntity =
    entity === "mixed" ? (transactions[0]?.entity ?? "personal") : entity;

  const accountBalances = parseAccountBalancesFromHermes(
    payload,
    balanceEntity,
    batchInstitutionContext,
  );

  const screenshotSources = extractScreenshotSources(payload, transactions);

  return {
    ok: true,
    data: {
      success: true,
      batchId,
      entity,
      confidence,
      transactions,
      screenshotSources: screenshotSources.length > 0 ? screenshotSources : undefined,
      accountBalances: accountBalances.length > 0 ? accountBalances : undefined,
      warnings: filterBalanceWarnings(warnings, accountBalances.length > 0),
      processedAt:
        pickString(root, ["processedAt", "processed_at", "timestamp"]) ??
        new Date().toISOString(),
    },
  };
}
