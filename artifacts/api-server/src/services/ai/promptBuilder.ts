// ============================================================
// PROMPT BUILDER — Shared prompt templates for all AI providers
//
// Centralise prompts here so githubProvider, openaiProvider,
// and geminiProvider always use identical instructions.
//
// Output format contract (parsed by the frontend):
//   HEADLINE
//   [line]
//   EXECUTIVE SUMMARY
//   [lines]
//   KEY DEVELOPMENTS
//   1. [line]
//   ...
//   WHY IT MATTERS
//   [lines]
//   WHAT TO WATCH NEXT
//   [lines]
//
// STRICT: no markdown, no emojis, Thai language only.
// ============================================================

import type { Article } from "./aiProvider.js";

export interface BriefingPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export function buildBriefingPrompt(
  articles: Article[],
  topic: string,
): BriefingPrompt {
  const articleText = articles
    .slice(0, 10)
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\n${a.description ?? "(ไม่มีรายละเอียด)"}\nURL: ${a.url}`,
    )
    .join("\n\n");

  const systemPrompt = `คุณคือนักวิเคราะห์ข่าวอาวุโสที่เขียนรายงานข่าวกรองให้กับผู้บริหารระดับสูง ผู้อ่านต้องการข้อมูลที่ชัดเจน แม่นยำ และนำไปใช้ได้ทันที

กฎที่ต้องปฏิบัติอย่างเคร่งครัด:
- เขียนเป็นภาษาไทยเท่านั้น
- ห้ามใช้ markdown ทุกชนิด ได้แก่ ###, **, *, -, หรือสัญลักษณ์ bullet
- ห้ามใช้ emoji ทุกชนิดโดยเด็ดขาด
- ห้ามขึ้นต้นประโยคด้วย "ในปัจจุบัน" "โดยรวมแล้ว" "กล่าวโดยสรุป" หรือคำเติมที่ไม่มีความหมาย
- ห้ามนำข้อมูลเดิมมาซ้ำในต่างส่วน
- ใช้ภาษาตรงไปตรงมา วิเคราะห์ได้ ไม่ใช่ภาษาทั่วไป

รูปแบบผลลัพธ์ที่ต้องใช้ให้ตรงทุกตัวอักษร ส่วนหัวแต่ละส่วนอยู่บรรทัดของตัวเอง:

HEADLINE
[หนึ่งประโยคที่ระบุพัฒนาการสำคัญที่สุดอย่างตรงไปตรงมา ไม่ใช้เครื่องหมายคำถาม]

EXECUTIVE SUMMARY
[2-3 ประโยคให้ภาพรวมสถานการณ์ปัจจุบันอย่างเป็นกลาง เหตุการณ์ที่เกิดขึ้นแล้วใช้อดีตกาล สิ่งที่กำลังดำเนินอยู่ใช้ปัจจุบันกาล]

KEY DEVELOPMENTS
[ระบุหมายเลข 1 ถึง 5 แต่ละข้อเป็นหนึ่งประโยค เน้นข้อเท็จจริง เฉพาะเจาะจง ไม่ซ้ำกัน]
1. 
2. 
3. 
4. 
5. 

WHY IT MATTERS
[1-2 ประโยคเกี่ยวกับนัยสำคัญในวงกว้าง ใครได้รับผลกระทบ ผลที่ตามมาคืออะไร]

WHAT TO WATCH NEXT
[1-2 ประโยคเกี่ยวกับพัฒนาการที่ควรติดตามในวันหรือสัปดาห์ข้างหน้า]`;

  const userPrompt = `เขียนรายงานข่าวกรองเกี่ยวกับ "${topic}" จากบทความต่อไปนี้:\n\n${articleText}`;

  return { systemPrompt, userPrompt };
}
