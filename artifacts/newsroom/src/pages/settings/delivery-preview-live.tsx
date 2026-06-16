import React, { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, RefreshCw, Smartphone, Eye, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BriefingType = "morning" | "evening" | "executive" | "intelligence";
type SendStatus = "idle" | "loading" | "sent" | "error";

const BRIEFING_TYPE_OPTIONS: Array<{ id: BriefingType; label: string; sub: string }> = [
  { id: "morning", label: "Morning Briefing", sub: "รูปแบบเช้า · สรุปสั้น" },
  { id: "evening", label: "Evening Recap", sub: "รูปแบบเย็น · วิเคราะห์วัน" },
  { id: "executive", label: "Executive Briefing", sub: "สำหรับผู้บริหาร · กระชับ" },
  { id: "intelligence", label: "Intelligence Briefing", sub: "ฉบับเต็ม · เจาะลึก" },
];

const SAMPLE_PREVIEW: Record<BriefingType, string> = {
  morning: `<b>🌅 Morning Intelligence Briefing</b>
<i>วันจันทร์ที่ 16 มิถุนายน 2568</i>
<i>3 แหล่ง  ·  via Reuters, Financial Times</i>

<i>──────────────────────</i>

<b>Nvidia</b> ประกาศยอดส่ง <b>H200</b> ไตรมาส 2 เกินเป้า 23%

◽ บริษัทรายงานรายได้ Data Center แตะระดับสูงสุดใหม่

◽ ผู้ผลิต AI infrastructure ในเอเชียเพิ่มคำสั่งซื้ออีก 40%

◽ ตลาด GPU ยังอยู่ในช่วง supercycle — นักวิเคราะห์คาดต่อเนื่อง 2026

<i>──────────────────────</i>
<i>INFOX · 07:00 ICT</i>`,

  evening: `<b>🌆 Evening Intelligence Recap</b>
<i>วันจันทร์ที่ 16 มิถุนายน 2568</i>
<i>5 แหล่ง  ·  via Bloomberg, FT</i>

<i>──────────────────────</i>

<b>Federal Reserve</b> คงอัตราดอกเบี้ยที่ 5.25% ตามที่ตลาดคาด

◽ <b>Jerome Powell</b> ส่งสัญญาณอาจลดอัตราดอกเบี้ยใน Q4

◽ ดัชนี S&P 500 ปิดบวก 1.2% หลังประกาศ Fed

◽ Inflation ล่าสุด 2.9% — ใกล้เป้า 2% แต่ยังไม่ถึง

<i>──────────────────────</i>
<i>INFOX · 18:00 ICT</i>`,

  executive: `<b>📊 Executive Briefing</b>
<i>สรุปผู้บริหาร · 16 มิถุนายน 2568</i>
<i>4 แหล่ง</i>

<i>──────────────────────</i>

<b>OpenAI</b> เปิดตัว GPT-5 พร้อม reasoning mode ใหม่

◽ ประสิทธิภาพดีกว่า GPT-4o ใน math และ coding 40%+

◽ Enterprise pricing เริ่ม $30/เดือน — กระทบ Microsoft ทางอ้อม

◽ <b>Sam Altman</b>: "AGI อาจเกิดขึ้นเร็วกว่าที่ใครคาด"

<i>──────────────────────</i>
<i>INFOX · 09:00 ICT</i>`,

  intelligence: `<b>🔍 Intelligence Briefing — AI</b>
<i>16 มิถุนายน 2568</i>
<i>7 แหล่ง  ·  via FT, Bloomberg, MIT Tech Review</i>

<i>──────────────────────</i>

<b>DeepSeek</b> R2 ทำลายสถิติ benchmark เกือบทุกด้าน

◽ รันบน hardware ราคาต่ำกว่า GPT-4o ถึง 10 เท่า

◽ นักลงทุน US AI เริ่มกังวลเรื่อง compute advantage

◽ Geopolitical risk: export ban อาจไม่เพียงพออีกต่อไป

<i>──────────────────────</i>
<i>INFOX · 14:30 ICT</i>`,
};

function TelegramMessageCard({ html }: { html: string }) {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-zinc-800 rounded-2xl p-1 shadow-xl">
        {/* Phone frame */}
        <div className="bg-[#17212B] rounded-xl overflow-hidden">
          {/* Status bar */}
          <div className="flex justify-between px-4 py-2 bg-[#17212B] text-[10px] text-zinc-500">
            <span>9:41</span>
            <span className="font-medium text-zinc-400">Telegram</span>
            <span>●●●</span>
          </div>
          {/* Chat header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700/50">
            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
              <span className="text-black text-[10px] font-bold">I</span>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-200">INFOX Intelligence</div>
              <div className="text-[10px] text-zinc-500">bot</div>
            </div>
          </div>
          {/* Message bubble */}
          <div className="p-3 pb-4">
            <div className="bg-[#182533] rounded-xl p-3 max-w-[90%]">
              <div
                className="text-xs text-zinc-300 leading-relaxed space-y-0.5 [&_b]:font-semibold [&_b]:text-white [&_i]:not-italic [&_i]:text-zinc-500 [&_i]:text-[10px]"
                dangerouslySetInnerHTML={{
                  __html: html
                    .replace(/\n/g, "<br/>")
                    .replace(/<i>──────────────────────<\/i>/g,
                      '<div class="my-1.5 border-t border-zinc-700/60"></div>'),
                }}
              />
              <div className="text-[10px] text-zinc-600 text-right mt-1.5">9:41 ✓✓</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryPreviewLivePage() {
  const [selectedType, setSelectedType] = useState<BriefingType>("morning");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");

  const previewHtml = SAMPLE_PREVIEW[selectedType];

  async function handleSendTest() {
    setSendStatus("loading");
    try {
      const res = await fetch("/api/telegram/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefingType: selectedType }),
      });
      setSendStatus(res.ok ? "sent" : "error");
    } catch {
      setSendStatus("error");
    }
    setTimeout(() => setSendStatus("idle"), 4000);
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/settings/delivery">
            <button className="p-2 rounded-lg hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-zinc-200">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Preview Live</h1>
            <p className="text-xs text-zinc-500 mt-0.5">ตัวอย่างข้อความที่จะส่งจริงทาง Telegram</p>
          </div>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {BRIEFING_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedType(opt.id)}
              className={[
                "px-3 py-2.5 rounded-lg text-sm text-left transition-all border",
                selectedType === opt.id
                  ? "border-amber-500 bg-amber-500/10 text-amber-300"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
              ].join(" ")}
            >
              <div className="font-medium text-xs">{opt.label}</div>
              <div className="text-[11px] opacity-60 mt-0.5">{opt.sub}</div>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Preview</span>
          </div>
          <TelegramMessageCard html={previewHtml} />
        </div>

        {/* Raw format */}
        <Card className="bg-zinc-950 border-zinc-800 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Telegram HTML Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
              {previewHtml}
            </pre>
          </CardContent>
        </Card>

        {/* Send test button */}
        <div className="space-y-3">
          <Button
            onClick={handleSendTest}
            disabled={sendStatus === "loading"}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
          >
            {sendStatus === "loading" ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> กำลังส่ง...</>
            ) : sendStatus === "sent" ? (
              <><CheckCircle className="w-4 h-4 mr-2" /> ส่งเรียบร้อย!</>
            ) : sendStatus === "error" ? (
              <><AlertCircle className="w-4 h-4 mr-2" /> ส่งไม่สำเร็จ</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> ส่ง Test Digest</>
            )}
          </Button>

          {sendStatus === "error" && (
            <p className="text-xs text-zinc-500 text-center">
              ตรวจสอบ TELEGRAM_BOT_TOKEN และ TELEGRAM_CHAT_ID ใน Secrets
            </p>
          )}

          <p className="text-xs text-zinc-600 text-center">
            ข้อความจะถูกส่งไปยัง Telegram ที่ตั้งค่าไว้ใน Settings → Delivery
          </p>
        </div>
      </div>
    </div>
  );
}
