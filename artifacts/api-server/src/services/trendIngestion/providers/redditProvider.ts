// Reddit RSS provider — ingests top posts from finance/tech/social subreddits
import type { TrendIngestionProvider, TrendItem } from "../index.js";

const SUBREDDIT_FEEDS: Array<{ url: string; topics: string[]; entities: string[] }> = [
  // Finance & Stocks
  { url: "https://www.reddit.com/r/CryptoCurrency/hot.rss?limit=20", topics: ["crypto"], entities: ["Bitcoin", "Ethereum", "Crypto"] },
  { url: "https://www.reddit.com/r/stocks/hot.rss?limit=20", topics: ["stocks", "markets"], entities: ["Stocks", "Markets"] },
  { url: "https://www.reddit.com/r/wallstreetbets/hot.rss?limit=15", topics: ["stocks", "markets"], entities: ["Stocks", "Wall Street", "Options"] },
  { url: "https://www.reddit.com/r/investing/hot.rss?limit=15", topics: ["stocks", "economy"], entities: ["Investing", "Markets", "Economy"] },
  // AI & Technology
  { url: "https://www.reddit.com/r/artificial/hot.rss?limit=20", topics: ["ai", "technology"], entities: ["AI", "OpenAI", "Anthropic"] },
  { url: "https://www.reddit.com/r/MachineLearning/hot.rss?limit=15", topics: ["ai"], entities: ["AI", "Machine Learning", "Research"] },
  { url: "https://www.reddit.com/r/technology/hot.rss?limit=20", topics: ["technology"], entities: ["Technology"] },
  { url: "https://www.reddit.com/r/singularity/hot.rss?limit=15", topics: ["ai", "technology"], entities: ["AI", "Singularity", "Future"] },
  // Gaming
  { url: "https://www.reddit.com/r/gaming/hot.rss?limit=15", topics: ["gaming", "technology"], entities: ["Gaming", "Nintendo", "Steam"] },
  { url: "https://www.reddit.com/r/Games/hot.rss?limit=15", topics: ["gaming"], entities: ["Gaming", "PlayStation", "Xbox"] },
  // Business & Economy
  { url: "https://www.reddit.com/r/geopolitics/hot.rss?limit=15", topics: ["geopolitics", "politics"], entities: ["Geopolitics"] },
  { url: "https://www.reddit.com/r/startups/hot.rss?limit=15", topics: ["startups", "business"], entities: ["Startups"] },
  { url: "https://www.reddit.com/r/Economics/hot.rss?limit=15", topics: ["economy"], entities: ["Economy", "Fed", "Inflation"] },
  // Social & Trending
  { url: "https://www.reddit.com/r/worldnews/hot.rss?limit=20", topics: ["politics", "geopolitics"], entities: ["World News"] },
  { url: "https://www.reddit.com/r/Futurology/hot.rss?limit=15", topics: ["technology", "ai"], entities: ["Future", "Technology", "AI"] },
  // EV & Climate
  { url: "https://www.reddit.com/r/electricvehicles/hot.rss?limit=15", topics: ["ev", "technology"], entities: ["EV", "Tesla", "BYD"] },
];

function parseFeedItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const itemRegex = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractLinkHref(block);
    const description = extractTag(block, "description") || extractTag(block, "summary");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated");
    if (title && link && !link.includes("reddit.com/r/") === false) {
      items.push({ title: cleanText(title), link, description: cleanText(description), pubDate });
    }
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function extractLinkHref(xml: string): string {
  const m = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
  return m ? m[1] : "";
}

function cleanText(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

export class RedditProvider implements TrendIngestionProvider {
  readonly name = "reddit";
  readonly enabled = true;

  async ingest(): Promise<TrendItem[]> {
    const items: TrendItem[] = [];

    await Promise.allSettled(
      SUBREDDIT_FEEDS.map(async ({ url, topics, entities }) => {
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "INFOX-TrendIngestion/1.0 (contact@infox.ai)" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return;
          const xml = await res.text();
          const raw = parseFeedItems(xml);

          for (const item of raw) {
            items.push({
              id: `reddit_${Buffer.from(item.link).toString("base64url").slice(0, 24)}`,
              source: "reddit",
              title: item.title,
              summary: item.description || null,
              url: item.link,
              entityTags: entities,
              topicTags: topics,
              publishedAt: item.pubDate || null,
              engagementScore: 50,
              sourceTrustScore: 55,
              language: "en",
            });
          }
        } catch {
          // Skip failed subreddit
        }
      }),
    );

    return items;
  }
}
