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

const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAIProvider implements AIProvider {
  readonly providerName = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async summarize(articles: Article[], topic: string): Promise<string> {
    const articleText = articles
      .slice(0, 10)
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
