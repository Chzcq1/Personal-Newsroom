// ============================================================
// STORY EVOLUTION ENGINE — Sprint 8 Task C
//
// Tracks ongoing narratives across days so the feed feels
// like a continuous intelligence stream rather than disconnected articles.
//
// Builds on trendMemory (Sprint 5) with a richer story-tracking model:
//   - Each "story" is a named narrative (entity + theme)
//   - Stories accumulate mentions across briefings
//   - Context strings are formatted for AI injection:
//     "Yesterday Nvidia announced... Today markets reacted..."
//
// Storage: in-memory, keyed by story slug.
// Stories expire after 72 hours (3 days).
//
// Architecture:
//   recordStoryMentions(articles, briefingType) — call after collect
//   getStoryContext(topicId)                    — call before AI prompt
//   formatStoryContextForAI(topicId)            — formatted for prompt
// ============================================================

import { logger } from "../../lib/logger.js";
import type { RssArticle } from "../news/rssService.js";

const STORY_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// ── Story entities ───────────────────────────────────────────

// Key named entities to track as ongoing story threads
const TRACKED_ENTITIES = [
  "nvidia", "openai", "anthropic", "google", "microsoft", "meta", "apple",
  "tesla", "bitcoin", "ethereum", "federal reserve", "fed", "imf",
  "china", "ukraine", "russia", "israel", "hamas", "nato",
  "nvidia", "arm", "qualcomm", "tsmc", "intel", "amd",
  "chatgpt", "claude", "gemini", "llama", "gpt",
  "s&p", "nasdaq", "dow", "oil", "gold",
];

// ── Types ────────────────────────────────────────────────────

export interface StoryEntry {
  slug: string;
  entity: string;
  topicId: string;
  mentions: Array<{
    headline: string;
    briefingType: "morning" | "evening" | "topic";
    recordedAt: Date;
    source?: string;
  }>;
  firstSeen: Date;
  lastSeen: Date;
  expiresAt: Date;
}

// ── Store ────────────────────────────────────────────────────

const storyStore = new Map<string, StoryEntry>();

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of storyStore.entries()) {
    if (entry.expiresAt.getTime() < now) {
      storyStore.delete(key);
    }
  }
}

function makeSlug(entity: string, topicId: string): string {
  return `${entity.toLowerCase().replace(/\s+/g, "-")}_${topicId}`;
}

// ── Entity extraction ────────────────────────────────────────

function extractEntities(article: RssArticle): string[] {
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  return TRACKED_ENTITIES.filter((entity) => text.includes(entity));
}

// ── Public API ───────────────────────────────────────────────

/**
 * Record story mentions from a set of articles for a given topic.
 * Call this after collecting articles, before or after AI generation.
 */
export function recordStoryMentions(
  articles: RssArticle[],
  topicId: string,
  briefingType: "morning" | "evening" | "topic" = "topic",
): void {
  evictExpired();
  const now = new Date();
  const expire = new Date(now.getTime() + STORY_TTL_MS);

  let recorded = 0;
  for (const article of articles) {
    const entities = extractEntities(article);
    for (const entity of entities) {
      const slug = makeSlug(entity, topicId);
      const existing = storyStore.get(slug);

      const mention = {
        headline: article.title,
        briefingType,
        recordedAt: now,
        source: article.source ?? undefined,
      };

      if (existing) {
        // Avoid duplicate headlines
        const isDupe = existing.mentions.some(
          (m) => m.headline === article.title,
        );
        if (!isDupe) {
          existing.mentions.push(mention);
          existing.lastSeen = now;
          existing.expiresAt = expire;
          // Keep at most 10 mentions per story
          if (existing.mentions.length > 10) {
            existing.mentions.shift();
          }
        }
      } else {
        storyStore.set(slug, {
          slug,
          entity,
          topicId,
          mentions: [mention],
          firstSeen: now,
          lastSeen: now,
          expiresAt: expire,
        });
        recorded++;
      }
    }
  }

  if (recorded > 0) {
    logger.debug({ topicId, newStories: recorded }, "Story evolution: recorded new stories");
  }
}

/**
 * Get active stories for a topic, sorted by recency.
 */
export function getActiveStories(topicId: string): StoryEntry[] {
  evictExpired();
  return Array.from(storyStore.values())
    .filter((s) => s.topicId === topicId && s.mentions.length >= 1)
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
}

/**
 * Format story evolution context for AI prompt injection.
 * Returns a block describing ongoing narratives.
 */
export function formatStoryContextForAI(topicId: string): string {
  const stories = getActiveStories(topicId)
    .filter((s) => s.mentions.length >= 2) // only multi-mention stories
    .slice(0, 5);

  if (stories.length === 0) return "";

  const lines = ["--- เรื่องราวต่อเนื่อง (Story Evolution) ---"];

  for (const story of stories) {
    const entity = story.entity;
    const mentions = story.mentions.slice(-3); // last 3 mentions
    const hoursAgo = Math.round(
      (Date.now() - story.firstSeen.getTime()) / 3_600_000,
    );
    const timeLabel =
      hoursAgo <= 1
        ? "ชั่วโมงที่ผ่านมา"
        : hoursAgo <= 24
        ? `${hoursAgo} ชั่วโมงที่ผ่านมา`
        : `${Math.round(hoursAgo / 24)} วันที่ผ่านมา`;

    lines.push(`\n[${entity.toUpperCase()}] — พบ ${story.mentions.length} ครั้งใน ${timeLabel}:`);
    for (const m of mentions) {
      const when = m.briefingType === "morning" ? "เช้านี้" : m.briefingType === "evening" ? "เมื่อเย็น" : "";
      lines.push(`  ${when ? `(${when}) ` : ""}${m.headline}`);
    }
  }

  lines.push("--- สิ้นสุดบริบทต่อเนื่อง ---");
  return lines.join("\n");
}

/**
 * Get all active stories across all topics (for admin/metrics).
 */
export function getAllActiveStories(): Array<{
  slug: string;
  entity: string;
  topicId: string;
  mentionCount: number;
  firstSeen: string;
  lastSeen: string;
}> {
  evictExpired();
  return Array.from(storyStore.values()).map((s) => ({
    slug: s.slug,
    entity: s.entity,
    topicId: s.topicId,
    mentionCount: s.mentions.length,
    firstSeen: s.firstSeen.toISOString(),
    lastSeen: s.lastSeen.toISOString(),
  }));
}
