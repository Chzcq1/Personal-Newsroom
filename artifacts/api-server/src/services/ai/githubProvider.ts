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
//
// Free models available on GitHub Models:
//   - gpt-4o-mini       (used here — fast, good quality)
//   - Phi-3.5-mini-instruct
//   - Meta-Llama-3.1-8B-Instruct
//
// To change the model, update DEFAULT_MODEL below.
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
        "AI summarization failed",
      );
      throw err;
    }
  }
}
