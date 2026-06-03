export interface DetectedBank {
  id: string;
  name: string;
  accent: string;
}

const BANKS: { id: string; name: string; accent: string; patterns: string[] }[] = [
  { id: "starling", name: "Starling", accent: "#7c5cff", patterns: ["starling"] },
  { id: "rbs", name: "RBS", accent: "#3b82f6", patterns: ["rbs", "royal bank"] },
  { id: "barclays", name: "Barclays", accent: "#38bdf8", patterns: ["barclays"] },
  { id: "amex", name: "Amex", accent: "#2563eb", patterns: ["amex", "american express"] },
  { id: "apple-pay", name: "Apple Pay", accent: "#f5f5f7", patterns: ["apple pay", "applepay", "wallet"] },
  { id: "tide", name: "Tide", accent: "#10b981", patterns: ["tide"] },
  { id: "monzo", name: "Monzo", accent: "#ff5a5f", patterns: ["monzo"] },
  { id: "revolut", name: "Revolut", accent: "#6366f1", patterns: ["revolut"] },
  { id: "halifax", name: "Halifax", accent: "#0ea5e9", patterns: ["halifax"] },
  { id: "lloyds", name: "Lloyds", accent: "#22c55e", patterns: ["lloyds"] },
  { id: "natwest", name: "NatWest", accent: "#a855f7", patterns: ["natwest"] },
  { id: "chase", name: "Chase", accent: "#14b8a6", patterns: ["chase"] },
  { id: "stripe", name: "Stripe", accent: "#635bff", patterns: ["stripe"] },
  { id: "tiktok", name: "TikTok Shop", accent: "#f43f5e", patterns: ["tiktok"] },
  { id: "etoro", name: "eToro", accent: "#22c55e", patterns: ["etoro"] },
];

const FALLBACK: DetectedBank = { id: "unknown", name: "Bank app", accent: "#8b909e" };

export function detectBankFromText(text: string): DetectedBank {
  const s = text.toLowerCase();
  for (const bank of BANKS) {
    if (bank.patterns.some((p) => s.includes(p))) {
      return { id: bank.id, name: bank.name, accent: bank.accent };
    }
  }
  return FALLBACK;
}

export function detectBankFromFilename(filename: string): DetectedBank {
  return detectBankFromText(filename.replace(/[_\-.]/g, " "));
}
