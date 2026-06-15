// ============================================================
// GITHUB MODELS PROVIDER
//
// Uses the GitHub Models API — an OpenAI-compatible endpoint
// served via Azure AI Inference.
//
// Docs: https://docs.github.com/en/github-models
// Base URL: https://models.inference.ai.azure.com
// Auth: Bearer GITHUB_TOKEN (GitHub Personal Access Token)
//
// Required env var: GITHUB_TOKEN
// Active when: AI_PROVIDER=github (default)
// ============================================================

import OpenAI from "openai";
import type { AIProvider, Article } from "./aiProvider.js";
import { buildBriefingPrompt } from "./promptBuilder.js";
import { logger } from "../../lib/logger.js";

const GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com";
const DEFAULT_MODEL = "gpt-4o-mini";

export class GithubProvider implements AIProvider {
  readonly providerName = "github";
  private client: OpenAI;

  constructor(token: string) {
    this.client = new OpenAI({
      baseURL: GITHUB_MODELS_BASE_URL,
      apiKey: token,
    });
  }

  /**
   * Low-level: call the model with any system + user prompt.
   * Used by both summarize() and delivery briefing generation.
   */
  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const startMs = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from GitHub Models API");
      }

      logger.info(
        { provider: this.providerName, model: DEFAULT_MODEL, durationMs: Date.now() - startMs },
        "AI summary generated",
      );

      return content;
    } catch (err) {
      logger.error(
        { provider: this.providerName, model: DEFAULT_MODEL, durationMs: Date.now() - startMs, err: String(err) },
        "AI completion failed",
      );
      throw err;
    }
  }

  async summarize(articles: Article[], topic: string): Promise<string> {
    const { systemPrompt, userPrompt } = buildBriefingPrompt(articles, topic);
    return this.complete(systemPrompt, userPrompt);
  }
}
