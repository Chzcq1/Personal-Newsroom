import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, Zap, Crown, Sparkles, CreditCard,
  QrCode, Clock, CheckCircle2, XCircle, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────

interface Plan {
  id: string;
  displayName: string;
  description: string;
  priceThb: number;
  features: string[];
}

interface BillingStatus {
  currentPlan: string;
  planDetails: Plan;
  usage: {
    dailySummariesUsed: number;
    dailySummariesLimit: number;
    watchlistItemCount: number;
    watchlistLimit: number;
  };
  paymentAvailable: boolean;
  promptpayConfigured: boolean;
}

interface PaymentInitResponse {
  txnId: string;
  planId: string;
  planDisplayName: string;
  amountThb: number;
  promptpayPhone: string;
  status: string;
  expiresAt: string;
  instructions: string[];
}

interface PaymentStatusResponse {
  txnId: string;
  status: string;
  amountThb: number;
  updatedAt: string;
}

// ── QR code generation ────────────────────────────────────

async function buildQrDataUrl(phone: string, amount: number): Promise<string> {
  const [{ default: generatePayload }, QRCode] = await Promise.all([
    import("promptpay-qr"),
    import("qrcode"),
  ]);
  const payload = generatePayload(phone, { amount });
  return QRCode.toDataURL(payload, { width: 240, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
}

// ── Visual constants ──────────────────────────────────────

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Zap className="w-5 h-5 text-white/50" />,
  pro: <Crown className="w-5 h-5 text-amber-400" />,
  elite: <Sparkles className="w-5 h-5 text-violet-400" />,
};

const PLAN_STYLES: Record<string, { border: string; bg: string; badge: string }> = {
  free: { border: "border-white/10", bg: "bg-white/3", badge: "text-white/40 bg-white/8" },
  pro: { border: "border-amber-500/30", bg: "bg-amber-500/5", badge: "text-amber-400 bg-amber-500/15" },
  elite: { border: "border-violet-500/30", bg: "bg-violet-500/5", badge: "text-violet-400 bg-violet-500/15" },
};

// ── QR Modal component ────────────────────────────────────

function PaymentQrModal({
  payment,
  onClose,
  onSuccess,
}: {
  payment: PaymentInitResponse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const successFiredRef = useRef(false);

  // Generate QR on mount
  useEffect(() => {
    buildQrDataUrl(payment.promptpayPhone, payment.amountThb)
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrError(true));
  }, [payment.promptpayPhone, payment.amountThb]);

  // Poll payment status every 4 seconds
  const { data: statusData } = useQuery<PaymentStatusResponse>({
    queryKey: ["payment-status", payment.txnId],
    queryFn: () =>
      fetch(`${BASE}/api/billing/payment/${payment.txnId}/status`).then((r) => r.json()),
    refetchInterval: 4000,
    enabled: true,
  });

  // Detect confirmed
  useEffect(() => {
    if (statusData?.status === "confirmed" && !successFiredRef.current) {
      successFiredRef.current = true;
      setTimeout(onSuccess, 800);
    }
  }, [statusData?.status, onSuccess]);

  const status = statusData?.status ?? "pending";
  const isConfirmed = status === "confirmed";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-[#111] border border-white/12 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">ชำระ PromptPay</p>
            <p className="text-xs text-white/45 mt-0.5">
              ฿{payment.amountThb}/เดือน · {payment.planDisplayName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/35 hover:text-white/70 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* QR area */}
        <div className="px-5 py-5 flex flex-col items-center gap-4">
          {isConfirmed ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <p className="text-sm font-semibold text-white">ชำระเงินสำเร็จ!</p>
              <p className="text-xs text-white/45 text-center">กำลังเปิดใช้งาน {payment.planDisplayName}…</p>
            </div>
          ) : qrError ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <XCircle className="w-10 h-10 text-red-400" />
              <p className="text-xs text-white/45 text-center">ไม่สามารถสร้าง QR ได้ กรุณาโอนด้วยหมายเลข {payment.promptpayPhone}</p>
            </div>
          ) : qrDataUrl ? (
            <div className="bg-white rounded-xl p-3">
              <img src={qrDataUrl} alt="PromptPay QR Code" className="w-[200px] h-[200px]" />
            </div>
          ) : (
            <div className="w-[200px] h-[200px] bg-white/5 rounded-xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white/35 animate-spin" />
            </div>
          )}

          {/* Phone + amount */}
          {!isConfirmed && (
            <div className="w-full space-y-1.5 text-center">
              <p className="text-lg font-bold text-white tracking-wider">{payment.promptpayPhone}</p>
              <p className="text-xs text-white/40">โอน ฿{payment.amountThb} แล้วส่งสลิปทาง Telegram/Line</p>
            </div>
          )}

          {/* Status indicator */}
          {!isConfirmed && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>รอการยืนยัน…</span>
            </div>
          )}

          {/* Transaction ID */}
          {!isConfirmed && (
            <div className="w-full p-3 rounded-lg bg-white/4 border border-white/8">
              <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Transaction ID</p>
              <p className="text-xs text-white/60 font-mono break-all">{payment.txnId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────

export default function BillingPage() {
  const qc = useQueryClient();
  const [activePayment, setActivePayment] = useState<PaymentInitResponse | null>(null);
  const [upgraded, setUpgraded] = useState(false);

  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["billing-plans"],
    queryFn: () => fetch(`${BASE}/api/billing/plans`).then((r) => r.json()),
  });

  const { data: status, isLoading: statusLoading } = useQuery<BillingStatus>({
    queryKey: ["billing-status"],
    queryFn: () => fetch(`${BASE}/api/billing/status`).then((r) => r.json()),
  });

  const initPayment = useMutation<PaymentInitResponse, Error, string>({
    mutationFn: (planId) =>
      fetch(`${BASE}/api/billing/payment/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Payment initiation failed");
        return data;
      }),
    onSuccess: (data) => setActivePayment(data),
  });

  const handleSuccess = () => {
    setUpgraded(true);
    setActivePayment(null);
    void qc.invalidateQueries({ queryKey: ["billing-status"] });
  };

  const currentPlanId = status?.currentPlan ?? "free";
  const plans = plansData?.plans ?? [];
  const paymentAvailable = status?.promptpayConfigured ?? false;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* QR Modal */}
      {activePayment && (
        <PaymentQrModal
          payment={activePayment}
          onClose={() => setActivePayment(null)}
          onSuccess={handleSuccess}
        />
      )}

      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/55 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <h1 className="text-base font-semibold tracking-tight">Billing & Plans</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-6 space-y-6 pb-24">

        {/* Upgrade success banner */}
        {upgraded && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">อัปเกรดสำเร็จ!</p>
              <p className="text-xs text-emerald-400/70 mt-0.5">แผนใหม่กำลังเปิดใช้งาน กรุณารีเฟรชหน้า</p>
            </div>
          </div>
        )}

        {/* Current plan */}
        {status && !statusLoading && (
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/45 uppercase tracking-widest font-medium">แผนปัจจุบัน</p>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="flex items-center gap-3">
              {PLAN_ICONS[currentPlanId]}
              <div>
                <p className="font-semibold text-white">{status.planDetails.displayName}</p>
                <p className="text-xs text-white/40">{status.planDetails.description}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-white/8 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">AI Summaries วันนี้</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-white">{status.usage.dailySummariesUsed}</span>
                  <span className="text-xs text-white/35">/ {status.usage.dailySummariesLimit === -1 ? "∞" : status.usage.dailySummariesLimit}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Watchlist</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-white">{status.usage.watchlistItemCount}</span>
                  <span className="text-xs text-white/35">/ {status.usage.watchlistLimit === -1 ? "∞" : status.usage.watchlistLimit}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-medium mb-3">เลือกแผน</p>
          <div className="space-y-3">
            {(plansLoading ? [null, null, null] : plans).map((plan, idx) => {
              if (!plan) return <div key={idx} className="h-32 rounded-xl bg-white/5 animate-pulse" />;
              const style = PLAN_STYLES[plan.id] ?? PLAN_STYLES.free;
              const isCurrent = plan.id === currentPlanId;
              const canUpgrade = !isCurrent && plan.priceThb > 0;

              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-4 transition-all ${style.border} ${style.bg} ${isCurrent ? "ring-1 ring-white/20" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      {PLAN_ICONS[plan.id]}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white text-sm">{plan.displayName}</p>
                          {isCurrent && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                              แผนของคุณ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40">{plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {plan.priceThb === 0 ? (
                        <p className="text-sm font-semibold text-white/60">ฟรี</p>
                      ) : (
                        <p className="text-sm font-semibold text-white">
                          ฿{plan.priceThb}
                          <span className="text-xs text-white/35 font-normal">/เดือน</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/55">
                        <Check className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button disabled size="sm" variant="outline" className="w-full border-white/10 text-white/30 text-xs">
                      แผนปัจจุบัน
                    </Button>
                  ) : canUpgrade && paymentAvailable ? (
                    <Button
                      size="sm"
                      className={`w-full text-xs gap-1.5 ${plan.id === "pro" ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-violet-600 hover:bg-violet-500 text-white"}`}
                      onClick={() => initPayment.mutate(plan.id)}
                      disabled={initPayment.isPending}
                    >
                      {initPayment.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <QrCode className="w-3.5 h-3.5" />
                      )}
                      อัปเกรดด้วย PromptPay
                    </Button>
                  ) : canUpgrade ? (
                    <Button size="sm" variant="outline" disabled className="w-full border-white/15 text-white/50 text-xs">
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                      ยังไม่พร้อมรับชำระเงิน
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error from mutation */}
        {initPayment.isError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{initPayment.error.message}</p>
          </div>
        )}

        {/* PromptPay instructions */}
        <div className="p-4 rounded-xl border border-white/6 bg-white/3">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-white/35 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/55 font-medium">วิธีชำระเงิน</p>
              <ol className="text-xs text-white/30 mt-1.5 space-y-1 list-decimal list-inside">
                <li>คลิก "อัปเกรดด้วย PromptPay" บนแผนที่ต้องการ</li>
                <li>สแกน QR Code หรือโอนด้วยหมายเลขที่ระบุ</li>
                <li>ส่งสลิปพร้อม Transaction ID ทาง Telegram</li>
                <li>Admin จะยืนยันภายใน 24 ชั่วโมง</li>
              </ol>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
