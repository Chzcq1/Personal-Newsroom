// ============================================================
// TREND NORMALIZER
// Sprint 28 — Product Realignment
//
// Converts raw articles from any source into normalized
// TrendEntity objects that the rest of the trend pipeline can
// work with uniformly regardless of origin.
// ============================================================

export interface RawSignal {
  title: string;
  url: string;
  description?: string | null;
  publishedAt?: string | null;
  source: string;
  platform: "reddit" | "youtube" | "google-news" | "github" | "twitter" | "rss" | "google-trends" | "tiktok";
  engagementScore?: number;   // upvotes, views, likes — platform-native
  commentCount?: number;
  shareCount?: number;
  tags?: string[];
}

export interface TrendEntity {
  id: string;                  // deterministic hash of url
  title: string;
  url: string;
  description: string;
  publishedAt: Date | null;
  source: string;
  platform: RawSignal["platform"];
  normalizedScore: number;     // 0-100, platform-normalized
  rawEngagement: number;       // raw engagement count
  tags: string[];
  extractedAt: Date;
}

// ── Platform engagement normalizers ──────────────────────────
// Each platform has wildly different engagement scales.
// These bring them to a comparable 0-100 range.

const PLATFORM_SCALE: Record<RawSignal["platform"], number> = {
  youtube:       10_000_000,
  reddit:        100_000,
  twitter:       1_000_000,
  "google-trends": 100,      // trend score is already 0-100
  tiktok:        50_000_000,
  "google-news": 1_000,
  github:        10_000,
  rss:           1_000,
};

function normalizeEngagement(
  platform: RawSignal["platform"],
  rawScore: number,
): number {
  const scale = PLATFORM_SCALE[platform] ?? 1_000;
  return Math.min(100, Math.round((rawScore / scale) * 100));
}

function deriveId(url: string): string {
  // Simple deterministic ID from URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `trend_${Math.abs(hash).toString(36)}`;
}

// ── Main normalizer ───────────────────────────────────────────

export function normalizeSignal(raw: RawSignal): TrendEntity {
  const rawEngagement = raw.engagementScore ?? 0;

  return {
    id: deriveId(raw.url),
    title: raw.title.trim(),
    url: raw.url,
    description: raw.description?.trim() ?? "",
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : null,
    source: raw.source,
    platform: raw.platform,
    normalizedScore: normalizeEngagement(raw.platform, rawEngagement),
    rawEngagement,
    tags: raw.tags ?? [],
    extractedAt: new Date(),
  };
}

export function normalizeSignals(raws: RawSignal[]): TrendEntity[] {
  return raws.map(normalizeSignal);
}

// ── Deduplication ─────────────────────────────────────────────
// Merges signals about the same story from different platforms.
// Uses URL as primary key, title similarity as fallback.

export function deduplicateSignals(entities: TrendEntity[]): TrendEntity[] {
  const byUrl = new Map<string, TrendEntity>();

  for (const entity of entities) {
    const existing = byUrl.get(entity.url);
    if (!existing) {
      byUrl.set(entity.url, entity);
      continue;
    }
    // Keep higher score, merge tags
    if (entity.normalizedScore > existing.normalizedScore) {
      byUrl.set(entity.url, {
        ...entity,
        tags: [...new Set([...existing.tags, ...entity.tags])],
      });
    } else {
      byUrl.set(entity.url, {
        ...existing,
        tags: [...new Set([...existing.tags, ...entity.tags])],
      });
    }
  }

  return Array.from(byUrl.values());
}
