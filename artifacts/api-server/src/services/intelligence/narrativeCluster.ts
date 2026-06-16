// ============================================================
// NARRATIVE CLUSTERING ENGINE — Sprint 9 Task C / Sprint 10 Task D
//
// Groups articles covering the same story into a narrative cluster.
//
// Sprint 10 upgrade — Semantic Clustering:
//   Extends Jaccard title similarity with:
//   1. Entity overlap scoring (shared canonical entities → higher similarity)
//   2. Paraphrase matching (synonym/alias expansion for known terms)
//   3. Topic continuity (same dominant entity across different wording)
//   4. Dynamic threshold adjustment based on entity confidence
//
// Clustering algorithm:
//   1. Tokenise titles (4+ char words, no stop words)
//   2. Extract canonical entities via entityExtractor
//   3. Compute combined similarity = Jaccard × 0.5 + entityOverlap × 0.5
//   4. Greedy single-linkage clustering at CLUSTER_THRESHOLD
//   5. Paraphrase check: same dominant entity = lower threshold (0.15)
//   6. Generate narrative headline from most-common terms + dominant entity
//
// Architecture note (Sprint 10 Task K):
//   Each cluster's `narrativeId` and `headline` are designed to become
//   shared context objects between future Bull/Bear/Macro agents.
// ============================================================

import type { RssArticle } from "../news/rssService.js";
import { extractEntities, areSameEntity } from "./entityExtractor.js";

export interface NarrativeCluster {
  id: string;
  headline: string;
  theme: string;
  dominantEntity: string | null;
  articles: Array<{
    url: string;
    title: string;
    source: string | null;
    relevanceClass?: string;
    combinedScore?: number;
  }>;
  sourceCount: number;
  avgCombinedScore: number;
  isMultiSource: boolean;
  // Sprint 9 Task K: future agent compatibility
  agentContext: {
    clusterType: "entity" | "theme" | "event";
    keyTerms: string[];
    canBeSharedBetweenAgents: boolean;
  };
}

// ── Configuration ────────────────────────────────────────────

const CLUSTER_THRESHOLD = 0.25; // Jaccard similarity floor
const MIN_CLUSTER_SIZE = 2;     // minimum articles to form a cluster
const MAX_CLUSTERS = 10;        // maximum clusters per feed

// ── Stop words ───────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "are", "have",
  "will", "been", "were", "they", "their", "about", "what", "your",
  "says", "said", "amid", "over", "into", "more", "than", "its",
  "after", "before", "could", "would", "should", "year", "week",
  "report", "news", "today", "just", "also", "new", "first",
]);

// ── Tokenisation ─────────────────────────────────────────────

function tokenise(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
  return new Set(words);
}

