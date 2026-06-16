// ============================================================
// PROMPT BUILDER — Sprint 8 update
//
// Four prompt types:
//   buildBriefingPrompt()        — Standard topic briefing (home page)
//   buildMorningBriefingPrompt() — Morning cross-topic briefing
//   buildEveningBriefingPrompt() — Evening daily recap
//   buildExecutiveBriefingPrompt() — 5-bullet executive mode (Task G)
//
// Sprint 8 additions:
//   Task E — Personality UI: all personalities now fully described
//   Task G — Executive mode: 5-bullet, impact-first, ≤90s reading
//   Task C — Story evolution context support in all prompts
//
// STRICT: no markdown, no emojis in output, Thai language only.
// ============================================================

import type { Article } from "./aiProvider.js";

export interface BriefingPrompt {
  systemPrompt: string;
  userPrompt: string;
}

// ── Personality Foundation ───────────────────────────────────

export type BriefingPersonality =
  | "analyst"
  | "concise"
  | "financial"
  | "neutral"
  | "aggressive";

const PERSONALITY_INSTRUCTIONS: Record<BriefingPersonality, string> = {
  analyst:
    "วิเคราะห์เชิงลึก เน้นผลกระทบเชิงโครงสร้างและนัยระยะยาว อ้างอิงข้อมูลและตัวเลขเสมอ ระบุสาเหตุและผลลัพธ์ที่เชื่อมโยงกัน",
  concise:
    "กระชับ ตรงประเด็น ไม่ยืดเยื้อ เน้นข้อเท็จจริงที่สำคัญที่สุดในแต่ละจุด ตัดคำฟุ่มเฟือยออกทั้งหมด",
  financial:
    "เน้นมุมมองการลงทุน ราคาหลักทรัพย์ ผลประกอบการ กำไร-ขาดทุน และนัยต่อตลาดการเงินและผู้ถือหุ้น",
  neutral: "รายงานข้อเท็จจริงอย่างสมดุล นำเสนอมุมมองหลายด้าน ไม่แสดงความเห็นส่วนตัวหรือตัดสิน",
  aggressive:
    "ตั้งคำถามท้าทายสมมติฐาน วิเคราะห์ความเสี่ยงที่คนอื่นมองข้าม ระบุสัญญาณเตือนอย่างตรงไปตรงมา และชี้ให้เห็นสิ่งที่อาจผิดพลาด",
};

// ── Shared constraints ───────────────────────────────────────

const SHARED_RULES = `กฎที่ต้องปฏิบัติอย่างเคร่งครัด:
- เขียนเป็นภาษาไทยเท่านั้น ยกเว้นชื่อเฉพาะที่กำหนดด้านล่าง
- ชื่อบริษัท ผลิตภัณฑ์ และเทคโนโลยีให้เขียนเป็นภาษาอังกฤษต้นฉบับเสมอ เช่น OpenAI, Nvidia, Tesla, Claude, GPT-4, Bitcoin, Apple, Google, Meta, Amazon — ห้ามแปลหรือทับศัพท์โดยไม่จำเป็น
- ห้ามใช้ markdown ทุกชนิด ได้แก่ ###, **, *, -, หรือสัญลักษณ์ bullet
- ห้ามใช้ emoji ทุกชนิดโดยเด็ดขาด
- ห้ามขึ้นต้นประโยคด้วย "ในปัจจุบัน" "โดยรวมแล้ว" "กล่าวโดยสรุป" หรือคำเติมที่ไม่มีความหมาย
- ห้ามนำข้อมูลเดิมมาซ้ำในต่างส่วน
- ใช้ภาษาไทยที่เป็นธรรมชาติ กระชับ และวิเคราะห์ได้ — ไม่ใช่การแปลตรงตัวจากบทความภาษาอังกฤษ
- อ้างอิงชื่อองค์กร บุคคล ตัวเลข และวันที่เฉพาะเจาะจงจากบทความที่ให้มา
- สังเคราะห์ข้อมูลจากหลายแหล่ง หากแหล่งข่าวมีข้อมูลขัดแย้งกัน ให้ระบุและวิเคราะห์ความขัดแย้งนั้นด้วย`;

// ── Standard briefing prompt ─────────────────────────────────

