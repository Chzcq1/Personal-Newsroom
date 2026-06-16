// ============================================================
// TELEGRAM DELIVERY PREVIEW V3 — Sprint 18 Task E
//
// Ultra-scannable Telegram format. Optimized for reading in 10s.
// Inspired by premium financial terminal design.
//
// Features:
//   - Bold entity highlighting
//   - Compact executive mode
//   - Optional deep-read expansion blocks
//   - Better Markdown/HTML hierarchy
//   - Delivery density tuning
//   - Spacing optimization
// ============================================================

import { logger } from "../../lib/logger.js";

// ── V3 delivery types ─────────────────────────────────────────

export type V3DensityMode = "ultra_compact" | "compact" | "standard" | "deep_read";

export interface V3Section {
  type:
    | "headline_signal"
    | "executive_bullets"
    | "key_signals"
    | "why_it_matters"
    | "watch_next"
    | "confidence_badge"
    | "separator"
    | "footer";
  content: string;
  priority: number;  // 1 = highest, shown first
}

export interface V3BriefingConfig {
  density: V3DensityMode;
  maxSections: number;
  includeBoldEntities: boolean;
  includeWhyItMatters: boolean;
  includeWatchNext: boolean;
  includeConfidenceBadge: boolean;
  includeTimestamp: boolean;
  bulletPrefix: string;
}

export interface V3FormattedDelivery {
  messages: string[];       // Split for Telegram 4096-char limit
  config: V3BriefingConfig;
  sectionCount: number;
  estimatedReadSecs: number;
  charCount: number;
}

// ── Preserved brand names for bolding ─────────────────────────

const BOLD_ENTITY_PATTERNS = [
  /\b(OpenAI|Anthropic|Nvidia|NVIDIA|Google|Meta|Microsoft|Apple|Amazon|Tesla)\b/g,
  /\b(GPT-4o?|GPT-5|Claude|Gemini|Llama|Grok|Copilot)\b/g,
  /\b(Bitcoin|BTC|Ethereum|ETH|Solana|SOL)\b/g,
  /\b(Fed|Federal Reserve|BlackRock|Goldman Sachs|JPMorgan)\b/g,
  /\b(S&P 500|Nasdaq|Dow Jones|SET)\b/g,
];

function boldEntities(text: string): string {
  let result = text;
  for (const pattern of BOLD_ENTITY_PATTERNS) {
    result = result.replace(pattern, "<b>$1</b>");
  }
  return result;
}

// ── Density configs ────────────────────────────────────────────

const DENSITY_CONFIGS: Record<V3DensityMode, V3BriefingConfig> = {
  ultra_compact: {
    density: "ultra_compact",
    maxSections: 2,
    includeBoldEntities: true,
    includeWhyItMatters: false,
    includeWatchNext: false,
    includeConfidenceBadge: false,
    includeTimestamp: true,
    bulletPrefix: "▸",
  },
  compact: {
    density: "compact",
    maxSections: 4,
    includeBoldEntities: true,
    includeWhyItMatters: false,
    includeWatchNext: true,
    includeConfidenceBadge: false,
    includeTimestamp: true,
    bulletPrefix: "▸",
  },
  standard: {
    density: "standard",
    maxSections: 6,
    includeBoldEntities: true,
    includeWhyItMatters: true,
    includeWatchNext: true,
    includeConfidenceBadge: true,
    includeTimestamp: true,
    bulletPrefix: "▸",
  },
  deep_read: {
    density: "deep_read",
    maxSections: 10,
    includeBoldEntities: true,
    includeWhyItMatters: true,
    includeWatchNext: true,
    includeConfidenceBadge: true,
    includeTimestamp: true,
    bulletPrefix: "▸",
  },
};

// ── Section formatters ─────────────────────────────────────────

