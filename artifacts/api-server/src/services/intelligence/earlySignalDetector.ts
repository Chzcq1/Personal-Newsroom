// ============================================================
// EARLY SIGNAL DETECTOR — Sprint 11 Task B
//
// Detects weak signals before they become mainstream narratives.
//
// Three detection modes:
//   1. Cross-source emergence — same theme from 3+ distinct sources
//      in a compressed time window (< 3h)
//   2. Unusual repetition — entity/theme appearing 5x+ above
//      its own rolling baseline in a 1h window
//   3. Sudden ecosystem linkage — a new entity suddenly appearing
//      alongside well-established interest-graph entities
//
// Each signal has a confidence score (0-1) and decays over 24h.
// Signals trigger the "Early Signal" badge in the feed.
// ============================================================

import type { RssArticle } from "../news/rssService.js";
import { INTEREST_GRAPH } from "./interestGraph.js";
import { extractEntities } from "./entityExtractor.js";

export type SignalType =
  | "cross_source_emergence"
  | "unusual_repetition"
  | "ecosystem_linkage"
  | "multi_topic_convergence";

export interface EarlySignal {
  id: string;
  type: SignalType;
  label: string;                    // human-readable summary
  entities: string[];               // entities involved
  sourceCount: number;
  sources: string[];
  confidence: number;               // 0.0-1.0
  firstDetectedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  articleSample: string[];          // up to 3 headline examples
  relatedNarrativeIds: string[];
}

// ── State ─────────────────────────────────────────────────────

const signalStore = new Map<string, EarlySignal>();

// Rolling baseline: entityId/theme → mention counts per hour
// Last 24 hourly buckets
const mentionBaseline = new Map<string, number[]>(); // entityId → hourly[24]

// Article observation window: 3h sliding
type ArticleObservation = {
  title: string;
  source: string | null;
  entities: string[];
  observedAt: number;
};
const observationWindow: ArticleObservation[] = [];

const SIGNAL_TTL_MS = 24 * 3_600_000;
const OBSERVATION_WINDOW_MS = 3 * 3_600_000;
const CROSS_SOURCE_THRESHOLD = 3;       // distinct sources needed
const REPETITION_MULTIPLIER = 5;        // 5x baseline = unusual
const MAX_SIGNALS = 100;
const ESTABLISHED_ENTITY_DEGREE = 3;    // min graph edges to be "established"

// ── Helpers ───────────────────────────────────────────────────

function makeSignalId(type: SignalType, label: string): string {
  const key = `${type}:${label.toLowerCase().replace(/\s+/g, "-")}`;
  return key.slice(0, 80);
}

function evictExpired(): void {
  const now = Date.now();
  for (const [id, signal] of signalStore) {
    if (new Date(signal.expiresAt).getTime() < now) {
      signalStore.delete(id);
    }
  }
  // Trim observation window
  const cutoff = now - OBSERVATION_WINDOW_MS;
  while (observationWindow.length > 0 && observationWindow[0].observedAt < cutoff) {
    observationWindow.shift();
  }
}

function getEstablishedEntities(): Set<string> {
  const established = new Set<string>();
  for (const [nodeId, node] of Object.entries(INTEREST_GRAPH)) {
    if (node.related && node.related.length >= ESTABLISHED_ENTITY_DEGREE) {
      established.add(nodeId.toLowerCase());
    }
  }
  return established;
}

function updateBaseline(entityId: string, now: number): void {
  const hourBucket = Math.floor(now / 3_600_000);
  const buckets = mentionBaseline.get(entityId) ?? new Array(24).fill(0);
  const idx = hourBucket % 24;
  buckets[idx] = (buckets[idx] ?? 0) + 1;
  mentionBaseline.set(entityId, buckets);
}

function getBaselineAvg(entityId: string): number {
  const buckets = mentionBaseline.get(entityId);
  if (!buckets) return 0;
  const total = buckets.reduce((a, b) => a + b, 0);
  return total / 24;
}