// ── Similarity ───────────────────────────────────────────────

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((w) => b.has(w)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

// Sprint 10 Task D: Entity overlap similarity
// Measures shared canonical entities between two article titles
function entityOverlapSimilarity(titleA: string, titleB: string): {
  similarity: number;
  sharedEntities: string[];
} {
  const entitiesA = new Set(extractEntities(titleA).map((e) => e.entityId));
  const entitiesB = new Set(extractEntities(titleB).map((e) => e.entityId));

  if (entitiesA.size === 0 && entitiesB.size === 0) return { similarity: 0, sharedEntities: [] };

  const shared = [...entitiesA].filter((e) => entitiesB.has(e));
  const union = new Set([...entitiesA, ...entitiesB]);
  const similarity = shared.length / union.size;

  return { similarity, sharedEntities: shared };
}

// Sprint 10 Task D: Combined semantic similarity
// Jaccard × 0.5 + entity overlap × 0.5
// Paraphrase bonus: if dominant entity matches, lower threshold
function semanticSimilarity(
  tokensA: Set<string>,
  tokensB: Set<string>,
  titleA: string,
  titleB: string,
): { score: number; isParaphrase: boolean } {
  const jaccard = jaccardSimilarity(tokensA, tokensB);
  const { similarity: entityOverlap, sharedEntities } = entityOverlapSimilarity(titleA, titleB);

  // Combined score
  const combined = jaccard * 0.5 + entityOverlap * 0.5;

  // Paraphrase detection: same entity, very different wording but same story
  // e.g. "Fed raises rates" vs "Federal Reserve hikes interest rates"
  const isParaphrase = sharedEntities.length >= 1 && entityOverlap >= 0.5;

  return { score: combined, isParaphrase };
}

// ── Dominant entity extraction ────────────────────────────────

// Most common capitalized term across article titles
function extractDominantEntity(titles: string[]): string | null {
  const freq = new Map<string, number>();
  for (const title of titles) {
    const matches = title.match(/\b[A-Z][a-zA-Z]{2,}\b/g) ?? [];
    for (const m of matches) {
      freq.set(m, (freq.get(m) ?? 0) + 1);
    }
  }
  if (freq.size === 0) return null;
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

// ── Narrative headline generation ─────────────────────────────

function generateNarrativeHeadline(
  articles: RssArticle[],
  dominantEntity: string | null,
): string {
  if (articles.length === 0) return "Related stories";

  const titles = articles.map((a) => a.title);
  const tokenSets = titles.map(tokenise);

  // Find words that appear in majority of titles
  const wordFreq = new Map<string, number>();
  for (const tset of tokenSets) {
    for (const word of tset) {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    }
  }

  const threshold = Math.max(2, Math.ceil(articles.length * 0.5));
  const commonWords = [...wordFreq.entries()]
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);

  if (commonWords.length === 0) {
    return dominantEntity
      ? `${dominantEntity}: ${articles.length} related stories`
      : articles[0].title;
  }

  // Reconstruct a headline-like phrase from the most common title
  // that contains the most common words
  const bestTitle = titles.reduce((best, title) => {
    const titleWords = tokenise(title);
    const overlap = commonWords.filter((w) => titleWords.has(w)).length;
    const bestWords = tokenise(best);
    const bestOverlap = commonWords.filter((w) => bestWords.has(w)).length;
    return overlap > bestOverlap ? title : best;
  }, titles[0]);

  // Append source count for multi-source
  const sources = new Set(articles.map((a) => a.source).filter(Boolean));
  if (sources.size >= 2) {
    return `${bestTitle} (${sources.size} sources)`;
  }

  return bestTitle;
}

// ── Cluster type classification ───────────────────────────────

function classifyClusterType(
  articles: RssArticle[],
  dominantEntity: string | null,
): NarrativeCluster["agentContext"]["clusterType"] {
  const hasEntity = dominantEntity !== null;
  const hasEventWords = articles.some((a) =>
    /\b(announces?|launches?|releases?|signs?|acquires?|merger|ipo|crisis|decision|ruling)\b/i.test(a.title),
  );

  if (hasEventWords) return "event";
  if (hasEntity) return "entity";
  return "theme";
}

// ── Main clustering function ─────────────────────────────────

/**
 * Cluster articles by narrative similarity.
 * Articles with combinedScore on them are sorted before clustering.
 *
 * @param articles — articles to cluster (with optional .combinedScore)
 * @returns NarrativeCluster[] (only clusters with >= MIN_CLUSTER_SIZE articles)
 *          plus singletons in a special "singleton" pseudo-cluster
 */
export function clusterNarratives(
  articles: Array<RssArticle & { combinedScore?: number; relevanceClass?: string }>,
): {
  clusters: NarrativeCluster[];
  singletons: typeof articles;
  clusteringRate: number;
} {
  if (articles.length === 0) {
    return { clusters: [], singletons: [], clusteringRate: 0 };
  }

  // Tokenise all titles
  const tokenised = articles.map((a) => ({
    article: a,
    tokens: tokenise(a.title),
  }));

  // Track cluster assignment
  const clustered = new Set<number>();
  const clusterGroups: number[][] = [];

  // Greedy single-linkage clustering seeded by article order (highest score first)
  // Sprint 10 Task D: uses semantic similarity (Jaccard + entity overlap) instead of Jaccard alone
  for (let i = 0; i < tokenised.length; i++) {
    if (clustered.has(i)) continue;

    const group = [i];
    for (let j = i + 1; j < tokenised.length; j++) {
      if (clustered.has(j)) continue;
      const { score, isParaphrase } = semanticSimilarity(
        tokenised[i].tokens,
        tokenised[j].tokens,
        tokenised[i].article.title,
        tokenised[j].article.title,
      );
      // Paraphrases use a lower threshold (0.15) to catch "Fed raises" / "Federal Reserve hikes"
      const effectiveThreshold = isParaphrase ? 0.15 : CLUSTER_THRESHOLD;
      if (score >= effectiveThreshold) {
        group.push(j);
        clustered.add(j);
      }
    }

    if (group.length >= MIN_CLUSTER_SIZE) {
      clustered.add(i);
      clusterGroups.push(group);
    }
  }

  // Build NarrativeCluster objects
  const clusters: NarrativeCluster[] = clusterGroups
    .slice(0, MAX_CLUSTERS)
    .map((group, idx) => {
      const groupArticles = group.map((i) => tokenised[i].article);
      const titles = groupArticles.map((a) => a.title);
      const dominantEntity = extractDominantEntity(titles);
      const headline = generateNarrativeHeadline(groupArticles, dominantEntity);
      const sources = new Set(groupArticles.map((a) => a.source).filter(Boolean));
      const avgScore = groupArticles.length > 0
        ? Math.round(groupArticles.reduce((sum, a) => sum + (a.combinedScore ?? 0), 0) / groupArticles.length)
        : 0;

      const keyTerms = [...new Set(
        groupArticles.flatMap((a) => [...tokenise(a.title)]),
      )].slice(0, 10);

      return {
        id: `cluster-${idx}-${Date.now()}`,
        headline,
        theme: keyTerms.slice(0, 3).join(", "),
        dominantEntity,
        articles: groupArticles.map((a) => ({
          url: a.url,
          title: a.title,
          source: a.source ?? null,
          relevanceClass: a.relevanceClass,
          combinedScore: a.combinedScore,
        })),
        sourceCount: sources.size,
        avgCombinedScore: avgScore,
        isMultiSource: sources.size >= 2,
        agentContext: {
          clusterType: classifyClusterType(groupArticles, dominantEntity),
          keyTerms,
          canBeSharedBetweenAgents: sources.size >= 2 && avgScore > 30,
        },
      };
    });

  // Singletons: articles not assigned to any cluster
  const singletons = articles.filter((_, i) => !clustered.has(i));
  const clusteringRate = articles.length > 0
    ? Math.round(((articles.length - singletons.length) / articles.length) * 100)
    : 0;

  return { clusters, singletons, clusteringRate };
}

/**
 * For a given article URL, find which cluster it belongs to.
 */
export function findClusterForArticle(
  url: string,
  clusters: NarrativeCluster[],
): NarrativeCluster | null {
  return clusters.find((c) => c.articles.some((a) => a.url === url)) ?? null;
}
