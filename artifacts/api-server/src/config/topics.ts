// ============================================================
// TOPICS CONFIG — Available news topics and their RSS sources
//
// To add a topic:
//   1. Add an entry to TOPICS array below
//   2. Add RSS feed URLs to TOPIC_RSS_FEEDS for the same id
//
// RSS feeds should be stable, publicly accessible endpoints.
// Use 2-4 feeds per topic for breadth without over-fetching.
// ============================================================

export interface TopicDefinition {
  id: string;
  label: string;
  labelTh: string;
  icon: string;
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

export const TOPIC_RSS_FEEDS: Record<string, string[]> = {
  ai: [
    "https://venturebeat.com/feed/",
    "https://techcrunch.com/feed/",
    "https://www.technologyreview.com/feed/",
  ],
  technology: [
    "https://feeds.arstechnica.com/arstechnica/technology-lab",
    "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    "https://www.theverge.com/rss/index.xml",
  ],
  stocks: [
    "https://finance.yahoo.com/news/rssindex",
    "https://feeds.marketwatch.com/marketwatch/topstories/",
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
  ],
  economy: [
    "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml",
    "https://feeds.bbci.co.uk/news/business/rss.xml",
    "https://www.economist.com/finance-and-economics/rss.xml",
  ],
  politics: [
    "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml",
    "https://feeds.bbci.co.uk/news/politics/rss.xml",
    "https://www.politico.com/rss/politicopicks.xml",
  ],
};

export function getTopicById(id: string): TopicDefinition | undefined {
  return TOPICS.find((t) => t.id === id);
}
