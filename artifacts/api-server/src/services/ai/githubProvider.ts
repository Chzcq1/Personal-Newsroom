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

const GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com";
const DEFAULT_MODEL = "gpt-4o-mini";

export class GithubProvider implements AIProvider {
  readonly providerName = "github";
  private client: OpenAI;

  constructor(token: string) {
    // GitHub Models is OpenAI-compatible — only the baseURL and apiKey differ
    this.client = new OpenAI({
      baseURL: GITHUB_MODELS_BASE_URL,
      apiKey: token,
    });
  }

  async summarize(articles: Article[], topic: string): Promise<string> {
    const articleText = articles
      .slice(0, 10) // Limit to 10 articles to stay within token budget
      .map(
        (a, i) =>
          `${i + 1}. ${a.title}\n${a.description ?? "(ไม่มีรายละเอียด)"}\nURL: ${a.url}`,
      )
      .join("\n\n");

    const response = await this.client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "คุณคือผู้ช่วยสรุปข่าวที่เชี่ยวชาญ สรุปข่าวเป็นภาษาไทยที่กระชับ ชัดเจน และเข้าใจง่าย ไม่ใช้ศัพท์เทคนิคโดยไม่จำเป็น",
        },
        {
          role: "user",
          content: `สรุปข่าวเกี่ยวกับ "${topic}" จากบทความต่อไปนี้เป็นภาษาไทย:\n\n${articleText}\n\nรูปแบบการสรุป:\n1. ภาพรวมสถานการณ์ (2-3 ประโยค)\n2. ประเด็นสำคัญ 3-5 ข้อ (ใช้ bullet points)\n3. สรุปผลกระทบหรือแนวโน้ม (1-2 ประโยค)`,
        },
      ],
      max_tokens: 1024,
    });

    return (
      response.choices[0]?.message?.content ?? "ไม่สามารถสรุปข่าวได้ในขณะนี้"
    );
  }
}