export function buildBriefingPrompt(
  articles: Article[],
  topic: string,
  trendContext?: string,
  personality?: BriefingPersonality,
  storyContext?: string,
): BriefingPrompt {
  const articleText = articles
    .slice(0, 10)
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\nแหล่งที่มา: ${(a as { source?: string }).source ?? "ไม่ระบุ"}\n${a.description ?? "(ไม่มีรายละเอียด)"}\nURL: ${a.url}`,
    )
    .join("\n\n");

  const personalityNote = personality
    ? `\nสไตล์การเขียน: ${PERSONALITY_INSTRUCTIONS[personality]}`
    : "";

  const systemPrompt = `คุณคือนักวิเคราะห์ข่าวกรองอาวุโส เขียนรายงานให้ผู้บริหารระดับสูงที่ต้องการข้อมูลเชิงลึก ไม่ใช่แค่ข่าวพาดหัว

พันธกิจของคุณ: วิเคราะห์ ไม่ใช่สรุป ผู้อ่านต้องเข้าใจว่า อะไรเกิดขึ้น ทำไมจึงเกิดขึ้น ใครได้รับผลกระทบ และผลกระทบระยะสั้น (1–4 สัปดาห์) กับระยะยาว (3–12 เดือน) แตกต่างกันอย่างไร

${SHARED_RULES}${personalityNote}
- ความยาวเป้าหมาย: 800–1500 คำภาษาไทย

รูปแบบผลลัพธ์ที่ต้องใช้ให้ตรงทุกตัวอักษร ส่วนหัวแต่ละส่วนอยู่บรรทัดของตัวเอง:

HEADLINE
[หนึ่งประโยคที่ระบุพัฒนาการสำคัญที่สุดอย่างตรงไปตรงมา ไม่ใช้เครื่องหมายคำถาม ระบุชื่อเฉพาะหรือตัวเลขให้ชัดเจน]

EXECUTIVE SUMMARY
[3–4 ประโยคที่ครอบคลุมภาพรวมสถานการณ์ปัจจุบัน ระบุผู้เล่นหลัก เหตุการณ์ที่เกิดขึ้นแล้ว และบริบทที่จำเป็น ใช้อดีตกาลสำหรับเหตุการณ์ที่สิ้นสุดแล้ว ใช้ปัจจุบันกาลสำหรับสิ่งที่กำลังดำเนินอยู่]

KEY DEVELOPMENTS
[ระบุหมายเลข 1 ถึง 5 แต่ละข้อเป็นข้อเท็จจริงเฉพาะเจาะจงที่มีหลักฐานรองรับจากบทความ พร้อมระบุแหล่งที่มาเมื่อเกี่ยวข้อง แต่ละข้ออาจมี 1–2 ประโยค]
1. 
2. 
3. 
4. 
5. 

IMPACT ANALYSIS
[ย่อหน้าที่ 1 — ผลกระทบระยะสั้น (1–4 สัปดาห์): ใครได้รับผลกระทบทันทีและอย่างไร มีตัวเลขหรือข้อเท็จจริงรองรับ]
[ย่อหน้าที่ 2 — ผลกระทบระยะยาว (3–12 เดือน): แนวโน้มเชิงโครงสร้าง การเปลี่ยนแปลงที่ถาวร หรือความเสี่ยงที่ต้องติดตาม]
[ย่อหน้าที่ 3 — หากมีข้อมูลขัดแย้งระหว่างแหล่งข่าว ให้วิเคราะห์ความขัดแย้งนั้นที่นี่]

WHAT TO WATCH NEXT
[2–3 ประโยคระบุเหตุการณ์ การประกาศ หรือตัวชี้วัดเฉพาะที่ผู้อ่านควรติดตามในสัปดาห์ข้างหน้า พร้อมเหตุผลว่าทำไมจึงสำคัญ]`;

  const trendSection = trendContext
    ? `\n\nบริบทย้อนหลัง (Trend Memory):\n${trendContext}\n\nในการวิเคราะห์ให้ระบุด้วยว่า อะไรเปลี่ยนแปลงจากบริบทก่อนหน้า อะไรต่อเนื่อง และอะไรที่เป็นเรื่องใหม่ทั้งหมด`
    : "";

  const storySection = storyContext
    ? `\n\n${storyContext}\n\nใช้บริบทต่อเนื่องนี้เพื่อระบุว่าเรื่องราวใดกำลังพัฒนาต่อเนื่อง และบอกผู้อ่านว่ามีอะไรใหม่หรือเปลี่ยนแปลงไปจากก่อน`
    : "";

  const userPrompt = `เขียนรายงานข่าวกรองเชิงวิเคราะห์เกี่ยวกับ "${topic}" จากบทความต่อไปนี้:${trendSection}${storySection}\n\n${articleText}`;

  return { systemPrompt, userPrompt };
}

// ── Morning briefing prompt ──────────────────────────────────

export function buildMorningBriefingPrompt(
  articles: Article[],
  topicLabels: string[],
  digestContext?: string,
  storyContext?: string,
  personality?: BriefingPersonality,
): BriefingPrompt {
  const articleText = articles
    .slice(0, 12)
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\nแหล่งที่มา: ${(a as { source?: string }).source ?? "ไม่ระบุ"}\n${a.description ?? "(ไม่มีรายละเอียด)"}`,
    )
    .join("\n\n");

  const topicsStr = topicLabels.join(", ");

  const digestSection = digestContext ? `\n\n${digestContext}` : "";
  const storySection = storyContext
    ? `\n\n${storyContext}\n\nอ้างอิงเรื่องราวต่อเนื่องเหล่านี้ในการเขียน เพื่อให้ผู้อ่านเห็นว่าสถานการณ์พัฒนาอย่างไรจากวันก่อน`
    : "";

  const personalityNote = personality
    ? `\nสไตล์การเขียน: ${PERSONALITY_INSTRUCTIONS[personality]}`
    : "";

  const systemPrompt = `คุณคือผู้ช่วยส่วนตัวด้านข่าวกรองที่จัดทำรายงานเช้าสำหรับผู้บริหาร เพื่อให้เขาเริ่มต้นวันด้วยข้อมูลที่สำคัญที่สุด

พันธกิจ: สังเคราะห์ข้อมูลข้ามหัวข้อ (${topicsStr}) และระบุ 5 พัฒนาการสำคัญที่สุดที่เกิดขึ้นในช่วงที่ผ่านมา เน้นสิ่งที่ผู้อ่านต้องรู้ก่อนเริ่มงาน

${SHARED_RULES}${personalityNote}
- ความยาวเป้าหมาย: 400–700 คำภาษาไทย (อ่านจบใน 2–4 นาที)
- เน้นความสั้นกระชับ ตรงประเด็น ไม่ยืดเยื้อ

รูปแบบผลลัพธ์ที่ต้องใช้ให้ตรงทุกตัวอักษร:

MORNING BRIEFING
[หนึ่งประโยค: พัฒนาการสำคัญที่สุดในเช้านี้]

TOP DEVELOPMENTS
1. [พัฒนาการที่ 1 — เฉพาะเจาะจง มีหลักฐาน ระบุชื่อองค์กรหรือตัวเลข]
2. [พัฒนาการที่ 2]
3. [พัฒนาการที่ 3]
4. [พัฒนาการที่ 4]
5. [พัฒนาการที่ 5]

EXECUTIVE SUMMARY
[2–3 ประโยค: ภาพรวมสถานการณ์เช้านี้ในบริบทที่กว้างขึ้น]

IMPACT ANALYSIS
[ย่อหน้าที่ 1 — ผลกระทบที่เกิดขึ้นทันทีวันนี้]
[ย่อหน้าที่ 2 — แนวโน้มระยะกลางที่ต้องจับตา]

WHAT TO WATCH TODAY
[2–3 ประโยค: เหตุการณ์ การประกาศ หรือข้อมูลเศรษฐกิจที่จะเกิดขึ้นวันนี้ และเหตุใดจึงสำคัญ]`;

  const userPrompt = `จัดทำ Morning Intelligence Briefing จากบทความข่าวล่าสุดต่อไปนี้ ซึ่งรวบรวมจากหัวข้อ: ${topicsStr}${digestSection}${storySection}\n\n${articleText}`;

  return { systemPrompt, userPrompt };
}

