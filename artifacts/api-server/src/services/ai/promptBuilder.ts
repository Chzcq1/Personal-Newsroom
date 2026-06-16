// ============================================================
// PROMPT BUILDER — Sprint 13 Task G (Signal-First Briefings)
//
// Five prompt types:
//   buildBriefingPrompt()              — Standard topic briefing
//   buildMorningBriefingPrompt()       — Morning cross-topic briefing
//   buildEveningBriefingPrompt()       — Evening daily recap
//   buildExecutiveBriefingPrompt()     — 5-bullet executive mode
//   buildIntelligenceBriefingPrompt()  — Signal-first deep-dive (NEW)
//
// Sprint 13 Task G: Every prompt now prioritizes:
//   1. WHAT CHANGED (not just what happened)
//   2. WHY IT MATTERS (systemic impact, not description)
//   3. WHO IS AFFECTED (specific stakeholders)
//   4. WHAT HAPPENS NEXT (actionable foresight)
//   5. OPPORTUNITY + RISK (decision lens)
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
  analyst: "วิเคราะห์เชิงลึก เน้นผลกระทบเชิงโครงสร้างและนัยระยะยาว อ้างอิงข้อมูลและตัวเลขเสมอ",
  concise: "กระชับ ตรงประเด็น ไม่ยืดเยื้อ เน้นข้อเท็จจริงที่สำคัญที่สุดในแต่ละจุด",
  financial: "เน้นมุมมองการลงทุน ราคาหลักทรัพย์ ผลประกอบการ และนัยต่อตลาดการเงิน",
  neutral: "รายงานข้อเท็จจริงอย่างสมดุล นำเสนอมุมมองหลายด้าน ไม่แสดงความเห็นส่วนตัว",
  aggressive: "ตั้งคำถามท้าทายสมมติฐาน วิเคราะห์ความเสี่ยงที่คนอื่นมองข้าม ชี้ให้เห็นสิ่งที่อาจผิดพลาด",
};

// ── Shared constraints ───────────────────────────────────────

const SHARED_RULES = `กฎที่ต้องปฏิบัติอย่างเคร่งครัด:
- เขียนเป็นภาษาไทยเท่านั้น ยกเว้นชื่อเฉพาะที่กำหนดด้านล่าง
- ชื่อบริษัท ผลิตภัณฑ์ และเทคโนโลยีให้เขียนเป็นภาษาอังกฤษต้นฉบับเสมอ เช่น OpenAI, Nvidia, Tesla, Claude, GPT-4, Bitcoin, Apple, Google, Meta, Amazon
- ห้ามใช้ markdown ทุกชนิด ได้แก่ ###, **, *, -, หรือสัญลักษณ์ bullet
- ห้ามใช้ emoji ทุกชนิดโดยเด็ดขาด
- ห้ามขึ้นต้นประโยคด้วย "ในปัจจุบัน" "โดยรวมแล้ว" "กล่าวโดยสรุป" หรือคำเติมที่ไม่มีความหมาย
- ห้ามนำข้อมูลเดิมมาซ้ำในต่างส่วน
- ใช้ภาษาไทยที่เป็นธรรมชาติ กระชับ และวิเคราะห์ได้
- อ้างอิงชื่อองค์กร บุคคล ตัวเลข และวันที่เฉพาะเจาะจงจากบทความที่ให้มา
- สังเคราะห์ข้อมูลจากหลายแหล่ง หากมีข้อมูลขัดแย้งกัน ให้ระบุและวิเคราะห์ความขัดแย้งนั้น`;

// ── Signal-first rules (Task G) ──────────────────────────────

const SIGNAL_FIRST_RULES = `
หลักการ Signal-First (สำคัญที่สุด):
- ทุกส่วนต้องตอบคำถาม "อะไรเปลี่ยน?" ก่อน ไม่ใช่ "อะไรเกิดขึ้น?"
- หลีกเลี่ยงการบรรยายเหตุการณ์ที่คนอ่านรู้อยู่แล้ว — เน้นการเปลี่ยนแปลงที่มีนัยสำคัญ
- ระบุผู้ได้รับผลกระทบเฉพาะเจาะจง (บริษัท กลุ่มคน ตลาด ประเทศ) ไม่ใช่แค่ "ผู้ที่เกี่ยวข้อง"
- ทุกการวิเคราะห์ต้องมีมุมมอง OPPORTUNITY หรือ RISK หรือทั้งสอง
- ผู้อ่านต้องสามารถตัดสินใจหรือดำเนินการบางอย่างได้หลังอ่านจบ`;

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

