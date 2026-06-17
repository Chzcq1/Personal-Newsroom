import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Zap, Crown, Sparkles, CreditCard, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  paymentNote: string;
}

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

export default function BillingPage() {
  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["billing-plans"],
    queryFn: () => fetch(`${BASE}/api/billing/plans`).then((r) => r.json()),
  });

  const { data: status, isLoading: statusLoading } = useQuery<BillingStatus>({
    queryKey: ["billing-status"],
    queryFn: () => fetch(`${BASE}/api/billing/status`).then((r) => r.json()),
  });

  const currentPlanId = status?.currentPlan ?? "free";
  const plans = plansData?.plans ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/55 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Billing & Plans</h1>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-6 space-y-6 pb-24">

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

            {/* Usage */}
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

        {/* Plans grid */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-medium mb-3">เลือกแผน</p>
          <div className="space-y-3">
            {(plansLoading ? [null, null, null] : plans).map((plan, idx) => {
              if (!plan) {
                return (
                  <div key={idx} className="h-32 rounded-xl bg-white/5 animate-pulse" />
                );
              }
              const style = PLAN_STYLES[plan.id] ?? PLAN_STYLES.free;
              const isCurrent = plan.id === currentPlanId;

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
                    <Button
                      disabled
                      size="sm"
                      variant="outline"
                      className="w-full border-white/10 text-white/30 text-xs"
                    >
                      แผนปัจจุบัน
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="w-full border-white/15 text-white/50 text-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                      อัปเกรด (เร็วๆ นี้)
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coming soon notice */}
        <div className="p-4 rounded-xl border border-white/6 bg-white/3">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-white/35 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/55 font-medium">PromptPay กำลังจะมา</p>
              <p className="text-xs text-white/30 mt-1 leading-relaxed">
                ระบบชำระเงินกำลังพัฒนา รองรับ PromptPay และ QR Code
                จะเปิดให้ใช้งานเร็วๆ นี้
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
