// ============================================================
// DELIVERY STUDIO — Sprint 19 Task A
// Unified Telegram delivery interface replacing 6 separate pages:
//   settings/delivery, settings/delivery/debug,
//   settings/delivery/preview-live, settings/delivery/preview-v3,
//   settings/scheduler, delivery-preview
// ============================================================

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Send, CheckCircle2, XCircle, Loader2,
  Eye, EyeOff, ExternalLink, MessageSquare, Bug,
  Bot, Clock, Plus, Trash2, ToggleLeft, ToggleRight,
  Smartphone, RefreshCw, CheckCircle, AlertCircle, Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTelegramSettings,
  saveTelegramSettings,
  clearTelegramSettings,
} from "@/lib/telegramSettings";
import {
  loadScheduleSettings,
  saveScheduleSettings,
  addSlot,
  removeSlot,
  toggleSlot,
  updateSlotDaysFilter,
  formatSlotTime,
  getNextDeliveryForSlot,
  getDaysFilterLabel,
  type ScheduleSlot,
  type ScheduleSettings,
} from "@/lib/schedulerSettings";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

type Tab = "config" | "preview" | "send" | "diagnostics" | "schedule";
type ConnectionStatus = "idle" | "testing" | "connected" | "failed";
type SendStatus = "idle" | "sending" | "sent" | "failed";
type BriefingType = "morning" | "evening" | "executive" | "intelligence";

// ── Sample preview content ────────────────────────────────────

const SAMPLE: Record<BriefingType, string> = {
  morning: `<b>🌅 Morning Intelligence Briefing</b>
<i>INFOX · 07:00 ICT</i>

<b>Nvidia</b> ประกาศยอดส่ง H200 ไตรมาส 2 เกินเป้า 23%

◽ รายได้ Data Center แตะระดับสูงสุดใหม่
◽ ผู้ผลิต AI infrastructure ในเอเชียเพิ่มคำสั่งซื้ออีก 40%
◽ ตลาด GPU ยังอยู่ใน supercycle — นักวิเคราะห์คาดต่อเนื่อง 2026`,

  evening: `<b>🌆 Evening Intelligence Recap</b>
<i>INFOX · 18:00 ICT</i>

<b>Federal Reserve</b> คงอัตราดอกเบี้ยที่ 5.25% ตามที่ตลาดคาด

◽ Powell ส่งสัญญาณอาจลดดอกเบี้ยใน Q4
◽ S&P 500 ปิดบวก 1.2% หลังประกาศ Fed
◽ Inflation ล่าสุด 2.9% — ใกล้เป้า 2% แต่ยังไม่ถึง`,

  executive: `<b>📊 Executive Briefing</b>
<i>สรุปผู้บริหาร · INFOX</i>

<b>OpenAI</b> เปิดตัว GPT-5 พร้อม reasoning mode ใหม่
◽ ประสิทธิภาพดีกว่า GPT-4o ใน math และ coding 40%+
◽ Enterprise tier เปิดตัวพร้อมกัน`,

  intelligence: `<b>🧠 Intelligence Briefing</b>
<i>วิเคราะห์เชิงลึก · INFOX</i>

<b>Apple</b> ประกาศ Apple Intelligence สำหรับภาษาไทย Q1 2026

◽ Partnership กับ Anthropic สำหรับ on-device Claude Nano
◽ ผลกระทบต่อ ecosystem ประเทศกำลังพัฒนา: ขยายฐาน 200M users
◽ นัยต่อ Google: SEO ใน Thai market เปลี่ยนโครงสร้าง`,
};

// ── Config Tab ────────────────────────────────────────────────

