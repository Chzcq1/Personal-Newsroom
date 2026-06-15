---
name: Feed Diagnostics
description: Every /api/news/summarize response includes debugInfo with per-feed status; frontend shows it in DEV mode
---

**Rule:** Every response from `POST /api/news/summarize` (success OR error) includes a `debugInfo: FeedDiagnostic[]` field.

**FeedDiagnostic shape:**
```ts
{
  name: string;       // feed source name
  url: string;        // full RSS URL
  status: "success" | "failed";
  articleCount: number;
  durationMs: number;
  error?: string;     // only on failed feeds
}
```

**Data flow:** rssService.fetchFeed → FeedResult { articles, diagnostic } → newsCollectorService.CollectionResult.feedDiagnostics → routes/news.ts response.debugInfo

**Frontend:** home.tsx renders `<DebugPanel>` only when `import.meta.env.DEV === true` AND `data.debugInfo` is present. Access via `(data as ExtendedNewsSummary).debugInfo`.

**Note:** debugInfo is NOT in the OpenAPI spec or generated types — typed as `ExtendedNewsSummary = NewsSummary & { debugInfo?: FeedDiagnostic[] }` in home.tsx.

**Why:** Technology topic was failing silently. Surfacing per-feed diagnostics in dev mode lets the developer see exactly which feeds fail and why, without touching server logs.
