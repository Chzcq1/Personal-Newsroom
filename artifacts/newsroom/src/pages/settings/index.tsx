import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Send, Heart, ChevronRight, Check, X,
  Brain, Zap, Layers, Radio, BarChart3, CreditCard,
  User, Sun, Moon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasTelegramSettings } from "@/lib/telegramSettings";
import { getInterests } from "@/lib/interestProfile";
import { getPersonality, PERSONALITY_OPTIONS } from "@/lib/personalitySettings";
import { isExecutiveModeEnabled, setExecutiveMode } from "@/lib/executiveMode";
import { useTheme } from "@/contexts/ThemeContext";

function SettingsRow({
  href, icon, iconBg, iconColor, title, badge, description, badgeVariant = "default",
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  badge?: React.ReactNode;
  description: string;
  badgeVariant?: "default" | "success" | "warning" | "info";
}) {
  return (
    <Link href={href}>
      <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors cursor-pointer group">
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <span className={iconColor}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-medium text-white text-sm">{title}</p>
              {badge}
            </div>
            <p className="text-xs text-white/45 leading-relaxed">{description}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/50 transition-colors flex-shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-white/50 uppercase tracking-widest px-1 pt-5 pb-1 font-medium">
      {children}
    </p>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "info" | "muted" }) {
  const cls = {
    default: "text-white/40 bg-white/8",
    success: "text-emerald-400 bg-emerald-400/10",
    warning: "text-amber-300 bg-amber-500/15 border border-amber-500/20",
    info: "text-blue-300 bg-blue-500/10",
    muted: "text-white/25 bg-white/5",
  }[variant];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${cls}`}>
      {children}
    </span>
  );
}

export default function SettingsPage() {
  const telegramOk = hasTelegramSettings();
  const interests = getInterests();
  const personality = getPersonality();
  const personalityOption = PERSONALITY_OPTIONS.find((p) => p.id === personality);
  const [execMode, setExecModeState] = useState(isExecutiveModeEnabled);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/55 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              กลับ
            </Button>
          </Link>
          <h1 className="text-base font-semibold tracking-tight flex-1">การตั้งค่า</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-8 h-8 text-white/55 hover:text-white"
            title={theme === "dark" ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-6 space-y-0.5">

        {/* ── การส่ง ────────────────────────────────────────────── */}
        <SectionLabel>การส่ง</SectionLabel>

        <SettingsRow
          href="/delivery-studio"
          icon={<Send className="w-4 h-4" />}
          iconBg="bg-[#2AABEE]/10"
          iconColor="text-[#2AABEE]"
          title="Delivery Studio"
          description="ตั้งค่า Telegram, ดูตัวอย่าง, ทดสอบส่ง, และกำหนดเวลา"
          badge={
            telegramOk
              ? <Badge variant="success"><Check className="w-3 h-3" /> เชื่อมต่อแล้ว</Badge>
              : <Badge variant="muted"><X className="w-3 h-3" /> ยังไม่ตั้งค่า</Badge>
          }
        />

        {/* ── ข่าวกรอง ──────────────────────────────────────────── */}
        <SectionLabel>ข่าวกรอง</SectionLabel>

        <SettingsRow
          href="/settings/signal-mode"
          icon={<Radio className="w-4 h-4" />}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-400"
          title="โหมดสัญญาณ"
          description="ปลอดภัย, สมดุล, หรือดิบ — ความเร็ว vs. การตรวจสอบ"
        />

        <SettingsRow
          href="/intelligence-center"
          icon={<BarChart3 className="w-4 h-4" />}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-400"
          title="ศูนย์ข่าวกรอง"
          description="การวิเคราะห์การส่ง, คุณภาพแหล่งข้อมูล, งบประมาณ token"
        />

        {/* ── ปรับแต่ง ───────────────────────────────────────────── */}
        <SectionLabel>ปรับแต่ง</SectionLabel>

        <SettingsRow
          href="/profile"
          icon={<Heart className="w-4 h-4" />}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-400"
          title="ความสนใจ"
          description="Tesla, Nvidia, Bitcoin — ติดตามสิ่งที่สำคัญสำหรับคุณ"
          badge={interests.length > 0
            ? <Badge variant="info">{interests.length} รายการ</Badge>
            : undefined}
        />

        <SettingsRow
          href="/settings/personality"
          icon={<Brain className="w-4 h-4" />}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-400"
          title="บุคลิก AI"
          description={personalityOption?.description ?? "เลือกโทนการเขียนของ AI"}
          badge={<Badge variant="info">{personalityOption?.name ?? "Analyst"}</Badge>}
        />

        {/* Exec Mode inline toggle */}
        <Card className={`border transition-colors ${execMode ? "border-amber-500/25 bg-amber-500/5" : "border-white/10 bg-white/5"}`}>
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${execMode ? "bg-amber-500/15" : "bg-white/8"}`}>
              <Zap className={`w-4 h-4 ${execMode ? "text-amber-400" : "text-white/40"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <p className="font-medium text-white text-sm">โหมดผู้บริหาร</p>
                {execMode && (
                  <Badge variant="warning"><Check className="w-3 h-3" /> เปิด</Badge>
                )}
              </div>
              <p className="text-xs text-white/45 leading-relaxed">สรุป 5 ข้อ อ่านจบใน 90 วินาที</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setExecutiveMode(!execMode); setExecModeState(!execMode); }}
              className={`text-xs flex-shrink-0 ${execMode ? "text-amber-400 hover:text-amber-300" : "text-white/40 hover:text-white"}`}
            >
              {execMode ? "ปิด" : "เปิด"}
            </Button>
          </CardContent>
        </Card>

        <SettingsRow
          href="/settings/topics"
          icon={<Layers className="w-4 h-4" />}
          iconBg="bg-slate-500/10"
          iconColor="text-slate-400"
          title="หัวข้อและแหล่งข้อมูล"
          description="จัดการหัวข้อในตัวและเพิ่ม RSS feed ของคุณเอง"
        />

        {/* ── บัญชี ───────────────────────────────────────────── */}
        <SectionLabel>บัญชี</SectionLabel>

        <SettingsRow
          href="/settings/billing"
          icon={<CreditCard className="w-4 h-4" />}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-400"
          title="แผนและการชำระเงิน"
          description="แผนปัจจุบัน, การใช้งาน, และอัปเกรด"
          badge={<Badge variant="default">ฟรี</Badge>}
        />

        <SettingsRow
          href="/profile"
          icon={<User className="w-4 h-4" />}
          iconBg="bg-white/8"
          iconColor="text-white/40"
          title="โปรไฟล์"
          description="ข้อมูลบัญชี, เข้าสู่ระบบ / ออกจากระบบ"
        />

        <div className="pt-6 pb-4 text-center">
          <p className="text-xs text-white/35">INFOX · ข่าวกรองเทรนด์</p>
        </div>

      </main>
    </div>
  );
}
