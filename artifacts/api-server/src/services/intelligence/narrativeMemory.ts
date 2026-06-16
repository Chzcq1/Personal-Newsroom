// ============================================================
// NARRATIVE MEMORY SYSTEM — Sprint 10 Task C
//
// Persists narrative tracking across sessions.
// Upgrades Sprint 9's session-level clustering to multi-day memory.
//
// Tracked per narrative thread:
//   - recurring headline patterns
//   - trend acceleration (velocity of coverage)
//   - narrative lifespan (first sighting → last sighting)
//   - sentiment direction (positive / negative / mixed)
//   - related entities (entity graph for narrative)
//   - narrative maturity (emerging / active / declining / resolved)
//
// Architecture:
//   in-memory Map with 14-day TTL per narrative
//   Interface-compatible with PostgreSQL (see longTermMemory.ts)
//
// Public API:
//   recordNarrativeCluster(cluster)  — ingest a cluster observation
//   getActiveNarratives(n)           — top N active narratives
//   getNarrativeById(id)             — get specific narrative thread
//   getNarrativeTimeline(id)         — ordered developments
//   getPersistentNarratives()        — all narratives (for debug)
// ============================================================

import { logger } from "../../lib/logger.js";
import type { NarrativeCluster } from "./narrativeCluster.js";
import { extractEntities } from "./entityExtractor.js";

export type NarrativeMaturity = "emerging" | "active" | "peaking" | "declining" | "resolved";
export type SentimentDirection = "positive" | "negative" | "mixed" | "neutral";

export interface NarrativeDevelopment {
  headline: string;
  sources: string[];
  recordedAt: string;
  articleCount: number;
  avgSignalScore: number;
  dominantEntity: string | null;
}

export interface NarrativeThread {
  id: string;                        // stable ID across days
  canonicalHeadline: string;         // best representative headline
  theme: string;                     // 2-3 word theme
  dominantEntity: string | null;
  relatedEntities: string[];         // entities mentioned alongside
  developments: NarrativeDevelopment[];
  totalMentions: number;
  mentionsLast24h: number;
  mentionsLast7d: number;
  avgScore: number;
  peakScore: number;
  maturity: NarrativeMaturity;
  sentimentDirection: SentimentDirection;
  trendAcceleration: number;         // mentions/day rate change (+/-)
  firstSeen: string;
  lastSeen: string;
  expiresAt: string;
  // Lifecycle milestones
  milestones: Array<{
    label: string;
    recordedAt: string;
    significance: "low" | "medium" | "high";
  }>;
}

// ── Configuration ──────────────────────────────────────────────

const NARRATIVE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MAX_DEVELOPMENTS_PER_NARRATIVE = 20;
const MAX_NARRATIVES = 150;
const SIMILARITY_THRESHOLD = 0.3;    // for grouping cluster → narrative
const MAX_RELATED_ENTITIES = 8;

// ── State ──────────────────────────────────────────────────────

const narrativeStore = new Map<string, NarrativeThread>();
const mentionTimestamps = new Map<string, number[]>(); // narrativeId → timestamps

// ── Helpers ───────────────────────────────────────────────────

function evictExpired(): void {
  const now = Date.now();
  for (const [id, thread] of narrativeStore) {
    if (new Date(thread.expiresAt).getTime() < now) {
      narrativeStore.delete(id);
      mentionTimestamps.delete(id);
    }
  }
}

