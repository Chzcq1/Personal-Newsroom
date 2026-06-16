// ============================================================
// SOURCE BRANDING — Sprint 7 Task H
//
// Maps known news source names to brand identity:
//   initials — 2–3 letter abbreviation
//   bg        — hex background color
//   fg        — hex text color
//   tier      — 'A' | 'B' | 'C' from sourceRegistry
//
// Unknown sources get deterministic initials + slate palette.
// ============================================================

export interface SourceBrand {
  initials: string;
  bg: string;
  fg: string;
  tier: "A" | "B" | "C";
}

const SOURCE_BRANDS: Record<string, SourceBrand> = {
  // ── Tier A — Premium editorial ──────────────────────────
  "Financial Times": { initials: "FT", bg: "#FCA511", fg: "#000000", tier: "A" },
  "Bloomberg": { initials: "BB", bg: "#3B1FBF", fg: "#FFFFFF", tier: "A" },
  "Reuters": { initials: "RE", bg: "#E05200", fg: "#FFFFFF", tier: "A" },
  "Associated Press": { initials: "AP", bg: "#CC0000", fg: "#FFFFFF", tier: "A" },
  "AP News": { initials: "AP", bg: "#CC0000", fg: "#FFFFFF", tier: "A" },
  "The Economist": { initials: "EC", bg: "#E3120B", fg: "#FFFFFF", tier: "A" },
  "Economist": { initials: "EC", bg: "#E3120B", fg: "#FFFFFF", tier: "A" },
  "MIT Technology Review": { initials: "MIT", bg: "#A31F34", fg: "#FFFFFF", tier: "A" },

  // ── Tier B — Quality tech / business ────────────────────
  "TechCrunch": { initials: "TC", bg: "#007AFF", fg: "#FFFFFF", tier: "B" },
  "Ars Technica": { initials: "ARS", bg: "#E55C00", fg: "#FFFFFF", tier: "B" },
  "The Verge": { initials: "VG", bg: "#6234A6", fg: "#FFFFFF", tier: "B" },
  "VentureBeat": { initials: "VB", bg: "#1A4E9F", fg: "#FFFFFF", tier: "B" },
  "CNBC": { initials: "CN", bg: "#0258B5", fg: "#FFFFFF", tier: "B" },
  "BBC News": { initials: "BBC", bg: "#BB1919", fg: "#FFFFFF", tier: "B" },
  "BBC": { initials: "BBC", bg: "#BB1919", fg: "#FFFFFF", tier: "B" },
  "Politico": { initials: "POL", bg: "#1A3A5C", fg: "#FFFFFF", tier: "B" },
  "MarketWatch": { initials: "MW", bg: "#126A25", fg: "#FFFFFF", tier: "B" },
  "Yahoo Finance": { initials: "YF", bg: "#5F01D1", fg: "#FFFFFF", tier: "B" },
  "Hacker News": { initials: "HN", bg: "#FF6600", fg: "#FFFFFF", tier: "B" },
  "Wired": { initials: "WI", bg: "#1A1A1A", fg: "#FFFFFF", tier: "B" },
  "Fortune": { initials: "FO", bg: "#1B3C6E", fg: "#FFFFFF", tier: "B" },
  "The Guardian": { initials: "GU", bg: "#052962", fg: "#FFFFFF", tier: "B" },
  "Wall Street Journal": { initials: "WSJ", bg: "#004785", fg: "#FFFFFF", tier: "B" },
  "WSJ": { initials: "WSJ", bg: "#004785", fg: "#FFFFFF", tier: "B" },
  "Business Insider": { initials: "BI", bg: "#2E75B6", fg: "#FFFFFF", tier: "B" },
  "Forbes": { initials: "FB", bg: "#0061A8", fg: "#FFFFFF", tier: "B" },
};

const FALLBACK_PALETTE = [
  { bg: "#374151", fg: "#FFFFFF" },
  { bg: "#1F2937", fg: "#FFFFFF" },
  { bg: "#292524", fg: "#FFFFFF" },
  { bg: "#1E1B4B", fg: "#FFFFFF" },
  { bg: "#1C1917", fg: "#FFFFFF" },
  { bg: "#14532D", fg: "#FFFFFF" },
  { bg: "#1E3A5F", fg: "#FFFFFF" },
];

function generateInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  if (words.length >= 3) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function getSourceBrand(sourceName: string | null | undefined): SourceBrand {
  if (!sourceName) {
    return { initials: "–", bg: "#374151", fg: "#FFFFFF", tier: "C" };
  }

  // Exact match
  const exact = SOURCE_BRANDS[sourceName];
  if (exact) return exact;

  // Partial match — source name contains or is contained in a known key
  const lower = sourceName.toLowerCase();
  for (const [key, brand] of Object.entries(SOURCE_BRANDS)) {
    const keyLower = key.toLowerCase();
    if (lower.includes(keyLower) || keyLower.includes(lower)) {
      return brand;
    }
  }

  // Deterministic fallback — consistent color per source name
  const colorIndex = sourceName.charCodeAt(0) % FALLBACK_PALETTE.length;
  const color = FALLBACK_PALETTE[colorIndex];
  return {
    initials: generateInitials(sourceName),
    bg: color.bg,
    fg: color.fg,
    tier: "C",
  };
}