พันธกิจของคุณ: วิเคราะห์ ไม่ใช่สรุป ผู้อ่านต้องเข้าใจว่า อะไรเปลี่ยนแปลง ทำไมจึงสำคัญ ใครได้รับผลกระทบ และควรทำอะไรต่อไป

${SHARED_RULES}${SIGNAL_FIRST_RULES}${personalityNote}
- ความยาวเป้าหมาย: 800–1500 คำภาษาไทย

รูปแบบผลลัพธ์ที่ต้องใช้:

HEADLINE
[หนึ่งประโยค: สิ่งที่เปลี่ยนแปลงสำคัญที่สุด ระบุชื่อเฉพาะและตัวเลข]

EXECUTIVE SUMMARY
[3–4 ประโยค: ภาพรวมการเปลี่ยนแปลงสถานการณ์ ผู้เล่นหลัก และบริบทจำเป็น]

KEY DEVELOPMENTS
1. [การเปลี่ยนแปลงที่ 1 — เฉพาะเจาะจง มีหลักฐาน]
2. [การเปลี่ยนแปลงที่ 2]
3. [การเปลี่ยนแปลงที่ 3]
4. [การเปลี่ยนแปลงที่ 4]
5. [การเปลี่ยนแปลงที่ 5]

WHO IS AFFECTED
[ย่อหน้า: ระบุกลุ่มที่ได้รับผลกระทบทันที พร้อมตัวเลขหรือข้อเท็จจริงรองรับ]

IMPACT ANALYSIS
[ย่อหน้าที่ 1 — ผลกระทบระยะสั้น (1–4 สัปดาห์)]
[ย่อหน้าที่ 2 — ผลกระทบระยะยาว (3–12 เดือน)]

OPPORTUNITY
[1–2 ประโยค: โอกาสที่เกิดจากการเปลี่ยนแปลงนี้]

RISK
[1–2 ประโยค: ความเสี่ยงหรือสัญญาณเตือนที่ต้องระวัง]

WHAT HAPPENS NEXT
[2–3 ประโยค: เหตุการณ์ที่คาดว่าจะตามมา และตัวชี้วัดที่ต้องติดตาม]`;

  const trendSection = trendContext
    ? `\n\nบริบทย้อนหลัง:\n${trendContext}\n\nระบุว่า อะไรเปลี่ยนแปลงจากบริบทก่อนหน้า อะไรต่อเนื่อง และอะไรใหม่ทั้งหมด`
    : "";

  const storySection = storyContext
    ? `\n\n${storyContext}\n\nระบุว่าเรื่องราวใดกำลังพัฒนาต่อเนื่อง และมีอะไรใหม่หรือเปลี่ยนแปลงไป`
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
    ? `\n\n${storyContext}\n\nอ้างอิงเรื่องราวต่อเนื่องเหล่านี้ เพื่อให้ผู้อ่านเห็นว่าสถานการณ์พัฒนาอย่างไรจากวันก่อน`
    : "";
  const personalityNote = personality
    ? `\nสไตล์การเขียน: ${PERSONALITY_INSTRUCTIONS[personality]}`
    : "";

  const systemPrompt = `คุณคือผู้ช่วยส่วนตัวด้านข่าวกรองที่จัดทำรายงานเช้าสำหรับผู้บริหาร

พันธกิจ: สังเคราะห์ข้อมูลข้ามหัวข้อ (${topicsStr}) ระบุ 5 การเปลี่ยนแปลงสำคัญที่สุดที่เกิดขึ้นในช่วงที่ผ่านมา เน้นสิ่งที่เปลี่ยนแปลงไป ไม่ใช่แค่สิ่งที่เกิดขึ้น

${SHARED_RULES}${SIGNAL_FIRST_RULES}${personalityNote}
- ความยาวเป้าหมาย: 400–700 คำภาษาไทย (อ่านจบใน 2–4 นาที)

รูปแบบผลลัพธ์:

MORNING BRIEFING
[หนึ่งประโยค: การเปลี่ยนแปลงสำคัญที่สุดในเช้านี้]

TOP DEVELOPMENTS
1. [การเปลี่ยนแปลงที่ 1 — เฉพาะเจาะจง มีหลักฐาน ระบุชื่อองค์กรหรือตัวเลข]
2. [การเปลี่ยนแปลงที่ 2]
3. [การเปลี่ยนแปลงที่ 3]
4. [การเปลี่ยนแปลงที่ 4]
5. [การเปลี่ยนแปลงที่ 5]

