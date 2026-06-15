import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, RefreshCw, Send, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

// ── Telegram message bubble ───────────────────────────────────
// Renders the HTML-formatted Telegram messages as they'd appear in the app.

function TelegramBubble({ messages }: { messages: string[] }) {
  return (
    <div className="space-y-2">
      {messages.map((msg, i) => (
        <div
          key={i}
          className="bg-[#1c2a3a] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-[#e8e8e8] font-[system-ui,sans-serif] max-w-full break-words"
          style={{ whiteSpace: "pre-wrap" }}
          dangerouslySetInnerHTML={{ __html: msg }}
        />
      ))}
    </div>
  );
}

// ── Preview card ──────────────────────────────────────────────

function PreviewCard({
  title,
  subtitle,
  type,
}: {
  title: string;
  subtitle: string;
  type: "morning" | "evening";
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
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as BriefingPreview;
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
      toast({ title: "Configure Telegram first", description: "Go to Settings → Telegram Delivery", variant: "destructive" });
      return;
    }
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch(apiUrl("/delivery/" + type), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: settings.botToken,
          chatId: settings.chatId,
        }),
      });
      const data = await res.json() as { success: boolean; error?: string };
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
    <div className="space-y-4">
      {/* Card header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="text-sm text-white/40">{subtitle}</p>
        </div>
        <Button
          onClick={generate}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-white/15 text-white hover:bg-white/10 gap-1.5 shrink-0"
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
        <Card className="bg-white/3 border-white/8">
          <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            <p className="text-sm text-white/50">Collecting articles and generating briefing…</p>
            <p className="text-xs text-white/30">This takes 15–30 seconds</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3 text-sm text-red-400">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {!loading && preview && (
        <div className="space-y-3">
          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-white/35">
            <span>{preview.articleCount} articles</span>
            <span>·</span>
            <span>{preview.topicsUsed.join(", ")}</span>
            <span>·</span>
            <span>{(preview.generationTimeMs / 1000).toFixed(1)}s</span>
          </div>

          {/* Mock Telegram UI */}
          <div className="bg-[#17212b] rounded-xl p-4 border border-white/5">
            {/* Telegram-style header bar */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <div className="w-8 h-8 rounded-full bg-[#2AABEE]/20 flex items-center justify-center text-xs font-bold text-[#2AABEE]">AI</div>
              <div>
                <p className="text-xs font-medium text-white/80">Personal AI Newsroom</p>
                <p className="text-[10px] text-white/30">bot</p>
              </div>
            </div>
            <TelegramBubble messages={preview.formattedMessages} />
          </div>

          {/* Send button */}
          <div className="flex items-center gap-2">
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
                <span className="text-xs text-white/35 hover:text-white/60 underline cursor-pointer">
                  Configure Telegram first
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !preview && !error && (
        <Card className="bg-white/3 border-white/8">
          <CardContent className="p-6 text-center text-sm text-white/35">
            Click Generate to see a live preview of your {type} briefing
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function DeliveryPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">Delivery Preview</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        <PreviewCard
          type="morning"
          title="Morning Briefing"
          subtitle="Sent at 07:00 — top developments overnight"
        />
        <div className="border-t border-white/5" />
        <PreviewCard
          type="evening"
          title="Evening Recap"
          subtitle="Sent at 18:00 — daily summary and tomorrow's watch list"
        />
      </main>
    </div>
  );
}
