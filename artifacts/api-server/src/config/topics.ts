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
//     Economy → "globe" | Politics → "landmark" | Thai → "flag"
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
  lang?: "th" | "en";
}

export const TOPICS: TopicDefinition[] = [
  {
    id: "thai-news",
    label: "Thai News",
    labelTh: "ข่าวไทย",
    icon: "flag",
  },
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
  // ── ข่าวไทย (Thai News) ──────────────────────────────────────
  // Mix of Thai-language and English-language Thai media
  "thai-news": [
    { name: "มติชน", url: "https://www.matichon.co.th/feed", lang: "th" },
    { name: "ข่าวสด", url: "https://www.khaosod.co.th/feed", lang: "th" },
    { name: "ประชาไท", url: "https://prachatai.com/feed", lang: "th" },
    { name: "The Standard", url: "https://thestandard.co/feed/", lang: "th" },
    { name: "Bangkok Post", url: "https://www.bangkokpost.com/rss/data/topstories.xml", lang: "en" },
    { name: "The Nation Thailand", url: "https://www.nationthailand.com/rss.xml", lang: "en" },
    { name: "Prachachat", url: "https://www.prachachat.net/feed", lang: "th" },
    { name: "ไทยรัฐ", url: "https://www.thairath.co.th/rss/news.rss", lang: "th" },
  ],

  // ── AI ────────────────────────────────────────────────────────
  ai: [
    { name: "VentureBeat", url: "https://venturebeat.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/" },
    { name: "Ars Technica AI", url: "https://feeds.arstechnica.com/arstechnica/index" },
    { name: "Wired", url: "https://www.wired.com/feed/rss" },
    { name: "The Verge AI", url: "https://www.theverge.com/rss/index.xml" },
    { name: "The Standard Tech", url: "https://thestandard.co/feed/", lang: "th" },
    { name: "Brand Inside", url: "https://brandinside.asia/feed/", lang: "th" },
  ],

  // ── Technology ────────────────────────────────────────────────
  technology: [
    { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    { name: "Hacker News", url: "https://hnrss.org/frontpage" },
    { name: "Engadget", url: "https://www.engadget.com/rss.xml" },
    { name: "ZDNet", url: "https://www.zdnet.com/news/rss.xml" },
    { name: "Brand Inside", url: "https://brandinside.asia/feed/", lang: "th" },
    { name: "The Thaiger Tech", url: "https://thethaiger.com/feed", lang: "en" },
  ],

  // ── Stocks & Markets ─────────────────────────────────────────
  stocks: [
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
    { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/" },
    { name: "CNBC Markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
    { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews" },
    { name: "Seeking Alpha", url: "https://seekingalpha.com/feed.xml" },
    { name: "ประชาชาติธุรกิจ", url: "https://www.prachachat.net/feed", lang: "th" },
    { name: "Bangkok Post Business", url: "https://www.bangkokpost.com/rss/data/business.xml", lang: "en" },
  ],

  // ── Economy ─────────────────────────────────────────────────
  economy: [
    { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
    { name: "The Economist", url: "https://www.economist.com/finance-and-economics/rss.xml" },
    { name: "Reuters Economy", url: "https://feeds.reuters.com/reuters/businessNews" },
    { name: "FT Economics", url: "https://www.ft.com/rss/home/uk" },
    { name: "Bloomberg Economics", url: "https://feeds.bloomberg.com/markets/news.rss" },
    { name: "มติชนเศรษฐกิจ", url: "https://www.matichon.co.th/feed", lang: "th" },
    { name: "ประชาชาติธุรกิจ", url: "https://www.prachachat.net/feed", lang: "th" },
  ],

  // ── Politics ─────────────────────────────────────────────────
  politics: [
    { name: "BBC Politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml" },
    { name: "Politico", url: "https://www.politico.com/rss/politicopicks.xml" },
    { name: "Reuters Politics", url: "https://feeds.reuters.com/Reuters/PoliticsNews" },
    { name: "AP Politics", url: "https://feeds.apnews.com/apnews/politics" },
    { name: "The Hill", url: "https://thehill.com/feed/" },
    { name: "ประชาไท", url: "https://prachatai.com/feed", lang: "th" },
    { name: "มติชน", url: "https://www.matichon.co.th/feed", lang: "th" },
    { name: "Bangkok Post Politics", url: "https://www.bangkokpost.com/rss/data/politics.xml", lang: "en" },
  ],
};

export function getTopicById(id: string): TopicDefinition | undefined {
  return TOPICS.find((t) => t.id === id);
}
