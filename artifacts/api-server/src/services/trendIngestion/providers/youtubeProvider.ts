// YouTube RSS provider — ingests recent videos from finance/AI channels
import type { TrendIngestionProvider, TrendItem } from "../index.js";

const YOUTUBE_CHANNELS: Array<{ channelId: string; name: string; topics: string[]; entities: string[] }> = [
  { channelId: "UCrp_UI8XtuYfpiqluWLD7Lw", name: "CNBC", topics: ["markets", "economy", "stocks"], entities: ["Markets", "Economy"] },
  { channelId: "UCIALMKvObZNtJ6AmdCLP7Lg", name: "Bloomberg", topics: ["markets", "economy", "business"], entities: ["Markets", "Bloomberg"] },
  { channelId: "UCCjyq_K1Xwfg8Lndy7lKMpA", name: "TechCrunch", topics: ["technology", "ai", "startups"], entities: ["Technology", "AI"] },
  { channelId: "UCSHZKyawb77ixDdsGog4iWA", name: "Lex Fridman", topics: ["ai", "technology"], entities: ["AI", "Technology"] },
  { channelId: "UCbfYPyITQ-7l4upoX8nvctg", name: "Two Minute Papers", topics: ["ai"], entities: ["AI", "Research"] },
];

function parseYoutubeItems(xml: string): Array<{ title: string; link: string; published: string; description: string }> {
  const items: Array<{ title: string; link: string; published: string; description: string }> = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let m;
  while ((m = entryRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title");
    const linkMatch = block.match(/<link[^>]+href="([^"]+)"/i);
    const link = linkMatch ? linkMatch[1] : "";
    const published = extractTag(block, "published");
    const description = extractTag(block, "media:description") || extractTag(block, "description");
    if (title && link) {
      items.push({ title: cleanText(title), link, published, description: cleanText(description) });
    }
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  const escaped = tag.replace(":", "\\:");
  const m = xml.match(new RegExp(`<${escaped}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${escaped}>`, "i"));
  return m ? m[1].trim() : "";
}

function cleanText(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

export class YouTubeProvider implements TrendIngestionProvider {
  readonly name = "youtube";
  readonly enabled = true;

  async ingest(): Promise<TrendItem[]> {
    const items: TrendItem[] = [];

    await Promise.allSettled(
      YOUTUBE_CHANNELS.map(async ({ channelId, name, topics, entities }) => {
        try {
          const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) return;
          const xml = await res.text();
          const raw = parseYoutubeItems(xml);

          for (const item of raw.slice(0, 10)) {
            items.push({
              id: `yt_${Buffer.from(item.link).toString("base64url").slice(0, 24)}`,
              source: "youtube",
              title: `[${name}] ${item.title}`,
              summary: item.description || null,
              url: item.link,
              entityTags: entities,
              topicTags: topics,
              publishedAt: item.published || null,
              engagementScore: 60,
              sourceTrustScore: 70,
              language: "en",
            });
          }
        } catch {
          // Skip failed channel
        }
      }),
    );

    return items;
  }
}