function ConfigTab() {
  const { toast } = useToast();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const saved = getTelegramSettings();
    if (saved) { setBotToken(saved.botToken); setChatId(saved.chatId); }
  }, []);

  async function handleTest() {
    if (!botToken.trim() || !chatId.trim()) {
      toast({ title: "Enter both fields first", variant: "destructive" }); return;
    }
    setStatus("testing");
    try {
      const res = await fetch(apiUrl("/telegram/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: botToken.trim(), chatId: chatId.trim() }),
      });
      const data = await res.json() as { success: boolean; message?: string; error?: string };
      setStatus(data.success ? "connected" : "failed");
      setStatusMessage(data.success ? (data.message ?? "Connection verified") : (data.error ?? "Connection failed"));
    } catch {
      setStatus("failed");
      setStatusMessage("Network error — check the API server is running");
    }
  }

  return (
    <div className="space-y-5">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold mb-1">Bot Credentials</h2>
            <p className="text-xs text-white/50">
              Create a bot via{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
                className="text-[#2AABEE] hover:underline inline-flex items-center gap-0.5">
                @BotFather <ExternalLink className="w-3 h-3" />
              </a>
              {" "}and paste the token below.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Bot Token</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                placeholder="123456789:ABCdef..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/20 pr-10 font-mono text-sm"
              />
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Chat ID</Label>
            <Input
              placeholder="123456789 or @channelname"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/20 font-mono text-sm"
            />
          </div>
          {status !== "idle" && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2.5 ${
              status === "testing" ? "bg-white/5 text-white/60"
              : status === "connected" ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
            }`}>
              {status === "testing" ? <Loader2 className="w-4 h-4 animate-spin" />
                : status === "connected" ? <CheckCircle2 className="w-4 h-4" />
                : <XCircle className="w-4 h-4" />}
              <span>{status === "testing" ? "Testing…" : statusMessage}</span>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => { void handleTest(); }} disabled={status === "testing" || !botToken || !chatId}
              variant="outline" className="border-white/15 text-white hover:bg-white/10 gap-2">
              {status === "testing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Test Connection
            </Button>
            <Button onClick={() => { saveTelegramSettings(botToken, chatId); toast({ title: "Saved" }); }}
              disabled={!botToken || !chatId} className="bg-white text-black hover:bg-white/90">
              Save
            </Button>
            {(botToken || chatId) && (
              <Button onClick={() => { clearTelegramSettings(); setBotToken(""); setChatId(""); setStatus("idle"); toast({ title: "Cleared" }); }}
                variant="ghost" className="text-white/40 hover:text-white/70 ml-auto">
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-sm font-semibold">Activate Scheduled Delivery</h2>
          <p className="text-xs text-white/50">
            For automatic morning + evening briefings, add these to <strong>Replit Secrets</strong>:
          </p>
          <div className="space-y-2 font-mono text-xs">
            <div className="bg-white/5 rounded-lg px-3 py-2 text-white/70">TELEGRAM_BOT_TOKEN</div>
            <div className="bg-white/5 rounded-lg px-3 py-2 text-white/70">TELEGRAM_CHAT_ID</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Preview Tab ───────────────────────────────────────────────

function PreviewTab() {
  const [briefingType, setBriefingType] = useState<BriefingType>("morning");
  const [loading, setLoading] = useState(false);
  const [livePreview, setLivePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchLive() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/api/delivery/preview/${briefingType}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { summary?: string; formatted?: string };
      setLivePreview(data.summary ?? data.formatted ?? "No preview available");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const displayText = livePreview ?? SAMPLE[briefingType];

  function renderTelegram(text: string) {
    return text
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/<b>(.*?)<\/b>/g, (_, m: string) => `<strong class="text-white font-semibold">${m}</strong>`)
      .replace(/<i>(.*?)<\/i>/g, (_, m: string) => `<em class="text-white/60 not-italic">${m}</em>`)
      .replace(/\n/g, "<br/>");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(["morning", "evening", "executive", "intelligence"] as BriefingType[]).map((t) => (
            <button key={t} onClick={() => { setBriefingType(t); setLivePreview(null); }}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                briefingType === t ? "bg-white/12 text-white" : "text-white/40 hover:text-white/70"
              }`}>
              {t}
            </button>
          ))}
        </div>
        <Button onClick={() => { void fetchLive(); }} disabled={loading} size="sm"
          variant="outline" className="border-white/15 text-white hover:bg-white/10 gap-1.5 ml-auto">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? "Generating…" : "Live Preview"}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

      {livePreview && (
        <p className="text-xs text-emerald-400/70 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" /> Live output from AI
        </p>
      )}

      {/* Phone frame */}
      <div className="flex justify-center">
        <div className="w-72 bg-[#17212b] rounded-3xl border-4 border-white/10 shadow-2xl overflow-hidden">
          <div className="bg-[#1c2733] px-4 py-3 flex items-center gap-2 border-b border-white/5">
            <Bot className="w-5 h-5 text-[#2AABEE]" />
            <div>
              <p className="text-xs font-medium text-white">INFOX Bot</p>
              <p className="text-[10px] text-white/40">bot</p>
            </div>
          </div>
          <div className="p-3">
            <div className="bg-[#2b5278] rounded-2xl rounded-tl-sm p-3 max-h-72 overflow-y-auto">
              <p className="text-[11px] leading-relaxed text-[#c9d1d9] thai-text"
                dangerouslySetInnerHTML={{ __html: renderTelegram(displayText) }} />
            </div>
            <p className="text-[10px] text-[#627483] text-right mt-1">07:00 ✓✓</p>
          </div>
        </div>
      </div>

      {!livePreview && (
        <p className="text-xs text-center text-white/30">Showing sample. Click "Live Preview" for real AI output.</p>
      )}
    </div>
  );
}

