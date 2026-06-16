// ============================================================
// SOURCE ADAPTER — Sprint 17 Task D
//
// Unified source contract and ingestion pipeline architecture.
// All new source adapters (Reddit, Twitter, YouTube, SEC filings)
// must implement the ISourceAdapter interface.
// ============================================================

// ── Unified article shape from any source ─────────────────────

export interface NormalizedArticle {
  id: string;                   // stable dedup ID (source::hash)
  title: string;
  summary: string;              // max 600 chars
  url: string;
  source: string;               // adapter name: "reddit", "rss", "twitter"
  sourceName: string;           // human label: "r/investing", "Reuters"
  publishedAt: string;          // ISO 8601
  fetchedAt: string;            // ISO 8601
  language: "th" | "en" | "other";
  topicTags: string[];          // normalised topic tags
  entityTags: string[];         // extracted entities
  signalScore: number;          // 0–100 pre-LLM heuristic score
  confidence: SourceConfidence;
  raw?: unknown;                // original payload (optional, for debugging)
}

export interface SourceConfidence {
  tier: "A" | "B" | "C" | "unverified";
  reliability: number;          // 0–1 from sourceReliability tracker
  latencyMs: number;            // time to fetch this batch
  isMultiSource: boolean;
  sourceCount: number;          // how many unique outlets reported this
  engagementSignal?: number;    // upvotes, shares, etc. (0–100 normalised)
}

// ── Source adapter interface ───────────────────────────────────

export interface ISourceAdapter {
  readonly id: string;           // machine ID: "reddit", "twitter", "rss"
  readonly displayName: string;  // human label
  readonly tier: "A" | "B" | "C" | "unverified";
  readonly isEnabled: boolean;

  /**
   * Fetch normalized articles for a set of topics.
   * Must never throw — catch all errors internally and return [].
   */
  fetch(topics: string[]): Promise<NormalizedArticle[]>;

  /**
   * Health check — called by the monitor every 5 min.
   */
  health(): Promise<{ ok: boolean; latencyMs: number; reason?: string }>;
}

// ── Source registry ────────────────────────────────────────────

const adapters = new Map<string, ISourceAdapter>();

export function registerSourceAdapter(adapter: ISourceAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function getSourceAdapter(id: string): ISourceAdapter | undefined {
  return adapters.get(id);
}

export function getAllSourceAdapters(): ISourceAdapter[] {
  return [...adapters.values()];
}

export function getEnabledAdapters(): ISourceAdapter[] {
  return [...adapters.values()].filter((a) => a.isEnabled);
}

// ── Aggregate ingestion ────────────────────────────────────────

/**
 * Fetch from all enabled adapters for the given topics.
 * Merges results and deduplicates by URL.
 */
export async function fetchFromAllSources(
  topics: string[],
): Promise<{ articles: NormalizedArticle[]; adapterStats: AdapterFetchStat[] }> {
  const enabled = getEnabledAdapters();
  const adapterStats: AdapterFetchStat[] = [];

  const results = await Promise.allSettled(
    enabled.map(async (adapter) => {
      const start = Date.now();
      try {
        const articles = await adapter.fetch(topics);
        adapterStats.push({
          adapterId: adapter.id,
          ok: true,
          count: articles.length,
          latencyMs: Date.now() - start,
        });
        return articles;
      } catch (err) {
        adapterStats.push({
          adapterId: adapter.id,
          ok: false,
          count: 0,
          latencyMs: Date.now() - start,
          error: String(err),
        });
        return [];
      }
    }),
  );

  const all = results
    .filter((r): r is PromiseFulfilledResult<NormalizedArticle[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Dedup by URL
  const seen = new Set<string>();
  const deduped = all.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  // Sort by signal score descending
  deduped.sort((a, b) => b.signalScore - a.signalScore);

  return { articles: deduped, adapterStats };
}

export interface AdapterFetchStat {
  adapterId: string;
  ok: boolean;
  count: number;
  latencyMs: number;
  error?: string;
}

// ── Normalisation helpers ──────────────────────────────────────

export function normaliseId(source: string, url: string): string {
  const hash = url
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(-32);
  return `${source}::${hash}`;
}

export function normaliseTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.toLowerCase().trim()).filter(Boolean))];
}
