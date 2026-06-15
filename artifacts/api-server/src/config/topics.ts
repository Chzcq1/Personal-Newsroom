// ============================================================
// TOPICS CONFIG — Available news topics and their RSS sources
//
// To add a topic:
//   1. Add an entry to TOPICS array
//   2. Add a matching entry to TOPIC_RSS_SOURCES with name+url pairs
//
// Rules:
//   - Use at least 4 sources per topic (guarantees 10+ articles even if 1-2 fail)
//   - Prefer stable, publicly accessible endpoints
//   - name field becomes the displayed source attribution in the UI
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
    icon: "🤖",
  },
  {
    id: "technology",
    label: "Technology",
    labelTh: "เทคโนโลยี",
    icon: "💻",
  },
  {
    id: "stocks",
    label: "Stocks & Markets",
    labelTh: "หุ้นและตลาดการเงิน",
    icon: "📈",
  },
  {
    id: "economy",
    label: "Economy",
    labelTh: "เศรษฐกิจ",
    icon: "🌐",
  },
  {
    id: "politics",
    label: "Politics",
    labelTh: "การเมือง",
    icon: "🏛️",
  },
];

export const TOPIC_RSS_SOURCES: Record<string, RssSource[]> = {
  ai: [
    { name: "VentureBeat", url: "https://venturebeat.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/" },
    { name: "Ars Technica AI", url: "https://feeds.arstechnica.com/arstechnica/index" },
    { name: "Wired", url: "https://www.wired.com/feed/rss" },
  ],
  technology: [
    // 5 sources so at least 10 articles survive even if 2 feeds fail
    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "Wired", url: "https://www.wired.com/feed/rss" },
    { name: "NY Times Technology", url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml" },
  ],
  stocks: [
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
    { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/" },
    { name: "CNBC Markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
    { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews" },
  ],
  economy: [
    { name: "NY Times Economy", url: "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml" },
    { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
    { name: "The Economist", url: "https://www.economist.com/finance-and-economics/rss.xml" },
    { name: "Reuters Economy", url: "https://feeds.reuters.com/reuters/businessNews" },
  ],
  politics: [
    { name: "NY Times Politics", url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml" },
    { name: "BBC Politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml" },
    { name: "Politico", url: "https://www.politico.com/rss/politicopicks.xml" },
    { name: "Reuters Politics", url: "https://feeds.reuters.com/Reuters/PoliticsNews" },
  ],
};

export function getTopicById(id: string): TopicDefinition | undefined {
  return TOPICS.find((t) => t.id === id);
}