WHO IS AFFECTED
[ย่อหน้า: กลุ่มที่ได้รับผลกระทบทันที]

EXECUTIVE SUMMARY
[2–3 ประโยค: ภาพรวมการเปลี่ยนแปลงในบริบทที่กว้างขึ้น]

OPPORTUNITY
[1 ประโยค: โอกาสสำคัญในวันนี้]

RISK
[1 ประโยค: ความเสี่ยงที่ต้องระวังวันนี้]

WHAT TO WATCH TODAY
[2–3 ประโยค: เหตุการณ์และการประกาศที่จะเกิดขึ้นวันนี้]`;

  const userPrompt = `จัดทำ Morning Intelligence Briefing จากบทความข่าวล่าสุดต่อไปนี้ หัวข้อ: ${topicsStr}${digestSection}${storySection}\n\n${articleText}`;

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
    ? `\n\n${storyContext}\n\nเปรียบเทียบกับบริบทนี้เพื่อแสดงว่าเรื่องราวพัฒนาอย่างไรตลอดวัน`
    : "";
  const personalityNote = personality
    ? `\nสไตล์การเขียน: ${PERSONALITY_INSTRUCTIONS[personality]}`
    : "";

  const systemPrompt = `คุณคือผู้ช่วยส่วนตัวด้านข่าวกรองที่จัดทำรายงานเย็น เพื่อให้ผู้บริหารเข้าใจสิ่งที่เปลี่ยนแปลงตลอดวัน และเตรียมพร้อมสำหรับวันพรุ่งนี้

พันธกิจ: สังเคราะห์พัฒนาการข้ามหัวข้อ (${topicsStr}) บอกว่าอะไรเปลี่ยนแปลงไปจากเช้า อะไรน่าแปลกใจ และอะไรที่ต้องติดตามพรุ่งนี้

${SHARED_RULES}${SIGNAL_FIRST_RULES}${personalityNote}
- ความยาวเป้าหมาย: 600–900 คำภาษาไทย (อ่านจบใน 3–5 นาที)

รูปแบบผลลัพธ์:

EVENING RECAP
[หนึ่งประโยค: สิ่งที่เปลี่ยนแปลงสำคัญที่สุดของวันนี้]

WHAT HAPPENED TODAY
[3–4 ย่อหน้าสั้น: เหตุการณ์และการเปลี่ยนแปลงสำคัญ เรียงจากผลกระทบสูงไปต่ำ]

WHAT CHANGED
[ย่อหน้าที่ 1 — อะไรพลิกผันหรือแตกต่างจากที่คาดไว้]
[ย่อหน้าที่ 2 — การเปลี่ยนแปลงเชิงโครงสร้างที่ชัดเจนขึ้น]

WHO IS AFFECTED
[ย่อหน้า: กลุ่มที่ได้รับผลกระทบที่สำคัญที่สุดของวันนี้]

OPPORTUNITY
[1 ประโยค: โอกาสที่เกิดจากการเปลี่ยนแปลงวันนี้]

RISK
[1 ประโยค: สัญญาณเตือนหรือความเสี่ยงที่ต้องระวัง]

WHAT MATTERS TOMORROW
[2–3 ประโยค: สิ่งที่ต้องติดตามในวันพรุ่งนี้ ระบุชื่อเหตุการณ์หรือการประกาศเฉพาะเจาะจง]`;

  const userPrompt = `จัดทำ Evening Intelligence Recap จากบทความข่าวล่าสุดต่อไปนี้ หัวข้อ: ${topicsStr}${digestSection}${storySection}\n\n${articleText}`;

  return { systemPrompt, userPrompt };
}

// ── Executive briefing prompt ────────────────────────────────

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

พันธกิจ: สรุป 5 การเปลี่ยนแปลงที่มีผลกระทบสูงสุด โดยเน้น "ผลกระทบ" ก่อน ไม่ใช่ "เหตุการณ์"
ผู้อ่านต้องเข้าใจสาระสำคัญทั้งหมดในการอ่านภายใน 90 วินาที

${SHARED_RULES}${SIGNAL_FIRST_RULES}
- ความยาวเป้าหมาย: ไม่เกิน 250 คำภาษาไทย
- แต่ละข้อเริ่มต้นด้วยผลกระทบก่อน ตามด้วยเหตุการณ์

รูปแบบผลลัพธ์:

EXECUTIVE BRIEFING
[วันที่และเวลา ICT]

1. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง มีตัวเลขหรือชื่อ]
2. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง]
3. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง]
4. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง]
5. [ผลกระทบก่อน — เหตุการณ์ในประโยคเดียว เฉพาะเจาะจง]

WATCH
[ประโยคเดียว: สิ่งที่ต้องจับตาวันนี้]`;

  const userPrompt = `จัดทำ Executive Briefing 5 ข้อจากบทความต่อไปนี้ หัวข้อ: ${topicsStr}\n\n${articleText}`;

  return { systemPrompt, userPrompt };
}

