import { detectBankFromFilename, detectBankFromText, type DetectedBank } from "./detect-bank";
import type { HermesExtractedTransaction, HermesScreenshotSource } from "@/lib/hermes/types";

export interface ScreenshotSourceView extends HermesScreenshotSource {
  previewUrl?: string;
  bankAccent: string;
}

function bankAccent(bankId: string, bank: string): string {
  return detectBankFromText(bank).accent || detectBankFromText(bankId).accent;
}

/** Merge Hermes sources, per-file hints, and transaction grouping into one list per screenshot. */
export function buildScreenshotSources(
  files: { name: string; previewUrl?: string }[],
  transactions: HermesExtractedTransaction[],
  hermesSources?: HermesScreenshotSource[],
): ScreenshotSourceView[] {
  const count = Math.max(files.length, hermesSources?.length ?? 0, 1);
  const indices = Array.from({ length: count }, (_, i) => i);

  return indices.map((index) => {
    const file = files[index];
    const fromHermes = hermesSources?.find((s) => s.index === index);
    const txns = transactions.filter((t) => (t.sourceImageIndex ?? 0) === index);
    const txnBank = txns
      .map((t) => t.sourceBank)
      .find((b) => b && b !== "Bank app");

    const fileBank = file ? detectBankFromFilename(file.name) : null;
    const bankName =
      fromHermes?.bank ?? txnBank ?? fileBank?.name ?? "Bank app";
    const bankId =
      fromHermes?.bankId ??
      (txnBank ? detectBankFromText(txnBank).id : fileBank?.id) ??
      "unknown";

    return {
      index,
      bank: bankName,
      bankId,
      fileName: file?.name ?? fromHermes?.fileName,
      transactionCount: fromHermes?.transactionCount ?? txns.length,
      confidence: fromHermes?.confidence,
      previewUrl: file?.previewUrl,
      bankAccent: bankAccent(bankId, bankName),
    };
  });
}

export function enrichTransactionsWithBanks(
  transactions: HermesExtractedTransaction[],
  sources: ScreenshotSourceView[],
): HermesExtractedTransaction[] {
  return transactions.map((t) => {
    if (t.sourceBank) return t;
    const idx = t.sourceImageIndex ?? 0;
    const source = sources.find((s) => s.index === idx);
    return source ? { ...t, sourceBank: source.bank } : t;
  });
}

export type { DetectedBank };
