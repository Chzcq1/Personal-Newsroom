// ============================================================
// BRIEFING FORMATTER — Sprint 13 Task A (Visual Digest V1)
//
// Converts raw AI briefing text into professional Telegram-ready
// HTML messages. Clean, compact, mobile-readable.
//
// Telegram HTML: <b>, <i>, <u>, <s>, <code>, <a>
//
// Sprint 13 improvements (Task A):
//   - Entity bolding: company/org names auto-bolded
//   - Number highlighting: figures bolded for fast scan
//   - Headline blocks: full-width visual weight
//   - Narrative separators: clean dividers between stories
//   - Key insight bullets: ◈ prefix for impact statements
//   - Momentum labels: ▲ Rising / ▼ Declining / → Stable
//   - Mobile-first spacing and hierarchy
//   - Readability engine integration
// ============================================================

import { optimizeForReadability } from "../deliveryinfra/readabilityEngine.js";

const MAX_TELEGRAM_MSG_LEN = 4096;

// ── Known entities to bold ────────────────────────────────────

const BOLD_ENTITIES = [
  "OpenAI","Anthropic","Google","Microsoft","Apple","Meta","Amazon","Nvidia","Tesla",
  "Samsung","Intel","AMD","Qualcomm","TSMC","Alibaba","Tencent","ByteDance","TikTok",
  "Huawei","IBM","Oracle","Salesforce","Palantir","Cloudflare","Stripe","Coinbase",
  "SpaceX","DeepMind","GPT-4","GPT-4o","Claude","Copilot","Grok","Midjourney",
  "Fed","Federal Reserve","ECB","IMF","World Bank","SEC",
  "Goldman Sachs","JPMorgan","Morgan Stanley","BlackRock",
  "Sam Altman","Elon Musk","Jensen Huang","Sundar Pichai","Satya Nadella",
  "Mark Zuckerberg","Tim Cook",
];

