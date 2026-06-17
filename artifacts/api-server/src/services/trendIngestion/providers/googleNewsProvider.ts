// Google News RSS provider — keyword-based trending news
import type { TrendIngestionProvider, TrendItem } from "../index.js";

const KEYWORD_FEEDS: Array<{ keyword: string; topics: string[]; entities: string[] }> = [
  { keyword: "bitcoin+cryptocurrency", topics: ["crypto"], entities: ["Bitcoin", "Crypto"] },
  { keyword: "artificial+intelligence+AI", topics: ["ai", "technology"], entities: ["AI", "OpenAI"] },
  { keyword: "stock+market+investing", topics: ["stocks", "markets"], entities: ["Stocks", "Markets"] },
  { keyword: "Thailand+economy+baht", topics: ["economy", "thailand"], entities: ["Thailand", "Economy"] },
  { keyword: "Federal+Reserve+interest+rates", topics: ["economy", "markets"], entities: ["Fed", "Economy", "Markets"] },
  { keyword: "Nvidia+semiconductors", topics: ["technology", "stocks"], entities: ["Nvidia", "Technology"] },
  { keyword: "geopolitics+global+tension", topics: ["geopolitics", "politics"], entities: ["Geopolitics"] },
  { keyword: "startup+funding+venture+capital", topics: ["startups", "business"], entities: ["Startups"] },
];

function parseFeedItems(xml: string): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const description = extractTag(block, "description");
    if (title && link) {
      items.push({ title: cleanText(title), link: link.trim(), pubDate, description: cleanText(description) });
    }
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function cleanText(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
}

export class GoogleNewsProvider implements TrendIngestionProvider {
  readonly name = "googlenews";
  readonly enabled = true;

  async ingest(): Promise<TrendItem[]> {
    const items: TrendItem[] = [];

    await Promise.allSettled(
      KEYWORD_FEEDS.map(async ({ keyword, topics, entities }) => {
        try {
          const url = `https://news.google.com/rss/search?q=${keyword}&hl=en-US&gl=US&ceid=US:en`;
          const res = await fetch(url, {
            headers: { "User-Agent": "INFOX-TrendIngestion/1.0" },
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) return;
          const xml = await res.text();
          const raw = parseFeedItems(xml);

          for (const item of raw.slice(0, 8)) {
            items.push({
              id: `gn_${Buffer.from(item.link).toString("base64url").slice(0, 24)}`,
              source: "googlenews",
              title: item.title,
              summary: item.description || null,
              url: item.link,
              entityTags: entities,
              topicTags: topics,
              publishedAt: item.pubDate || null,
              engagementScore: 65,
              sourceTrustScore: 75,
              language: "en",
            });
          }
        } catch {
          // Skip failed keyword
        }
      }),
    );

    return items;
  }
}
