import type { HermesEntityHint } from "@/lib/hermes/types";

export type ResolvedEntity = "personal" | "avaken";

/** Personal banking / wealth apps seen in screenshots. */
const PERSONAL_INSTITUTION_MARKERS = [
  "starling",
  "rbs",
  "royal bank",
  "barclays",
  "apple pay",
  "applepay",
  "etoro",
  "revolut",
  "monzo",
  "chase uk",
  "halifax",
  "lloyds",
  "natwest",
  "nationwide",
  "amex",
  "american express",
] as const;

/** Avaken Ltd business banking. */
const AVAKEN_INSTITUTION_MARKERS = ["tide"] as const;

function normalizeExplicitEntity(raw: unknown): ResolvedEntity | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s.includes("personal") || s === "p") return "personal";
  if (s.includes("avaken") || s === "a" || s.includes("business") || s.includes("ltd")) {
    return "avaken";
  }
  return null;
}

/**
 * Infers entity from bank/app names in Hermes output (descriptions, institution fields, etc.).
 * Tide → Avaken; Starling, RBS, Barclays, Apple Pay, eToro, etc. → Personal.
 */
export function inferEntityFromInstitution(text: string): ResolvedEntity | null {
  const s = text.toLowerCase();
  if (!s.trim()) return null;

  for (const marker of AVAKEN_INSTITUTION_MARKERS) {
    if (s.includes(marker)) return "avaken";
  }
  for (const marker of PERSONAL_INSTITUTION_MARKERS) {
    if (s.includes(marker)) return "personal";
  }
  return null;
}

/**
 * Per-transaction resolution — institution keywords win over a wrong row-level entity
 * (e.g. Starling screenshot tagged `avaken` by Hermes).
 */
export function resolveTransactionEntity(
  raw: unknown,
  hint: HermesEntityHint,
  contextText = "",
): ResolvedEntity {
  const fromInstitution = inferEntityFromInstitution(contextText);
  if (fromInstitution) return fromInstitution;

  const explicit = normalizeExplicitEntity(raw);
  if (explicit) return explicit;

  if (hint === "personal" || hint === "avaken") return hint;

  return "personal";
}

/** Honors Hermes `detected_entity` first, then institution context, then UI hint. */
export function resolveFromDetectedEntity(
  raw: unknown,
  hint: HermesEntityHint,
  contextText = "",
): ResolvedEntity {
  const explicit = normalizeExplicitEntity(raw);
  if (explicit) return explicit;

  const fromInstitution = inferEntityFromInstitution(contextText);
  if (fromInstitution) return fromInstitution;

  if (hint === "personal" || hint === "avaken") return hint;

  return "personal";
}

export function parseImportEntityHint(raw: unknown): HermesEntityHint | "personal" | "avaken" {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "personal" || s === "p") return "personal";
  if (s === "avaken" || s === "a" || s === "business") return "avaken";
  if (s === "auto") return "auto";
  return "personal";
}

export function buildInstitutionContext(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Reads `importEntityHint` from a wrapper body without treating it as Hermes metadata. */
export function extractJsonImportRequest(body: unknown): {
  payload: unknown;
  importEntityHint: "personal" | "avaken";
} {
  if (body === null || typeof body !== "object") {
    return { payload: body, importEntityHint: "personal" };
  }

  const root = { ...(body as Record<string, unknown>) };
  const parsed = parseImportEntityHint(root.importEntityHint);
  const importEntityHint: "personal" | "avaken" = parsed === "avaken" ? "avaken" : "personal";

  delete root.importEntityHint;
  delete root.entityHint;
  delete root.entity_hint;

  return { payload: root, importEntityHint };
}
