import React, { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Zap, Filter, Clock, Globe, BarChart2, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Step = "intro" | "interests" | "pain" | "delivery" | "preview" | "done";

const INDUSTRY_OPTIONS = [
  "เทคโนโลยี / AI",
  "การเงิน / การลงทุน",
  "ธุรกิจ / สตาร์ทอัพ",
  "การเมือง / ภูมิรัฐศาสตร์",
  "พลังงาน / ESG",
  "สุขภาพ / ไบโอเทค",
  "อสังหาริมทรัพย์",
  "บันเทิง / มีเดีย",
];

const PAIN_OPTIONS = [
  "ข้อมูลมากเกินไป ไม่รู้จะอ่านอะไรก่อน",
  "ข่าวที่ได้รับไม่ตรงกับสิ่งที่ต้องการ",
  "เสียเวลากับการกรองข่าวที่ไม่จำเป็น",
  "ขาดภาพรวมที่เชื่อมโยงเรื่องราวต่างๆ",
  "ข้อมูลภาษาไทยที่ดีมีน้อย",
  "ไม่มีเวลาติดตามข่าวอย่างสม่ำเสมอ",
];

const DELIVERY_OPTIONS = [
  { id: "morning", label: "ตอนเช้า", sub: "07:00 · เตรียมพร้อมก่อนเริ่มวัน" },
  { id: "evening", label: "ตอนเย็น", sub: "18:00 · สรุปเหตุการณ์ประจำวัน" },
  { id: "ondemand", label: "เมื่อต้องการ", sub: "กด Generate เองเมื่อพร้อม" },
  { id: "both", label: "เช้าและเย็น", sub: "07:00 + 18:00 · ครบทุกช่วง" },
];

function ProgressBar({ step }: { step: Step }) {
  const steps: Step[] = ["intro", "interests", "pain", "delivery", "preview", "done"];
  const idx = steps.indexOf(step);
  const pct = ((idx) / (steps.length - 1)) * 100;
  return (
    <div className="h-0.5 w-full bg-zinc-800 mb-8">
      <div
        className="h-full bg-amber-500 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function WaitlistPage() {
  const [step, setStep] = useState<Step>("intro");
  const [industries, setIndustries] = useState<string[]>([]);
  const [pains, setPains] = useState<string[]>([]);
  const [delivery, setDelivery] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function toggleItem<T extends string>(arr: T[], item: T, setter: (v: T[]) => void) {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  async function handleSubmit() {
    try {
      await fetch("/api/waitlist/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industries, pains, delivery }),
      });
    } catch {
      // best-effort
    }
    setSubmitted(true);
    setStep("done");
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      <div className="max-w-lg mx-auto w-full px-4 py-8 flex-1 flex flex-col">
        {/* Logo */}
        <div className="mb-6">
          <span className="text-sm font-bold tracking-[0.2em] text-amber-400 uppercase">INFOX</span>
          <span className="text-xs text-zinc-600 ml-2">Intelligence Platform</span>
        </div>

        <ProgressBar step={step} />

        {/* ── INTRO ──────────────────────────────────────────── */}
        {step === "intro" && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mb-4">
                <Zap className="w-3 h-3" />
                Founding Member Access
              </div>
              <h1 className="text-3xl font-bold text-zinc-100 leading-tight mb-4">
                ข่าวสารที่คุณ<br />
                <span className="text-amber-400">ต้องการจริงๆ</span>
              </h1>
              <p className="text-zinc-400 leading-relaxed">
                INFOX คือ intelligence companion ส่วนตัว
                ที่กรองข่าว วิเคราะห์สัญญาณ และสรุปเป็นภาษาไทย
                ส่งถึงคุณทาง Telegram ทุกเช้าและเย็น
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: <Filter className="w-4 h-4" />, text: "กรองสัญญาณจากข่าว" },
                { icon: <Clock className="w-4 h-4" />, text: "ประหยัดเวลาอ่านข่าว" },
                { icon: <Globe className="w-4 h-4" />, text: "ครอบคลุมทุกหัวข้อ" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="text-amber-400">{icon}</div>
                  <span className="text-xs text-zinc-400 text-center leading-snug">{text}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setStep("interests")}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              เริ่มต้น <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="text-xs text-zinc-600 text-center mt-3">ใช้เวลาประมาณ 2 นาที</p>
          </div>
        )}

        {/* ── INTERESTS ──────────────────────────────────────── */}
        {step === "interests" && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl font-semibold mb-1">คุณทำงานในอุตสาหกรรมไหน?</h2>
            <p className="text-sm text-zinc-500 mb-6">เลือกได้มากกว่า 1 ข้อ</p>
            <div className="grid grid-cols-2 gap-2 mb-auto">
              {INDUSTRY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleItem(industries, opt, setIndustries)}
                  className={[
                    "px-3 py-3 rounded-lg text-sm text-left transition-all border",
                    industries.includes(opt)
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <Button variant="ghost" onClick={() => setStep("intro")} className="flex-1 text-zinc-500">
                ย้อนกลับ
              </Button>
              <Button
                onClick={() => setStep("pain")}
                disabled={industries.length === 0}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-40"
              >
                ถัดไป <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── PAIN POINTS ────────────────────────────────────── */}
        {step === "pain" && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl font-semibold mb-1">ปัญหาที่คุณเจอกับข้อมูลข่าวสาร</h2>
            <p className="text-sm text-zinc-500 mb-6">เลือกได้มากกว่า 1 ข้อ</p>
            <div className="space-y-2 mb-auto">
              {PAIN_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleItem(pains, opt, setPains)}
                  className={[
                    "w-full px-4 py-3 rounded-lg text-sm text-left transition-all border",
                    pains.includes(opt)
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <Button variant="ghost" onClick={() => setStep("interests")} className="flex-1 text-zinc-500">
                ย้อนกลับ
              </Button>
              <Button
                onClick={() => setStep("delivery")}
                disabled={pains.length === 0}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-40"
              >
                ถัดไป <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── DELIVERY ───────────────────────────────────────── */}
        {step === "delivery" && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl font-semibold mb-1">ต้องการรับ briefing เมื่อไหร่?</h2>
            <p className="text-sm text-zinc-500 mb-6">เลือก 1 ข้อ</p>
            <div className="space-y-2 mb-auto">
              {DELIVERY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setDelivery(opt.id)}
                  className={[
                    "w-full px-4 py-3 rounded-lg text-sm text-left transition-all border",
                    delivery === opt.id
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
                  ].join(" ")}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <Button variant="ghost" onClick={() => setStep("pain")} className="flex-1 text-zinc-500">
                ย้อนกลับ
              </Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={!delivery}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-40"
              >
                ดูตัวอย่าง <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── PREVIEW ────────────────────────────────────────── */}
        {step === "preview" && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl font-semibold mb-1">ตัวอย่าง Intelligence Briefing</h2>
            <p className="text-sm text-zinc-500 mb-6">นี่คือรูปแบบที่คุณจะได้รับทาง Telegram</p>

            {/* Phone preview card */}
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-xs">
                <div className="bg-zinc-800 rounded-2xl p-1 shadow-2xl">
                  <div className="bg-zinc-900 rounded-xl overflow-hidden">
                    {/* Status bar */}
                    <div className="flex justify-between px-4 py-2 bg-zinc-900 text-[10px] text-zinc-600">
                      <span>9:41</span><span>●●●</span>
                    </div>
                    {/* Telegram message */}
                    <div className="p-3 space-y-2">
                      <div className="bg-[#182533] rounded-xl p-3 text-xs leading-relaxed">
                        <div className="font-bold text-white mb-1">
                          🌅 Morning Intelligence Briefing
                        </div>
                        <div className="text-zinc-400 text-[10px] mb-2">จันทร์ 16 มิถุนายน 2026</div>
                        <div className="border-t border-zinc-700 my-2" />
                        <div className="text-zinc-200 font-medium mb-1">
                          Nvidia ทะลุ $200 หลัง Blackwell B200 ส่งมอบเกินเป้า
                        </div>
                        <div className="space-y-1 text-zinc-400">
                          <div>◽ Nvidia รายงาน GPU shipment Q2 เกินเป้า 23%</div>
                          <div>◽ ผู้ผลิต AI infrastructure เพิ่มคำสั่งซื้อ H200</div>
                          <div>◽ ตลาด AI hardware ยังอยู่ในช่วง supercycle</div>
                        </div>
                        <div className="border-t border-zinc-700 my-2" />
                        <div className="text-zinc-500 text-[10px]">INFOX · 07:00 ICT</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setStep("delivery")} className="flex-1 text-zinc-500">
                ย้อนกลับ
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              >
                สมัครเลย <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── DONE ───────────────────────────────────────────── */}
        {step === "done" && (
          <div className="flex-1 flex flex-col justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <Zap className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">ขอบคุณ!</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              คุณได้รับสิทธิ์ <span className="text-amber-400 font-medium">Founding Member</span> เรียบร้อยแล้ว
              เราจะแจ้งให้ทราบเมื่อพร้อมเปิดใช้งาน
            </p>
            <div className="space-y-3">
              <Link href="/">
                <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                  ลองใช้ INFOX ตอนนี้
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="w-full border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200">
                  ตั้งค่า Telegram Delivery
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