// ── Intelligence briefing prompt (NEW — Sprint 13 Task G) ────

export function buildIntelligenceBriefingPrompt(
  articles: Article[],
  topicLabels: string[],
  sourceDepthContext?: string,
): BriefingPrompt {
  const articleText = articles
    .slice(0, 15)
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\nแหล่งที่มา: ${(a as { source?: string }).source ?? "ไม่ระบุ"}\n${a.description ?? "(ไม่มีรายละเอียด)"}`,
    )
    .join("\n\n");

  const topicsStr = topicLabels.join(", ");
  const depthSection = sourceDepthContext ? `\n\nบริบทแหล่งที่มา:\n${sourceDepthContext}` : "";

  const systemPrompt = `คุณคือระบบข่าวกรองเชิงลึกระดับสูง วิเคราะห์สัญญาณเปลี่ยนแปลงในข่าวสารเพื่อให้ผู้อ่านได้เปรียบด้านข้อมูลก่อนคนอื่น

พันธกิจ: ไม่ใช่สรุปข่าว แต่คือการตรวจจับ "อะไรกำลังเปลี่ยนแปลง" "ทำไมจึงสำคัญ" และ "อะไรจะเกิดขึ้นต่อไป"
เน้นสัญญาณที่อ่อนแอแต่มีนัยสำคัญ แนวโน้มที่กำลังเร่งตัว และความเสี่ยง/โอกาสที่ยังไม่มีคนเห็น

${SHARED_RULES}${SIGNAL_FIRST_RULES}
- ความยาวเป้าหมาย: 1,000–1,800 คำภาษาไทย (อ่านจบใน 5–8 นาที)
- ต้องวิเคราะห์เชิงระบบ ไม่ใช่แค่รายงานข้อเท็จจริง

รูปแบบผลลัพธ์:

HEADLINE
[สัญญาณการเปลี่ยนแปลงที่สำคัญที่สุดในชุดข่าวนี้ — ระบุชื่อและตัวเลข]

KEY SIGNALS
[3–5 สัญญาณที่กำลังเร่งตัวหรือเปลี่ยนทิศทาง เรียงจากผลกระทบสูงไปต่ำ]
1. 
2. 
3. 

WHO IS AFFECTED
[วิเคราะห์กลุ่มที่ได้รับผลกระทบเฉพาะเจาะจง ทั้งผู้ได้ประโยชน์และผู้เสียประโยชน์]

WHY IT MATTERS
[ย่อหน้า: อธิบายว่าทำไมการเปลี่ยนแปลงนี้จึงมีนัยสำคัญในระดับโครงสร้าง ไม่ใช่แค่ระดับเหตุการณ์]

WHAT HAPPENS NEXT
[3–4 ประโยค: สิ่งที่คาดว่าจะเกิดตามมา พร้อมเงื่อนไขที่ต้องเกิดขึ้นก่อน]

OPPORTUNITY
[ย่อหน้า: โอกาสเฉพาะเจาะจงที่เกิดจากสถานการณ์นี้ พร้อมระบุว่าใครควรจับโอกาสนี้]

RISK
[ย่อหน้า: ความเสี่ยงที่อาจมองข้ามหรือถูกประเมินต่ำ พร้อมสัญญาณเตือนที่ต้องติดตาม]

EXECUTIVE SUMMARY
[3–4 ประโยค: สรุปสัญญาณสำคัญสำหรับผู้บริหารที่อ่านส่วนสุดท้ายก่อน]`;

  const userPrompt = `วิเคราะห์ชุดข่าวต่อไปนี้ในหัวข้อ: ${topicsStr}${depthSection}\n\n${articleText}`;

  return { systemPrompt, userPrompt };
}
