// ============================================================
// TOPICS CONFIG — Available news topics and their RSS sources
//
// To add a topic:
//   1. Add an entry to TOPICS array
//   2. Add a matching entry to TOPIC_RSS_SOURCES with name+url pairs
//
// Rules:
//   - Use at least 5 sources per topic (guarantees 10+ articles even if 2-3 fail)
//   - Prefer stable, publicly accessible endpoints
//   - name field becomes the displayed source attribution in the UI
//   - icon field: Lucide React icon name (lowercase kebab matches LucideIcon import)
//     AI → "cpu" | Technology → "laptop" | Stocks → "bar-chart-2"
//     Economy → "globe" | Politics → "landmark"
// ============================================================

export interface TopicDefinition {
  id: string;
  label: string;
  labelTh: string;
  icon: string;
}

export interface RssSource {
  name: string;
  url: string;
}

export const TOPICS: TopicDefinition[] = [
  {
    id: "ai",
    label: "Artificial Intelligence",
    labelTh: "ปัญญาประดิษฐ์",
    icon: "cpu",
  },
  {
    id: "technology",
    label: "Technology",
    labelTh: "เทคโนโลยี",
    icon: "laptop",
  },
  {
    id: "stocks",
    label: "Stocks & Markets",
    labelTh: "หุ้นและตลาดการเงิน",
    icon: "bar-chart-2",
  },
  {
    id: "economy",
    label: "Economy",
    labelTh: "เศรษฐกิจ",
    icon: "globe",
  },
  {
    id: "politics",
    label: "Politics",
    labelTh: "การเมือง",
    icon: "landmark",
  },
];

export const TOPIC_RSS_SOURCES: Record<string, RssSource[]> = {
  ai: [
    { name: "VentureBeat", url: "https://venturebeat.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/" },
    { name: "Ars Technica AI", url: "https://feeds.arstechnica.com/arstechnica/index" },
    { name: "Wired", url: "https://www.wired.com/feed/rss" },
    { name: "The Verge AI", url: "https://www.theverge.com/rss/index.xml" },
  ],
  technology: [
    // 6 sources — technology has historically had the most feed failures.
    // Prefer sources that do not require authentication or paywalls.
    { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    { name: "Hacker News", url: "https://hnrss.org/frontpage" },
    { name: "Engadget", url: "https://www.engadget.com/rss.xml" },
    { name: "ZDNet", url: "https://www.zdnet.com/news/rss.xml" },
  ],
  stocks: [
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
    { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/" },
    { name: "CNBC Markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
    { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews" },
    { name: "Seeking Alpha", url: "https://seekingalpha.com/feed.xml" },
  ],
  economy: [
    { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
    { name: "The Economist", url: "https://www.economist.com/finance-and-economics/rss.xml" },
    { name: "Reuters Economy", url: "https://feeds.reuters.com/reuters/businessNews" },
    { name: "FT Economics", url: "https://www.ft.com/rss/home/uk" },
    { name: "Bloomberg Economics", url: "https://feeds.bloomberg.com/markets/news.rss" },
  ],
  politics: [
    { name: "BBC Politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml" },
    { name: "Politico", url: "https://www.politico.com/rss/politicopicks.xml" },
    { name: "Reuters Politics", url: "https://feeds.reuters.com/Reuters/PoliticsNews" },
    { name: "AP Politics", url: "https://feeds.apnews.com/apnews/politics" },
    { name: "The Hill", url: "https://thehill.com/feed/" },
  ],
};

export function getTopicById(id: string): TopicDefinition | undefined {
  return TOPICS.find((t) => t.id === id);
}
