// ============================================================
// BRIEFING FORMATTER — Sprint 6 Task B
//
// Converts raw AI briefing text into professional Telegram-ready
// HTML messages. Clean, compact, mobile-readable.
//
// Telegram HTML mode supports: <b>, <i>, <u>, <s>, <code>, <a>
// All special HTML chars in content must be escaped.
//
// Improvements in Sprint 6:
//   - Professional section headers with visual indicators
//   - Reading time estimate
//   - Source count in header
//   - Cleaner spacing for mobile
//   - Divider footer with timestamp
// ============================================================

const MAX_TELEGRAM_MSG_LEN = 4096;

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
];

const SECTION_ICONS: Record<string, string> = {
  "HEADLINE": "◆",
  "MORNING BRIEFING": "◆",
  "EVENING RECAP": "◆",
  "EXECUTIVE SUMMARY": "▸",
  "KEY DEVELOPMENTS": "▸",
  "TOP DEVELOPMENTS": "▸",
  "IMPACT ANALYSIS": "▸",
  "WHAT TO WATCH NEXT": "▸",
  "WHAT TO WATCH TODAY": "▸",
  "WHAT HAPPENED TODAY": "▸",
  "WHAT CHANGED": "▸",
  "WHAT MATTERS TOMORROW": "▸",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Estimate reading time in minutes for Thai text.
 * Thai reading speed ≈ 400 chars/min (200 words × ~2 chars/word avg).
 */
function estimateReadingTime(text: string): string {
  const charCount = text.replace(/\s+/g, "").length;
  const minutes = Math.max(1, Math.round(charCount / 400));
  return `${minutes} min`;
}

/**
 * Convert raw AI output into Telegram HTML-formatted text.
 * Section headers become bold with visual indicators.
 */
function applyTelegramFormatting(
  rawText: string,
  header: string,
  subtitle: string,
  sourceCount?: number,
): string {
  const readingTime = estimateReadingTime(rawText);
  const lines = rawText.split("\n");
  const out: string[] = [];

  out.push(`<b>${escapeHtml(header)}</b>`);
  out.push(`<i>${escapeHtml(subtitle)}</i>`);

  const metaParts: string[] = [`⏱ ${readingTime} read`];
  if (sourceCount && sourceCount > 0) {
    metaParts.push(`${sourceCount} sources`);
  }
  out.push(`<i>${metaParts.join("  ·  ")}</i>`);
  out.push("");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    if (SECTION_HEADERS.includes(trimmed)) {
      const icon = SECTION_ICONS[trimmed] ?? "▸";
      out.push(`\n<b>${icon} ${escapeHtml(trimmed)}</b>`);
    } else {
      out.push(escapeHtml(trimmed));
    }
  }

  const timestamp = new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  out.push(`\n<i>─── สร้างเมื่อ ${timestamp} ICT ───</i>`);

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Split a long message into chunks ≤ 4096 chars.
 * Tries to split at double-newline paragraph breaks first,
 * then at single newlines, ensuring no chunk exceeds the limit.
 */
function splitMessages(text: string): string[] {
  if (text.length <= MAX_TELEGRAM_MSG_LEN) return [text];

  const messages: string[] = [];
  let remaining = text;
  let chunkNum = 2;

  while (remaining.length > MAX_TELEGRAM_MSG_LEN) {
    let splitAt = remaining.lastIndexOf("\n\n", MAX_TELEGRAM_MSG_LEN - 20);
    if (splitAt <= 0) {
      splitAt = remaining.lastIndexOf("\n", MAX_TELEGRAM_MSG_LEN - 20);
    }
    if (splitAt <= 0) {
      splitAt = MAX_TELEGRAM_MSG_LEN - 20;
    }
    messages.push(remaining.slice(0, splitAt).trim());
    remaining = `<i>(ต่อ ${chunkNum})</i>\n\n` + remaining.slice(splitAt).trim();
    chunkNum++;
  }

  if (remaining) messages.push(remaining);
  return messages;
}

// ── Public formatters ────────────────────────────────────────

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
  const header = `📰 Intelligence Briefing — ${topicLabel}`;
  const subtitle = `${topicLabelTh} · ${date}`;
  const formatted = applyTelegramFormatting(rawBriefing, header, subtitle, sourceCount);
  return splitMessages(formatted);
}

export function formatMorningBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  sourceCount?: number,
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const header = `🌅 Morning Intelligence Briefing`;
  const subtitle = `${date}`;
  const formatted = applyTelegramFormatting(rawBriefing, header, subtitle, sourceCount);
  return splitMessages(formatted);
}

export function formatEveningBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
  sourceCount?: number,
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const header = `🌆 Evening Intelligence Recap`;
  const subtitle = `${date}`;
  const formatted = applyTelegramFormatting(rawBriefing, header, subtitle, sourceCount);
  return splitMessages(formatted);
}
