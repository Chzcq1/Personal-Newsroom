// ============================================================
// GOOGLE GEMINI PROVIDER
//
// Uses the Google Generative AI (Gemini) API.
//
// Docs: https://ai.google.dev/docs
// Required env var: GEMINI_API_KEY
// Active when: AI_PROVIDER=gemini
//
// To switch to this provider:
//   Set AI_PROVIDER=gemini in your environment variables.
//   Ensure GEMINI_API_KEY is set in Replit Secrets.
//   Get an API key at: https://aistudio.google.com/app/apikey
//
// Available models: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, Article } from "./aiProvider.js";
import { buildBriefingPrompt } from "./promptBuilder.js";
import { logger } from "../../lib/logger.js";

const DEFAULT_MODEL = "gemini-1.5-flash";

export class GeminiProvider implements AIProvider {
  readonly providerName = "gemini";
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async summarize(articles: Article[], topic: string): Promise<string> {
    const { systemPrompt, userPrompt } = buildBriefingPrompt(articles, topic);
    const startMs = Date.now();

    try {
      const model = this.genAI.getGenerativeModel({
        model: DEFAULT_MODEL,
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userPrompt);
      const text = result.response.text();

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      logger.info(
        { provider: this.providerName, model: DEFAULT_MODEL, durationMs: Date.now() - startMs },
        "AI summary generated",
      );

      return text;
    } catch (err) {
      logger.error(
        { provider: this.providerName, model: DEFAULT_MODEL, durationMs: Date.now() - startMs, err: String(err) },
        "AI summarization failed",
      );
      throw err;
    }
  }
}
