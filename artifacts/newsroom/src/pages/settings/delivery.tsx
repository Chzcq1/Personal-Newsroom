import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  MessageSquare,
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
import { useToast } from "@/hooks/use-toast";

type ConnectionStatus = "idle" | "testing" | "connected" | "failed";
type TestSendStatus = "idle" | "sending" | "sent" | "failed";

function apiUrl(path: string): string {
  return `${import.meta.env.BASE_URL}api${path}`;
}

export default function DeliverySettingsPage() {
  const { toast } = useToast();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  // Task A — test-send state
  const [testSendStatus, setTestSendStatus] = useState<TestSendStatus>("idle");
  const [testSendResult, setTestSendResult] = useState<{
    botUsername?: string;
    chatTitle?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const saved = getTelegramSettings();
    if (saved) {
      setBotToken(saved.botToken);
      setChatId(saved.chatId);
    }
  }, []);

  function handleSave() {
    if (!botToken.trim() || !chatId.trim()) {
      toast({ title: "Both fields are required", variant: "destructive" });
      return;
    }
    saveTelegramSettings(botToken, chatId);
    toast({ title: "Settings saved" });
  }

  function handleClear() {
    clearTelegramSettings();
    setBotToken("");
    setChatId("");
    setStatus("idle");
    setTestSendStatus("idle");
    setTestSendResult(null);
    toast({ title: "Settings cleared" });
  }

  async function handleTest() {
    if (!botToken.trim() || !chatId.trim()) {
      toast({ title: "Enter both Bot Token and Chat ID first", variant: "destructive" });
      return;
    }
    setStatus("testing");
    setStatusMessage("");

    try {
      const res = await fetch(apiUrl("/telegram/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: botToken.trim(), chatId: chatId.trim() }),
      });
      const data = (await res.json()) as { success: boolean; message?: string; error?: string };
      if (data.success) {
        setStatus("connected");
        setStatusMessage(data.message ?? "Connection verified");
      } else {
        setStatus("failed");
        setStatusMessage(data.error ?? "Connection failed");
      }
    } catch {
      setStatus("failed");
      setStatusMessage("Network error — check that the API server is running");
    }
  }

  // Task A — send an actual test message to Telegram
  async function handleTestSend() {
    if (!botToken.trim() || !chatId.trim()) {
      toast({ title: "Enter both Bot Token and Chat ID first", variant: "destructive" });
      return;
    }
    setTestSendStatus("sending");
    setTestSendResult(null);

    try {
      const res = await fetch(apiUrl("/telegram/test-message"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: botToken.trim(), chatId: chatId.trim() }),
      });
      const data = (await res.json()) as {
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
    } catch {
      setTestSendStatus("failed");
      setTestSendResult({ error: "Network error — check that the API server is running" });
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">Telegram Delivery</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Credentials form */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold mb-1">Bot Credentials</h2>
              <p className="text-sm text-white/50">
                Create a bot via{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2AABEE] hover:underline inline-flex items-center gap-0.5"
                >
                  @BotFather <ExternalLink className="w-3 h-3" />
                </a>{" "}
                and paste the token here.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Bot Token</Label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/25 pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Chat ID</Label>
              <Input
                type="text"
                placeholder="123456789 or @channelname"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/25 font-mono text-sm"
              />
              <p className="text-xs text-white/35">
                Send a message to your bot then visit{" "}
                <code className="bg-white/10 px-1 py-0.5 rounded text-white/60">
                  https://api.telegram.org/bot&#123;TOKEN&#125;/getUpdates
                </code>{" "}
                to find your chat ID.
              </p>
            </div>

            {/* Connection test status */}
            {status !== "idle" && (
              <div
                className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2.5 ${
                  status === "testing"
                    ? "bg-white/5 text-white/60"
                    : status === "connected"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {status === "testing" ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : status === "connected" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>
                  {status === "testing" ? "Testing connection…" : statusMessage}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-1 flex-wrap">
              <Button
                onClick={handleTest}
                disabled={status === "testing" || !botToken || !chatId}
                variant="outline"
                className="border-white/15 text-white hover:bg-white/10 gap-2"
              >
                {status === "testing" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Test Connection
              </Button>
              <Button
                onClick={handleSave}
                disabled={!botToken || !chatId}
                className="bg-white text-black hover:bg-white/90"
              >
                Save
              </Button>
              {(botToken || chatId) && (
                <Button
                  onClick={handleClear}
                  variant="ghost"
                  className="text-white/40 hover:text-white/70 ml-auto"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Task A: Send Test Briefing ───────────────────────── */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold mb-1">Send Test Message</h2>
              <p className="text-sm text-white/50">
                Sends a real message to your Telegram chat to confirm delivery is working end-to-end.
              </p>
            </div>

            {/* Result display */}
            {testSendStatus === "sent" && testSendResult && (
              <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-emerald-400 font-medium">Delivered successfully</p>
                  {testSendResult.botUsername && (
                    <p className="text-emerald-400/70 text-xs mt-0.5">
                      {testSendResult.botUsername} → {testSendResult.chatTitle}
                    </p>
                  )}
                </div>
              </div>
            )}
            {testSendStatus === "failed" && testSendResult?.error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-red-400 font-medium">Send failed</p>
                  <p className="text-red-400/70 text-xs mt-0.5">{testSendResult.error}</p>
                  <Link href="/settings/delivery/debug">
                    <p className="text-[#2AABEE] text-xs mt-1.5 cursor-pointer hover:underline">
                      Run diagnostics →
                    </p>
                  </Link>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={handleTestSend}
                disabled={testSendStatus === "sending" || !botToken || !chatId}
                className="bg-[#2AABEE] hover:bg-[#2AABEE]/80 text-white gap-2"
              >
                {testSendStatus === "sending" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                {testSendStatus === "sending" ? "Sending…" : "Send Test Message"}
              </Button>
              <Link href="/settings/delivery/debug">
                <span className="text-xs text-white/35 hover:text-white/60 cursor-pointer transition-colors">
                  Full diagnostics →
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled delivery info */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-semibold">Scheduled Delivery</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-16 text-white/40">07:00</span>
                <span className="text-white/80">Morning Intelligence Briefing</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-16 text-white/40">18:00</span>
                <span className="text-white/80">Evening Intelligence Recap</span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-sm text-amber-200/70">
              <p className="font-medium text-amber-200/90 mb-1">Activate scheduled delivery</p>
              <p>
                Add <code className="bg-black/30 px-1 py-0.5 rounded">TELEGRAM_BOT_TOKEN</code> and{" "}
                <code className="bg-black/30 px-1 py-0.5 rounded">TELEGRAM_CHAT_ID</code> to{" "}
                <strong>Replit Secrets</strong> to enable automatic delivery.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
