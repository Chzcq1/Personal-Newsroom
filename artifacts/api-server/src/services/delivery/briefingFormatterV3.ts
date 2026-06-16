// ============================================================
// BRIEFING FORMATTER V3 — Sprint 16 Task F
//
// Premium intelligence terminal formatting for Telegram.
//
// V3 structure (6 sections):
//   1. HEADLINE           — bold topic + signal mode indicator
//   2. WHY THIS MATTERS   — personalised strategic context
//   3. KEY SIGNALS        — 3 scan bullets (layered from V2)
//   4. STRATEGIC WATCHLIST — entities to monitor next
//   5. CONFIDENCE         — signal class + source count
//   6. READ TIME          — estimated Thai reading time
//
// V3 improvements over V2:
//   - "Why you received this" section
//   - Signal confidence tag per briefing
//   - Signal mode indicator in header
//   - Cleaner mobile scan hierarchy
//   - Strategic watchlist block
//
// Telegram HTML is preserved (not MarkdownV2).
// Architecture: pure functions, no side effects.
// ============================================================

import type { SignalMode } from "../intelligence/signalModeEngine.js";
import { SIGNAL_MODES } from "../intelligence/signalModeEngine.js";

const MAX_TELEGRAM_MSG_LEN = 4096;

// ── HTML escape ───────────────────────────────────────────────

