// ============================================================
// BRIEFING FORMATTER — Sprint 12 Task B
//
// Converts raw AI briefing text into professional Telegram-ready
// HTML messages. Clean, compact, mobile-readable.
//
// Telegram HTML: <b>, <i>, <u>, <s>, <code>, <a>
//
// Sprint 12 improvements:
//   - Clean dividers between sections (no ASCII noise)
//   - Compact hierarchy with clear visual weight
//   - Narrative grouping support
//   - Signal badges inline
//   - Reading time calibrated for Thai text
//   - Mobile-first spacing
//   - 4 briefing type formatters (morning/evening/executive/intelligence)
// ============================================================

const MAX_TELEGRAM_MSG_LEN = 4096;

// ── Section header detection ──────────────────────────────────

const SECTION_HEADERS = [
  "HEADLINE",
  "MORNING BRIEFING",
  "EXECUTIVE SUMMARY",
  "KEY DEVELOPMENTS",
  "TOP DEVELOPMENTS",
  "IMPACT ANALYSIS",
  "WHAT TO WATCH NEXT",
  "WHAT TO WATCH TODAY",
  "EVENING RECAP",
  "WHAT HAPPENED TODAY",
  "WHAT CHANGED",
  "WHAT MATTERS TOMORROW",
  "สรุปสำคัญ",
  "พัฒนาการสำคัญ",
  "ผลกระทบ",
  "สิ่งที่ต้องจับตา",
  "บทสรุป",
];

const SECTION_MARKER: Record<string, string> = {
  "HEADLINE": "◆",
  "MORNING BRIEFING": "◆",
  "EVENING RECAP": "◆",
  "EXECUTIVE SUMMARY": "▸",
  "KEY DEVELOPMENTS": "▸",
  "TOP DEVELOPMENTS": "▸",
  "IMPACT ANALYSIS": "▸",
  "WHAT TO WATCH NEXT": "◎",
  "WHAT TO WATCH TODAY": "◎",
  "WHAT HAPPENED TODAY": "▸",
  "WHAT CHANGED": "▸",
  "WHAT MATTERS TOMORROW": "◎",
  "สรุปสำคัญ": "◆",
  "พัฒนาการสำคัญ": "▸",
  "ผลกระทบ": "▸",
  "สิ่งที่ต้องจับตา": "◎",
  "บทสรุป": "◆",
};

// ── Utilities ─────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Reading time calibrated for Thai mixed-language text.
 * ~440 characters/minute accounts for English proper nouns embedded in Thai.
 */
function estimateReadingTime(text: string): string {
  const charCount = text.replace(/\s+/g, "").length;
  const minutes = Math.max(1, Math.round(charCount / 440));
  return `${minutes} นาที`;
}

// ── Core formatter ────────────────────────────────────────────

export interface BriefingFormatOptions {
  sourceCount?: number;
  signalBadge?: string;
  narrativeCount?: number;
  momentum?: string;
}

function applyTelegramFormatting(
  rawText: string,
  header: string,
  subtitle: string,
  options: BriefingFormatOptions = {},
): string {
  const { sourceCount, signalBadge, narrativeCount, momentum } = options;
  const readingTime = estimateReadingTime(rawText);
  const lines = rawText.split("\n");
  const out: string[] = [];

  // Header block — clean, no emoji
  out.push(`<b>${escapeHtml(header)}</b>`);
  out.push(`<i>${escapeHtml(subtitle)}</i>`);

  // Meta line
  const metaParts: string[] = [readingTime];
  if (sourceCount && sourceCount > 0) {
    metaParts.push(`${sourceCount} แหล่ง`);
  }
  if (narrativeCount && narrativeCount > 1) {
    metaParts.push(`${narrativeCount} เรื่อง`);
  }
  if (signalBadge) {
    metaParts.push(signalBadge);
  }
  out.push(`<i>${metaParts.join("  ·  ")}</i>`);
  out.push("");

  // Content — section-aware formatting
  let inSection = false;
  let prevWasEmpty = true;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      if (!prevWasEmpty) {
        out.push("");
        prevWasEmpty = true;
      }
      continue;
    }

    prevWasEmpty = false;

    if (SECTION_HEADERS.includes(trimmed)) {
      const marker = SECTION_MARKER[trimmed] ?? "▸";
      if (inSection) {
        out.push("");
        out.push(`<i>────────────────</i>`);
      }
      out.push(`\n<b>${marker} ${escapeHtml(trimmed)}</b>`);
      inSection = true;
    } else {
      out.push(escapeHtml(trimmed));
    }
  }

  // Footer
  const timestamp = new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  out.push("");

  if (momentum) {
    out.push(`<i>● ${escapeHtml(momentum)}</i>`);
  }

  out.push(`<i>─── INFOX · ${timestamp} ICT ───</i>`);

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
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  const formatted = applyTelegramFormatting(
    rawBriefing,
    `Intelligence Briefing — ${topicLabel}`,
    `${topicLabelTh} · ${date}`,
    { sourceCount },
  );
  return splitMessages(formatted);
}

export function formatMorningBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  sourceCount?: number,
  options: BriefingFormatOptions = {},
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const formatted = applyTelegramFormatting(
    rawBriefing,
    `Morning Intelligence Briefing`,
    date,
    { sourceCount, ...options },
  );
  return splitMessages(formatted);
}

export function formatEveningBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  sourceCount?: number,
  options: BriefingFormatOptions = {},
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const formatted = applyTelegramFormatting(
    rawBriefing,
    `Evening Intelligence Recap`,
    date,
    { sourceCount, ...options },
  );
  return splitMessages(formatted);
}

export function formatExecutiveBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  sourceCount?: number,
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const formatted = applyTelegramFormatting(
    rawBriefing,
    `Executive Briefing`,
    `สรุปผู้บริหาร · ${date}`,
    { sourceCount, signalBadge: "EXECUTIVE" },
  );
  return splitMessages(formatted);
}

export function formatIntelligenceBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  topicLabel: string,
  sourceCount?: number,
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  const formatted = applyTelegramFormatting(
    rawBriefing,
    `Intelligence Briefing — ${topicLabel}`,
    date,
    { sourceCount, signalBadge: "INTELLIGENCE" },
  );
  return splitMessages(formatted);
}