function recordSignal(signal: Omit<EarlySignal, "id" | "expiresAt">): void {
  const id = makeSignalId(signal.type, signal.label);
  const existing = signalStore.get(id);

  if (existing) {
    // Update existing signal
    signalStore.set(id, {
      ...existing,
      lastSeenAt: new Date().toISOString(),
      sourceCount: Math.max(existing.sourceCount, signal.sourceCount),
      sources: [...new Set([...existing.sources, ...signal.sources])],
      confidence: Math.min(1.0, existing.confidence + 0.05),
      articleSample: [...new Set([...existing.articleSample, ...signal.articleSample])].slice(0, 3),
    });
  } else {
    if (signalStore.size >= MAX_SIGNALS) {
      // Remove oldest signal
      const oldest = [...signalStore.entries()].sort(
        (a, b) => new Date(a[1].firstDetectedAt).getTime() - new Date(b[1].firstDetectedAt).getTime(),
      )[0];
      if (oldest) signalStore.delete(oldest[0]);
    }

    signalStore.set(id, {
      id,
      ...signal,
      expiresAt: new Date(Date.now() + SIGNAL_TTL_MS).toISOString(),
    });
  }
}

// ── Detection algorithms ──────────────────────────────────────

function detectCrossSourceEmergence(obs: ArticleObservation[]): void {
  // Group by entity and count distinct sources
  const entitySources = new Map<string, Set<string>>();
  const entityArticles = new Map<string, string[]>();

  for (const o of obs) {
    for (const entity of o.entities) {
      if (!entitySources.has(entity)) {
        entitySources.set(entity, new Set());
        entityArticles.set(entity, []);
      }
      if (o.source) entitySources.get(entity)!.add(o.source);
      entityArticles.get(entity)!.push(o.title);
    }
  }

  for (const [entity, sources] of entitySources) {
    if (sources.size >= CROSS_SOURCE_THRESHOLD) {
      const articles = entityArticles.get(entity) ?? [];
      recordSignal({
        type: "cross_source_emergence",
        label: `${entity} emerging across ${sources.size} sources`,
        entities: [entity],
        sourceCount: sources.size,
        sources: [...sources],
        confidence: Math.min(1.0, 0.4 + (sources.size - 3) * 0.15),
        firstDetectedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        articleSample: articles.slice(0, 3),
        relatedNarrativeIds: [],
      });
    }
  }
}

function detectUnusualRepetition(obs: ArticleObservation[], now: number): void {
  // Count entity mentions in last 1h
  const recentCutoff = now - 3_600_000;
  const recentObs = obs.filter((o) => o.observedAt >= recentCutoff);

  const recentCounts = new Map<string, number>();
  const recentTitles = new Map<string, string[]>();

  for (const o of recentObs) {
    for (const entity of o.entities) {
      recentCounts.set(entity, (recentCounts.get(entity) ?? 0) + 1);
      const t = recentTitles.get(entity) ?? [];
      t.push(o.title);
      recentTitles.set(entity, t);
    }
  }

  for (const [entity, count] of recentCounts) {
    const baseline = getBaselineAvg(entity);
    if (baseline > 0 && count >= baseline * REPETITION_MULTIPLIER && count >= 3) {
      recordSignal({
        type: "unusual_repetition",
        label: `Unusual spike: ${entity} (${count}x in 1h vs ${baseline.toFixed(1)} avg)`,
        entities: [entity],
        sourceCount: recentObs.filter((o) => o.entities.includes(entity)).map((o) => o.source).filter(Boolean).length,
        sources: [...new Set(recentObs.filter((o) => o.entities.includes(entity)).map((o) => o.source ?? ""))].filter(Boolean),
        confidence: Math.min(1.0, 0.5 + (count / baseline) * 0.05),
        firstDetectedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        articleSample: (recentTitles.get(entity) ?? []).slice(0, 3),
        relatedNarrativeIds: [],
      });
    }
  }
}

