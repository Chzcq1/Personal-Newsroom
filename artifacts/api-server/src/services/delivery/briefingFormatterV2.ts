// ============================================================
// BRIEFING FORMATTER V2 — Sprint 15 Task C
//
// Layered Intelligence Formatting for Telegram.
//
// Problems with V1:
//   - Dense HTML blocks — unreadable on mobile
//   - Sections buried inside long paragraphs
//   - No "scan-first" structure
//   - Thai text with no scannable entry point
//
// Sprint 15 format (Layered Intelligence):
//
//   [BOLD HEADLINE — Topic · Time]
//
//   ◽ Executive summary (1 line Thai)
//   ◽ Key implication
//   ◽ Why this matters
//
//   ── Signal ──
//   📌 [ดูข้อมูลเพิ่มเติมบน INFOX]
//
// Telegram HTML is preserved (not MarkdownV2) because:
//   - MarkdownV2 requires escaping 18+ characters
//   - HTML is more predictable for Thai text
//   - HTML entities are handled correctly
//
// Architecture: pure functions, no side effects.
// ============================================================

const MAX_TELEGRAM_MSG_LEN = 4096;

// ── HTML escape ───────────────────────────────────────────────

function esc(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Bold key entities in a line ───────────────────────────────

const INLINE_ENTITIES = [
  "OpenAI","Anthropic","Google","Microsoft","Apple","Meta","Amazon",
  "Nvidia","Tesla","Samsung","Intel","AMD","TSMC","Alibaba","Huawei",
  "Federal Reserve","Fed","SEC","IMF",
  "Goldman Sachs","JPMorgan","BlackRock",
  "Sam Altman","Elon Musk","Jensen Huang","Jerome Powell",
  "GPT-4","GPT-4o","GPT-5","Claude","Gemini","Llama","DeepSeek",
  "H100","Blackwell","B200",
];

const ENTITY_RE = new RegExp(
  `\\b(${INLINE_ENTITIES.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "g",
);

function boldEntities(text: string): string {
  // Bold numbers with units first
  const withNums = text.replace(
    /(\$|¥|£|€|฿)?(\d[\d,]*\.?\d*)(\s?(?:B|M|T|bn|mn|trillion|billion|million|%|บาท|ล้าน))?(?=[\s,.)!?]|$)/g,
    (m) => m.trim().length > 1 ? `<b>${m}</b>` : m,
  );
  return withNums.replace(ENTITY_RE, "<b>$1</b>");
}

// ── Layered line extraction ──────────────────────────────────
//
// The AI briefing is in Thai and may or may not have explicit
// section markers. We extract up to 4 meaningful layers from it
// to create the compact scan-first format.

interface BriefingLayers {
  headline: string;        // First meaningful sentence / section header
  summary: string;         // One-line executive summary
  implication: string;     // Key implication or development
  whyItMatters: string;    // Broader significance
  remaining: string;       // Rest of the content (for full article)
}

const SECTION_RE = /^(HEADLINE|EXECUTIVE SUMMARY|KEY DEVELOPMENTS|IMPACT ANALYSIS|WHY IT MATTERS|สรุปสำคัญ|พัฒนาการสำคัญ|ผลกระทบ|บทสรุป)\s*:?\s*/i;

function extractLayers(rawText: string): BriefingLayers {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const meaningful: string[] = lines.filter((l) => l.length > 20);

  // Try to find explicit section markers
  let headline = "";
  let summary = "";
  let implication = "";
  let whyItMatters = "";

  for (const line of meaningful) {
    const lower = line.toLowerCase();
    if (!headline && (SECTION_RE.test(line) || line.length < 120)) {
      headline = line.replace(SECTION_RE, "").trim() || line;
    } else if (!summary && (lower.includes("สรุป") || lower.includes("summary") || lower.includes("executive"))) {
      summary = line.replace(SECTION_RE, "").trim();
    } else if (!implication && (lower.includes("ผลกระทบ") || lower.includes("implication") || lower.includes("impact") || lower.includes("development"))) {
      implication = line.replace(SECTION_RE, "").trim();
    } else if (!whyItMatters && (lower.includes("สำคัญ") || lower.includes("matters") || lower.includes("why") || lower.includes("significance"))) {
      whyItMatters = line.replace(SECTION_RE, "").trim();
    }
  }

  // Fallback: distribute first 4 meaningful lines into layers
  if (!headline && meaningful.length > 0) headline = meaningful[0];
  if (!summary && meaningful.length > 1) summary = meaningful[1];
  if (!implication && meaningful.length > 2) implication = meaningful[2];
  if (!whyItMatters && meaningful.length > 3) whyItMatters = meaningful[3];

  // Remaining = everything after first 4 meaningful lines
  const usedCount = [headline, summary, implication, whyItMatters].filter(Boolean).length;
  const remaining = meaningful.slice(usedCount).join("\n\n");

  return { headline, summary, implication, whyItMatters, remaining };
}

// ── Timestamp helper ─────────────────────────────────────────

function thaiTime(): string {
  return new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  });
}

function thaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

function thaiDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

// ── Signal badge ─────────────────────────────────────────────

function signalBadgeIcon(badge?: string): string {
  switch (badge) {
    case "MORNING":      return "🌅";
    case "EVENING":      return "🌆";
    case "EXECUTIVE":    return "📊";
    case "INTELLIGENCE": return "🔍";
    case "ALERT":        return "⚡";
    default:             return "◆";
  }
}

// ── Core layered formatter ────────────────────────────────────

export interface LayeredFormatOptions {
  sourceCount?: number;
  signalBadge?: string;
  narrativeCount?: number;
  momentum?: string;
  topTierSources?: string[];
  appUrl?: string;
}

function formatLayered(
  rawText: string,
  topicLabel: string,
  subtitle: string,
  options: LayeredFormatOptions = {},
): string {
  const { sourceCount, signalBadge, topTierSources, appUrl } = options;
  const layers = extractLayers(rawText);
  const out: string[] = [];
  const icon = signalBadgeIcon(signalBadge);

  // ── Header ───────────────────────────────────────────────
  out.push(`<b>${icon} ${esc(topicLabel)}</b>`);
  out.push(`<i>${esc(subtitle)}</i>`);

  // Meta line
  const meta: string[] = [];
  if (sourceCount && sourceCount > 0) meta.push(`${sourceCount} แหล่ง`);
  if (topTierSources?.length) meta.push(`via ${topTierSources.slice(0, 2).join(", ")}`);
  if (meta.length > 0) out.push(`<i>${meta.join("  ·  ")}</i>`);

  out.push("");
  out.push("<i>──────────────────────</i>");
  out.push("");

  // ── Layered intelligence content ─────────────────────────
  if (layers.headline) {
    out.push(boldEntities(esc(layers.headline)));
    out.push("");
  }

  if (layers.summary) {
    out.push(`◽ ${boldEntities(esc(layers.summary))}`);
  }
  if (layers.implication) {
    out.push(`◽ ${boldEntities(esc(layers.implication))}`);
  }
  if (layers.whyItMatters) {
    out.push(`◽ ${boldEntities(esc(layers.whyItMatters))}`);
  }

  // Extended content (if any) with compact formatting
  if (layers.remaining) {
    out.push("");
    out.push("<i>──────────────────────</i>");
    out.push("");
    const remainingLines = layers.remaining.split("\n").filter((l) => l.trim());
    let lineCount = 0;
    for (const line of remainingLines) {
      if (lineCount > 8) { // Cap at 8 additional lines for scan-first
        out.push("<i>…</i>");
        break;
      }
      out.push(boldEntities(esc(line.trim())));
      lineCount++;
    }
  }

  out.push("");
  out.push("<i>──────────────────────</i>");

  // Footer
  const footerParts: string[] = [];
  if (appUrl) footerParts.push(`<a href="${appUrl}">📌 ดูข้อมูลเพิ่มเติมบน INFOX</a>`);
  footerParts.push(`<i>INFOX · ${thaiTime()} ICT</i>`);
  out.push(footerParts.join("  "));

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ── Message splitting ─────────────────────────────────────────

function splitMessages(text: string): string[] {
  if (text.length <= MAX_TELEGRAM_MSG_LEN) return [text];
  const messages: string[] = [];
  let remaining = text;
  let chunkNum = 2;
  while (remaining.length > MAX_TELEGRAM_MSG_LEN) {
    let splitAt = remaining.lastIndexOf("\n\n", MAX_TELEGRAM_MSG_LEN - 20);
    if (splitAt <= 0) splitAt = remaining.lastIndexOf("\n", MAX_TELEGRAM_MSG_LEN - 20);
    if (splitAt <= 0) splitAt = MAX_TELEGRAM_MSG_LEN - 20;
    messages.push(remaining.slice(0, splitAt).trim());
    remaining = `<i>(ต่อ ${chunkNum})</i>\n\n` + remaining.slice(splitAt).trim();
    chunkNum++;
  }
  if (remaining) messages.push(remaining);
  return messages;
}

// ── Public formatters (V2) ────────────────────────────────────

export function formatBriefingV2(
  rawBriefing: string,
  topicLabel: string,
  topicLabelTh: string,
  generatedAt: string,
  options: LayeredFormatOptions = {},
): string[] {
  return splitMessages(formatLayered(
    rawBriefing,
    `Intelligence Briefing — ${topicLabel}`,
    `${topicLabelTh} · ${thaiDate(generatedAt)}`,
    options,
  ));
}

export function formatMorningBriefingV2(
  rawBriefing: string,
  generatedAt: string,
  options: LayeredFormatOptions = {},
): string[] {
  return splitMessages(formatLayered(
    rawBriefing,
    "Morning Intelligence Briefing",
    thaiDateTime(generatedAt),
    { signalBadge: "MORNING", ...options },
  ));
}

export function formatEveningBriefingV2(
  rawBriefing: string,
  generatedAt: string,
  options: LayeredFormatOptions = {},
): string[] {
  return splitMessages(formatLayered(
    rawBriefing,
    "Evening Intelligence Recap",
    thaiDateTime(generatedAt),
    { signalBadge: "EVENING", ...options },
  ));
}

export function formatExecutiveBriefingV2(
  rawBriefing: string,
  generatedAt: string,
  options: LayeredFormatOptions = {},
): string[] {
  return splitMessages(formatLayered(
    rawBriefing,
    "Executive Briefing",
    `สรุปผู้บริหาร · ${thaiDate(generatedAt)}`,
    { signalBadge: "EXECUTIVE", ...options },
  ));
}

export function formatIntelligenceBriefingV2(
  rawBriefing: string,
  generatedAt: string,
  topicLabel: string,
  options: LayeredFormatOptions = {},
): string[] {
  return splitMessages(formatLayered(
    rawBriefing,
    `Intelligence Briefing — ${topicLabel}`,
    thaiDate(generatedAt),
    { signalBadge: "INTELLIGENCE", ...options },
  ));
}

// ── Preview renderer (for /settings/delivery/preview-live) ───
//
// Returns the exact HTML string that would be sent to Telegram,
// formatted for display in a phone-like preview card.

export function renderPreviewHtml(messages: string[]): string {
  return messages
    .map((msg, i) =>
      `<div class="telegram-message">${
        i > 0 ? `<div class="continuation-marker">(ต่อ ${i + 1})</div>` : ""
      }${msg}</div>`,
    )
    .join("\n");
}

// ── Compact alert format ──────────────────────────────────────
//
// For high-priority alerts (single article, not full briefing)

export function formatAlertV2(
  headline: string,
  summary: string,
  source: string,
  articleUrl?: string,
  priorityLabel?: string,
): string {
  const icon = priorityLabel === "critical" ? "⚡" :
               priorityLabel === "high" ? "🔔" : "◆";

  const out: string[] = [
    `<b>${icon} ${esc(headline)}</b>`,
    "",
    boldEntities(esc(summary)),
    "",
    `<i>via ${esc(source)} · ${thaiTime()} ICT</i>`,
  ];

  if (articleUrl) {
    out.push(`<a href="${articleUrl}">อ่านต่อ →</a>`);
  }

  return out.join("\n");
}
