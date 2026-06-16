import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Loader2, Bug, Bot, MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react";
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

  // Task A — test send state
  const [testSendStatus, setTestSendStatus] = useState<TestSendStatus>("idle");
  const [testSendResult, setTestSendResult] = useState<{
    botUsername?: string;
    chatTitle?: string;
    error?: string;
  } | null>(null);

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
      </main>
    </div>
  );
}
