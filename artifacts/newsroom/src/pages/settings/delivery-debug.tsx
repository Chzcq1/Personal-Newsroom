import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Loader2, Bug, Bot, MessageSquare, ChevronDown, ChevronUp, Send, Sunrise, Sunset, Briefcase, Zap, Smartphone, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTelegramSettings } from "@/lib/telegramSettings";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DiagnosticReport {
  checkedAt: string;
  tokenProvided: boolean;
  chatIdProvided: boolean;
  bot: {
    ok: boolean;
    username?: string;
    firstName?: string;
    id?: number;
    canJoinGroups?: boolean;
    canReadMessages?: boolean;
    rawResponse?: unknown;
    error?: string;
  };
  chat: {
    ok: boolean;
    chatId?: string;
    type?: string;
    title?: string;
    username?: string;
    rawResponse?: unknown;
    error?: string;
  } | null;
  diagnosis: string[];
  overallOk: boolean;
}

// ── Telegram Phone Preview — Sprint 13 Task B ────────────────

function PhonePreviewSection() {
  const [previewType, setPreviewType] = useState<"morning" | "evening">("morning");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    formatted?: string;
    articleCount?: number;
    sourceCount?: number;
    topicsUsed?: string[];
    generatedAt?: string;
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function fetchPreview() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${BASE}/api/delivery/preview/${previewType}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as typeof previewData & { summary?: string };
      // The preview endpoint returns summary (raw text), not formatted HTML
      setPreviewData({ ...data, formatted: data?.summary });
    } catch (err) {
      setFetchError(String(err));
    } finally {
      setLoading(false);
    }
  }

  // Render Telegram HTML as styled text (simplified — just strip tags for display)
  function stripTags(html: string): string {
    return html.replace(/<b>/g, "").replace(/<\/b>/g, "").replace(/<i>/g, "").replace(/<\/i>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm mb-1 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              Telegram Phone Preview
            </p>
            <p className="text-xs text-white/40">
              Fetch a formatted briefing without sending to Telegram
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(["morning", "evening"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPreviewType(t)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  previewType === t
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                {t === "morning" ? "Morning" : "Evening"}
              </button>
            ))}
          </div>
          <Button
            onClick={() => { void fetchPreview(); }}
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-white/15 text-white hover:bg-white/10 gap-1.5 ml-auto"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {loading ? "Fetching…" : "Preview"}
          </Button>
        </div>

        {fetchError && (
          <p className="text-xs text-red-400">{fetchError}</p>
        )}

        {previewData && (
          <>
            {/* Meta */}
            <div className="flex items-center gap-3 text-[10px] text-white/30">
              {previewData.articleCount !== undefined && <span>{previewData.articleCount} articles</span>}
              {previewData.sourceCount !== undefined && <span>{previewData.sourceCount} sources</span>}
              {previewData.topicsUsed?.length && <span>{previewData.topicsUsed.join(", ")}</span>}
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center">
              <div className="w-[260px] rounded-[28px] bg-[#1a1a1a] border-2 border-white/10 overflow-hidden shadow-2xl">
                {/* Phone notch */}
                <div className="bg-[#1a1a1a] px-4 py-2 flex items-center justify-between border-b border-white/5">
                  <span className="text-[9px] text-white/40">9:41</span>
                  <div className="w-12 h-1.5 rounded-full bg-white/20" />
                  <span className="text-[9px] text-white/40">●●●</span>
                </div>
                {/* Telegram header */}
                <div className="bg-[#212121] px-3 py-2.5 flex items-center gap-2 border-b border-white/5">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[8px] text-blue-400 font-bold">IN</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-white leading-none">INFOX</p>
                    <p className="text-[8px] text-white/30">Intelligence Bot</p>
                  </div>
                </div>
                {/* Messages */}
                <div className="bg-[#0e0e0e] px-2 py-3 min-h-[300px] max-h-[400px] overflow-y-auto">
                  {previewData.formatted ? (
                    <div className="bg-[#1e2d3d] rounded-lg rounded-tl-none p-2.5 max-w-[90%]">
                      <pre className="text-[8px] text-white/80 whitespace-pre-wrap leading-relaxed font-sans">
                        {stripTags(previewData.formatted).slice(0, 800)}
                        {previewData.formatted.length > 800 ? "\n\n…" : ""}
                      </pre>
                      <p className="text-[7px] text-white/20 text-right mt-1.5">
                        {new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/20 text-center mt-8">
                      No preview available. Check API logs.
                    </p>
                  )}
                </div>
                {/* Bottom bar */}
                <div className="bg-[#212121] px-3 py-2 border-t border-white/5">
                  <div className="w-full h-6 rounded-full bg-white/5 flex items-center px-2">
                    <span className="text-[8px] text-white/20">Message…</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {!previewData && !loading && (
          <p className="text-xs text-white/25 text-center py-4">
            Click Preview to fetch the formatted briefing
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
}

function DiagnosisLine({ line }: { line: string }) {
  const isOk = line.startsWith("✅");
  const isError = line.startsWith("❌");
  const isInfo = line.startsWith("ℹ️") || line.startsWith("💡");
  const isWarn = line.startsWith("⚠️");
  const isSuccess = line.startsWith("🎉");

  const cls = isOk || isSuccess
    ? "text-emerald-400"
    : isError
    ? "text-red-400"
    : isWarn
    ? "text-amber-400"
    : "text-white/60";

  return <p className={`text-sm leading-relaxed ${cls}`}>{line}</p>;
}

function RawResponseToggle({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Raw Telegram response
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-black/40 rounded-lg text-[10px] text-white/50 overflow-auto max-h-40 leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

type TestSendStatus = "idle" | "sending" | "sent" | "failed";

export default function DeliveryDebugPage() {
  const settings = getTelegramSettings();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simple test message state
  const [testSendStatus, setTestSendStatus] = useState<TestSendStatus>("idle");
  const [testSendResult, setTestSendResult] = useState<{
    botUsername?: string;
    chatTitle?: string;
    error?: string;
  } | null>(null);

  // Send Test Briefing state (Task A)
  type BriefingType = "morning" | "evening" | "executive" | "intelligence";
  const [briefingStatus, setBriefingStatus] = useState<Record<BriefingType, TestSendStatus>>({
    morning: "idle", evening: "idle", executive: "idle", intelligence: "idle",
  });
  const [briefingResult, setBriefingResult] = useState<Record<BriefingType, {
    articleCount?: number;
    topicsUsed?: string[];
    messageCount?: number;
    generationTimeMs?: number;
    compressionStats?: { reductionPercent: number };
    error?: string;
  }>>({
    morning: {}, evening: {}, executive: {}, intelligence: {},
  });

  async function handleSendBriefing(type: BriefingType) {
    if (!settings?.botToken || !settings?.chatId) return;
    setBriefingStatus((s) => ({ ...s, [type]: "sending" }));
    setBriefingResult((r) => ({ ...r, [type]: {} }));
    try {
      const res = await fetch(`${BASE}/api/delivery/preview/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: settings.botToken,
          chatId: settings.chatId,
          briefingType: type,
          topicId: "ai",
        }),
      });
      const data = await res.json() as {
        success: boolean;
        articleCount?: number;
        topicsUsed?: string[];
        messageCount?: number;
        generationTimeMs?: number;
        compressionStats?: { reductionPercent: number };
        error?: string;
      };
      if (data.success) {
        setBriefingStatus((s) => ({ ...s, [type]: "sent" }));
        setBriefingResult((r) => ({
          ...r,
          [type]: {
            articleCount: data.articleCount,
            topicsUsed: data.topicsUsed,
            messageCount: data.messageCount,
            generationTimeMs: data.generationTimeMs,
            compressionStats: data.compressionStats,
          },
        }));
      } else {
        setBriefingStatus((s) => ({ ...s, [type]: "failed" }));
        setBriefingResult((r) => ({ ...r, [type]: { error: data.error } }));
      }
    } catch (err) {
      setBriefingStatus((s) => ({ ...s, [type]: "failed" }));
      setBriefingResult((r) => ({ ...r, [type]: { error: String(err) } }));
    }
  }

  async function handleTestSend() {
    if (!settings?.botToken || !settings?.chatId) return;
    setTestSendStatus("sending");
    setTestSendResult(null);
    try {
      const res = await fetch(`${BASE}/api/telegram/test-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: settings.botToken, chatId: settings.chatId }),
      });
      const data = await res.json() as {
        success: boolean;
        botUsername?: string;
        chatTitle?: string;
        error?: string;
      };
      if (data.success) {
        setTestSendStatus("sent");
        setTestSendResult({ botUsername: data.botUsername, chatTitle: data.chatTitle });
      } else {
        setTestSendStatus("failed");
        setTestSendResult({ error: data.error });
      }
    } catch (err) {
      setTestSendStatus("failed");
      setTestSendResult({ error: String(err) });
    }
  }

  const runDiagnostics = async () => {
    if (!settings?.botToken) {
      setError("No bot token configured. Go to Settings → Telegram Delivery first.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch(`${BASE}/api/telegram/diagnostics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: settings.botToken,
          chatId: settings.chatId,
        }),
      });
      const data: DiagnosticReport = await res.json();
      setReport(data);
    } catch (err) {
      setError(`Network error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings/delivery">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Telegram Diagnostics</h1>
            <p className="text-xs text-white/40">Debug your bot connection</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {/* Current settings */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#2AABEE]/10 flex items-center justify-center">
                <Bug className="w-4 h-4 text-[#2AABEE]" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">Connection Check</p>
                <p className="text-xs text-white/40">Tests your saved bot token and chat ID</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-white/40 w-20 flex-shrink-0">Bot Token</span>
                <span className="font-mono text-white/70 text-xs">
                  {settings?.botToken
                    ? `${settings.botToken.slice(0, 8)}…${settings.botToken.slice(-4)}`
                    : <span className="text-red-400">Not configured</span>}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-white/40 w-20 flex-shrink-0">Chat ID</span>
                <span className="font-mono text-white/70 text-xs">
                  {settings?.chatId ?? <span className="text-red-400">Not configured</span>}
                </span>
              </div>
            </div>

            {!settings?.botToken && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  No Telegram credentials saved.{" "}
                  <Link href="/settings/delivery">
                    <span className="underline cursor-pointer">Configure them first →</span>
                  </Link>
                </p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={runDiagnostics}
                disabled={loading || !settings?.botToken}
                className="flex-1 bg-[#2AABEE] hover:bg-[#2AABEE]/90 text-white gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
                ) : (
                  <><Bug className="w-4 h-4" /> Run Diagnostics</>
                )}
              </Button>
              <Button
                onClick={handleTestSend}
                disabled={testSendStatus === "sending" || !settings?.botToken}
                variant="outline"
                className="border-white/15 text-white hover:bg-white/10 gap-2"
              >
                {testSendStatus === "sending" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {testSendStatus === "sending" ? "Sending…" : "Send Test Message"}
              </Button>
            </div>

            {/* Test send result */}
            {testSendStatus === "sent" && testSendResult && (
              <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mt-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-400">
                  <p className="font-medium">Delivered successfully</p>
                  {testSendResult.botUsername && (
                    <p className="text-emerald-400/70 mt-0.5">
                      {testSendResult.botUsername} → {testSendResult.chatTitle}
                    </p>
                  )}
                </div>
              </div>
            )}
            {testSendStatus === "failed" && testSendResult?.error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mt-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{testSendResult.error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Send Test Briefing (Task A) ────────────────────────── */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="font-medium text-sm mb-1">Send Test Briefing</p>
              <p className="text-xs text-white/40">
                Generates a real briefing and sends it to Telegram so you see exactly what INFOX delivers.
              </p>
            </div>

            {!settings?.botToken && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Configure Telegram credentials first.{" "}
                  <Link href="/settings/delivery">
                    <span className="underline cursor-pointer">Go to delivery settings →</span>
                  </Link>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {(["morning", "evening", "executive", "intelligence"] as const).map((type) => {
                const status = briefingStatus[type];
                const result = briefingResult[type];
                const icons = {
                  morning: Sunrise,
                  evening: Sunset,
                  executive: Briefcase,
                  intelligence: Zap,
                };
                const labels = {
                  morning: "Morning Digest",
                  evening: "Evening Recap",
                  executive: "Executive Briefing",
                  intelligence: "Intelligence Briefing",
                };
                const Icon = icons[type];

                return (
                  <div key={type} className="space-y-1.5">
                    <Button
                      onClick={() => handleSendBriefing(type)}
                      disabled={status === "sending" || !settings?.botToken}
                      variant="outline"
                      className={`w-full border-white/15 text-white hover:bg-white/10 gap-2 justify-start ${
                        status === "sent" ? "border-emerald-500/30 text-emerald-400" :
                        status === "failed" ? "border-red-500/30 text-red-400" : ""
                      }`}
                    >
                      {status === "sending" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                      ) : status === "sent" ? (
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : status === "failed" ? (
                        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : (
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      <span className="text-xs truncate">{labels[type]}</span>
                    </Button>
                    {status === "sent" && result.articleCount !== undefined && (
                      <p className="text-[10px] text-emerald-400/70 px-1">
                        {result.articleCount} articles · {result.messageCount} msg
                        {result.compressionStats?.reductionPercent
                          ? ` · ${result.compressionStats.reductionPercent}% compressed`
                          : ""}
                      </p>
                    )}
                    {status === "failed" && result.error && (
                      <p className="text-[10px] text-red-400/70 px-1 truncate">{result.error}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-white/25">
              Briefing generation takes 15–40 seconds depending on AI provider speed.
              Executive briefing uses a tighter token budget.
            </p>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Report */}
        {report && (
          <>
            {/* Overall status */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              report.overallOk
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}>
              <StatusIcon ok={report.overallOk} />
              <div>
                <p className="font-medium text-sm">
                  {report.overallOk ? "All checks passed" : "Issues detected"}
                </p>
                <p className="text-xs text-white/40">
                  Checked at {new Date(report.checkedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Bot info */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-4 h-4 text-white/60" />
                  <p className="font-medium text-sm">Bot Token</p>
                  <StatusIcon ok={report.bot.ok} />
                </div>

                {report.bot.ok ? (
                  <div className="space-y-1.5">
                    <div className="flex gap-3 text-xs">
                      <span className="text-white/40 w-24">Username</span>
                      <span className="text-white font-mono">@{report.bot.username}</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-white/40 w-24">Name</span>
                      <span className="text-white">{report.bot.firstName}</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-white/40 w-24">Bot ID</span>
                      <span className="text-white/60 font-mono">{report.bot.id}</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-white/40 w-24">Can Join Groups</span>
                      <span className={report.bot.canJoinGroups ? "text-emerald-400" : "text-white/40"}>
                        {report.bot.canJoinGroups ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-400">{report.bot.error}</p>
                )}

                <RawResponseToggle data={report.bot.rawResponse} />
              </CardContent>
            </Card>

            {/* Chat info */}
            {report.chat && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-white/60" />
                    <p className="font-medium text-sm">Chat ID</p>
                    <StatusIcon ok={report.chat.ok} />
                  </div>

                  {report.chat.ok ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-3 text-xs">
                        <span className="text-white/40 w-24">Type</span>
                        <span className="text-white capitalize">{report.chat.type}</span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-white/40 w-24">Title</span>
                        <span className="text-white">{report.chat.title}</span>
                      </div>
                      {report.chat.username && (
                        <div className="flex gap-3 text-xs">
                          <span className="text-white/40 w-24">Username</span>
                          <span className="text-white font-mono">@{report.chat.username}</span>
                        </div>
                      )}
                      <div className="flex gap-3 text-xs">
                        <span className="text-white/40 w-24">Chat ID</span>
                        <span className="text-white/60 font-mono">{report.chat.chatId}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-400">{report.chat.error}</p>
                  )}

                  <RawResponseToggle data={report.chat.rawResponse} />
                </CardContent>
              </Card>
            )}

            {/* Diagnosis */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5">
                <p className="font-medium text-sm mb-4">Diagnosis</p>
                <div className="space-y-2">
                  {report.diagnosis.map((line, i) => (
                    <DiagnosisLine key={i} line={line} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Common fixes if not ok */}
            {!report.overallOk && (
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-5">
                  <p className="font-medium text-sm text-amber-400 mb-3">Common fixes</p>
                  <ul className="space-y-2 text-xs text-white/60">
                    <li>1. Get a bot token from <span className="text-[#2AABEE]">@BotFather</span> on Telegram</li>
                    <li>2. Send <code className="bg-white/10 px-1 rounded">/start</code> to your bot</li>
                    <li>3. For groups: add the bot, send a message, then get the chat ID</li>
                    <li>4. Visit <code className="bg-white/10 px-1 rounded break-all">api.telegram.org/bot{"{TOKEN}"}/getUpdates</code> to find your chat ID</li>
                    <li>5. For channels: make the bot an admin with "Post Messages" permission</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── Telegram Phone Preview — Sprint 13 Task B ─────────── */}
        <PhonePreviewSection />

      </main>
    </div>
  );
}
