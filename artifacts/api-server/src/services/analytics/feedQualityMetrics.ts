// ============================================================
// FEED QUALITY METRICS — Sprint 9 Task J
//
// Tracks internal feed quality indicators per request.
//
// Metrics:
//   - Relevance accuracy (% articles with direct/contextual relevance)
//   - Duplicate suppression rate (% narratives clustered)
//   - Narrative compression ratio (articles → clusters)
//   - Average signal score
//   - Feed diversity (unique sources / total)
//   - Filtered irrelevant stories count
//
// Storage: in-memory ring buffer, max 500 records.
// Accessible at GET /api/admin/feed-quality.
// ============================================================

export interface FeedQualityRecord {
  id: string;
  recordedAt: string;
  interestCount: number;
  watchlistCount: number;
  totalArticles: number;
  directCount: number;         // "direct" relevance class
  contextualCount: number;
  weakCount: number;
  incidentalCount: number;
  filteredCount: number;       // quality-filtered out
  clusterCount: number;        // narrative clusters formed
  singletonCount: number;      // unclustered articles
  clusteringRate: number;      // % articles in a cluster
  avgCombinedScore: number;
  uniqueSourceCount: number;
  feedDiversityRate: number;   // uniqueSources / totalArticles
  relevanceAccuracy: number;   // % direct + contextual
  processingTimeMs: number;
}

export interface FeedQualityStats {
  totalRequests: number;
  avgRelevanceAccuracy: number;
  avgClusteringRate: number;
  avgFeedDiversity: number;
  avgCombinedScore: number;
  avgFilteredCount: number;
  last24hRequests: number;
  qualityTrend: "improving" | "stable" | "degrading";
}

const MAX_RECORDS = 500;
const qualityLog: FeedQualityRecord[] = [];

// ── Public API ───────────────────────────────────────────────

export function recordFeedQuality(record: Omit<FeedQualityRecord, "id" | "recordedAt">): void {
  const full: FeedQualityRecord = {
    ...record,
    id: `fq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recordedAt: new Date().toISOString(),
  };

  qualityLog.push(full);
  if (qualityLog.length > MAX_RECORDS) qualityLog.shift();
}

export function getFeedQualityLog(): FeedQualityRecord[] {
  return [...qualityLog].reverse();
}

export function getFeedQualityStats(): FeedQualityStats {
  const total = qualityLog.length;
  if (total === 0) {
    return {
      totalRequests: 0, avgRelevanceAccuracy: 0, avgClusteringRate: 0,
      avgFeedDiversity: 0, avgCombinedScore: 0, avgFilteredCount: 0,
      last24hRequests: 0, qualityTrend: "stable",
    };
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10;

  const cutoff24h = Date.now() - 86_400_000;
  const recent = qualityLog.filter((r) => new Date(r.recordedAt).getTime() >= cutoff24h);
  const older = qualityLog.filter((r) => new Date(r.recordedAt).getTime() < cutoff24h).slice(-20);

  const recentAccuracy = avg(recent.map((r) => r.relevanceAccuracy));
  const olderAccuracy = avg(older.map((r) => r.relevanceAccuracy));

  let qualityTrend: FeedQualityStats["qualityTrend"] = "stable";
  if (recent.length >= 3 && older.length >= 3) {
    if (recentAccuracy - olderAccuracy > 5) qualityTrend = "improving";
    else if (olderAccuracy - recentAccuracy > 5) qualityTrend = "degrading";
  }

  return {
    totalRequests: total,
    avgRelevanceAccuracy: avg(qualityLog.map((r) => r.relevanceAccuracy)),
    avgClusteringRate: avg(qualityLog.map((r) => r.clusteringRate)),
    avgFeedDiversity: avg(qualityLog.map((r) => r.feedDiversityRate * 100)),
    avgCombinedScore: avg(qualityLog.map((r) => r.avgCombinedScore)),
    avgFilteredCount: avg(qualityLog.map((r) => r.filteredCount)),
    last24hRequests: recent.length,
    qualityTrend,
  };
}

export function getFeedQualitySnapshot() {
  return {
    stats: getFeedQualityStats(),
    recentRecords: getFeedQualityLog().slice(0, 50),
    generatedAt: new Date().toISOString(),
  };
}
