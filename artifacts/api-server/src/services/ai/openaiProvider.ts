// ============================================================
// OPENAI PROVIDER
//
// Uses the standard OpenAI API.
//
// Docs: https://platform.openai.com/docs
// Required env var: OPENAI_API_KEY
// Active when: AI_PROVIDER=openai
//
// To switch to this provider:
//   Set AI_PROVIDER=openai in your environment variables.
//   Ensure OPENAI_API_KEY is set in Replit Secrets.
//
// To change the model, update DEFAULT_MODEL below.
// ============================================================

import OpenAI from "openai";
import type { AIProvider, Article } from "./aiProvider.js";
import { buildBriefingPrompt } from "./promptBuilder.js";
import { logger } from "../../lib/logger.js";

const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAIProvider implements AIProvider {
  readonly providerName = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async summarize(articles: Article[], topic: string): Promise<string> {
    const { systemPrompt, userPrompt } = buildBriefingPrompt(articles, topic);
    const startMs = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI API");
      }

      logger.info(
        { provider: this.providerName, model: DEFAULT_MODEL, durationMs: Date.now() - startMs },
        "AI summary generated",
      );

      return content;
    } catch (err) {
      logger.error(
        { provider: this.providerName, model: DEFAULT_MODEL, durationMs: Date.now() - startMs, err: String(err) },
        "AI summarization failed",
      );
      throw err;
    }
  }
}