function detectEcosystemLinkage(obs: ArticleObservation[]): void {
  const established = getEstablishedEntities();

  // Find new entities (first seen in last 6h) appearing alongside established ones
  const entityFirstSeen = new Map<string, number>();
  for (const o of obs) {
    for (const entity of o.entities) {
      if (!entityFirstSeen.has(entity)) {
        entityFirstSeen.set(entity, o.observedAt);
      }
    }
  }

  const recentCutoff = Date.now() - 6 * 3_600_000;

  for (const o of obs) {
    const newEntities = o.entities.filter(
      (e) => !established.has(e.toLowerCase()) &&
        (entityFirstSeen.get(e) ?? 0) >= recentCutoff,
    );
    const establishedInArticle = o.entities.filter((e) => established.has(e.toLowerCase()));

    if (newEntities.length >= 1 && establishedInArticle.length >= 2) {
      const label = `New entity "${newEntities[0]}" links to ${establishedInArticle.slice(0, 2).join(" + ")}`;
      recordSignal({
        type: "ecosystem_linkage",
        label,
        entities: [...newEntities, ...establishedInArticle],
        sourceCount: 1,
        sources: o.source ? [o.source] : [],
        confidence: 0.35 + establishedInArticle.length * 0.08,
        firstDetectedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        articleSample: [o.title],
        relatedNarrativeIds: [],
      });
    }
  }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Process a batch of articles to detect early signals.
 * Called during feed processing after entity extraction.
 */
export function detectSignals(articles: RssArticle[]): EarlySignal[] {
  evictExpired();

  const now = Date.now();

  // Build observations from articles
  for (const article of articles) {
    const entities = extractEntities(article.title + " " + (article.description ?? ""))
      .map((e) => e.entityId);

    const obs: ArticleObservation = {
      title: article.title,
      source: article.source ?? null,
      entities,
      observedAt: article.pubDate ? new Date(article.pubDate).getTime() : now,
    };
    observationWindow.push(obs);

    // Update baseline
    for (const entity of entities) {
      updateBaseline(entity, now);
    }
  }

  // Run detection algorithms on the current window
  detectCrossSourceEmergence(observationWindow);
  detectUnusualRepetition(observationWindow, now);
  detectEcosystemLinkage(observationWindow);

  return getActiveSignals();
}

/**
 * Get all currently active early signals, sorted by confidence.
 */
export function getActiveSignals(): EarlySignal[] {
  evictExpired();
  return [...signalStore.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Check if a specific article should get the "Early Signal" badge.
 */
export function isEarlySignalArticle(
  title: string,
  entities: string[],
): { isSignal: boolean; signal: EarlySignal | null } {
  const signals = getActiveSignals();
  for (const signal of signals) {
    if (signal.confidence < 0.4) continue;
    const hasEntity = entities.some((e) =>
      signal.entities.some((se) => se.toLowerCase() === e.toLowerCase()),
    );
    const titleMatch = signal.articleSample.some((s) =>
      s.toLowerCase().includes(title.toLowerCase().slice(0, 30)),
    );
    if (hasEntity || titleMatch) {
      return { isSignal: true, signal };
    }
  }
  return { isSignal: false, signal: null };
}

/**
 * Get signal stats for admin dashboard.
 */
export function getSignalStats(): {
  total: number;
  byType: Record<SignalType, number>;
  avgConfidence: number;
  highConfidence: number;
} {
  const signals = getActiveSignals();
  const byType: Record<SignalType, number> = {
    cross_source_emergence: 0,
    unusual_repetition: 0,
    ecosystem_linkage: 0,
    multi_topic_convergence: 0,
  };
  for (const s of signals) byType[s.type]++;
  const avgConfidence = signals.length > 0
    ? signals.reduce((a, b) => a + b.confidence, 0) / signals.length
    : 0;
  return {
    total: signals.length,
    byType,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    highConfidence: signals.filter((s) => s.confidence >= 0.7).length,
  };
}
