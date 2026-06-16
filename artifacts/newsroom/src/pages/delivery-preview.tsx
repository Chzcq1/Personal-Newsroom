// ============================================================
// DELIVERY PREVIEW — Sprint 7 Task G redesign
// Mobile-first phone mockup, Telegram-identical rendering.
// ============================================================

import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTelegramSettings, hasTelegramSettings } from "@/lib/telegramSettings";
import { useToast } from "@/hooks/use-toast";

interface BriefingPreview {
  type: "morning" | "evening";
  rawText: string;
  formattedMessages: string[];
  generatedAt: string;
  generationTimeMs: number;
  articleCount: number;
  topicsUsed: string[];
}

function apiUrl(path: string): string {
  return `${import.meta.env.BASE_URL}api${path}`;
}

// ── Telegram phone mockup ─────────────────────────────────────

function TelegramPhone({
  messages,
  type,
  generatedAt,
}: {
  messages: string[];
  type: "morning" | "evening";
  generatedAt: string;
}) {
  const timeStr = new Date(generatedAt).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex justify-center">
      {/* Phone outer frame */}
      <div
        className="relative bg-[#1a1a2a] rounded-[36px] shadow-2xl border border-white/10"
        style={{ width: 320, padding: "10px" }}
      >
        {/* Notch pill */}
        <div className="flex justify-center mb-1">
          <div className="w-20 h-5 bg-black rounded-full" />
        </div>

        {/* Screen */}
        <div className="bg-[#17212b] rounded-[26px] overflow-hidden">
          {/* Telegram chat header */}
          <div className="bg-[#17212b] px-3 py-2.5 flex items-center gap-2.5 border-b border-white/5">
            <div className="w-8 h-8 rounded-full bg-[#2AABEE]/20 flex items-center justify-center text-xs font-bold text-[#2AABEE] flex-shrink-0">
              AI
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white leading-none">INFOX Bot</p>
              <p className="text-[9px] text-[#5DB85C] mt-0.5">online</p>
            </div>
            <div className="flex gap-1.5 text-white/30">
              <div className="w-3 h-3 rounded-full border border-white/15" />
              <div className="w-3 h-3 rounded-full border border-white/15" />
              <div className="w-3 h-3 rounded-full border border-white/15" />
            </div>
          </div>

          {/* Date separator */}
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[9px] text-white/20 whitespace-nowrap">Today</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Message bubbles */}
          <div className="px-3 pb-3 space-y-1.5 max-h-[460px] overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className="flex justify-start">
                <div
                  className="max-w-[88%] bg-[#1e2b3b] rounded-2xl rounded-tl-sm px-3 py-2"
                  style={{ wordBreak: "break-word" }}
                >
                  <div
                    className="text-[11px] text-[#e8e8e8] leading-relaxed"
                    style={{ whiteSpace: "pre-wrap", fontFamily: "system-ui, sans-serif" }}
                    dangerouslySetInnerHTML={{ __html: msg }}
                  />
                  <div className="text-right mt-1">
                    <span className="text-[9px] text-white/25">{timeStr}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input bar (decorative) */}
          <div className="bg-[#17212b] px-3 py-2.5 border-t border-white/5 flex items-center gap-2">
            <div className="flex-1 bg-[#242f3d] rounded-full h-8 px-3 flex items-center">
              <span className="text-white/20 text-[10px]">Message</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#2AABEE] flex items-center justify-center flex-shrink-0">
              <Send className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center mt-2">
          <div className="w-24 h-1 bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Preview card ──────────────────────────────────────────────

function PreviewCard({
  title,
  subtitle,
  type,
  icon,
}: {
  title: string;
  subtitle: string;
  type: "morning" | "evening";
  icon: React.ReactNode;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<BriefingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"success" | "failed" | null>(null);

  async function generate() {
    setLoading(true);
    setPreview(null);
    setError(null);
    setSendResult(null);

    try {
      const res = await fetch(apiUrl(`/delivery/preview/${type}`));
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as BriefingPreview;
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function sendToTelegram() {
    if (!preview) return;
    const settings = getTelegramSettings();
    if (!settings) {
      toast({
        title: "Configure Telegram first",
        description: "Go to Settings → Telegram Delivery",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch(apiUrl("/delivery/" + type), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: settings.botToken, chatId: settings.chatId }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setSendResult("success");
        toast({ title: "Sent to Telegram!" });
      } else {
        setSendResult("failed");
        toast({ title: "Send failed", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      setSendResult("failed");
      toast({ title: "Send failed", description: String(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const telegramReady = hasTelegramSettings();

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-xs text-white/40">{subtitle}</p>
          </div>
        </div>
        <Button
          onClick={generate}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-white/15 text-white/70 hover:text-white hover:bg-white/8 gap-1.5 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {preview ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          <p className="text-sm text-white/40">Collecting articles and generating briefing…</p>
          <p className="text-xs text-white/25">This takes 15–30 seconds</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-500/8 border border-red-500/20 rounded-xl">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Phone mockup + actions */}
      {!loading && preview && (
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px] text-white/30">
            <span>{preview.articleCount} articles</span>
            <span>·</span>
            <span>{preview.topicsUsed.join(", ")}</span>
            <span>·</span>
            <span>{(preview.generationTimeMs / 1000).toFixed(1)}s</span>
          </div>

          {/* Phone frame */}
          <TelegramPhone
            messages={preview.formattedMessages}
            type={type}
            generatedAt={preview.generatedAt}
          />

          {/* Send to Telegram */}
          <div className="flex items-center gap-3 justify-center pt-1">
            <Button
              onClick={sendToTelegram}
              disabled={sending || !telegramReady}
              size="sm"
              className="bg-[#2AABEE] hover:bg-[#2AABEE]/80 text-white gap-2"
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send to Telegram
            </Button>

            {sendResult === "success" && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
              </span>
            )}
            {sendResult === "failed" && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <XCircle className="w-3.5 h-3.5" /> Failed
              </span>
            )}
            {!telegramReady && (
              <Link href="/settings/delivery">
                <span className="text-xs text-white/30 hover:text-white/50 underline cursor-pointer">
                  Configure Telegram →
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !preview && !error && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">
            Click Generate to preview your {type === "morning" ? "morning" : "evening"} briefing
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function DeliveryPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Delivery Preview</h1>
            <p className="text-xs text-white/35">See exactly what arrives in Telegram</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-14">
        <PreviewCard
          type="morning"
          title="Morning Briefing"
          subtitle="Sent at 07:00 ICT — overnight developments"
          icon={<Sun className="w-4 h-4" />}
        />

        <div className="border-t border-white/5" />

        <PreviewCard
          type="evening"
          title="Evening Recap"
          subtitle="Sent at 18:00 ICT — daily summary and tomorrow's watch list"
          icon={<Moon className="w-4 h-4" />}
        />
      </main>
    </div>
  );
}