function tokenise(text: string): Set<string> {
  const STOP = new Set([
    "the", "and", "for", "that", "with", "this", "from", "are", "have",
    "will", "been", "were", "they", "their", "about", "what", "says",
    "said", "amid", "over", "into", "more", "than", "its", "after",
    "before", "could", "would", "should", "year", "week", "just", "also",
  ]);
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = [...a].filter((w) => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function detectSentiment(headlines: string[]): SentimentDirection {
  const text = headlines.join(" ").toLowerCase();
  const positiveWords = ["surges", "gains", "rises", "breakthrough", "growth",
    "rally", "record", "approval", "launches", "expands", "beats", "profit"];
  const negativeWords = ["falls", "drops", "crisis", "concern", "risk", "ban",
    "crash", "decline", "warning", "loss", "fails", "reject", "cut"];

  const posCount = positiveWords.filter((w) => text.includes(w)).length;
  const negCount = negativeWords.filter((w) => text.includes(w)).length;

  if (posCount > negCount + 1) return "positive";
  if (negCount > posCount + 1) return "negative";
  if (posCount > 0 && negCount > 0) return "mixed";
  return "neutral";
}

function calculateMaturity(
  thread: NarrativeThread,
  mentionTimestamps: number[],
): NarrativeMaturity {
  const now = Date.now();
  const ageHours = (now - new Date(thread.firstSeen).getTime()) / 3_600_000;
  const last24h = mentionTimestamps.filter((t) => t >= now - 86_400_000).length;
  const prev24h = mentionTimestamps.filter(
    (t) => t >= now - 172_800_000 && t < now - 86_400_000,
  ).length;

  if (ageHours < 6) return "emerging";
  if (last24h === 0) return "resolved";
  if (last24h > prev24h * 1.5) return "peaking";
  if (last24h < prev24h * 0.5 && ageHours > 48) return "declining";
  return "active";
}

function calculateAcceleration(timestamps: number[]): number {
  const now = Date.now();
  const last24h = timestamps.filter((t) => t >= now - 86_400_000).length;
  const prev24h = timestamps.filter(
    (t) => t >= now - 172_800_000 && t < now - 86_400_000,
  ).length;
  if (prev24h === 0) return last24h > 0 ? 1.0 : 0;
  return (last24h - prev24h) / prev24h;
}

function generateNarrativeId(cluster: NarrativeCluster): string {
  // Stable ID based on theme words (so same narrative across days = same ID)
  const theme = cluster.theme.replace(/\s+/g, "-").toLowerCase().slice(0, 30);
  const entity = (cluster.dominantEntity ?? "general").toLowerCase().slice(0, 15);
  return `narr-${entity}-${theme}`.replace(/[^a-z0-9-]/g, "-");
}

function findExistingNarrative(cluster: NarrativeCluster): string | null {
  const clusterTokens = tokenise(cluster.headline + " " + cluster.theme);

  for (const [id, thread] of narrativeStore) {
    const threadTokens = tokenise(thread.canonicalHeadline + " " + thread.theme);
    const sim = jaccardSimilarity(clusterTokens, threadTokens);
    if (sim >= SIMILARITY_THRESHOLD) return id;
  }

  // Check by dominant entity (same entity = possibly same narrative)
  if (cluster.dominantEntity) {
    for (const [id, thread] of narrativeStore) {
      if (thread.dominantEntity === cluster.dominantEntity) {
        const ageHours = (Date.now() - new Date(thread.lastSeen).getTime()) / 3_600_000;
        if (ageHours < 72) return id; // same entity, recent → same narrative
      }
    }
  }

  return null;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Ingest a narrative cluster observation into memory.
 * Matches against existing threads or creates new ones.
 */
export function recordNarrativeCluster(
  cluster: NarrativeCluster,
  avgSignalScore = 0,
): void {
  evictExpired();

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expire = new Date(now + NARRATIVE_TTL_MS).toISOString();

  // Extract entities from the cluster articles
  const allText = cluster.articles.map((a) => a.title).join(" ");
  const extracted = extractEntities(allText);
  const relatedEntities = extracted
    .filter((e) => !e.entityId.startsWith("dynamic:"))
    .map((e) => e.entityId)
    .slice(0, MAX_RELATED_ENTITIES);

  // Find or create narrative thread
  const existingId = findExistingNarrative(cluster);

  const development: NarrativeDevelopment = {
    headline: cluster.headline,
    sources: cluster.articles.map((a) => a.source ?? "Unknown").filter(Boolean),
    recordedAt: nowIso,
    articleCount: cluster.articles.length,
    avgSignalScore,
    dominantEntity: cluster.dominantEntity,
  };

  if (existingId) {
    const thread = narrativeStore.get(existingId)!;
    const ts = mentionTimestamps.get(existingId) ?? [];
    ts.push(now);
    mentionTimestamps.set(existingId, ts.filter((t) => t >= now - NARRATIVE_TTL_MS));

    thread.totalMentions += cluster.articles.length;
    thread.mentionsLast24h = ts.filter((t) => t >= now - 86_400_000).length;
    thread.mentionsLast7d = ts.filter((t) => t >= now - 604_800_000).length;
    thread.lastSeen = nowIso;
    thread.expiresAt = expire;

    // Update headline if new cluster has more sources
    if (cluster.sourceCount > (thread.developments[thread.developments.length - 1]?.sources.length ?? 0)) {
      thread.canonicalHeadline = cluster.headline;
    }

    // Add development (ring buffer)
    thread.developments.push(development);
    if (thread.developments.length > MAX_DEVELOPMENTS_PER_NARRATIVE) {
      thread.developments.shift();
    }

    // Update derived fields
    const allHeadlines = thread.developments.map((d) => d.headline);
    thread.sentimentDirection = detectSentiment(allHeadlines);
    thread.maturity = calculateMaturity(thread, ts);
    thread.trendAcceleration = calculateAcceleration(ts);
    thread.avgScore = Math.round(
      thread.developments.reduce((s, d) => s + d.avgSignalScore, 0) / thread.developments.length,
    );
    thread.peakScore = Math.max(thread.peakScore, avgSignalScore);

    // Merge related entities
    for (const entity of relatedEntities) {
      if (!thread.relatedEntities.includes(entity)) {
        thread.relatedEntities.push(entity);
      }
    }
    thread.relatedEntities = thread.relatedEntities.slice(0, MAX_RELATED_ENTITIES);

    // Milestone detection
    if (thread.mentionsLast24h >= 5 && thread.maturity === "peaking") {
      const alreadyMilestoied = thread.milestones.some((m) => m.label === "Peak coverage");
      if (!alreadyMilestoied) {
        thread.milestones.push({
          label: "Peak coverage",
          recordedAt: nowIso,
          significance: "high",
        });
      }
    }

    logger.debug({ narrativeId: existingId, headline: cluster.headline }, "Narrative updated");
  } else {
    // New narrative thread
    if (narrativeStore.size >= MAX_NARRATIVES) {
      // Evict oldest resolved narrative
      let oldestId = "";
      let oldestTime = Infinity;
      for (const [id, thread] of narrativeStore) {
        const lastMs = new Date(thread.lastSeen).getTime();
        if (lastMs < oldestTime && thread.maturity !== "active") {
          oldestTime = lastMs;
          oldestId = id;
        }
      }
      if (oldestId) {
        narrativeStore.delete(oldestId);
        mentionTimestamps.delete(oldestId);
      }
    }

    const id = generateNarrativeId(cluster);
    const ts = [now];
    mentionTimestamps.set(id, ts);

    narrativeStore.set(id, {
      id,
      canonicalHeadline: cluster.headline,
      theme: cluster.theme,
      dominantEntity: cluster.dominantEntity,
      relatedEntities,
      developments: [development],
      totalMentions: cluster.articles.length,
      mentionsLast24h: 1,
      mentionsLast7d: 1,
      avgScore: avgSignalScore,
      peakScore: avgSignalScore,
      maturity: "emerging",
      sentimentDirection: detectSentiment([cluster.headline]),
      trendAcceleration: 0,
      firstSeen: nowIso,
      lastSeen: nowIso,
      expiresAt: expire,
      milestones: [{
        label: "First detected",
        recordedAt: nowIso,
        significance: "low",
      }],
    });

    logger.debug({ id, headline: cluster.headline }, "New narrative thread created");
  }
}

/**
 * Get active narrative threads sorted by recency and signal.
 */
export function getActiveNarratives(limit = 20): NarrativeThread[] {
  evictExpired();
  return [...narrativeStore.values()]
    .filter((t) => t.maturity !== "resolved")
    .sort((a, b) => {
      // Sort by: peaking > active > emerging > declining
      const maturityOrder = { peaking: 4, active: 3, emerging: 2, declining: 1, resolved: 0 };
      const mDiff = maturityOrder[b.maturity] - maturityOrder[a.maturity];
      if (mDiff !== 0) return mDiff;
      return b.peakScore - a.peakScore;
    })
    .slice(0, limit);
}

/**
 * Get a specific narrative thread by ID.
 */
export function getNarrativeById(id: string): NarrativeThread | null {
  evictExpired();
  return narrativeStore.get(id) ?? null;
}

/**
 * Get narrative timeline: ordered developments for a thread.
 */
export function getNarrativeTimeline(id: string): NarrativeDevelopment[] {
  const thread = getNarrativeById(id);
  if (!thread) return [];
  return [...thread.developments].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
}

/**
 * Get all narratives (including resolved), for debug/admin.
 */
export function getPersistentNarratives(): NarrativeThread[] {
  evictExpired();
  return [...narrativeStore.values()].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
  );
}

/**
 * Get narratives related to a specific entity.
 */
export function getNarrativesForEntity(entityId: string): NarrativeThread[] {
  evictExpired();
  return [...narrativeStore.values()]
    .filter(
      (t) =>
        t.dominantEntity === entityId ||
        t.relatedEntities.includes(entityId),
    )
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
}

/**
 * Summary snapshot for analytics.
 */
export function getNarrativeMemoryStats(): {
  total: number;
  emerging: number;
  active: number;
  peaking: number;
  declining: number;
  resolved: number;
  avgLifespanHours: number;
} {
  evictExpired();
  const threads = [...narrativeStore.values()];
  const byMaturity = (m: NarrativeMaturity) => threads.filter((t) => t.maturity === m).length;

  const avgLifespan = threads.length > 0
    ? Math.round(
        threads.reduce((sum, t) => {
          const hours = (new Date(t.lastSeen).getTime() - new Date(t.firstSeen).getTime()) / 3_600_000;
          return sum + hours;
        }, 0) / threads.length,
      )
    : 0;

  return {
    total: threads.length,
    emerging: byMaturity("emerging"),
    active: byMaturity("active"),
    peaking: byMaturity("peaking"),
    declining: byMaturity("declining"),
    resolved: byMaturity("resolved"),
    avgLifespanHours: avgLifespan,
  };
}