// ── Evening briefing prompt ──────────────────────────────────

export function buildEveningBriefingPrompt(
  articles: Article[],
  topicLabels: string[],
  digestContext?: string,
  storyContext?: string,
  personality?: BriefingPersonality,
): BriefingPrompt {
  const articleText = articles
    .slice(0, 12)
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\nแหล่งที่มา: ${(a as { source?: string }).source ?? "ไม่ระบุ"}\n${a.description ?? "(ไม่มีรายละเอียด)"}`,
    )
    .join("\n\n");

  const topicsStr = topicLabels.join(", ");

  const digestSection = digestContext ? `\n\n${digestContext}` : "";
  const storySection = storyContext
    ? `\n\n${storyContext}\n\nเปรียบเทียบกับบริบทต่อเนื่องเหล่านี้เพื่อแสดงให้เห็นว่าเรื่องราวพัฒนาอย่างไรตลอดวัน`
    : "";

  const personalityNote = personality
    ? `\nสไตล์การเขียน: ${PERSONALITY_INSTRUCTIONS[personality]}`
    : "";

  const systemPrompt = `คุณคือผู้ช่วยส่วนตัวด้านข่าวกรองที่จัดทำรายงานเย็น เพื่อให้ผู้บริหารเข้าใจสิ่งที่เกิดขึ้นตลอดวัน และเตรียมพร้อมสำหรับวันพรุ่งนี้

พันธกิจ: สังเคราะห์พัฒนาการสำคัญจากหลายหัวข้อ (${topicsStr}) บอกว่าอะไรเปลี่ยนแปลงไปจากเช้า อะไรน่าแปลกใจ และอะไรที่ต้องติดตามพรุ่งนี้

${SHARED_RULES}${personalityNote}
- ความยาวเป้าหมาย: 600–900 คำภาษาไทย (อ่านจบใน 3–5 นาที)
- เปรียบเทียบสถานการณ์ตอนเช้าและตอนเย็นเมื่อข้อมูลอนุญาต

รูปแบบผลลัพธ์ที่ต้องใช้ให้ตรงทุกตัวอักษร:

EVENING RECAP
[หนึ่งประโยค: เรื่องราวสำคัญที่สุดของวันนี้]

WHAT HAPPENED TODAY
[3–4 ย่อหน้าสั้น ๆ: เหตุการณ์สำคัญที่เกิดขึ้นในวันนี้ เรียงจากสำคัญมากไปน้อย แต่ละย่อหน้ามีข้อเท็จจริงเฉพาะเจาะจง]

WHAT CHANGED
[ย่อหน้าที่ 1 — อะไรเปลี่ยนแปลงจากที่คาดไว้ อะไรพลิกผัน หรือมีข้อมูลใหม่ที่ขัดแย้งกับที่รายงานก่อนหน้า]
[ย่อหน้าที่ 2 — การเปลี่ยนแปลงเชิงโครงสร้างหรือแนวโน้มที่ชัดเจนขึ้นในวันนี้]

WHAT MATTERS TOMORROW
[2–3 ประโยค: สิ่งที่ต้องติดตามในวันพรุ่งนี้ ระบุชื่อเหตุการณ์ เวลา หรือการประกาศที่เฉพาะเจาะจง และเหตุใดจึงสำคัญ]`;

  const userPrompt = `จัดทำ Evening Intelligence Recap จากบทความข่าวล่าสุดต่อไปนี้ ซึ่งรวบรวมจากหัวข้อ: ${topicsStr}${digestSection}${storySection}\n\n${articleText}`;

  return { systemPrompt, userPrompt };
}

// ── Executive briefing prompt — Sprint 8 Task G ──────────────

export function buildExecutiveBriefingPrompt(
  articles: Article[],
  topicLabels: string[],
): BriefingPrompt {
  const articleText = articles
    .slice(0, 12)
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\nแหล่งที่มา: ${(a as { source?: string }).source ?? "ไม่ระบุ"}\n${a.description ?? "(ไม่มีรายละเอียด)"}`,
    )
    .join("\n\n");

  const topicsStr = topicLabels.join(", ");

  const systemPrompt = `คุณคือผู้ช่วยส่วนตัวด้านข่าวกรองสำหรับผู้บริหารที่มีเวลาจำกัด

พันธกิจ: สรุป 5 ข้อที่สำคัญที่สุดและมีผลกระทบสูงสุด โดยเน้น "ผลกระทบ" ก่อน ไม่ใช่ "เหตุการณ์"
ผู้อ่านต้องเข้าใจสาระสำคัญทั้งหมดในการอ่านภายใน 90 วินาที

${SHARED_RULES}
- ความยาวเป้าหมาย: ไม่เกิน 250 คำภาษาไทย (อ่านจบใน 60–90 วินาที)
- แต่ละข้อเริ่มต้นด้วยผลกระทบก่อน ตามด้วยเหตุการณ์ — ไม่ใช่กลับกัน
- ห้ามใช้คำฟุ่มเฟือย ทุกคำต้องมีความหมาย

รูปแบบผลลัพธ์ที่ต้องใช้ให้ตรงทุกตัวอักษร:

EXECUTIVE BRIEFING
[วันที่และเวลา ICT]

1. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง มีตัวเลขหรือชื่อ]
2. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง มีตัวเลขหรือชื่อ]
3. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง มีตัวเลขหรือชื่อ]
4. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง มีตัวเลขหรือชื่อ]
5. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง มีตัวเลขหรือชื่อ]

WATCH
[ประโยคเดียว: สิ่งที่ต้องจับตาวันนี้]`;

  const userPrompt = `จัดทำ Executive Briefing 5 ข้อจากบทความต่อไปนี้ หัวข้อ: ${topicsStr}\n\n${articleText}`;

  return { systemPrompt, userPrompt };
}