const ENTITY_RE = new RegExp(
  `\\b(${BOLD_ENTITIES.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "g",
);

// ── Section header detection ──────────────────────────────────

const SECTION_HEADERS = new Set([
  "HEADLINE","MORNING BRIEFING","EXECUTIVE SUMMARY","KEY DEVELOPMENTS",
  "TOP DEVELOPMENTS","IMPACT ANALYSIS","WHAT TO WATCH NEXT",
  "WHAT TO WATCH TODAY","EVENING RECAP","WHAT HAPPENED TODAY",
  "WHAT CHANGED","WHAT MATTERS TOMORROW","EXECUTIVE BRIEFING",
  "WATCH","KEY SIGNALS","OPPORTUNITY","RISK","WHO IS AFFECTED",
  "WHAT HAPPENS NEXT","WHY IT MATTERS",
  "สรุปสำคัญ","พัฒนาการสำคัญ","ผลกระทบ","สิ่งที่ต้องจับตา","บทสรุป",
]);

const SECTION_MARKERS: Record<string, string> = {
  "HEADLINE": "◆", "MORNING BRIEFING": "◆", "EVENING RECAP": "◆",
  "EXECUTIVE BRIEFING": "◆", "EXECUTIVE SUMMARY": "▸",
  "KEY DEVELOPMENTS": "▸", "TOP DEVELOPMENTS": "▸",
  "IMPACT ANALYSIS": "▸", "WHAT HAPPENED TODAY": "▸", "WHAT CHANGED": "▸",
  "KEY SIGNALS": "◎", "WHAT TO WATCH NEXT": "◎",
  "WHAT TO WATCH TODAY": "◎", "WHAT MATTERS TOMORROW": "◎", "WATCH": "◎",
  "OPPORTUNITY": "▲", "RISK": "▼",
  "WHO IS AFFECTED": "◈", "WHAT HAPPENS NEXT": "◈", "WHY IT MATTERS": "◈",
  "สรุปสำคัญ": "◆", "พัฒนาการสำคัญ": "▸", "ผลกระทบ": "▸",
  "สิ่งที่ต้องจับตา": "◎", "บทสรุป": "◆",
};

// ── Utilities ─────────────────────────────────────────────────

function escapeHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function boldEntities(text: string): string {
  // Numbers with units first
  const withNums = text.replace(
    /(\$|¥|£|€|฿)?(\d[\d,]*\.?\d*)(\s?(?:B|M|T|bn|mn|trillion|billion|million|%|บาท|ล้าน|พัน|แสน))?(?=[\s,.)!?]|$)/g,
    (m) => m.trim().length > 1 ? `<b>${m}</b>` : m,
  );
  return withNums.replace(ENTITY_RE, "<b>$1</b>");
}

function estimateReadingTime(text: string): string {
  const chars = text.replace(/\s+/g, "").length;
  const minutes = Math.max(1, Math.round(chars / 440));
  return `${minutes} นาที`;
}

function isNumberedItem(line: string): boolean {
  return /^\d+\.\s/.test(line.trim());
}

function formatNumberedItem(line: string): string {
  const m = line.trim().match(/^(\d+)\.\s+(.+)/);
  if (!m) return escapeHtml(line.trim());
  return `<b>${m[1]}.</b> ${boldEntities(escapeHtml(m[2]))}`;
}

// ── Core formatter ────────────────────────────────────────────

export interface BriefingFormatOptions {
  sourceCount?: number;
  signalBadge?: string;
  narrativeCount?: number;
  momentum?: string;
  topTierSources?: string[];
}

function applyTelegramFormatting(
  rawText: string,
  header: string,
  subtitle: string,
  options: BriefingFormatOptions = {},
): string {
  const { sourceCount, signalBadge, narrativeCount, momentum, topTierSources } = options;

  const optimized = optimizeForReadability(rawText);
  const readingTime = estimateReadingTime(optimized);

  const lines = optimized.split("\n");
  const out: string[] = [];

  // Header
  out.push(`<b>${escapeHtml(header)}</b>`);
  out.push(`<i>${escapeHtml(subtitle)}</i>`);

  // Meta line
  const meta: string[] = [`⏱ ${readingTime}`];
  if (sourceCount && sourceCount > 0) meta.push(`${sourceCount} แหล่ง`);
  if (narrativeCount && narrativeCount > 1) meta.push(`${narrativeCount} เรื่อง`);
  if (signalBadge) meta.push(`[${signalBadge}]`);
  out.push(`<i>${meta.join("  ·  ")}</i>`);

  if (topTierSources?.length) {
    out.push(`<i>via ${topTierSources.slice(0, 3).join(", ")}</i>`);
  }

  out.push("");
  out.push(`<i>─────────────────────────</i>`);
  out.push("");

  let inSection = false;
  let prevWasEmpty = true;
  let sectionLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      if (!prevWasEmpty) { out.push(""); prevWasEmpty = true; sectionLines = 0; }
      continue;
    }
    prevWasEmpty = false;

    if (SECTION_HEADERS.has(trimmed)) {
      const marker = SECTION_MARKERS[trimmed] ?? "▸";
      if (inSection) { out.push(""); out.push(`<i>── ── ──</i>`); out.push(""); }
      out.push(`<b>${marker}  ${escapeHtml(trimmed)}</b>`);
      inSection = true;
      sectionLines = 0;
    } else if (isNumberedItem(trimmed)) {
      out.push(formatNumberedItem(trimmed));
      sectionLines++;
    } else {
      out.push(boldEntities(escapeHtml(trimmed)));
      sectionLines++;
      if (sectionLines === 3 && i + 1 < lines.length && lines[i + 1].trim()) {
        out.push("");
        sectionLines = 0;
      }
    }
  }

  out.push("");
  out.push(`<i>─────────────────────────</i>`);

  if (momentum) {
    const icon = /accelerat|ris|grow/i.test(momentum) ? "▲" :
                 /declin|fall|drop/i.test(momentum) ? "▼" : "→";
    out.push(`<i>${icon} ${escapeHtml(momentum)}</i>`);
  }

  const ts = new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  });
  out.push(`<i>INFOX Intelligence · ${ts} ICT</i>`);

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

// ── Public formatters ─────────────────────────────────────────

export function formatBriefingForTelegram(
  rawBriefing: string,
  topicLabel: string,
  topicLabelTh: string,
  generatedAt: string,
  sourceCount?: number,
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  });
  return splitMessages(applyTelegramFormatting(
    rawBriefing,
    `Intelligence Briefing — ${topicLabel}`,
    `${topicLabelTh} · ${date}`,
    { sourceCount },
  ));
}

export function formatMorningBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  sourceCount?: number,
  options: BriefingFormatOptions = {},
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok",
  });
  return splitMessages(applyTelegramFormatting(
    rawBriefing, `Morning Intelligence Briefing`, date,
    { sourceCount, signalBadge: "MORNING", ...options },
  ));
}

export function formatEveningBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  sourceCount?: number,
  options: BriefingFormatOptions = {},
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok",
  });
  return splitMessages(applyTelegramFormatting(
    rawBriefing, `Evening Intelligence Recap`, date,
    { sourceCount, signalBadge: "EVENING", ...options },
  ));
}

export function formatExecutiveBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  sourceCount?: number,
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok",
  });
  return splitMessages(applyTelegramFormatting(
    rawBriefing, `Executive Briefing`, `สรุปผู้บริหาร · ${date}`,
    { sourceCount, signalBadge: "EXECUTIVE" },
  ));
}

export function formatIntelligenceBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  topicLabel: string,
  sourceCount?: number,
  options: BriefingFormatOptions = {},
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  });
  return splitMessages(applyTelegramFormatting(
    rawBriefing, `Intelligence Briefing — ${topicLabel}`, date,
    { sourceCount, signalBadge: "INTELLIGENCE", ...options },
  ));
}
