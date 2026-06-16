// ============================================================
// MULTIMODAL PREPARATION — Sprint 13 Task H
//
// Architecture contracts for future audio, voice, podcast,
// and image-aware intelligence delivery.
//
// Current state: interface definitions and routing stubs only.
// No audio generation — architecture readiness only.
//
// Future delivery modes:
//   1. Audio briefings (TTS: ElevenLabs / Azure / OpenAI TTS)
//   2. AI voice summaries (streaming audio)
//   3. Podcast-style delivery (multi-segment, intro/outro)
//   4. Image-aware intelligence (article thumbnail analysis)
//   5. Chart rendering (data → visual → image briefing)
// ============================================================

// ── Delivery mode contracts ────────────────────────────────────

export type DeliveryMode =
  | "text"       // Current: Telegram HTML
  | "audio"      // Future: TTS audio file (MP3/OGG)
  | "voice"      // Future: streaming voice message
  | "podcast"    // Future: multi-segment audio with music
  | "visual"     // Future: image card (PNG)
  | "chart";     // Future: chart image (SVG → PNG)

export interface MultimodalDeliveryRequest {
  mode: DeliveryMode;
  briefingType: "morning" | "evening" | "executive" | "intelligence";
  rawBriefingText: string;
  topicLabels: string[];
  articleCount: number;
  // Audio-specific
  audio?: {
    voiceId?: string;        // ElevenLabs voice ID or Azure voice name
    speedMultiplier?: number; // 0.8–1.2
    addMusicBed?: boolean;    // background ambient music
    format?: "mp3" | "ogg" | "wav";
  };
  // Visual-specific
  visual?: {
    width?: number;
    height?: number;
    brandTheme?: "dark" | "light";
    includeChart?: boolean;
  };
}

export interface MultimodalDeliveryResult {
  mode: DeliveryMode;
  ready: boolean;
  // For future implementations:
  audioUrl?: string;
  imageUrl?: string;
  durationSeconds?: number;
  error?: string;
}

// ── Audio briefing contract ────────────────────────────────────

export interface AudioBriefingSegment {
  type: "intro" | "headline" | "development" | "analysis" | "outro";
  text: string;
  estimatedSeconds: number;
  pauseAfterMs?: number;
}

/**
 * Convert a briefing text into a podcast-ready segment list.
 * Each segment maps to one TTS call (future).
 */
export function buildAudioSegments(rawText: string): AudioBriefingSegment[] {
  const lines = rawText.split("\n").filter((l) => l.trim());
  const segments: AudioBriefingSegment[] = [];

  // Intro
  segments.push({
    type: "intro",
    text: "INFOX Intelligence Briefing",
    estimatedSeconds: 2,
    pauseAfterMs: 800,
  });

  let currentType: AudioBriefingSegment["type"] = "headline";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect section changes
    if (trimmed.match(/HEADLINE|MORNING BRIEFING|EVENING RECAP|EXECUTIVE BRIEFING/)) {
      currentType = "headline";
    } else if (trimmed.match(/KEY DEVELOPMENTS|TOP DEVELOPMENTS|WHAT HAPPENED/)) {
      currentType = "development";
    } else if (trimmed.match(/IMPACT ANALYSIS|WHAT CHANGED|EXECUTIVE SUMMARY/)) {
      currentType = "analysis";
    }

    const wordCount = trimmed.split(/\s+/).length;
    const estimatedSeconds = Math.ceil(wordCount / 2.5); // ~150 WPM Thai

    segments.push({
      type: currentType,
      text: trimmed,
      estimatedSeconds,
      pauseAfterMs: currentType === "headline" ? 500 : 200,
    });
  }

  // Outro
  segments.push({
    type: "outro",
    text: "ติดตาม INFOX ได้ทุกวัน",
    estimatedSeconds: 2,
  });

  return segments;
}

/**
 * Estimate total audio duration from segments.
 */
export function estimateAudioDuration(segments: AudioBriefingSegment[]): number {
  return segments.reduce((sum, s) => {
    return sum + s.estimatedSeconds + (s.pauseAfterMs ?? 0) / 1000;
  }, 0);
}

// ── Image-aware intelligence contract ─────────────────────────

export interface ArticleImageContext {
  url: string;
  altText: string;
  source: string;
  relevanceScore: number; // 0–100
  // Future: AI caption, object detection, chart flag
  estimatedHasChart: boolean;
  estimatedSubject?: string;
}

/**
 * Score article images for relevance to briefing content.
 * Current: heuristic only (URL pattern matching).
 * Future: vision model analysis.
 */
export function scoreArticleImages(
  articles: Array<{ imageUrl?: string; title?: string; source?: string }>,
): ArticleImageContext[] {
  return articles
    .filter((a) => a.imageUrl)
    .map((a) => {
      const url = a.imageUrl!;
      const lowerUrl = url.toLowerCase();

      // Heuristic: chart/graph detection from URL patterns
      const estimatedHasChart =
        lowerUrl.includes("chart") ||
        lowerUrl.includes("graph") ||
        lowerUrl.includes("data-vis") ||
        lowerUrl.includes("infograph");

      // Relevance: prefer images from known quality sources
      const relevanceScore = a.source
        ? (["Bloomberg", "FT", "Reuters"].some((s) => a.source?.includes(s)) ? 80 : 60)
        : 40;

      return {
        url,
        altText: a.title ?? "",
        source: a.source ?? "",
        relevanceScore,
        estimatedHasChart,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ── Chart rendering contract ───────────────────────────────────

export interface ChartRenderRequest {
  type: "line" | "bar" | "pie" | "area";
  title: string;
  data: Array<{ label: string; value: number }>;
  unit?: string;
  color?: string;
}

/**
 * Placeholder for future chart → PNG pipeline.
 * Will use: D3 → canvas → sharp → PNG buffer.
 */
export function prepareChartRenderRequest(
  _request: ChartRenderRequest,
): { ready: boolean; reason: string } {
  return {
    ready: false,
    reason: "Chart rendering pipeline not yet implemented. Target: D3 + canvas + sharp.",
  };
}

// ── Multimodal readiness check ─────────────────────────────────

export interface MultimodalReadinessReport {
  text: { ready: true };
  audio: { ready: false; blocker: string };
  voice: { ready: false; blocker: string };
  podcast: { ready: false; blocker: string };
  visual: { ready: false; blocker: string };
  chart: { ready: false; blocker: string };
}

export function getMultimodalReadiness(): MultimodalReadinessReport {
  return {
    text: { ready: true },
    audio: { ready: false, blocker: "TTS provider not configured (ElevenLabs / Azure / OpenAI TTS)" },
    voice: { ready: false, blocker: "Streaming audio not configured; Telegram voice message API not integrated" },
    podcast: { ready: false, blocker: "Audio segments ready but no TTS + audio stitching pipeline" },
    visual: { ready: false, blocker: "Image card renderer not implemented (target: html2canvas or Puppeteer)" },
    chart: { ready: false, blocker: "Chart renderer not implemented (target: D3 + canvas + sharp)" },
  };
}