function formatHeadlineSignal(
  topic: string,
  headline: string,
  time: string,
  config: V3BriefingConfig
): string {
  const topicEmoji: Record<string, string> = {
    ai: "🤖",
    technology: "💻",
    economy: "📊",
    stocks: "📈",
    politics: "🏛",
    geopolitics: "🌏",
    energy: "⚡",
    crypto: "₿",
  };
  const emoji = topicEmoji[topic.toLowerCase()] ?? "📰";
  const timeStr = config.includeTimestamp ? ` · ${time}` : "";
  const headlineFormatted = config.includeBoldEntities ? boldEntities(headline) : headline;
  return `${emoji} <b>${headlineFormatted}</b>${timeStr}`;
}

function formatExecutiveBullets(
  bullets: string[],
  config: V3BriefingConfig,
  maxBullets = 4
): string {
  const prefix = config.bulletPrefix;
  const lines = bullets.slice(0, maxBullets).map((b) => {
    const content = config.includeBoldEntities ? boldEntities(b) : b;
    return `${prefix} ${content}`;
  });
  return lines.join("\n");
}

function formatSeparator(): string {
  return "──────────────";
}

function formatConfidenceBadge(
  confidence: "experimental" | "early_signal" | "developing" | "confirmed" | "established",
  score: number
): string {
  const badges: Record<string, string> = {
    established: "🟢 Established",
    confirmed: "🔵 Confirmed",
    developing: "🟡 Developing",
    early_signal: "🟠 Early Signal",
    experimental: "⚪ Experimental",
  };
  return `${badges[confidence] ?? "⚪"} · Confidence ${score}/100`;
}

function formatFooter(sourceCount: number, density: V3DensityMode): string {
  const densityLabel =
    density === "deep_read" ? "Deep Read" :
    density === "standard" ? "Standard" :
    density === "compact" ? "Compact" : "Express";
  return `<i>📡 ${sourceCount} sources · ${densityLabel} · INFOX</i>`;
}

// ── Main V3 formatter ──────────────────────────────────────────

export interface V3BriefingInput {
  topic: string;
  topicLabel: string;
  headline: string;
  executiveBullets: string[];
  whyItMatters?: string;
  keySignals?: string[];
  watchNext?: string[];
  sourceCount: number;
  confidenceScore?: number;
  confidenceClass?: "experimental" | "early_signal" | "developing" | "confirmed" | "established";
  timestamp?: string;
  density?: V3DensityMode;
}