function esc(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Entity bolding ────────────────────────────────────────────

const INLINE_ENTITIES = [
  "OpenAI","Anthropic","Google","Microsoft","Apple","Meta","Amazon",
  "Nvidia","Tesla","Samsung","Intel","AMD","TSMC","Alibaba","Huawei",
  "Federal Reserve","Fed","SEC","IMF","OPEC",
  "Goldman Sachs","JPMorgan","BlackRock","Citigroup",
  "Sam Altman","Elon Musk","Jensen Huang","Jerome Powell","Sundar Pichai",
  "GPT-4","GPT-4o","GPT-5","Claude","Gemini","Llama","DeepSeek","Grok",
  "H100","Blackwell","B200","GB200",
  "Bitcoin","Ethereum","BTC","ETH",
];

const ENTITY_RE = new RegExp(
  `\\b(${INLINE_ENTITIES.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "g",
);

function boldEntities(text: string): string {
  const withNums = text.replace(
    /(\$|¥|£|€|฿)?(\d[\d,]*\.?\d*)(\s?(?:B|M|T|bn|mn|trillion|billion|million|%|บาท|ล้าน))?(?=[\s,.)!?]|$)/g,
    (m) => (m.trim().length > 1 ? `<b>${m}</b>` : m),
  );
  return withNums.replace(ENTITY_RE, "<b>$1</b>");
}

// ── Layer extraction ──────────────────────────────────────────

const SECTION_RE = /^(HEADLINE|EXECUTIVE SUMMARY|KEY DEVELOPMENTS|IMPACT ANALYSIS|WHY IT MATTERS|สรุปสำคัญ|พัฒนาการสำคัญ|ผลกระทบ|บทสรุป)\s*:?\s*/i;

interface BriefingLayers {
  headline: string;
  summary: string;
  implication: string;
  whyItMatters: string;
  remaining: string;
}

function extractLayers(rawText: string): BriefingLayers {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const meaningful = lines.filter((l) => l.length > 20);

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

  if (!headline && meaningful.length > 0) headline = meaningful[0];
  if (!summary && meaningful.length > 1) summary = meaningful[1];
  if (!implication && meaningful.length > 2) implication = meaningful[2];
  if (!whyItMatters && meaningful.length > 3) whyItMatters = meaningful[3];

  const used = [headline, summary, implication, whyItMatters].filter(Boolean).length;
  const remaining = meaningful.slice(used).join("\n\n");

  return { headline, summary, implication, whyItMatters, remaining };
}

// ── Helpers ───────────────────────────────────────────────────

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

function estimateReadTimeThai(text: string): string {
  // Thai text: ~440 chars/min (roughly)
  const chars = text.replace(/\s+/g, "").length;
  const minutes = Math.ceil(chars / 440);
  if (minutes <= 1) return "~1 นาที";
  return `~${minutes} นาที`;
}

function signalModeTag(mode?: SignalMode): string {
  if (!mode) return "";
  const config = SIGNAL_MODES[mode];
  const icons: Record<string, string> = {
    safe: "🛡",
    balanced: "⚖️",
    raw: "⚡",
  };
  return `${icons[mode] ?? ""} ${config.label}`;
}

function confidenceTag(signalClass?: string, total?: number): string {
  if (!signalClass) return "";
  const labels: Record<string, string> = {
    institutional: "✦ Institutional",
    confirmed: "✓ Confirmed",
    developing: "◐ Developing",
    early_signal: "△ Early Signal",
    experimental: "◌ Experimental",
  };
  const label = labels[signalClass] ?? signalClass;
  return total !== undefined ? `${label} · ${total}/100` : label;
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

// ── V3 format options ─────────────────────────────────────────

export interface V3FormatOptions {
  sourceCount?: number;
  topTierSources?: string[];
  signalBadge?: string;
  narrativeCount?: number;
  momentum?: string;
  appUrl?: string;
  // V3 additions
  signalMode?: SignalMode;
  whyYouReceivedThis?: string;        // personalised context from strategicContext.ts
  strategicWatchlist?: string[];      // entities to watch
  confidenceScore?: number;           // 0–100
  confidenceClass?: string;           // signal class id
  isMultiSource?: boolean;
}

// ── Core V3 formatter ─────────────────────────────────────────

function formatV3(
  rawText: string,
  topicLabel: string,
  subtitle: string,
  options: V3FormatOptions = {},
): string {
  const {
    sourceCount,
    topTierSources,
    signalMode,
    whyYouReceivedThis,
    strategicWatchlist,
    confidenceScore,
    confidenceClass,
    isMultiSource,
    appUrl,
  } = options;

  const layers = extractLayers(rawText);
  const out: string[] = [];

  // ── SECTION 1: HEADLINE ──────────────────────────────────
  const modeTag = signalModeTag(signalMode);
  out.push(
    modeTag
      ? `<b>${esc(topicLabel)}</b>  <i>${modeTag}</i>`
      : `<b>${esc(topicLabel)}</b>`,
  );
  out.push(`<i>${esc(subtitle)}</i>`);

  // Meta line
  const meta: string[] = [];
  if (sourceCount && sourceCount > 0) meta.push(`${sourceCount} แหล่งข่าว`);
  if (isMultiSource) meta.push("multi-source");
  if (topTierSources?.length) meta.push(`via ${topTierSources.slice(0, 2).join(", ")}`);
  if (meta.length > 0) out.push(`<i>${meta.join("  ·  ")}</i>`);

  out.push("");
  out.push("<i>──────────────────────</i>");

  // ── SECTION 2: WHY THIS MATTERS ─────────────────────────
  if (whyYouReceivedThis) {
    out.push("");
    out.push(`<b>💡 ทำไมถึงสำคัญ</b>`);
    out.push(esc(whyYouReceivedThis));
  }

  out.push("");

  // ── SECTION 3: KEY SIGNALS ───────────────────────────────
  if (layers.headline) {
    out.push(boldEntities(esc(layers.headline)));
    out.push("");
  }

  if (layers.summary) out.push(`▸ ${boldEntities(esc(layers.summary))}`);
  if (layers.implication) out.push(`▸ ${boldEntities(esc(layers.implication))}`);
  if (layers.whyItMatters) out.push(`▸ ${boldEntities(esc(layers.whyItMatters))}`);

  if (layers.remaining) {
    out.push("");
    out.push("<i>──────────────────────</i>");
    out.push("");
    const remainingLines = layers.remaining.split("\n").filter((l) => l.trim());
    let lineCount = 0;
    for (const line of remainingLines) {
      if (lineCount > 6) {
        out.push("<i>…</i>");
        break;
      }
      out.push(boldEntities(esc(line.trim())));
      lineCount++;
    }
  }

  out.push("");
  out.push("<i>──────────────────────</i>");

  // ── SECTION 4: STRATEGIC WATCHLIST ──────────────────────
  if (strategicWatchlist && strategicWatchlist.length > 0) {
    out.push("");
    out.push(`<b>👁 Watch</b>`);
    out.push(strategicWatchlist.slice(0, 4).map((e) => `· ${esc(e)}`).join("\n"));
    out.push("");
    out.push("<i>──────────────────────</i>");
  }

  // ── SECTION 5: CONFIDENCE ────────────────────────────────
  const confTag = confidenceTag(confidenceClass, confidenceScore);
  if (confTag) {
    out.push("");
    out.push(`<i>${confTag}</i>`);
  }

  // ── SECTION 6: READ TIME + FOOTER ────────────────────────
  const readTime = estimateReadTimeThai(rawText);
  const footerParts: string[] = [];
  if (appUrl) footerParts.push(`<a href="${appUrl}">📌 ดูบน INFOX</a>`);
  footerParts.push(`<i>อ่าน ${readTime}  ·  INFOX · ${thaiTime()} ICT</i>`);

  out.push("");
  out.push(footerParts.join("  "));

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ── Public formatters (V3) ────────────────────────────────────

export function formatBriefingV3(
  rawBriefing: string,
  topicLabel: string,
  topicLabelTh: string,
  generatedAt: string,
  options: V3FormatOptions = {},
): string[] {
  return splitMessages(
    formatV3(
      rawBriefing,
      `Intelligence Briefing — ${topicLabel}`,
      `${topicLabelTh} · ${thaiDate(generatedAt)}`,
      options,
    ),
  );
}

export function formatMorningBriefingV3(
  rawBriefing: string,
  generatedAt: string,
  options: V3FormatOptions = {},
): string[] {
  return splitMessages(
    formatV3(
      rawBriefing,
      "🌅 Morning Intelligence Briefing",
      thaiDateTime(generatedAt),
      { signalBadge: "MORNING", ...options },
    ),
  );
}

export function formatEveningBriefingV3(
  rawBriefing: string,
  generatedAt: string,
  options: V3FormatOptions = {},
): string[] {
  return splitMessages(
    formatV3(
      rawBriefing,
      "🌆 Evening Intelligence Recap",
      thaiDateTime(generatedAt),
      { signalBadge: "EVENING", ...options },
    ),
  );
}

export function formatExecutiveBriefingV3(
  rawBriefing: string,
  generatedAt: string,
  options: V3FormatOptions = {},
): string[] {
  return splitMessages(
    formatV3(
      rawBriefing,
      "📊 Executive Briefing",
      `สรุปผู้บริหาร · ${thaiDate(generatedAt)}`,
      { signalBadge: "EXECUTIVE", ...options },
    ),
  );
}

export function formatIntelligenceBriefingV3(
  rawBriefing: string,
  generatedAt: string,
  topicLabel: string,
  options: V3FormatOptions = {},
): string[] {
  return splitMessages(
    formatV3(
      rawBriefing,
      `🔍 Intelligence — ${topicLabel}`,
      thaiDate(generatedAt),
      { signalBadge: "INTELLIGENCE", ...options },
    ),
  );
}

// ── Preview renderer ──────────────────────────────────────────

export function renderPreviewHtmlV3(messages: string[]): string {
  return messages
    .map(
      (msg, i) =>
        `<div class="telegram-message">${
          i > 0
            ? `<div class="continuation-marker">(ต่อ ${i + 1})</div>`
            : ""
        }${msg}</div>`,
    )
    .join("\n");
}

// ── Alert formatter V3 ────────────────────────────────────────

export function formatAlertV3(
  headline: string,
  summary: string,
  source: string,
  options: {
    articleUrl?: string;
    priorityLabel?: string;
    confidenceScore?: number;
    confidenceClass?: string;
    whyItMatters?: string;
    signalMode?: SignalMode;
  } = {},
): string {
  const icon =
    options.priorityLabel === "critical" ? "⚡" :
    options.priorityLabel === "high" ? "🔔" : "◆";

  const out: string[] = [
    `<b>${icon} ${esc(headline)}</b>`,
    "",
    boldEntities(esc(summary)),
  ];

  if (options.whyItMatters) {
    out.push("");
    out.push(`<i>💡 ${esc(options.whyItMatters)}</i>`);
  }

  const confTag = confidenceTag(options.confidenceClass, options.confidenceScore);
  if (confTag) {
    out.push("");
    out.push(`<i>${confTag}</i>`);
  }

  out.push("");
  const footer: string[] = [`<i>via ${esc(source)} · ${thaiTime()} ICT</i>`];
  if (options.signalMode) {
    footer.push(`<i>${signalModeTag(options.signalMode)}</i>`);
  }
  out.push(footer.join("  "));

  if (options.articleUrl) {
    out.push(`<a href="${options.articleUrl}">อ่านต่อ →</a>`);
  }

  return out.join("\n");
}
