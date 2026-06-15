// ============================================================
// BRIEFING FORMATTER
//
// Converts raw AI briefing text into Telegram-ready HTML messages.
// Handles Telegram's 4096 character message limit by splitting
// at paragraph boundaries without truncating sentences.
//
// Telegram HTML mode supports: <b>, <i>, <u>, <s>, <code>, <a>
// All special HTML chars in content must be escaped.
// ============================================================

const MAX_TELEGRAM_MSG_LEN = 4096;

// Section headers used in standard, morning, and evening briefings
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Convert raw AI output into Telegram HTML-formatted text.
 * Section headers become bold lines; content is escaped.
 */
function applyTelegramFormatting(rawText: string, header: string, subtitle: string): string {
  const lines = rawText.split("\n");
  const out: string[] = [];

  // Pinned header
  out.push(`<b>${escapeHtml(header)}</b>`);
  out.push(`<i>${escapeHtml(subtitle)}</i>`);
  out.push("");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    if (SECTION_HEADERS.includes(trimmed)) {
      out.push(`<b>${escapeHtml(trimmed)}</b>`);
    } else {
      out.push(escapeHtml(trimmed));
    }
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Split a long message into chunks ≤ 4096 chars.
 * Tries to split at double-newline paragraph breaks first,
 * then at single newlines if no paragraph boundary exists.
 */
function splitMessages(text: string): string[] {
  if (text.length <= MAX_TELEGRAM_MSG_LEN) return [text];

  const messages: string[] = [];
  let remaining = text;

  while (remaining.length > MAX_TELEGRAM_MSG_LEN) {
    // Find the last double-newline within the limit
    let splitAt = remaining.lastIndexOf("\n\n", MAX_TELEGRAM_MSG_LEN);
    if (splitAt <= 0) {
      // Fall back to last single newline
      splitAt = remaining.lastIndexOf("\n", MAX_TELEGRAM_MSG_LEN);
    }
    if (splitAt <= 0) {
      // No newline found — hard split (rare edge case for Thai)
      splitAt = MAX_TELEGRAM_MSG_LEN;
    }
    messages.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) messages.push(remaining);
  return messages;
}

// ── Public formatters ────────────────────────────────────────

/**
 * Format a standard topic briefing for Telegram delivery.
 */
export function formatBriefingForTelegram(
  rawBriefing: string,
  topicLabel: string,
  topicLabelTh: string,
  generatedAt: string,
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const header = `📰 Intelligence Briefing — ${topicLabel}`;
  const subtitle = `${topicLabelTh} · ${date}`;
  const formatted = applyTelegramFormatting(rawBriefing, header, subtitle);
  return splitMessages(formatted);
}

/**
 * Format a morning intelligence briefing for Telegram delivery.
 */
export function formatMorningBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const header = `🌅 Morning Intelligence Briefing`;
  const subtitle = `${date} · 07:00`;
  const formatted = applyTelegramFormatting(rawBriefing, header, subtitle);
  return splitMessages(formatted);
}

/**
 * Format an evening intelligence recap for Telegram delivery.
 */
export function formatEveningBriefingForTelegram(
  rawBriefing: string,
  generatedAt: string,
): string[] {
  const date = new Date(generatedAt).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const header = `🌆 Evening Intelligence Recap`;
  const subtitle = `${date} · 18:00`;
  const formatted = applyTelegramFormatting(rawBriefing, header, subtitle);
  return splitMessages(formatted);
}
