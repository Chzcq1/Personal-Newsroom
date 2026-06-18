import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User,
  Bookmark,
  Star,
  Brain,
  Settings,
  ChevronRight,
  TrendingUp,
  Cpu,
  Clock,
  Hash,
  LogOut,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { getProfileStats } from "@/lib/userIdentity";
import { getSavedCount } from "@/lib/briefingStorage";
import { useAuth } from "@/contexts/AuthContext";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

interface Interest {
  id: number;
  interestLabel: string;
  weight: number;
  engagementScore: number;
  lastInteraction: string | null;
}

interface WatchlistItem {
  id: number;
  entityLabel: string;
  entityType: string;
}

function weightColor(weight: number): string {
  if (weight >= 80) return "text-green-400";
  if (weight >= 60) return "text-emerald-400";
  if (weight >= 40) return "text-amber-400";
  return "text-red-400";
}

function WeightBar({ weight }: { weight: number }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${weight}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold w-6 text-right ${weightColor(weight)}`}>
        {weight}
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout, profileId, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const stats = getProfileStats();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [savedCount] = useState(getSavedCount());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/interests/${profileId}`).then((r) => r.json()).catch(() => ({})),
      fetch(`${BASE}/api/watchlist/${profileId}`).then((r) => r.json()).catch(() => ({})),
    ]).then(([iData, wData]) => {
      setInterests((iData.interests ?? []).sort((a: Interest, b: Interest) => b.weight - a.weight));
      setWatchlist(wData.items ?? []);
    }).finally(() => setLoading(false));
  }, [profileId]);

  const topInterests = interests.slice(0, 5);
  const completionPct = Math.min(100, Math.round(
    (isAuthenticated ? 20 : 0) +
    (interests.length >= 3 ? 30 : (interests.length / 3) * 30) +
    (watchlist.length > 0 ? 20 : 0) +
    (savedCount > 0 ? 20 : 0) +
    ((stats?.sessionCount ?? 0) >= 3 ? 10 : 0)
  ));

  async function handleLogout() {
    await logout();
    setLocation("/");
  }

  const displayName = user?.displayName ?? (isAuthenticated ? user?.email?.split("@")[0] : null) ?? "Anonymous Reader";
  const shortId = stats?.shortId ?? "—";
  const accountAge = user
    ? new Date(user.createdAt).toLocaleDateString("en", { month: "short", year: "numeric" })
    : stats?.accountAge ?? "—";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b border-border/60 bg-background/95 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-base font-semibold text-foreground">โปรไฟล์</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </Button>
            )}
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {/* Identity card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/60 bg-card/50 p-5 space-y-4"
        >
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                {user?.foundingMember && (
                  <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-400/30 shrink-0">
                    Founder
                  </Badge>
                )}
                {!isAuthenticated && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                    Anonymous
                  </Badge>
                )}
              </div>
              {user?.email && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
              )}
              {!user?.email && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">#{shortId}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {accountAge}
                </span>
                {!isAuthenticated && (
                  <span className="text-[11px] text-muted-foreground">
                    {stats?.sessionCount ?? 0} sessions
                  </span>
                )}
                {user && (
                  <Badge variant="outline" className="text-[10px] capitalize">{user.tier.replace("_", " ")}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Profile completeness */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">ความครบถ้วนของโปรไฟล์</span>
              <span className="text-xs font-semibold text-foreground">{completionPct}%</span>
            </div>
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
          </div>

          {/* Create account CTA for anonymous users */}
          {!isAuthenticated && (
            <Link to="/auth/signup">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors cursor-pointer">
                <LogIn className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary">สร้างบัญชี</p>
                  <p className="text-[11px] text-muted-foreground">เก็บข้อมูลข้ามอุปกรณ์</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-primary/60 ml-auto shrink-0" />
              </div>
            </Link>
          )}
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Brain, label: "ความสนใจ", value: interests.length, href: "/discover" },
            { icon: Star, label: "ติดตาม", value: watchlist.length, href: "/watchlist" },
            { icon: Bookmark, label: "บันทึก", value: savedCount, href: "/saved" },
          ].map(({ icon: Icon, label, value, href }) => (
            <Link key={label} to={href}>
              <div className="rounded-xl border border-border/60 bg-card/50 p-3.5 text-center hover:border-border/90 transition-colors cursor-pointer">
                <Icon className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Interest profile */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">ความสนใจ</h2>
            </div>
            <Link to="/discover">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                <Cpu className="w-3 h-3" />
                เพิ่มเติม
              </Button>
            </Link>
          </div>

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && topInterests.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/50 p-5 text-center space-y-2">
              <Brain className="w-6 h-6 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">ยังไม่มีความสนใจ</p>
              <Link to="/discover">
                <Button variant="outline" size="sm" className="mt-1">เริ่มติดตามหัวข้อ</Button>
              </Link>
            </div>
          )}

          {!loading && topInterests.length > 0 && (
            <div className="space-y-2">
              {topInterests.map((interest) => (
                <div
                  key={interest.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/40"
                >
                  <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">
                    {interest.interestLabel}
                  </span>
                  <div className="w-28">
                    <WeightBar weight={interest.weight} />
                  </div>
                </div>
              ))}
              {interests.length > 5 && (
                <Link to="/discover">
                  <button className="w-full text-xs text-muted-foreground py-2 hover:text-foreground transition-colors">
                    +{interests.length - 5} ความสนใจเพิ่มเติม
                  </button>
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Watchlist preview */}
        {watchlist.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-foreground">ติดตาม</h2>
              </div>
              <Link to="/watchlist">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                  ดูทั้งหมด <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {watchlist.slice(0, 6).map((item) => (
                <Badge
                  key={item.id}
                  variant="outline"
                  className="text-xs border-border/60 text-foreground/80"
                >
                  {item.entityLabel}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Navigation links */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            บัญชี
          </h2>
          {[
            { label: "สรุปข่าวที่บันทึก", href: "/saved", icon: Bookmark },
            { label: "การตั้งค่า", href: "/settings", icon: Settings },
            { label: "ศูนย์ส่งข้อมูล", href: "/delivery-studio", icon: TrendingUp },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={href} to={href}>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/60 bg-card/30 hover:border-border/90 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </Link>
          ))}
        </section>

        {/* Subscription placeholder */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h3 className="text-sm font-semibold text-foreground">INFOX Pro</h3>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              เร็วๆ นี้
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            ซิงค์หลายอุปกรณ์, แหล่งข้อมูลกำหนดเอง, ติดตามเรื่องเล่าเชิงลึก, และ Intelligence ระดับพิเศษ
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