// ── Send Test Tab ─────────────────────────────────────────────

function SendTestTab() {
  const { toast } = useToast();
  const [status, setStatus] = useState<SendStatus>("idle");
  const [result, setResult] = useState<{ botUsername?: string; chatTitle?: string; error?: string } | null>(null);

  async function handleSend() {
    const saved = getTelegramSettings();
    if (!saved) {
      toast({ title: "Configure Telegram credentials first", variant: "destructive" }); return;
    }
    setStatus("sending"); setResult(null);
    try {
      const res = await fetch(apiUrl("/telegram/test-message"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: saved.botToken, chatId: saved.chatId }),
      });
      const data = await res.json() as { success: boolean; botUsername?: string; chatTitle?: string; error?: string };
      setStatus(data.success ? "sent" : "failed");
      setResult(data.success ? { botUsername: data.botUsername, chatTitle: data.chatTitle } : { error: data.error });
    } catch {
      setStatus("failed");
      setResult({ error: "Network error" });
    }
  }

  async function handleSendBriefing(type: "morning" | "evening") {
    const saved = getTelegramSettings();
    if (!saved) {
      toast({ title: "Configure Telegram credentials first", variant: "destructive" }); return;
    }
    toast({ title: `Sending ${type} briefing…` });
    try {
      const res = await fetch(apiUrl(`/delivery/send-now`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, botToken: saved.botToken, chatId: saved.chatId }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        toast({ title: `${type === "morning" ? "Morning" : "Evening"} briefing sent!` });
      } else {
        toast({ title: "Send failed", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  }

  const saved = getTelegramSettings();

  return (
    <div className="space-y-5">
      {!saved && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Configure bot credentials in the <strong>Config</strong> tab first.</span>
        </div>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold mb-1">Send Test Message</h2>
            <p className="text-xs text-white/50">Sends a short ping to confirm your bot is connected.</p>
          </div>
          {status === "sent" && result && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-emerald-400 font-medium">Delivered</p>
                {result.botUsername && (
                  <p className="text-emerald-400/70 text-xs">{result.botUsername} → {result.chatTitle}</p>
                )}
              </div>
            </div>
          )}
          {status === "failed" && result?.error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{result.error}</p>
            </div>
          )}
          <Button onClick={() => { void handleSend(); }} disabled={status === "sending" || !saved}
            className="bg-[#2AABEE] hover:bg-[#2AABEE]/80 text-white gap-2">
            {status === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            {status === "sending" ? "Sending…" : "Send Test Message"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold mb-1">Send Full Briefing Now</h2>
            <p className="text-xs text-white/50">Generates a real briefing and delivers it immediately.</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => { void handleSendBriefing("morning"); }} disabled={!saved}
              variant="outline" className="border-white/15 text-white hover:bg-white/10 gap-2 flex-1">
              <Zap className="w-4 h-4 text-amber-400" />
              Morning Briefing
            </Button>
            <Button onClick={() => { void handleSendBriefing("evening"); }} disabled={!saved}
              variant="outline" className="border-white/15 text-white hover:bg-white/10 gap-2 flex-1">
              <Zap className="w-4 h-4 text-indigo-400" />
              Evening Recap
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Diagnostics Tab ───────────────────────────────────────────

interface DiagnosticReport {
  checkedAt: string;
  tokenProvided: boolean;
  chatIdProvided: boolean;
  bot: { ok: boolean; username?: string; firstName?: string; error?: string };
  chat: { ok: boolean; chatId?: string; type?: string; title?: string; error?: string } | null;
  diagnosis: string[];
  overallOk: boolean;
}

function DiagnosticsTab() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDiagnostics() {
    const saved = getTelegramSettings();
    if (!saved) { setError("No credentials saved. Configure in the Config tab first."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(apiUrl("/telegram/diagnostics"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: saved.botToken, chatId: saved.chatId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as DiagnosticReport;
      setReport(data);
    } catch (e) {
      setError(`Diagnostics failed: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Connection Diagnostics</h2>
          <p className="text-xs text-white/50 mt-0.5">Validate bot token, chat access, and message permissions.</p>
        </div>
        <Button onClick={() => { void runDiagnostics(); }} disabled={loading}
          variant="outline" className="border-white/15 text-white hover:bg-white/10 gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
          {loading ? "Running…" : "Run Diagnostics"}
        </Button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{error}</div>
      )}

      {report && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            report.overallOk ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
          }`}>
            {report.overallOk
              ? <CheckCircle className="w-5 h-5 text-emerald-400" />
              : <XCircle className="w-5 h-5 text-red-400" />}
            <div>
              <p className={`text-sm font-semibold ${report.overallOk ? "text-emerald-400" : "text-red-400"}`}>
                {report.overallOk ? "All checks passed" : "Issues found"}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                Checked {new Date(report.checkedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Bot Token", ok: report.tokenProvided, detail: report.bot.username ? `@${report.bot.username}` : report.bot.error },
              { label: "Chat Access", ok: report.chat?.ok ?? false, detail: report.chat?.title ?? report.chat?.error ?? "Not checked" },
            ].map(({ label, ok, detail }) => (
              <Card key={label} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  {detail && <p className="text-xs text-white/40 pl-6">{detail}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {report.diagnosis.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Diagnosis</p>
                {report.diagnosis.map((d, i) => (
                  <p key={i} className="text-sm text-white/80 flex items-start gap-2">
                    <span className="text-white/30 mt-0.5">·</span>
                    {d}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Schedule Tab ──────────────────────────────────────────────

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = [0, 15, 30, 45];
const DAYS_OPTIONS: ScheduleSlot["daysFilter"][] = ["all", "weekdays", "weekends"];

function SlotCard({
  slot,
  onToggle,
  onRemove,
  onDaysChange,
}: {
  slot: ScheduleSlot;
  onToggle: () => void;
  onRemove: () => void;
  onDaysChange: (f: ScheduleSlot["daysFilter"]) => void;
}) {
  const [next, setNext] = useState(() => getNextDeliveryForSlot(slot));
  useEffect(() => {
    setNext(getNextDeliveryForSlot(slot));
    const id = setInterval(() => setNext(getNextDeliveryForSlot(slot)), 60_000);
    return () => clearInterval(id);
  }, [slot]);

  const isDefault = slot.id === "morning-default" || slot.id === "evening-default";

  return (
    <Card className={`border ${slot.enabled ? "bg-white/5 border-white/10" : "bg-white/3 border-white/6"}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${slot.enabled ? "bg-amber-500/15" : "bg-white/5"}`}>
            <Clock className={`w-4 h-4 ${slot.enabled ? "text-amber-400" : "text-white/25"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm font-semibold ${slot.enabled ? "text-white" : "text-white/30"}`}>
                {formatSlotTime(slot)}
              </span>
              <span className="text-xs text-white/30">ICT</span>
              {isDefault && <span className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">default</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs ${slot.enabled ? "text-white/50" : "text-white/20"}`}>{slot.label}</span>
              {slot.enabled && next && <span className="text-[10px] text-emerald-400">Next: {next}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <select value={slot.daysFilter} onChange={(e) => onDaysChange(e.target.value as ScheduleSlot["daysFilter"])}
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/60 outline-none">
              {DAYS_OPTIONS.map((d) => (
                <option key={d} value={d} className="bg-[#0a0a0a]">{getDaysFilterLabel(d)}</option>
              ))}
            </select>
            <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/8 transition-colors">
              {slot.enabled
                ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                : <ToggleLeft className="w-5 h-5 text-white/30" />}
            </button>
            {!isDefault && (
              <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-4 h-4 text-white/30 hover:text-red-400" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ScheduleSettings>(() => loadScheduleSettings());
  const [addHour, setAddHour] = useState(8);
  const [addMinute, setAddMinute] = useState(0);

  function save(updated: ScheduleSettings) {
    saveScheduleSettings(updated);
    setSettings(updated);
  }

  function handleAddSlot() {
    const label = `${String(addHour).padStart(2, "0")}:${String(addMinute).padStart(2, "0")} Briefing`;
    const updated = addSlot(settings, addHour, addMinute, label);
    save(updated);
    toast({ title: "Slot added" });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold mb-1">Delivery Schedule</h2>
        <p className="text-xs text-white/50">Choose when INFOX sends your briefings. Uses server-side cron with Replit Secrets.</p>
      </div>

      <div className="space-y-3">
        {settings.slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            onToggle={() => save(toggleSlot(settings, slot.id))}
            onRemove={() => save(removeSlot(settings, slot.id))}
            onDaysChange={(f) => save(updateSlotDaysFilter(settings, slot.id, f))}
          />
        ))}
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-white/50 uppercase tracking-wider">Add Custom Slot</p>
          <div className="flex items-center gap-2">
            <select value={addHour} onChange={(e) => setAddHour(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono outline-none">
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h} className="bg-[#0a0a0a]">{String(h).padStart(2, "0")}</option>
              ))}
            </select>
            <span className="text-white/40">:</span>
            <select value={addMinute} onChange={(e) => setAddMinute(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono outline-none">
              {MINUTE_OPTIONS.map((m) => (
                <option key={m} value={m} className="bg-[#0a0a0a]">{String(m).padStart(2, "0")}</option>
              ))}
            </select>
            <Button onClick={handleAddSlot} size="sm"
              className="bg-white/10 hover:bg-white/15 text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "config", label: "Config" },
  { id: "preview", label: "Preview" },
  { id: "send", label: "Send Test" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "schedule", label: "Schedule" },
];

export default function DeliveryStudioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("config");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              การตั้งค่า
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">ศูนย์ส่งข้อมูล</h1>
            <p className="text-xs text-white/40">Telegram, ดูตัวอย่าง, และกำหนดเวลา</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-white text-white"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {activeTab === "config" && <ConfigTab />}
        {activeTab === "preview" && <PreviewTab />}
        {activeTab === "send" && <SendTestTab />}
        {activeTab === "diagnostics" && <DiagnosticsTab />}
        {activeTab === "schedule" && <ScheduleTab />}
      </main>
    </div>
  );
}
