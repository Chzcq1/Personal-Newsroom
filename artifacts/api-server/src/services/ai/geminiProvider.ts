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
// To change the model, update DEFAULT_MODEL below.
// Available models: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, Article } from "./aiProvider.js";

const DEFAULT_MODEL = "gemini-1.5-flash";

export class GeminiProvider implements AIProvider {
  readonly providerName = "gemini";
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async summarize(articles: Article[], topic: string): Promise<string> {
    const articleText = articles
      .slice(0, 10)
      .map(
        (a, i) =>
          `${i + 1}. ${a.title}\n${a.description ?? "(ไม่มีรายละเอียด)"}\nURL: ${a.url}`,
      )
      .join("\n\n");

    const model = this.genAI.getGenerativeModel({ model: DEFAULT_MODEL });

    const prompt = `คุณคือผู้ช่วยสรุปข่าวที่เชี่ยวชาญ

สรุปข่าวเกี่ยวกับ "${topic}" จากบทความต่อไปนี้เป็นภาษาไทย:

${articleText}

รูปแบบการสรุป:
1. ภาพรวมสถานการณ์ (2-3 ประโยค)
2. ประเด็นสำคัญ 3-5 ข้อ (ใช้ bullet points)
3. สรุปผลกระทบหรือแนวโน้ม (1-2 ประโยค)

สรุปเป็นภาษาไทยที่กระชับ ชัดเจน และเข้าใจง่าย`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text() ?? "ไม่สามารถสรุปข่าวได้ในขณะนี้";
  }
}
