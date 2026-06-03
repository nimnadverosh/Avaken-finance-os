import type { Entity, Transaction, TxnType } from "@/lib/data/types";

/** Entity hint sent to Hermes; `auto` lets vision infer personal vs avaken. */
export type HermesEntityHint = "personal" | "avaken" | "auto";

/** Balance read from a screenshot (e.g. Starling home screen). */
export interface HermesAccountBalance {
  accountId: string;
  balance: number;
  institution?: string;
  currency?: "GBP" | "USD";
  /** Personal imports: bank cash vs credit card outstanding. */
  kind?: "bank" | "credit";
}

export interface HermesExtractedTransaction {
  /** Stable id for preview row editing (client-generated if missing). */
  id: string;
  date: string;
  description: string;
  counterparty: string;
  amount: number;
  category: string;
  type: TxnType;
  entity: Exclude<Entity, "consolidated">;
  vat?: number;
  confidence?: number;
  sourceImageIndex?: number;
}

export interface HermesAnalyzeResponse {
  success: true;
  batchId: string;
  entity: Exclude<Entity, "consolidated"> | "mixed";
  confidence: number;
  transactions: HermesExtractedTransaction[];
  /** When Hermes reads an on-screen balance, maps to a connected account id (e.g. starling). */
  accountBalances?: HermesAccountBalance[];
  warnings: string[];
  processedAt: string;
  /** True when Finance OS used local demo extraction (Hermes URL not configured). */
  demo?: boolean;
}

export interface HermesAnalyzeError {
  success: false;
  error: string;
  code:
    | "VALIDATION"
    | "HERMES_UNAVAILABLE"
    | "HERMES_REJECTED"
    | "TIMEOUT"
    | "BAD_IMAGE"
    | "INTERNAL";
}

export type HermesAnalyzeResult = HermesAnalyzeResponse | HermesAnalyzeError;

export interface ScreenshotImportPayload {
  transactions: HermesExtractedTransaction[];
  accountBalances?: HermesAccountBalance[];
  batchId?: string;
}

export interface ScreenshotImportResponse {
  success: true;
  imported: number;
  ids: string[];
  storage: "database" | "mock";
  /** Returned so the client can update the in-memory ledger immediately. */
  transactions: Transaction[];
  accountBalances?: HermesAccountBalance[];
}

export interface ScreenshotImportError {
  success: false;
  error: string;
}

export interface JsonImportResponse {
  success: true;
  message: string;
  imported: number;
  batchId: string;
  storage: "database" | "mock";
  ids: string[];
  /** Present for mock storage so the browser can update the client ledger immediately. */
  transactions: Transaction[];
  accountBalances?: HermesAccountBalance[];
}

export interface JsonImportError {
  success: false;
  error: string;
}