export function formatV3Briefing(input: V3BriefingInput): V3FormattedDelivery {
  const density = input.density ?? "standard";
  const config = DENSITY_CONFIGS[density];
  const time = input.timestamp
    ? new Date(input.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  const sections: V3Section[] = [];

  // 1. Headline signal (always included)
  sections.push({
    type: "headline_signal",
    content: formatHeadlineSignal(input.topic, input.headline, time, config),
    priority: 1,
  });

  // 2. Executive bullets (always included)
  if (input.executiveBullets.length > 0) {
    sections.push({
      type: "executive_bullets",
      content: formatExecutiveBullets(input.executiveBullets, config, density === "ultra_compact" ? 3 : 5),
      priority: 2,
    });
  }

  // 3. Why it matters
  if (config.includeWhyItMatters && input.whyItMatters) {
    const whyFormatted = config.includeBoldEntities
      ? boldEntities(input.whyItMatters)
      : input.whyItMatters;
    sections.push({
      type: "why_it_matters",
      content: `💡 <i>${whyFormatted}</i>`,
      priority: 3,
    });
  }

  // 4. Key signals
  if (input.keySignals && input.keySignals.length > 0 && density !== "ultra_compact") {
    const maxSignals = density === "compact" ? 2 : density === "standard" ? 3 : 5;
    const sigLines = input.keySignals.slice(0, maxSignals).map((s) => {
      const formatted = config.includeBoldEntities ? boldEntities(s) : s;
      return `${config.bulletPrefix} ${formatted}`;
    });
    sections.push({
      type: "key_signals",
      content: sigLines.join("\n"),
      priority: 4,
    });
  }

  // 5. Watch next
  if (config.includeWatchNext && input.watchNext && input.watchNext.length > 0) {
    const watchLines = input.watchNext
      .slice(0, 3)
      .map((w) => `👁 ${w}`)
      .join("\n");
    sections.push({
      type: "watch_next",
      content: `จับตา:\n${watchLines}`,
      priority: 5,
    });
  }

  // 6. Confidence badge
  if (config.includeConfidenceBadge && input.confidenceClass && input.confidenceScore !== undefined) {
    sections.push({
      type: "confidence_badge",
      content: formatConfidenceBadge(input.confidenceClass, input.confidenceScore),
      priority: 6,
    });
  }

  // 7. Footer
  sections.push({
    type: "footer",
    content: formatFooter(input.sourceCount, density),
    priority: 99,
  });

  // Assemble message, respecting maxSections
  const orderedSections = sections
    .sort((a, b) => a.priority - b.priority)
    .slice(0, config.maxSections + 1); // +1 for footer always

  // Ensure footer is included
  const hasFooter = orderedSections.some((s) => s.type === "footer");
  const footerSection = sections.find((s) => s.type === "footer");
  const bodySections = orderedSections.filter((s) => s.type !== "footer");

  const bodyWithSeparators: string[] = [];
  bodySections.forEach((s, i) => {
    bodyWithSeparators.push(s.content);
    if (i < bodySections.length - 1) {
      bodyWithSeparators.push(formatSeparator());
    }
  });
  if (hasFooter && footerSection) {
    bodyWithSeparators.push(formatSeparator());
    bodyWithSeparators.push(footerSection.content);
  }

  const fullText = bodyWithSeparators.join("\n");

  // Split for Telegram 4096-char limit
  const messages = splitForTelegram(fullText);

  const estimatedReadSecs = Math.max(5, Math.round(fullText.length / 50));

  logger.debug(
    { density, sectionCount: bodySections.length, charCount: fullText.length },
    "[DeliveryV3] Briefing formatted"
  );

  return {
    messages,
    config,
    sectionCount: bodySections.length,
    estimatedReadSecs,
    charCount: fullText.length,
  };
}

function splitForTelegram(text: string, maxChars = 4000): string[] {
  if (text.length <= maxChars) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    // Find last separator or newline within limit
    const chunk = remaining.slice(0, maxChars);
    const lastNewline = chunk.lastIndexOf("\n");
    const splitAt = lastNewline > maxChars * 0.7 ? lastNewline : maxChars;
    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining.length > 0) parts.push(remaining);
  return parts;
}

// ── Extract V3 input from existing briefing text ───────────────

export function extractV3InputFromBriefingText(
  rawText: string,
  topic: string,
  topicLabel: string,
  sourceCount = 5
): V3BriefingInput {
  // Extract first line as headline
  const lines = rawText.split("\n").filter((l) => l.trim());
  const headline = lines[0]?.slice(0, 150) ?? "Intelligence Briefing";

  // Extract bullet-like lines as executive bullets
  const bulletLines = lines
    .filter((l) => l.match(/^[-•▸]\s/) || (l.length > 20 && l.length < 200 && !l.includes("http")))
    .slice(1, 7)
    .map((l) => l.replace(/^[-•▸]\s*/, "").trim());

  // Extract "watch" hints (last lines)
  const watchNext = lines.slice(-3).filter((l) => l.length > 20).map((l) => l.trim());

  return {
    topic,
    topicLabel,
    headline,
    executiveBullets: bulletLines.length > 0 ? bulletLines : lines.slice(1, 5),
    whyItMatters: lines[Math.floor(lines.length / 3)]?.trim(),
    keySignals: lines.slice(2, 6).map((l) => l.trim()),
    watchNext,
    sourceCount,
    timestamp: new Date().toISOString(),
  };
}

// ── Preview generation for UI ──────────────────────────────────

export function generateV3Preview(
  input: V3BriefingInput,
  modes: V3DensityMode[] = ["ultra_compact", "compact", "standard"]
): Record<V3DensityMode, V3FormattedDelivery> {
  const result = {} as Record<V3DensityMode, V3FormattedDelivery>;
  for (const mode of modes) {
    result[mode] = formatV3Briefing({ ...input, density: mode });
  }
  return result;
}
